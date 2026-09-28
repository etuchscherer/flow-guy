import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

// Ensure journeys are registered
import '../src/journeys';

import {
  createABFlowSession,
  getDefaultMockAdapter,
  journeyABRegistry,
  MockABAdapter,
  resetActiveABAdapter,
  resolveJourneyVariant,
  setActiveABAdapter,
  StatsigABAdapter,
} from '../src/flows/ab';

describe('A/B Testing Adapter Layer & Flow Testing', () => {
  let mockAdapter: MockABAdapter;

  beforeEach(() => {
    resetActiveABAdapter();
    mockAdapter = getDefaultMockAdapter();
    mockAdapter.reset();
  });

  describe('MockABAdapter', () => {
    it('returns default variant when no rules are configured', () => {
      const evaluation = mockAdapter.getExperiment('exp_test', { userId: 'user-1' });
      assert.equal(evaluation.variant, 'control');
      assert.equal(evaluation.inExperiment, true);
    });

    it('returns configured default variant', () => {
      mockAdapter.setExperimentConfig('exp_test', {
        defaultVariant: 'variant_a',
      });
      const evaluation = mockAdapter.getExperiment('exp_test', { userId: 'user-1' });
      assert.equal(evaluation.variant, 'variant_a');
    });

    it('assigns variant based on user overrides configuration', () => {
      mockAdapter.setExperimentConfig('exp_test', {
        defaultVariant: 'control',
        userOverrides: {
          'user-treatment': 'treatment',
          'user-control': 'control',
        },
      });

      assert.equal(
        mockAdapter.getExperiment('exp_test', { userId: 'user-treatment' }).variant,
        'treatment'
      );
      assert.equal(
        mockAdapter.getExperiment('exp_test', { userId: 'user-control' }).variant,
        'control'
      );
      assert.equal(
        mockAdapter.getExperiment('exp_test', { userId: 'user-other' }).variant,
        'control'
      );
    });

    it('allows dynamic global variant overrides for testing', () => {
      mockAdapter.overrideVariant('exp_test', 'forced_variant');

      const eval1 = mockAdapter.getExperiment('exp_test', { userId: 'user-1' });
      const eval2 = mockAdapter.getExperiment('exp_test', { userId: 'user-2' });

      assert.equal(eval1.variant, 'forced_variant');
      assert.equal(eval2.variant, 'forced_variant');
    });

    it('allows dynamic user-specific overrides for testing', () => {
      mockAdapter.overrideUserVariant('vip_user', 'exp_test', 'vip_experience');

      assert.equal(
        mockAdapter.getExperiment('exp_test', { userId: 'vip_user' }).variant,
        'vip_experience'
      );
      assert.equal(
        mockAdapter.getExperiment('exp_test', { userId: 'normal_user' }).variant,
        'control'
      );
    });

    it('records exposures with user context and timestamps', () => {
      mockAdapter.logExposure('exp_pricing', 'tier_b', {
        userId: 'u_100',
        email: 'test@example.com',
      });

      const exposures = mockAdapter.getExposures();
      assert.equal(exposures.length, 1);
      assert.equal(exposures[0].experimentName, 'exp_pricing');
      assert.equal(exposures[0].variant, 'tier_b');
      assert.equal(exposures[0].user?.userId, 'u_100');
      assert.ok(exposures[0].timestamp > 0);
    });

    it('records events with metadata and user context', () => {
      mockAdapter.logEvent(
        'checkout_completed',
        49.99,
        { item: 'pro_pack' },
        { userId: 'u_200' }
      );

      const events = mockAdapter.getEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0].eventName, 'checkout_completed');
      assert.equal(events[0].value, 49.99);
      assert.deepEqual(events[0].metadata, { item: 'pro_pack' });
      assert.equal(events[0].user?.userId, 'u_200');
    });

    it('supports real-time exposure and event listeners', () => {
      let heardExposure = false;
      let heardEvent = false;

      const unsubExp = mockAdapter.onExposure((exp) => {
        if (exp.experimentName === 'exp_live') heardExposure = true;
      });
      const unsubEvt = mockAdapter.onEvent((evt) => {
        if (evt.eventName === 'event_live') heardEvent = true;
      });

      mockAdapter.logExposure('exp_live', 'variant_1');
      mockAdapter.logEvent('event_live');

      assert.equal(heardExposure, true);
      assert.equal(heardEvent, true);

      unsubExp();
      unsubEvt();
    });
  });

  describe('StatsigABAdapter (Reference Implementation)', () => {
    it('translates calls to Statsig client SDK interface', () => {
      let loggedExposure = '';
      let loggedEvent = '';
      let loggedEventMetadata: Record<string, string> = {};

      const mockStatsigClient = {
        getExperiment: (_name: string) => ({
          getName: () => 'exp_statsig',
          getGroupName: () => 'Treatment A',
          getRuleID: () => 'rule_1',
          get: (_param: string, fallback: any) => fallback,
          value: { buttonColor: 'blue' },
        }),
        manuallyLogExperimentExposure: (expName: string) => {
          loggedExposure = expName;
        },
        logEvent: (name: string, _value: any, metadata: any) => {
          loggedEvent = name;
          loggedEventMetadata = metadata;
        },
        checkGate: (gateName: string) => gateName === 'feature_active',
      };

      const statsigAdapter = new StatsigABAdapter(mockStatsigClient);

      const exp = statsigAdapter.getExperiment('exp_statsig', { userId: 'u_stat' });
      assert.equal(exp.groupName, 'Treatment A');
      assert.equal(exp.value?.buttonColor, 'blue');

      statsigAdapter.logExposure('exp_statsig', 'Treatment A', { userId: 'u_stat' });
      assert.equal(loggedExposure, 'exp_statsig');

      statsigAdapter.logEvent('user_signup', 1, { source: 'organic' }, { userId: 'u_stat' });
      assert.equal(loggedEvent, 'user_signup');
      assert.equal(loggedEventMetadata.source, 'organic');

      assert.equal(statsigAdapter.checkGate('feature_active'), true);
      assert.equal(statsigAdapter.checkGate('other_gate'), false);
    });
  });

  describe('JourneyExperimentRegistry', () => {
    it('resolves registered auth journey to its mapped experiment and variant', () => {
      // Configure mock adapter for exp_auth_v2
      mockAdapter.setExperimentConfig('exp_auth_v2', {
        userOverrides: {
          'user-control': 'control',
          'user-upsell': 'upgrade_sheet',
        },
      });

      const resControl = resolveJourneyVariant('auth', { userId: 'user-control' }, mockAdapter);
      assert.equal(resControl.resolvedVariant, 'control');
      assert.equal(resControl.experimentName, 'exp_auth_v2');

      const resTreatment = resolveJourneyVariant('auth', { userId: 'user-upsell' }, mockAdapter);
      assert.equal(resTreatment.resolvedVariant, 'auth-with-upgrade-sheet');
      assert.equal(resTreatment.experimentVariant, 'upgrade_sheet');
    });

    it('falls back to control for journeys without A/B mapping', () => {
      const res = resolveJourneyVariant('unknown-journey', { userId: 'u1' }, mockAdapter);
      assert.equal(res.resolvedVariant, 'control');
      assert.equal(res.inExperiment, false);
    });
  });

  describe('createABFlowSession - End-to-End Flow Testing', () => {
    it('tests Classic Auth Flow (Control) with exposure and completion tracking', () => {
      mockAdapter.overrideUserVariant('user_control_1', 'exp_auth_v2', 'control');

      const session = createABFlowSession({
        journey: 'auth',
        user: { userId: 'user_control_1' },
        adapter: mockAdapter,
      });

      // 1. Verify Exposure was reported automatically upon session start
      const exposures = mockAdapter.getExposures({ experimentName: 'exp_auth_v2' });
      assert.equal(exposures.length, 1);
      assert.equal(exposures[0].variant, 'control');
      assert.equal(exposures[0].user?.userId, 'user_control_1');

      // 2. Verify Flow Started event
      const startEvents = mockAdapter.getEvents({ eventName: 'auth_flow_started' });
      assert.equal(startEvents.length, 1);
      assert.equal(startEvents[0].metadata?.variant, 'control');

      // 3. Step through flow: Select password authentication
      let snapshot = session.getSnapshot();
      assert.equal(snapshot.currentStepId, 'welcome');

      // Advance from welcome by selecting password auth
      session.next({ authMethod: 'password' });

      // Inside subflow passwordAuth
      snapshot = session.getSnapshot();
      assert.equal(snapshot.currentStepId, 'enterEmail');
      assert.equal(snapshot.subflowDepth, 1);

      // Enter email
      session.next({ email: 'alice@example.com' });
      snapshot = session.getSnapshot();
      assert.equal(snapshot.currentStepId, 'enterPassword');

      // Enter password -> Existing User branch -> enters existingUser subflow
      session.next({
        password: 'secret',
        isExistingUser: true,
        firstName: 'Alice',
      });

      snapshot = session.getSnapshot();
      // Should branch to existingUser subflow -> welcomeBackGuard
      assert.equal(snapshot.currentStepId, 'welcomeBackGuard');

      // Advance from guard to authenticatedHome
      session.next();
      snapshot = session.getSnapshot();
      assert.equal(snapshot.currentStepId, 'authenticatedHome');
      assert.equal(snapshot.isLastStep, true);

      // Complete the journey
      session.complete({ success: true, user: 'Alice' });

      // 4. Verify Flow Completed event was reported with payload
      const completionEvents = mockAdapter.getEvents({ eventName: 'auth_flow_completed' });
      assert.equal(completionEvents.length, 1);
      assert.equal(completionEvents[0].metadata?.variant, 'control');
      assert.deepEqual(completionEvents[0].metadata?.result, { success: true, user: 'Alice' });
      assert.equal(completionEvents[0].user?.userId, 'user_control_1');
    });

    it('tests Auth Flow with Upgrade Sheet (Treatment Variant)', () => {
      mockAdapter.overrideUserVariant('user_treatment_1', 'exp_auth_v2', 'upgrade_sheet');

      const session = createABFlowSession({
        journey: 'auth',
        user: { userId: 'user_treatment_1' },
        adapter: mockAdapter,
      });

      // 1. Verify Exposure was reported for treatment variant
      assert.equal(session.resolved.resolvedVariant, 'auth-with-upgrade-sheet');
      const exposures = mockAdapter.getExposures({ experimentName: 'exp_auth_v2' });
      assert.equal(exposures.length, 1);
      assert.equal(exposures[0].variant, 'upgrade_sheet');

      // 2. Select OTP auth
      session.next({ authMethod: 'otp' });
      assert.equal(session.getSnapshot().currentStepId, 'enterEmail');

      // Enter email
      session.next({ email: 'newuser@example.com' });
      assert.equal(session.getSnapshot().currentStepId, 'enterOtp');

      // Enter OTP -> New User branch -> enters registration-with-upgrade subflow
      session.next({ otp: '123456', isExistingUser: false });

      // In registration subflow
      assert.equal(session.getSnapshot().currentStepId, 'enterName');
      session.next({ name: 'Bob Smith' });

      assert.equal(session.getSnapshot().currentStepId, 'updateEmail');
      session.next({ email: 'bob@example.com' });

      // In treatment variant: MUST hit upgradeSheet screen!
      assert.equal(session.getSnapshot().currentStepId, 'upgradeSheet');

      // User interacts with upgrade sheet and continues
      session.next({ upgradedToPro: true });

      // Reaches authenticatedHome
      assert.equal(session.getSnapshot().currentStepId, 'authenticatedHome');

      // Complete
      session.complete({ userId: 'bob_123', plan: 'pro' });

      const completionEvents = mockAdapter.getEvents({ eventName: 'auth_flow_completed' });
      assert.equal(completionEvents.length, 1);
      assert.equal(completionEvents[0].metadata?.variant, 'auth-with-upgrade-sheet');
      assert.deepEqual(completionEvents[0].metadata?.result, {
        userId: 'bob_123',
        plan: 'pro',
      });
    });

    it('tests Flow Cancellation logging', () => {
      const session = createABFlowSession({
        journey: 'auth',
        user: { userId: 'user_abandon_1' },
        adapter: mockAdapter,
      });

      // Start on welcome step and cancel
      assert.equal(session.getSnapshot().currentStepId, 'welcome');
      session.cancel();

      assert.equal(session.getSnapshot().isCancelled, true);

      const cancelEvents = mockAdapter.getEvents({ eventName: 'auth_flow_cancelled' });
      assert.equal(cancelEvents.length, 1);
      assert.equal(cancelEvents[0].metadata?.lastStepId, 'welcome');
      assert.equal(cancelEvents[0].user?.userId, 'user_abandon_1');
    });

    it('tests Sticker Workflow: Quick-Smash bypasses effects subflow', () => {
      // 1. Control variant: selectPhoto -> chooseSticker -> effects subflow -> exportReview
      const sessionControl = createABFlowSession({
        journey: 'sticker-workflow',
        forceVariant: 'control',
        adapter: mockAdapter,
      });

      assert.equal(sessionControl.getSnapshot().currentStepId, 'selectPhoto');
      sessionControl.next({ photoUri: 'photo.jpg' });
      assert.equal(sessionControl.getSnapshot().currentStepId, 'chooseSticker');
      sessionControl.next({ stickerId: 'star' });
      // In control: enters filter effects subflow
      assert.equal(sessionControl.getSnapshot().currentStepId, 'tuneFilter');
      sessionControl.next({ filter: 'vintage' });
      assert.equal(sessionControl.getSnapshot().currentStepId, 'exportReview');
      sessionControl.complete({ exported: true });

      // 2. Quick-Smash variant: selectPhoto -> chooseSticker -> exportReview (bypasses effects!)
      mockAdapter.overrideVariant('exp_sticker_editor', 'quick_smash');
      const sessionQuick = createABFlowSession({
        journey: 'sticker-workflow',
        adapter: mockAdapter,
      });

      assert.equal(sessionQuick.resolved.resolvedVariant, 'quick-smash');
      assert.equal(sessionQuick.getSnapshot().currentStepId, 'selectPhoto');
      sessionQuick.next({ photoUri: 'photo.jpg' });
      assert.equal(sessionQuick.getSnapshot().currentStepId, 'chooseSticker');
      // In quick-smash: goes directly to exportReview!
      sessionQuick.next({ stickerId: 'rocket' });
      assert.equal(sessionQuick.getSnapshot().currentStepId, 'exportReview');
      sessionQuick.complete({ exported: true });

      // Verify completion events
      const completions = mockAdapter.getEvents({ eventName: 'sticker_flow_completed' });
      assert.equal(completions.length, 2);
      assert.equal(completions[0].metadata?.variant, 'control');
      assert.equal(completions[1].metadata?.variant, 'quick-smash');
    });
  });
});
