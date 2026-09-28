/// <reference types="node" />
import assert from 'node:assert';
import Module from 'node:module';

// Alias react-native for headless Node execution
const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: any[]) {
  if (request === 'react-native') {
    return require.resolve('react-native-web');
  }
  return origResolve.call(this, request, ...args);
};

async function runTests() {
  console.log('🧪 Starting Flow Engine automated unit tests...\n');

  const { FlowEngine } = await import('../src/flows/core/engine');
  const { registry } = await import('../src/flows/core/registry');
  await import('../src/journeys');

  // Test 1: Journey Discovery and Control Variant
  console.log('Test 1: Journey registration and control variant fallback');
  const authJourney = registry.getJourney('auth');
  assert(authJourney, 'Auth journey should be registered');
  assert(authJourney?.variants.control, 'Control variant must exist');
  console.log('  ✓ Classic Auth journey registered with control variant');

  // Test 2: Password Path -> Existing User with Name (Jane)
  console.log('\nTest 2: Password Path -> Jane (Complete existing user)');
  const engineJane = new FlowEngine<any>({
    journey: 'auth',
    variant: 'control',
  });

  let snap = engineJane.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'welcome', 'Initial step is welcome');
  assert.strictEqual(snap.currentStep.type, 'screen', 'Step type normalized to screen');
  assert(
    'component' in snap.currentStep && snap.currentStep.component,
    'Welcome screen component must be present on currentStep'
  );

  // Select password method
  engineJane.next({ authMethod: 'password' });
  snap = engineJane.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'enterEmail',
    'Should enter passwordAuthSubflow at enterEmail'
  );
  assert.strictEqual(snap.subflowDepth, 1);

  // Fill Jane's credentials
  engineJane.updateContext({
    email: 'jane@example.com',
    isExistingUser: true,
    firstName: 'Jane',
  });
  engineJane.next(); // to enterPassword
  snap = engineJane.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'enterPassword');

  // Submit password in subflow -> completes passwordAuthSubflow -> enters existingUserSubflow
  // existingUserSubflow initial is checkProfile (transient action) which sees firstName: 'Jane'
  // and auto-transitions immediately to welcomeBackGuard!
  engineJane.next();
  snap = engineJane.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'welcomeBackGuard',
    'Jane has first name, so action guard auto-advanced directly to welcomeBackGuard'
  );
  assert.strictEqual(snap.subflowDepth, 1, 'Inside existingUserSubflow');

  // Guard timer completes
  engineJane.next();
  snap = engineJane.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'authenticatedHome',
    'Resumes parent flow at authenticatedHome'
  );
  assert.strictEqual(snap.subflowDepth, 0);

  // Finish journey
  engineJane.next();
  assert.strictEqual(engineJane.getSnapshot().isCompleted, true);
  console.log('  ✓ Jane successfully passed Password auth and 2s guard to Home');

  // Test 3: Password Path -> Existing User Missing Name (No-Name)
  console.log('\nTest 3: Password Path -> No-Name (Existing user needing profile completion)');
  const engineNoName = new FlowEngine<any>({
    journey: 'auth',
    variant: 'control',
  });

  engineNoName.next({ authMethod: 'password' });
  engineNoName.updateContext({
    email: 'noname@example.com',
    isExistingUser: true,
    firstName: '', // Missing first name!
  });
  engineNoName.next(); // to enterPassword
  engineNoName.next(); // submits password -> enters existingUserSubflow
  snap = engineNoName.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'enterFirstName',
    'Missing first name correctly routed to enterFirstNameScreen'
  );

  // User inputs first name
  engineNoName.updateContext({ firstName: 'Alex' });
  engineNoName.next(); // to welcomeBackGuard
  snap = engineNoName.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'welcomeBackGuard');

  // Guard finishes -> authenticatedHome
  engineNoName.next();
  assert.strictEqual(engineNoName.getSnapshot().currentStepId, 'authenticatedHome');
  console.log('  ✓ Missing name correctly intercepted by enterFirstNameScreen before guard');

  // Test 4: Password Path -> New User Registration Subflow
  console.log('\nTest 4: Password Path -> New User Registration Subflow');
  const engineNewUser = new FlowEngine<any>({
    journey: 'auth',
    variant: 'control',
  });

  engineNewUser.next({ authMethod: 'password' });
  engineNewUser.updateContext({
    email: 'newuser@example.com',
    isExistingUser: false, // Brand new user!
  });
  engineNewUser.next(); // to enterPassword
  engineNewUser.next(); // submits password -> routes to registrationSubflow!
  snap = engineNewUser.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'enterName',
    'New user correctly routed to registrationSubflow step 1 (enterName)'
  );

  engineNewUser.updateContext({ firstName: 'Taylor' });
  engineNewUser.next(); // to updateEmail
  snap = engineNewUser.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'updateEmail',
    'Registration step 2: updateEmail'
  );

  engineNewUser.updateContext({ email: 'taylor_updated@example.com' });
  engineNewUser.next(); // finishes registration subflow -> resumes parent at authenticatedHome
  snap = engineNewUser.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'authenticatedHome');
  assert.strictEqual(snap.context.email, 'taylor_updated@example.com');
  assert.strictEqual(snap.context.firstName, 'Taylor');
  console.log('  ✓ New user successfully traversed registration subflow and updated email');

  // Test 5: Email OTP Path -> Existing User
  console.log('\nTest 5: Email OTP Path -> Existing User (Jane)');
  const engineOtp = new FlowEngine<any>({
    journey: 'auth',
    variant: 'control',
  });

  engineOtp.next({ authMethod: 'otp' });
  snap = engineOtp.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'enterEmail',
    'Enters otpAuthSubflow at enterEmail'
  );

  engineOtp.updateContext({
    email: 'jane@example.com',
    isExistingUser: true,
    firstName: 'Jane',
  });
  engineOtp.next(); // to enterOtp
  snap = engineOtp.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'enterOtp');

  engineOtp.updateContext({ otpCode: '123456' });
  engineOtp.next(); // submits OTP -> enters existingUserSubflow -> auto-guard
  snap = engineOtp.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'welcomeBackGuard');

  engineOtp.next(); // guard finishes -> authenticatedHome
  assert.strictEqual(engineOtp.getSnapshot().currentStepId, 'authenticatedHome');
  console.log('  ✓ Email OTP path verified through async verification to guard');

  // Test 6: Auth with Upgrade Sheet Variant Execution
  console.log('\nTest 6: Variant Execution -> "auth-with-upgrade-sheet"');
  const engineUpgrade = new FlowEngine<any>({
    journey: 'auth',
    variant: 'auth-with-upgrade-sheet',
  });
  snap = engineUpgrade.getSnapshot();
  assert.strictEqual(snap.variantId, 'auth-with-upgrade-sheet');
  assert.strictEqual(snap.currentStepId, 'welcome');

  // Choose password auth
  engineUpgrade.next({ authMethod: 'password' });
  assert.strictEqual(engineUpgrade.getSnapshot().currentStepId, 'enterEmail');

  // New user credentials
  engineUpgrade.updateContext({
    email: 'creator@example.com',
    isExistingUser: false,
  });
  engineUpgrade.next(); // to enterPassword
  engineUpgrade.next(); // submits password -> enters registrationWithUpgradeSubflow!

  snap = engineUpgrade.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'enterName',
    'New user routes to alternate registration subflow step 1'
  );
  engineUpgrade.updateContext({ firstName: 'Jordan' });
  engineUpgrade.next(); // to updateEmail

  assert.strictEqual(engineUpgrade.getSnapshot().currentStepId, 'updateEmail');
  engineUpgrade.next(); // to upgradeSheet!

  snap = engineUpgrade.getSnapshot();
  assert.strictEqual(
    snap.currentStepId,
    'upgradeSheet',
    'Alternate subflow routes to upgradeSheet bottom sheet step'
  );

  // User accepts Pro upgrade
  engineUpgrade.updateContext({
    tier: 'pro',
    upgradedAtRegistration: true,
    selectedPlan: 'annual',
  });
  engineUpgrade.next(); // completes subflow -> authenticatedHome

  snap = engineUpgrade.getSnapshot();
  assert.strictEqual(snap.currentStepId, 'authenticatedHome');
  assert.strictEqual(snap.context.tier, 'pro');
  assert.strictEqual(snap.context.upgradedAtRegistration, true);
  assert.strictEqual(snap.context.selectedPlan, 'annual');
  console.log('  ✓ auth-with-upgrade-sheet variant traversed registration with upgrade sheet to Pro status');


  // Test 7: Sticker Smash Workflow Journey
  console.log('\nTest 7: Sticker Smash Workflow Journey');
  const engineSticker = new FlowEngine({
    journey: 'sticker-workflow',
    variant: 'control',
  });
  assert.strictEqual(engineSticker.getSnapshot().currentStepId, 'selectPhoto');
  engineSticker.next(); // to chooseSticker
  assert.strictEqual(engineSticker.getSnapshot().currentStepId, 'chooseSticker');
  engineSticker.next(); // enters effects subflow
  assert.strictEqual(engineSticker.getSnapshot().currentStepId, 'tuneFilter');
  assert.strictEqual(engineSticker.getSnapshot().subflowDepth, 1);
  engineSticker.next(); // exits effects subflow to exportReview
  assert.strictEqual(engineSticker.getSnapshot().currentStepId, 'exportReview');
  assert.strictEqual(engineSticker.getSnapshot().subflowDepth, 0);
  engineSticker.next(); // complete
  assert.strictEqual(engineSticker.getSnapshot().isCompleted, true);
  console.log('  ✓ Sticker Smash Workflow executed cleanly through subflow');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (7/7 suites)\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
