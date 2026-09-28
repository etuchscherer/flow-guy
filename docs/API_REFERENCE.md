# Flow Orchestration & A/B Testing: API Reference

Complete reference for all functions, types, props, and configuration options across the **Core Flow Engine**, **React Bindings**, **A/B Adapter Layer**, and **Visualizer Workbench**.

---

## Table of Contents

1. [Core Flow Engine API](#1-core-flow-engine-api)
   - [`defineFlow`](#defineflow)
   - [`FlowDefinition`](#flowdefinition)
   - [Step Definitions: Screen, Action, Subflow](#step-definitions)
   - [Dynamic Transitions & Resolvers](#dynamic-transitions--resolvers)
   - [`defineJourney` & `FlowRegistry`](#definejourney--flowregistry)
   - [`FlowLifecycleEvent`](#flowlifecycleevent)
2. [React Integration API](#2-react-integration-api)
   - [`useFlow`](#useflow)
   - [`<FlowRenderer />`](#flowrenderer-)
   - [`<FlowProvider />`](#flowprovider-)
3. [A/B Testing Adapter API](#3-ab-testing-adapter-api)
   - [`ABAdapter` Interface](#abadapter-interface)
   - [`MockABAdapter`](#mockabadapter)
   - [`StatsigABAdapter`](#statsigabadapter)
   - [`journeyABRegistry`](#journeyabregistry)
   - [`createABFlowSession`](#createabflowsession)
   - [`useABJourney`](#useabjourney)
   - [`<ABFlowRenderer />`](#abflowrenderer-)
4. [Visualizer & Diff API](#4-visualizer--diff-api)
   - [`computeJourneyDiff`](#computejourneydiff)
   - [`journeyToMermaid` & `journeyToDiffMermaid`](#journeytomermaid--journeytodiffmermaid)
   - [CLI Commands](#cli-commands)

---

## 1. Core Flow Engine API

```typescript
import { defineFlow, defineJourney, registry } from '@/flows';
```

### `defineFlow`

Factory function to create a strongly typed `FlowDefinition`.

```typescript
function defineFlow<TContext = any>(config: FlowDefinition<TContext>): FlowDefinition<TContext>;
```

#### Example
```typescript
interface RegistrationContext {
  email: string;
  isVerified?: boolean;
}

export const registrationFlow = defineFlow<RegistrationContext>({
  id: 'user-registration',
  name: 'User Registration',
  initial: 'enterEmail',
  initialContext: { email: '' },
  steps: {
    enterEmail: {
      type: 'screen',
      title: 'Enter Email',
      component: EnterEmailScreen,
      next: 'verifyEmail',
    },
    verifyEmail: {
      type: 'screen',
      title: 'Verify Email',
      component: VerifyEmailScreen,
      next: null, // Finishes flow
    },
  },
  onComplete: (context) => console.log('Registration finished', context),
  onCancel: (context) => console.log('Registration aborted', context),
});
```

---

### `FlowDefinition`

Configuration object representing a complete state machine graph.

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for this flow. |
| `name` | `string?` | Human-readable name for logging and documentation. |
| `description` | `string?` | Description of the flow's purpose. |
| `initial` | `StepId` | The starting step ID of the flow. |
| `steps` | `Record<StepId, StepDefinition<TContext>>` | Dictionary of step definitions keyed by step ID. |
| `initialContext` | `TContext \| (() => TContext)?` | Default initial context object or factory function. |
| `onComplete` | `((context: TContext, result?: any) => void)?` | Callback invoked when the flow finishes. |
| `onCancel` | `((context: TContext) => void)?` | Callback invoked when the flow is cancelled. |

---

### Step Definitions

There are three types of steps:

#### 1. `ScreenStepDefinition` (`type: 'screen'`)
Represents an interactive UI screen.

```typescript
interface ScreenStepDefinition<TContext = any, TPayload = any> {
  type?: 'screen';
  title?: string;
  description?: string;
  component?: React.ComponentType<any>;
  next?: TransitionTarget<TContext, TPayload>;
  back?: StepId | ((context: TContext) => StepId | null);
  on?: Record<string, TransitionTarget<TContext, any>>;
  onEnter?: (context: TContext) => void | Partial<TContext>;
  onExit?: (context: TContext) => void;
  decisionLabel?: string;
  branches?: BranchDefinition[];
}
```

#### 2. `ActionStepDefinition` (`type: 'action'`)
A headless step for validation, decision routing, or async operations without rendering UI. The engine automatically evaluates `next` immediately upon entry.

```typescript
interface ActionStepDefinition<TContext = any> {
  type: 'action';
  title?: string;
  description?: string;
  next: TransitionTarget<TContext, any>;
  onEnter?: (context: TContext) => void | Partial<TContext>;
  onExit?: (context: TContext) => void;
  decisionLabel?: string;
  branches?: BranchDefinition[];
}
```

#### 3. `SubflowStepDefinition` (`type: 'subflow'`)
Embeds a child flow or registered Journey as a modular subflow.

```typescript
interface SubflowStepDefinition<TContext = any, TSubContext = any, TResult = any> {
  type: 'subflow';
  title?: string;
  description?: string;
  subflow: FlowDefinition<TSubContext> | string; // FlowDefinition or registered Journey ID
  variant?: string; // If journey ID, specifies variant (defaults to 'control')
  mapContextToSubflow?: (parentContext: TContext) => TSubContext;
  onComplete: (parentContext: TContext, subflowResult: TResult) => TransitionTarget<TContext, TResult>;
  onCancel?: (parentContext: TContext) => TransitionTarget<TContext, any>;
  back?: StepId | ((context: TContext) => StepId | null);
}
```

---

### Dynamic Transitions & Resolvers

The `next` property can be:
1. `null` or `undefined`: **Terminal step**. Completing this step completes the flow or subflow.
2. `string`: Static Step ID to advance to.
3. `TransitionResolver<TContext, TPayload>`: Function evaluated at runtime.

```typescript
type TransitionResolver<TContext, TPayload> = (
  context: TContext,
  payload?: TPayload
) => StepId | null | undefined;
```

#### Example: Dynamic Branching
```typescript
steps: {
  selectMethod: {
    type: 'screen',
    title: 'Select Auth Method',
    component: SelectMethodScreen,
    next: (context, payload) => {
      if (payload?.method === 'social') return 'socialAuth';
      if (context.isExistingUser) return 'enterPassword';
      return 'registrationSubflow';
    },
    // Optional: documentation hints for Mermaid generation
    decisionLabel: 'Auth Method?',
    branches: [
      { target: 'socialAuth', label: 'Social' },
      { target: 'enterPassword', label: 'Password' },
      { target: 'registrationSubflow', label: 'New User' },
    ],
  },
}
```

---

### `defineJourney` & `FlowRegistry`

A **Journey** defines a business workflow that has a baseline `control` flow and one or more experiment `variants`.

```typescript
import { defineJourney, registry } from '@/flows';

export const authJourney = defineJourney({
  id: 'auth',
  name: 'Authentication Journey',
  description: 'Authentication funnels across all entry points',
  defaultVariant: 'control',
  variants: {
    control: authControlFlow,
    'upgrade-sheet': authWithUpgradeSheetFlow,
    'otp-fast-track': authWithOtpOnlyFlow,
  },
});

// Register into singleton registry
registry.registerJourney(authJourney);
```

#### `FlowRegistry` Methods
- `registry.registerJourney(journey: JourneyDefinition): void`: Registers a multi-variant journey.
- `registry.getJourney(id: string): JourneyDefinition | undefined`: Retrieves journey by ID.
- `registry.resolveFlow(journeyOrFlowId: string, variantKey?: string): FlowDefinition`: Resolves the specific `FlowDefinition` for a journey and variant.
- `registry.getAllJourneys(): JourneyDefinition[]`: Returns all registered journeys.

---

### `FlowLifecycleEvent`

The core state machine emits generic lifecycle events across 5 lifecycle stages:

```typescript
type FlowLifecycleEvent<TContext = any> =
  | { type: 'flow_started'; flowId: string; journeyId?: string; variantId?: string; initialStepId: StepId; context: TContext }
  | { type: 'step_enter'; flowId: string; journeyId?: string; variantId?: string; stepId: StepId; step: StepDefinition<any>; isSubflow: boolean; subflowDepth: number; context: TContext }
  | { type: 'step_exit'; flowId: string; journeyId?: string; variantId?: string; stepId: StepId; context: TContext }
  | { type: 'flow_completed'; flowId: string; journeyId?: string; variantId?: string; result?: any; context: TContext }
  | { type: 'flow_cancelled'; flowId: string; journeyId?: string; variantId?: string; lastStepId: StepId; context: TContext };
```

---

## 2. React Integration API

```typescript
import { useFlow, FlowRenderer, FlowProvider } from '@/flows';
```

### `useFlow`

Hook used inside screen components to interact with the active flow.

```typescript
function useFlow<TContext = any>(): FlowHookResult<TContext>;
```

#### Return Value
```typescript
interface FlowHookResult<TContext> {
  // Active Step Info
  stepId: string;
  step: StepDefinition<TContext>;
  stepTitle: string;
  stepDescription?: string;
  isSubflow: boolean;
  subflowDepth: number;
  subflowPath: string[];

  // Identity
  journeyId?: string;
  variantId?: string;
  flowId: string;

  // Shared State
  context: TContext;
  updateContext: (partial: Partial<TContext> | ((prev: TContext) => Partial<TContext>)) => void;

  // Navigation & Transitions
  next: (payload?: any) => void;
  back: () => void;
  goTo: (stepId: string) => void;
  send: (eventType: string, payload?: any) => void;
  complete: (result?: any) => void;
  cancel: () => void;
  reset: () => void;

  // Status Flags
  isFirstStep: boolean;
  isLastStep: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  result?: any;
  history: string[];
}
```

---

### `<FlowRenderer />`

Declarative React component that renders the current step of a flow.

```tsx
<FlowRenderer<MyContext>
  journey={authJourney}
  variant="control"
  initialContext={{ email: 'user@example.com' }}
  onComplete={(context, result) => {
    // Navigate to dashboard
  }}
  onCancel={(context) => {
    // Dismiss flow modal
  }}
  renderCompleted={({ context, result, reset }) => (
    <MyCustomSuccessScreen onDone={reset} />
  )}
  renderCancelled={({ context, reset }) => (
    <MyCustomExitScreen onRestart={reset} />
  )}
  style={{ flex: 1 }}
/>
```

#### Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `journey` | `JourneyDefinition?` | Journey to render. |
| `variant` | `string?` | Variant key within the journey. |
| `flow` | `FlowDefinition?` | Direct `FlowDefinition` if not using a Journey. |
| `initialContext` | `Partial<TContext>?` | Initial context values to merge into flow defaults. |
| `onComplete` | `(context: TContext, result?: any) => void` | Invoked when the flow finishes. |
| `onCancel` | `(context: TContext) => void` | Invoked when the flow is cancelled. |
| `renderCompleted` | `(props) => ReactNode` | Optional custom UI to render when completed. |
| `renderCancelled` | `(props) => ReactNode` | Optional custom UI to render when cancelled. |
| `style` | `ViewStyle?` | Style applied to root container. |

---

## 3. A/B Testing Adapter API

```typescript
import {
  MockABAdapter,
  StatsigABAdapter,
  journeyABRegistry,
  createABFlowSession,
  useABJourney,
  ABFlowRenderer,
  setGlobalABAdapter,
  getGlobalABAdapter,
} from '@/flows';
```

### `ABAdapter` Interface

The contract that any A/B experimentation vendor must implement:

```typescript
export interface ABAdapter {
  getVariant(
    user: ExperimentUser,
    experimentName: string,
    fallbackVariant: string
  ): Promise<string> | string;

  logExposure(
    user: ExperimentUser,
    experimentName: string,
    variant: string,
    metadata?: Record<string, any>
  ): void;

  logEvent(
    user: ExperimentUser,
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>
  ): void;
}
```

---

### `MockABAdapter`

In-memory implementation with full inspection and test override features.

```typescript
const adapter = new MockABAdapter({
  defaultVariants: {
    exp_auth_v2: 'upsell_sheet',
  },
  userOverrides: {
    'user-vip': { exp_auth_v2: 'control' },
  },
  targetingRules: [
    {
      experimentName: 'exp_auth_v2',
      variant: 'upsell_sheet',
      predicate: (user) => user.custom?.isTierPro === true,
    },
  ],
});
```

#### Methods
- `adapter.setGlobalVariantOverride(experimentName: string, variant: string): void`: Forces all users into this variant.
- `adapter.setUserVariantOverride(userId: string, experimentName: string, variant: string): void`: Overrides for a specific user ID.
- `adapter.clearOverrides(): void`: Clears all overrides.
- `adapter.getExposures(): ExposureRecord[]`: Returns array of all recorded exposures.
- `adapter.getEvents(): EventRecord[]`: Returns array of all recorded metric events.
- `adapter.onExposure(callback: (exposure: ExposureRecord) => void): () => void`: Live listener for exposure events.
- `adapter.onEvent(callback: (event: EventRecord) => void): () => void`: Live listener for metric events.
- `adapter.reset(): void`: Clears exposure and event history.

---

### `StatsigABAdapter`

Production adapter wrapping Statsig client SDK.

```typescript
import { StatsigClient } from '@statsig/js-client';
import { StatsigABAdapter, setGlobalABAdapter } from '@/flows';

const client = new StatsigClient('client-YOUR-KEY', { userID: 'user-123' });
await client.initializeAsync();

const adapter = new StatsigABAdapter(client, {
  eventPrefix: 'flow_',              // Prepends prefix to logged events
  logExposureAutomatically: true,    // Log exposure inside getExperiment call
});

setGlobalABAdapter(adapter);
```

---

### `journeyABRegistry`

Maps flow journeys to remote experiment keys and variant groups.

```typescript
journeyABRegistry.registerExperimentMapping({
  journeyId: 'auth',
  experimentName: 'exp_auth_v2',
  defaultVariant: 'control',
  variants: {
    control: 'control',
    upsell_sheet: 'auth-with-upgrade-sheet',
  },
});
```

---

### `createABFlowSession`

Headless test and programmatic execution runner.

```typescript
const session = await createABFlowSession({
  journeyId: 'auth',
  user: { userID: 'test-user-1' },
  adapter: mockAdapter, // Optional: defaults to global adapter
});

// Programmatic control
session.advance({ password: 'secret' });
session.jumpTo('upgradeSheet');
session.updateContext({ tier: 'pro' });

// State inspection
console.log(session.getSnapshot().currentStepId);
console.log(session.isCompleted());
console.log(session.getVariant());
```

---

### `<ABFlowRenderer />`

High-level React component that evaluates the user's variant, logs exposure, and renders the flow.

```tsx
<ABFlowRenderer
  journeyId="auth"
  user={{ userID: 'u123', email: 'user@example.com' }}
  onComplete={(context, result) => {
    console.log('Flow finished:', context);
  }}
  onCancel={(context) => {
    console.log('Flow cancelled');
  }}
  renderLoading={() => <ActivityIndicator />}
/>
```

---

## 4. Visualizer & Diff API

```typescript
import {
  computeJourneyDiff,
  journeyToMermaid,
  journeyToDiffMermaid,
  generateHtmlVisualizer,
} from '@/flows/viz';
```

### `computeJourneyDiff`

Computes the graph diff between a journey's Control flow and a variant.

```typescript
const diff = computeJourneyDiff(authJourney, 'auth-with-upgrade-sheet');
```

#### Returns `FlowDiffResult`:
```typescript
interface FlowDiffResult {
  journeyId: string;
  variantKey: string;
  controlStepCount: number;
  variantStepCount: number;
  stepCountDelta: number;
  addedSteps: StepDiffItem[];
  bypassedSteps: StepDiffItem[];
  modifiedTransitions: TransitionDiffItem[];
  impactNarrative: string; // e.g. "Introduces 1 new step: 'Upgrade Sheet (Upsell)'."
  tags: string[];          // e.g. ["+1 Step", "Monetization", "Altered Paths"]
}
```

---

### `journeyToMermaid` & `journeyToDiffMermaid`

Generates Mermaid markdown string representing the flow or visual diff.

```typescript
// Single flow diagram
const mermaidText = journeyToMermaid(authJourney, 'control');

// Diff diagram comparing variant vs control with color-coded classes
const diffMermaidText = journeyToDiffMermaid(authJourney, 'auth-with-upgrade-sheet');
```

---

### CLI Commands

```bash
# Compile docs/flows.md and flows-viz/index.html
npm run flows:viz

# Compile and automatically open the visualizer in your browser
npm run flows:viz:open
# or:
npm run flows:viz -- -open
```
