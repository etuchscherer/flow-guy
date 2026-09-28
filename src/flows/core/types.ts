import type { ComponentType } from 'react';

export type StepId = string;

/**
 * A transition target can be a static step ID,
 * or a resolver function evaluated against the current context & action payload.
 */
export type TransitionResolver<TContext = any, TPayload = any> = (
  context: TContext,
  payload?: TPayload
) => StepId | null | undefined;

export type TransitionTarget<TContext = any, TPayload = any> =
  | StepId
  | TransitionResolver<TContext, TPayload>
  | null;

export type StepType = 'screen' | 'subflow' | 'action';

export interface BranchDefinition {
  target: StepId;
  label?: string;
  condition?: string;
}

export interface BaseStepDefinition<TContext = any> {
  id?: StepId;
  title?: string;
  description?: string;
  decisionLabel?: string;
  branches?: BranchDefinition[];
  onEnter?: (context: TContext) => void | Partial<TContext>;
  onExit?: (context: TContext) => void;
}

export interface ScreenStepDefinition<TContext = any, TPayload = any>
  extends BaseStepDefinition<TContext> {
  type?: 'screen';
  /**
   * Component to render for this step.
   * Can be undefined if handled by an external layout.
   */
  component?: ComponentType<any>;
  /**
   * Default transition when user clicks "next" or calls `flow.next()`.
   * Can be a static StepId or a conditional branching function.
   */
  next?: TransitionTarget<TContext, TPayload>;
  /**
   * Custom back target or function. If omitted, uses historical navigation stack.
   */
  back?: StepId | ((context: TContext) => StepId | null);
  /**
   * Custom event-driven transitions (e.g. `flow.send('SKIP')`).
   */
  on?: Record<string, TransitionTarget<TContext, any>>;
}

export interface SubflowStepDefinition<TContext = any, TSubContext = any, TResult = any>
  extends BaseStepDefinition<TContext> {
  type: 'subflow';
  /**
   * The subflow to execute. Can be a FlowDefinition directly or a journey identifier string.
   */
  subflow: FlowDefinition<TSubContext> | string;
  /**
   * If subflow is a journey identifier, specifies which variant to run (default: 'control').
   */
  variant?: string;
  /**
   * Map parent context to initial subflow context.
   */
  mapContextToSubflow?: (parentContext: TContext) => TSubContext;
  /**
   * Handler when the subflow finishes: updates parent context and returns next step in parent.
   */
  onComplete: (
    parentContext: TContext,
    subflowResult: TResult
  ) => TransitionTarget<TContext, TResult>;
  /**
   * Optional handler if the user cancels inside the subflow.
   */
  onCancel?: (parentContext: TContext) => TransitionTarget<TContext, any>;
  /**
   * Custom back target if going back at the root of subflow.
   */
  back?: StepId | ((context: TContext) => StepId | null);
}

export interface ActionStepDefinition<TContext = any>
  extends BaseStepDefinition<TContext> {
  type: 'action';
  next: TransitionTarget<TContext, any>;
}

export type StepDefinition<TContext = any> =
  | ScreenStepDefinition<TContext>
  | SubflowStepDefinition<TContext>
  | ActionStepDefinition<TContext>;

export interface FlowDefinition<TContext = any> {
  id: string;
  name?: string;
  description?: string;
  initial: StepId;
  steps: Record<StepId, StepDefinition<TContext>>;
  initialContext?: TContext | (() => TContext);
  onComplete?: (context: TContext, result?: any) => void;
  onCancel?: (context: TContext) => void;
}

export interface JourneyVariants<TContext = any> {
  /**
   * Control flow is required — acts as the default / baseline variant.
   */
  control: FlowDefinition<TContext>;
  [variantKey: string]: FlowDefinition<TContext>;
}

export interface JourneyDefinition<TContext = any> {
  id: string;
  name: string;
  description?: string;
  defaultVariant?: string;
  variants: JourneyVariants<TContext>;
}

export interface SubflowStackFrame<TParentContext = any, TSubContext = any> {
  flow: FlowDefinition<TSubContext>;
  stepId: StepId;
  history: StepId[];
  context: TSubContext;
  subflowStepConfig: SubflowStepDefinition<TParentContext, TSubContext>;
}

/**
 * Immutable snapshot of the state machine at a single point in time,
 * ideal for React rendering and state inspection.
 */
export interface FlowSnapshot<TContext = any> {
  journeyId?: string;
  variantId?: string;
  flowId: string;
  currentStepId: StepId;
  currentStep: StepDefinition<any>;
  context: TContext;
  history: StepId[];
  subflowDepth: number;
  subflowPath: string[];
  isFirstStep: boolean;
  isLastStep: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  result?: any;
}

/**
 * Generic state machine lifecycle event emitted to external observers.
 * Completely decoupled from any analytics or A/B testing vendor.
 */
export type FlowLifecycleEvent<TContext = any> =
  | {
      type: 'flow_started';
      flowId: string;
      journeyId?: string;
      variantId?: string;
      initialStepId: StepId;
      context: TContext;
    }
  | {
      type: 'step_enter';
      flowId: string;
      journeyId?: string;
      variantId?: string;
      stepId: StepId;
      step: StepDefinition<any>;
      isSubflow: boolean;
      subflowDepth: number;
      context: TContext;
    }
  | {
      type: 'step_exit';
      flowId: string;
      journeyId?: string;
      variantId?: string;
      stepId: StepId;
      context: TContext;
    }
  | {
      type: 'flow_completed';
      flowId: string;
      journeyId?: string;
      variantId?: string;
      result?: any;
      context: TContext;
    }
  | {
      type: 'flow_cancelled';
      flowId: string;
      journeyId?: string;
      variantId?: string;
      lastStepId: StepId;
      context: TContext;
    };
