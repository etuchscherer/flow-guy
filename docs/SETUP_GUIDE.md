# Flow Orchestration & A/B Testing: Setup & Integration Guide

This guide walks through integrating the **Flow Orchestration Engine** and **A/B Experimentation Adapter Layer** into your React Native, Expo, or React application from scratch.

---

## Table of Contents

1. [Prerequisites & Dependencies](#1-prerequisites--dependencies)
2. [Directory Layout](#2-directory-layout)
3. [Step 1: Copy the Flow Module](#step-1-copy-the-flow-module)
4. [Step 2: Define Context & Screen Components](#step-2-define-context--screen-components)
5. [Step 3: Define Your First Flow](#step-3-define-your-first-flow)
6. [Step 4: Create a Journey with Variants](#step-4-create-a-journey-with-variants)
7. [Step 5: Render in React with `<FlowRenderer />`](#step-5-render-in-react-with-flowrenderer-)
8. [Step 6: Configure the A/B Testing Layer](#step-6-configure-the-ab-testing-layer)
9. [Step 7: Render with A/B Variant Assignment](#step-7-render-with-ab-variant-assignment)
10. [Step 8: Write Headless Automated Tests](#step-8-write-headless-automated-tests)
11. [Step 9: Setup Flow Visualization & Diff Tooling](#step-9-setup-flow-visualization--diff-tooling)

---

## 1. Prerequisites & Dependencies

The flow engine itself has **zero required runtime dependencies** beyond React.

```json
{
  "dependencies": {
    "react": ">=18.0.0",
    "react-native": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Optional dependencies for production A/B testing:
- `@statsig/js-client` or `@statsig/react-native-bindings` (if using Statsig).
- `tsx` (for running the headless CLI visualizer in Node).

---

## 2. Directory Layout

We recommend separating the generic flow engine framework from application-specific journeys:

```text
src/
├── flows/             # Flow Framework (copy from StickerSmash/src/flows)
│   ├── core/          # State machine engine, registry, types
│   ├── ab/            # A/B adapter layer (Mock + Statsig)
│   ├── react/         # React hooks and FlowRenderer
│   ├── viz/           # Mermaid & visual diff generator
│   └── index.ts
│
└── journeys/          # Your application flows
    ├── onboarding/    # Example onboarding journey
    │   ├── control.ts
    │   ├── variants/
    │   ├── screens/
    │   ├── types.ts
    │   └── index.ts
    └── index.ts       # Central import hub to register all journeys
```

---

## Step 1: Copy the Flow Module

Copy the entire [`src/flows/`](file:///Users/erictuchscherer/apps/StickerSmash/src/flows) directory into your project's `src/flows/` folder.

Verify your TypeScript path aliases in `tsconfig.json` (optional but recommended):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/flows": ["src/flows"],
      "@/flows/*": ["src/flows/*"]
    }
  }
}
```

---

## Step 2: Define Context & Screen Components

Each flow shares a typed **context object** across all steps.

### 1. Define the Context Type
Create `src/journeys/onboarding/types.ts`:

```typescript
export interface OnboardingContext {
  userName?: string;
  email?: string;
  notificationOptIn?: boolean;
  tier?: 'free' | 'pro';
}
```

### 2. Create Screen Components
Each screen uses the `useFlow<TContext>()` hook to read state, update context, and advance navigation.

Create `src/journeys/onboarding/screens/NameScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useFlow } from '@/flows';
import type { OnboardingContext } from '../types';

export function NameScreen() {
  const { context, updateContext, next, back, isFirstStep } = useFlow<OnboardingContext>();
  const [name, setName] = useState(context.userName ?? '');

  const handleNext = () => {
    updateContext({ userName: name });
    next(); // Advances to the step configured in the flow definition
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your name?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter full name"
        value={name}
        onChangeText={setName}
      />
      <View style={styles.buttonRow}>
        {!isFirstStep && (
          <TouchableOpacity style={styles.backButton} onPress={back}>
            <Text>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  backButton: { padding: 12, borderRadius: 8, backgroundColor: '#eee' },
  button: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
```

Create `src/journeys/onboarding/screens/NotificationScreen.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFlow } from '@/flows';
import type { OnboardingContext } from '../types';

export function NotificationScreen() {
  const { updateContext, next } = useFlow<OnboardingContext>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable Push Notifications?</Text>
      <Text style={styles.subtitle}>Stay updated with important announcements.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          updateContext({ notificationOptIn: true });
          next();
        }}
      >
        <Text style={styles.buttonText}>Yes, Enable</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          updateContext({ notificationOptIn: false });
          next();
        }}
      >
        <Text style={styles.skipText}>Maybe Later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  button: { padding: 14, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  skipButton: { padding: 14, alignItems: 'center' },
  skipText: { color: '#666' },
});
```

---

## Step 3: Define Your First Flow

Use `defineFlow` to declare your state machine:
- Initial step.
- Step registry (`screen`, `action`, or `subflow`).
- Static or dynamic transitions (`next`).

Create `src/journeys/onboarding/control.ts`:

```typescript
import { defineFlow } from '@/flows';
import type { OnboardingContext } from './types';
import { NameScreen } from './screens/NameScreen';
import { NotificationScreen } from './screens/NotificationScreen';

export const onboardingControlFlow = defineFlow<OnboardingContext>({
  id: 'onboarding-control',
  name: 'Standard Onboarding (Control)',
  description: 'Two-step onboarding: Name capture followed by notification prompt.',
  initial: 'name',
  initialContext: {
    userName: '',
    notificationOptIn: false,
    tier: 'free',
  },
  steps: {
    name: {
      type: 'screen',
      title: 'Enter Name',
      component: NameScreen,
      next: 'notifications',
    },
    notifications: {
      type: 'screen',
      title: 'Notification Opt-In',
      component: NotificationScreen,
      next: null, // Terminal step: completing this finishes the flow
    },
  },
});
```

---

## Step 4: Create a Journey with Variants

A **Journey** bundles a baseline `control` flow and one or more experiment **variants**.

Create an expedited variant that bypasses the notification screen in `src/journeys/onboarding/variants/fast-track.ts`:

```typescript
import { defineFlow } from '@/flows';
import type { OnboardingContext } from '../types';
import { onboardingControlFlow } from '../control';

export const onboardingFastTrackFlow = defineFlow<OnboardingContext>({
  ...onboardingControlFlow,
  id: 'onboarding-fast-track',
  name: 'Fast-Track Onboarding (Experiment Variant)',
  description: 'One-step expedited onboarding bypassing notification opt-in.',
  steps: {
    ...onboardingControlFlow.steps,
    name: {
      ...onboardingControlFlow.steps.name,
      next: null, // Completes immediately after name!
    },
  },
});
```

Now register the journey in `src/journeys/onboarding/index.ts`:

```typescript
import { registry, defineJourney } from '@/flows';
import { onboardingControlFlow } from './control';
import { onboardingFastTrackFlow } from './variants/fast-track';

export const onboardingJourney = defineJourney({
  id: 'onboarding',
  name: 'User Onboarding Journey',
  description: 'First-time user onboarding funnel.',
  defaultVariant: 'control',
  variants: {
    control: onboardingControlFlow,
    'fast-track': onboardingFastTrackFlow,
  },
});

// Register into the global flow registry
registry.registerJourney(onboardingJourney);
```

Ensure this file is imported at app launch (e.g., in `src/journeys/index.ts` or `src/app/_layout.tsx`).

---

## Step 5: Render in React with `<FlowRenderer />`

Render any flow or journey variant directly:

```tsx
import React from 'react';
import { FlowRenderer } from '@/flows';
import { onboardingJourney } from '@/journeys/onboarding';

export default function OnboardingScreen() {
  return (
    <FlowRenderer
      journey={onboardingJourney}
      variant="control" // Or omit to use journey default
      onComplete={(context) => {
        console.log('User finished onboarding:', context);
        // router.replace('/home');
      }}
      onCancel={() => {
        console.log('User cancelled onboarding');
        // router.back();
      }}
    />
  );
}
```

---

## Step 6: Configure the A/B Testing Layer

The A/B layer lets you automatically resolve which variant a user gets without modifying flow components.

### 1. Map Journey to Experiment
Register the mapping between your journey and remote experiment in `src/flows/ab/registry.ts` (or app initialization):

```typescript
import { journeyABRegistry } from '@/flows';

journeyABRegistry.registerExperimentMapping({
  journeyId: 'onboarding',
  experimentName: 'exp_onboarding_speed_v1',
  defaultVariant: 'control',
  variants: {
    control: 'control',
    speedy: 'fast-track', // Maps Statsig group 'speedy' -> local variant 'fast-track'
  },
});
```

### 2. Choose Your Adapter

#### Option A: In-Memory Mock Adapter (Local Development & Tests)
Use `MockABAdapter` to test variants locally or simulate different user segments:

```typescript
import { setGlobalABAdapter, MockABAdapter } from '@/flows';

const mockAdapter = new MockABAdapter({
  defaultVariants: {
    exp_onboarding_speed_v1: 'speedy',
  },
  // Optionally define user-level overrides
  userOverrides: {
    'user-vip': { exp_onboarding_speed_v1: 'speedy' },
  },
});

setGlobalABAdapter(mockAdapter);
```

#### Option B: Production Statsig Adapter
When ready for production, plug in Statsig:

```typescript
import { StatsigClient } from '@statsig/js-client';
import { setGlobalABAdapter, StatsigABAdapter } from '@/flows';

const statsigClient = new StatsigClient(
  'client-YOUR-STATSIG-SDK-KEY',
  { userID: 'user-123' }
);
await statsigClient.initializeAsync();

// Wrap with StatsigABAdapter and set as global
setGlobalABAdapter(new StatsigABAdapter(statsigClient));
```

---

## Step 7: Render with A/B Variant Assignment

Use `<ABFlowRenderer />` to automatically:
1. Evaluate the user's variant via the active `ABAdapter`.
2. Log experiment exposure to Statsig.
3. Automatically stream lifecycle events (`flow_step_view`, `flow_completed`, `flow_cancelled`).

```tsx
import React from 'react';
import { ABFlowRenderer } from '@/flows';

export default function ExperimentOnboardingScreen() {
  const currentUser = {
    userID: 'user_456',
    email: 'alex@example.com',
    custom: { isNewUser: true },
  };

  return (
    <ABFlowRenderer
      journeyId="onboarding"
      user={currentUser}
      onComplete={(context, result) => {
        console.log('Onboarding complete:', context);
      }}
      onCancel={(context) => {
        console.log('Onboarding cancelled');
      }}
    />
  );
}
```

---

## Step 8: Write Headless Automated Tests

You can test 100% of your flows headlessly without React Native rendering overhead.

Create `tests/onboarding-flow.test.ts`:

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MockABAdapter, createABFlowSession } from '@/flows';
import '@/journeys/onboarding'; // Registers the journey

describe('Onboarding Flow A/B Tests', () => {
  test('Control user traverses Name -> Notifications -> Complete', async () => {
    const adapter = new MockABAdapter({
      defaultVariants: { exp_onboarding_speed_v1: 'control' },
    });

    const session = await createABFlowSession({
      journeyId: 'onboarding',
      user: { userID: 'user-ctrl' },
      adapter,
    });

    // Step 1: Name screen
    assert.equal(session.getSnapshot().currentStepId, 'name');
    session.updateContext({ userName: 'Eric' });
    session.advance();

    // Step 2: Notifications screen
    assert.equal(session.getSnapshot().currentStepId, 'notifications');
    session.advance();

    // Completed
    assert.equal(session.isCompleted(), true);
    assert.equal(session.getContext().userName, 'Eric');

    // Telemetry assertions
    const exposures = adapter.getExposures();
    assert.equal(exposures.length, 1);
    assert.equal(exposures[0].experimentName, 'exp_onboarding_speed_v1');
    assert.equal(exposures[0].variant, 'control');

    const completionEvents = adapter.getEvents().filter((e) => e.eventName === 'flow_completed');
    assert.equal(completionEvents.length, 1);
  });

  test('Fast-track user bypasses Notifications step', async () => {
    const adapter = new MockABAdapter({
      defaultVariants: { exp_onboarding_speed_v1: 'speedy' },
    });

    const session = await createABFlowSession({
      journeyId: 'onboarding',
      user: { userID: 'user-fast' },
      adapter,
    });

    assert.equal(session.getSnapshot().currentStepId, 'name');
    session.advance();

    // Directly completes, skipping notifications!
    assert.equal(session.isCompleted(), true);
  });
});
```

Run tests via:
```bash
npx tsx --test tests/**/*.test.ts
```

---

## Step 9: Setup Flow Visualization & Diff Tooling

The visualization tool compiles Markdown docs and generates an interactive HTML workbench.

### 1. Add NPM Scripts to `package.json`
```json
{
  "scripts": {
    "flows:viz": "npx tsx scripts/flows-viz.ts",
    "flows:viz:open": "npx tsx scripts/flows-viz.ts -open"
  }
}
```

### 2. Run the Compiler
```bash
npm run flows:viz:open
```

This generates:
1. `docs/flows.md`: Markdown document with Mermaid flowcharts for every journey.
2. `flows-viz/index.html`: Interactive web workbench with:
   - Left Variant Matrix with toggleable options and impact tags.
   - Flow diffing highlighting:
     - 🟩 **Green**: Added steps.
     - 🟧 **Amber**: Path / transition alterations.
     - 🟥 **Red Dashed**: Bypassed / skipped steps.
   - Side-by-side split screen view.
   - Live impact summary inspector.
