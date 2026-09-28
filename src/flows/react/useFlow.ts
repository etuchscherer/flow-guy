import { useFlowContext } from './FlowContext';

/**
 * Hook for components and screens inside a Flow to inspect status and trigger transitions.
 */
export function useFlow<TContext = any>() {
  const {
    snapshot,
    next,
    back,
    goTo,
    send,
    updateContext,
    complete,
    cancel,
    reset,
  } = useFlowContext<TContext>();

  return {
    // Current step information
    stepId: snapshot.currentStepId,
    step: snapshot.currentStep,
    stepTitle: snapshot.currentStep.title ?? snapshot.currentStepId,
    stepDescription: snapshot.currentStep.description,
    isSubflow: snapshot.subflowDepth > 0,
    subflowDepth: snapshot.subflowDepth,
    subflowPath: snapshot.subflowPath,

    // Flow & Journey identity
    journeyId: snapshot.journeyId,
    variantId: snapshot.variantId,
    flowId: snapshot.flowId,

    // Shared State / Context
    context: snapshot.context,
    updateContext,

    // Transition Helpers
    next,
    back,
    goTo,
    send,
    complete,
    cancel,
    reset,

    // Status flags
    isFirstStep: snapshot.isFirstStep,
    isLastStep: snapshot.isLastStep,
    isCompleted: snapshot.isCompleted,
    isCancelled: snapshot.isCancelled,
    result: snapshot.result,
    history: snapshot.history,
  };
}
