import { FlowEngine, type FlowEngineOptions } from '../core/engine';
import type { FlowLifecycleEvent, FlowSnapshot, StepId } from '../core/types';
import { getActiveABAdapter } from './provider';
import { journeyABRegistry, resolveJourneyVariant } from './registry';
import type { ABAdapter, ExperimentUser, ResolvedJourneyVariant } from './types';

export interface ABFlowSessionOptions<TContext = any>
  extends Omit<FlowEngineOptions<TContext>, 'journey' | 'variant'> {
  journey: string;
  user?: ExperimentUser;
  adapter?: ABAdapter;
  /** Explicit variant override; if provided, bypasses A/B resolution */
  forceVariant?: string;
  /** Whether to automatically log exposure on session initialization (default: true) */
  autoLogExposure?: boolean;
  /** Whether to log step_enter events to analytics (default: false) */
  trackStepViews?: boolean;
}

export interface ABFlowSession<TContext = any> {
  engine: FlowEngine<TContext>;
  resolved: ResolvedJourneyVariant;
  adapter: ABAdapter;
  user?: ExperimentUser;

  // State inspection
  getSnapshot(): FlowSnapshot<TContext>;
  getContext(): TContext;
  updateContext(updater: Partial<TContext> | ((prev: TContext) => Partial<TContext>)): void;

  // Transitions
  next(payload?: any): void;
  back(): void;
  goTo(stepId: StepId, payload?: any): void;
  send(event: string, payload?: any): void;
  complete(result?: any): void;
  cancel(): void;
  reset(): void;

  // Explicit Exposure Logging
  logExposure(): void;
}

/**
 * Creates an A/B managed Flow session.
 * Connects the FlowEngine to an A/B Adapter to automatically:
 * 1. Resolve experiment configuration & variant for the user
 * 2. Report exposure to the A/B testing provider
 * 3. Log flow lifecycle events (started, completed, cancelled)
 */
export function createABFlowSession<TContext = any>(
  options: ABFlowSessionOptions<TContext>
): ABFlowSession<TContext> {
  const adapter = options.adapter ?? getActiveABAdapter();
  const user = options.user;
  const mapping = journeyABRegistry.get(options.journey);

  // 1. Resolve variant
  let resolved: ResolvedJourneyVariant;
  if (options.forceVariant) {
    resolved = {
      journeyId: options.journey,
      experimentName: mapping?.experimentName,
      experimentVariant: options.forceVariant,
      resolvedVariant: options.forceVariant,
      inExperiment: true,
      user,
    };
  } else {
    resolved = resolveJourneyVariant(options.journey, user, adapter);
  }

  const shouldAutoLogExposure =
    options.autoLogExposure ?? mapping?.autoLogExposure ?? true;

  const logExposure = () => {
    if (resolved.experimentName && resolved.experimentVariant) {
      adapter.logExposure(
        resolved.experimentName,
        resolved.experimentVariant,
        user,
        {
          journeyId: options.journey,
          resolvedVariant: resolved.resolvedVariant,
        }
      );
    }
  };

  // 2. Setup lifecycle event forwarding to A/B engine
  const startedEventName =
    mapping?.events?.started ?? `${options.journey}_started`;
  const completedEventName =
    mapping?.events?.completed ?? `${options.journey}_completed`;
  const cancelledEventName =
    mapping?.events?.cancelled ?? `${options.journey}_cancelled`;

  const handleLifecycleEvent = (event: FlowLifecycleEvent<TContext>) => {
    // Also notify any custom user observer
    options.onLifecycleEvent?.(event);

    switch (event.type) {
      case 'flow_started': {
        adapter.logEvent(
          startedEventName,
          undefined,
          {
            journeyId: options.journey,
            variant: resolved.resolvedVariant,
            experimentName: resolved.experimentName,
            initialStepId: event.initialStepId,
          },
          user
        );
        break;
      }
      case 'flow_completed': {
        adapter.logEvent(
          completedEventName,
          undefined,
          {
            journeyId: options.journey,
            variant: resolved.resolvedVariant,
            experimentName: resolved.experimentName,
            result: event.result,
          },
          user
        );
        break;
      }
      case 'flow_cancelled': {
        adapter.logEvent(
          cancelledEventName,
          undefined,
          {
            journeyId: options.journey,
            variant: resolved.resolvedVariant,
            experimentName: resolved.experimentName,
            lastStepId: event.lastStepId,
          },
          user
        );
        break;
      }
      case 'step_enter': {
        if (options.trackStepViews) {
          adapter.logEvent(
            `${options.journey}_step_view`,
            undefined,
            {
              journeyId: options.journey,
              stepId: event.stepId,
              isSubflow: event.isSubflow,
              variant: resolved.resolvedVariant,
            },
            user
          );
        }
        break;
      }
    }
  };

  // 3. Instantiate FlowEngine with the resolved variant
  const engine = new FlowEngine<TContext>({
    journey: options.journey,
    variant: resolved.resolvedVariant,
    initialContext: options.initialContext,
    onComplete: options.onComplete,
    onCancel: options.onCancel,
    onLifecycleEvent: handleLifecycleEvent,
  });

  // 4. Log exposure if configured
  if (shouldAutoLogExposure) {
    logExposure();
  }

  return {
    engine,
    resolved,
    adapter,
    user,
    getSnapshot: () => engine.getSnapshot(),
    getContext: () => engine.getContext(),
    updateContext: (updater) => engine.updateContext(updater),
    next: (payload) => engine.next(payload),
    back: () => engine.back(),
    goTo: (stepId, payload) => engine.goTo(stepId, payload),
    send: (ev, payload) => engine.send(ev, payload),
    complete: (result) => engine.complete(result),
    cancel: () => engine.cancel(),
    reset: () => {
      engine.reset();
      if (shouldAutoLogExposure) {
        logExposure();
      }
    },
    logExposure,
  };
}
