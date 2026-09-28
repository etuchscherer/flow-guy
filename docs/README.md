# Flow Orchestration & A/B Testing Documentation Hub

Welcome to the documentation suite for the **Flow Orchestration Engine** and **A/B Experimentation Adapter Layer**.

This modular architecture allows mobile and web applications to build complex, multi-step screen flows and state machines that are **100% decoupled** from specific A/B testing vendors (like Statsig, LaunchDarkly, or Optimizely) and navigation routers.

---

## 📚 Documentation Guides

| Guide | Description |
| :--- | :--- |
| 🏛️ **[Architecture Guide](./ARCHITECTURE.md)** | High-level system design, 4-layer separation of concerns, telemetry pipeline, subflow execution model, and sequence diagrams. |
| 🚀 **[Setup & Integration Guide](./SETUP_GUIDE.md)** | Step-by-step instructions for copying or integrating the flow engine into your project, defining your first journey, and mounting in React/Expo. |
| 📖 **[API Reference](./API_REFERENCE.md)** | Comprehensive API documentation for `defineFlow`, step types (`screen`, `action`, `subflow`), dynamic transitions, React hooks (`useFlow`), and the A/B adapter layer (`MockABAdapter`, `StatsigABAdapter`). |
| 🗺️ **[Flow Diagrams & State Machines](./flows.md)** | Auto-generated Markdown documentation containing Mermaid flowcharts for all registered application journeys and variants. |

---

## ⚡ Quick Start: 30-Second Example

### 1. Define a Context & Flow
```typescript
import { defineFlow } from '@/flows';

interface OnboardingContext {
  userName?: string;
}

export const onboardingFlow = defineFlow<OnboardingContext>({
  id: 'onboarding',
  initial: 'welcome',
  initialContext: {},
  steps: {
    welcome: {
      type: 'screen',
      title: 'Welcome Screen',
      component: WelcomeScreen,
      next: 'complete',
    },
    complete: {
      type: 'screen',
      title: 'Setup Complete',
      component: SuccessScreen,
      next: null, // Finishes flow
    },
  },
});
```

### 2. Use Inside Screen Components
```tsx
import { useFlow } from '@/flows';

export function WelcomeScreen() {
  const { updateContext, next } = useFlow<OnboardingContext>();

  return (
    <Button
      title="Continue"
      onPress={() => {
        updateContext({ userName: 'Alice' });
        next();
      }}
    />
  );
}
```

### 3. Render Declaratively
```tsx
import { FlowRenderer } from '@/flows';
import { onboardingFlow } from './onboardingFlow';

export default function Screen() {
  return (
    <FlowRenderer
      flow={onboardingFlow}
      onComplete={(context) => console.log('Done!', context)}
    />
  );
}
```

---

## 🛠️ Developer Tooling & Interactive Visualizer

Run the visualizer compiler to inspect your flows, compare A/B variants, and explore visual diffs in your browser:

```bash
# Compile and automatically launch the visualizer workbench
npm run flows:viz:open
```

- 🟩 **Green**: Steps added in experiment variants.
- 🟧 **Amber**: Steps with altered transition paths.
- 🟥 **Red Dashed**: Steps bypassed or skipped in variants.
