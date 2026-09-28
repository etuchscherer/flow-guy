import { registry } from './registry';
import type {
  FlowDefinition,
  FlowLifecycleEvent,
  FlowSnapshot,
  JourneyDefinition,
  StepDefinition,
  StepId,
  SubflowStackFrame,
  SubflowStepDefinition,
} from './types';

export interface FlowEngineOptions<TContext = any> {
  journey?: JourneyDefinition<TContext> | string;
  variant?: string;
  flow?: FlowDefinition<TContext> | string;
  initialContext?: Partial<TContext>;
  onComplete?: (context: TContext, result?: any) => void;
  onCancel?: (context: TContext) => void;
  onLifecycleEvent?: (event: FlowLifecycleEvent<TContext>) => void;
}

export class FlowEngine<TContext = any> {
  private journeyId?: string;
  private variantId?: string;
  private rootFlow: FlowDefinition<any>;
  private currentFlow: FlowDefinition<any>;
  private stack: SubflowStackFrame[] = [];
  private currentStepId: StepId;
  private history: StepId[] = [];
  private context: TContext;
  private isCompleted = false;
  private isCancelled = false;
  private completionResult?: any;
  private listeners = new Set<(snapshot: FlowSnapshot<TContext>) => void>();
  private onCompleteCallback?: (context: TContext, result?: any) => void;
  private onCancelCallback?: (context: TContext) => void;
  private onLifecycleEventCallback?: (event: FlowLifecycleEvent<TContext>) => void;

  constructor(options: FlowEngineOptions<TContext>) {
    this.onCompleteCallback = options.onComplete;
    this.onCancelCallback = options.onCancel;
    this.onLifecycleEventCallback = options.onLifecycleEvent;

    // Resolve Journey or Flow
    if (options.journey) {
      const journey =
        typeof options.journey === 'string'
          ? registry.getJourney(options.journey)
          : options.journey;

      if (!journey) {
        throw new Error(
          `[FlowEngine] Journey "${options.journey}" could not be resolved.`
        );
      }

      this.journeyId = journey.id;
      this.variantId = options.variant ?? journey.defaultVariant ?? 'control';
      const flow = journey.variants[this.variantId] ?? journey.variants.control;
      if (!flow) {
        throw new Error(
          `[FlowEngine] Journey "${journey.id}" does not have variant "${this.variantId}".`
        );
      }
      this.rootFlow = flow;
    } else if (options.flow) {
      this.rootFlow = registry.resolveFlow(options.flow);
    } else {
      throw new Error('[FlowEngine] Either journey or flow must be provided.');
    }

    this.currentFlow = this.rootFlow;
    this.currentStepId = this.currentFlow.initial;

    // Initialize context
    const baseContext =
      typeof this.currentFlow.initialContext === 'function'
        ? this.currentFlow.initialContext()
        : (this.currentFlow.initialContext ?? {});

    this.context = {
      ...baseContext,
      ...(options.initialContext ?? {}),
    } as TContext;

    // If initial step is a subflow, enter it immediately
    this.checkAndEnterSubflow();
    this.triggerStepEnter();

    this.emitLifecycleEvent({
      type: 'flow_started',
      flowId: this.rootFlow.id,
      journeyId: this.journeyId,
      variantId: this.variantId,
      initialStepId: this.currentStepId,
      context: this.context,
    });
  }

  // --- Snapshot & Subscriptions ---

  getSnapshot(): FlowSnapshot<TContext> {
    const rawStep = this.currentFlow.steps[this.currentStepId];
    const currentStep = rawStep
      ? (rawStep.id ? rawStep : { ...rawStep, id: this.currentStepId })
      : { id: this.currentStepId, title: this.currentStepId };


    const subflowPath = this.stack.map(
      (f) => `${f.flow.id}/${f.stepId}`
    );
    subflowPath.push(`${this.currentFlow.id}/${this.currentStepId}`);

    return {
      journeyId: this.journeyId,
      variantId: this.variantId,
      flowId: this.currentFlow.id,
      currentStepId: this.currentStepId,
      currentStep,
      context: this.context,
      history: [...this.history],
      subflowDepth: this.stack.length,
      subflowPath,
      isFirstStep: this.history.length === 0 && this.stack.length === 0,
      isLastStep: this.computeIsLastStep(currentStep),
      isCompleted: this.isCompleted,
      isCancelled: this.isCancelled,
      result: this.completionResult,
    };
  }

  subscribe(listener: (snapshot: FlowSnapshot<TContext>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  // --- Context Manipulation ---

  updateContext(updater: Partial<TContext> | ((prev: TContext) => Partial<TContext>)): void {
    if (this.isCompleted || this.isCancelled) return;

    const patch = typeof updater === 'function' ? updater(this.context) : updater;
    this.context = {
      ...this.context,
      ...patch,
    };
    this.notify();
  }

  getContext(): TContext {
    return this.context;
  }

  // --- Transitions ---

  next(payload?: any): void {
    if (this.isCompleted || this.isCancelled) return;

    const step = this.getCurrentStepDefinition();
    if (!step) {
      this.complete(payload);
      return;
    }

    // Resolve next target
    let targetId: StepId | null | undefined;
    if (step.type === 'subflow') {
      // If we are on a subflow step, the subflow is already active.
      // A direct `next()` when still on subflow step means advancing within subflow
      // which is handled by active step.
    } else {
      const nextConfig = step.next;
      if (typeof nextConfig === 'function') {
        targetId = nextConfig(this.context, payload);
      } else {
        targetId = nextConfig;
      }
    }

    if (!targetId) {
      // If no next step is specified:
      if (this.stack.length > 0) {
        // Subflow is completed! Return to parent flow
        this.exitSubflow(payload);
      } else {
        // Root flow is completed!
        this.complete(payload);
      }
      return;
    }

    this.transitionTo(targetId);
  }

  back(): void {
    if (this.isCompleted || this.isCancelled) return;

    const step = this.getCurrentStepDefinition();

    // 1. Check custom back transition on current step
    if (step && 'back' in step && step.back) {
      const customBack =
        typeof step.back === 'function' ? step.back(this.context) : step.back;
      if (customBack) {
        this.transitionTo(customBack, false);
        return;
      }
    }

    // 2. Pop from historical stack in current flow
    if (this.history.length > 0) {
      const previousStepId = this.history.pop()!;
      this.transitionTo(previousStepId, false);
      return;
    }

    // 3. If history is empty and we are inside a subflow, pop out to parent flow!
    if (this.stack.length > 0) {
      const parentFrame = this.stack.pop()!;
      this.currentFlow = parentFrame.flow;
      this.history = parentFrame.history;
      this.context = parentFrame.context;

      const subflowStep = parentFrame.subflowStepConfig;
      if (subflowStep.back) {
        const customBack =
          typeof subflowStep.back === 'function'
            ? subflowStep.back(this.context)
            : subflowStep.back;
        if (customBack) {
          this.currentStepId = customBack;
          this.triggerStepEnter();
          this.notify();
          return;
        }
      }

      if (this.history.length > 0) {
        this.currentStepId = this.history.pop()!;
      } else {
        this.currentStepId = parentFrame.stepId;
      }

      this.triggerStepEnter();
      this.notify();
    }
  }

  goTo(stepId: StepId, payload?: any): void {
    if (this.isCompleted || this.isCancelled) return;
    this.transitionTo(stepId, true, payload);
  }

  send(event: string, payload?: any): void {
    if (this.isCompleted || this.isCancelled) return;

    const step = this.getCurrentStepDefinition();
    if (!step || step.type !== 'screen' || !step.on || !step.on[event]) {
      return;
    }

    const handler = step.on[event];
    const targetId = typeof handler === 'function' ? handler(this.context, payload) : handler;
    if (targetId) {
      this.transitionTo(targetId, true, payload);
    }
  }

  complete(result?: any): void {
    if (this.isCompleted || this.isCancelled) return;

    // If we're inside a subflow, complete the subflow and resume parent
    if (this.stack.length > 0) {
      this.exitSubflow(result);
      return;
    }

    this.isCompleted = true;
    this.completionResult = result;
    this.emitLifecycleEvent({
      type: 'flow_completed',
      flowId: this.rootFlow.id,
      journeyId: this.journeyId,
      variantId: this.variantId,
      result,
      context: this.context,
    });
    this.rootFlow.onComplete?.(this.context, result);
    this.onCompleteCallback?.(this.context, result);
    this.notify();
  }

  cancel(): void {
    if (this.isCompleted || this.isCancelled) return;

    // Check if subflow has custom onCancel
    if (this.stack.length > 0) {
      const parentFrame = this.stack.pop()!;
      const onCancelHandler = parentFrame.subflowStepConfig.onCancel;
      this.currentFlow = parentFrame.flow;
      this.history = parentFrame.history;
      this.context = parentFrame.context;

      if (onCancelHandler) {
        const nextTarget =
          typeof onCancelHandler === 'function'
            ? onCancelHandler(this.context)
            : onCancelHandler;

        if (typeof nextTarget === 'string') {
          this.currentStepId = nextTarget;
          this.triggerStepEnter();
          this.notify();
          return;
        }
      }
    }

    this.isCancelled = true;
    this.emitLifecycleEvent({
      type: 'flow_cancelled',
      flowId: this.rootFlow.id,
      journeyId: this.journeyId,
      variantId: this.variantId,
      lastStepId: this.currentStepId,
      context: this.context,
    });
    this.rootFlow.onCancel?.(this.context);
    this.onCancelCallback?.(this.context);
    this.notify();
  }

  reset(): void {
    this.currentFlow = this.rootFlow;
    this.stack = [];
    this.history = [];
    this.currentStepId = this.currentFlow.initial;
    this.isCompleted = false;
    this.isCancelled = false;
    this.completionResult = undefined;

    const baseContext =
      typeof this.currentFlow.initialContext === 'function'
        ? this.currentFlow.initialContext()
        : (this.currentFlow.initialContext ?? {});
    this.context = { ...baseContext } as TContext;

    this.checkAndEnterSubflow();
    this.triggerStepEnter();
    this.emitLifecycleEvent({
      type: 'flow_started',
      flowId: this.rootFlow.id,
      journeyId: this.journeyId,
      variantId: this.variantId,
      initialStepId: this.currentStepId,
      context: this.context,
    });
    this.notify();
  }

  // --- Internal Helpers ---

  private getCurrentStepDefinition(): StepDefinition<any> | undefined {
    return this.currentFlow.steps[this.currentStepId];
  }

  private transitionTo(targetId: StepId, pushHistory = true, _payload?: any) {
    const currentStep = this.getCurrentStepDefinition();
    currentStep?.onExit?.(this.context);
    this.emitLifecycleEvent({
      type: 'step_exit',
      flowId: this.currentFlow.id,
      journeyId: this.journeyId,
      variantId: this.variantId,
      stepId: this.currentStepId,
      context: this.context,
    });

    if (pushHistory) {
      this.history.push(this.currentStepId);
    }

    this.currentStepId = targetId;
    this.triggerStepEnter();
    this.checkAndEnterSubflow();
    this.notify();
  }

  private checkAndEnterSubflow(): void {
    const step = this.getCurrentStepDefinition();
    if (step && step.type === 'subflow') {
      const subflowDef = registry.resolveFlow(step.subflow, step.variant);

      // Create stack frame for parent
      const parentFrame: SubflowStackFrame = {
        flow: this.currentFlow,
        stepId: this.currentStepId,
        history: [...this.history],
        context: this.context,
        subflowStepConfig: step as SubflowStepDefinition,
      };
      this.stack.push(parentFrame);

      // Initialize subflow
      this.currentFlow = subflowDef;
      this.history = [];
      this.currentStepId = subflowDef.initial;

      const mappedSubContext = step.mapContextToSubflow
        ? step.mapContextToSubflow(this.context)
        : { ...this.context };

      const defaultSubContext =
        typeof subflowDef.initialContext === 'function'
          ? subflowDef.initialContext()
          : (subflowDef.initialContext ?? {});

      this.context = {
        ...defaultSubContext,
        ...mappedSubContext,
      };

      this.triggerStepEnter();
    }
  }

  private exitSubflow(subflowResult: any): void {
    if (this.stack.length === 0) return;

    const parentFrame = this.stack.pop()!;
    const parentStepConfig = parentFrame.subflowStepConfig;

    // Merge subflow context and result back into parent context
    const mergedContext = {
      ...parentFrame.context,
      ...this.context,
      ...(subflowResult && typeof subflowResult === 'object' ? subflowResult : {}),
    };

    this.currentFlow = parentFrame.flow;
    this.history = parentFrame.history;
    // Push the subflow step itself to history so back() works predictably
    this.history.push(parentFrame.stepId);
    this.context = mergedContext;

    // Resolve onComplete in parent flow
    const nextTarget = parentStepConfig.onComplete(
      mergedContext,
      subflowResult
    );

    const resolvedTargetId =
      typeof nextTarget === 'function'
        ? nextTarget(mergedContext, subflowResult)
        : nextTarget;

    if (!resolvedTargetId) {
      this.complete(subflowResult);
      return;
    }

    this.currentStepId = resolvedTargetId;
    this.triggerStepEnter();
    this.checkAndEnterSubflow();
    this.notify();
  }

  private triggerStepEnter(): void {
    const step = this.getCurrentStepDefinition();
    if (step) {
      this.emitLifecycleEvent({
        type: 'step_enter',
        flowId: this.currentFlow.id,
        journeyId: this.journeyId,
        variantId: this.variantId,
        stepId: this.currentStepId,
        step,
        isSubflow: this.stack.length > 0,
        subflowDepth: this.stack.length,
        context: this.context,
      });
    }

    if (step?.onEnter) {
      const patch = step.onEnter(this.context);
      if (patch && typeof patch === 'object') {
        this.context = {
          ...this.context,
          ...patch,
        };
      }
    }

    // Auto-advance transient action/choice steps immediately
    if (step && step.type === 'action' && step.next) {
      const target =
        typeof step.next === 'function'
          ? step.next(this.context)
          : step.next;
      if (target) {
        this.currentStepId = target;
        this.triggerStepEnter();
        this.checkAndEnterSubflow();
      }
    }
  }

  private emitLifecycleEvent(event: FlowLifecycleEvent<TContext>): void {
    if (this.onLifecycleEventCallback) {
      try {
        this.onLifecycleEventCallback(event);
      } catch (err) {
        console.error('[FlowEngine] Error in onLifecycleEvent callback:', err);
      }
    }
  }

  private computeIsLastStep(step: StepDefinition<any>): boolean {
    if (step.type === 'subflow') return false;
    return !step.next && this.stack.length === 0;
  }
}
