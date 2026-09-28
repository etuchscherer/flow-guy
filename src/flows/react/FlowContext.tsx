import React, { createContext, useContext, useEffect, useState } from 'react';
import { FlowEngine, type FlowEngineOptions } from '../core/engine';
import type { FlowSnapshot, StepId } from '../core/types';

export interface FlowContextValue<TContext = any> {
  snapshot: FlowSnapshot<TContext>;
  engine: FlowEngine<TContext>;
  next: (payload?: any) => void;
  back: () => void;
  goTo: (stepId: StepId, payload?: any) => void;
  send: (event: string, payload?: any) => void;
  updateContext: (
    updater: Partial<TContext> | ((prev: TContext) => Partial<TContext>)
  ) => void;
  complete: (result?: any) => void;
  cancel: () => void;
  reset: () => void;
}

export const FlowContext = createContext<FlowContextValue<any> | null>(null);

export interface FlowProviderProps<TContext = any> extends FlowEngineOptions<TContext> {
  children?: React.ReactNode;
}

export function FlowProvider<TContext = any>({
  children,
  journey,
  variant,
  flow,
  initialContext,
  onComplete,
  onCancel,
}: FlowProviderProps<TContext>) {
  const [engine] = useState(
    () =>
      new FlowEngine<TContext>({
        journey,
        variant,
        flow,
        initialContext,
        onComplete,
        onCancel,
      })
  );

  const [snapshot, setSnapshot] = useState<FlowSnapshot<TContext>>(() =>
    engine.getSnapshot()
  );

  useEffect(() => {
    const unsubscribe = engine.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    return unsubscribe;
  }, [engine]);

  const value: FlowContextValue<TContext> = {
    snapshot,
    engine,
    next: (payload) => engine.next(payload),
    back: () => engine.back(),
    goTo: (stepId, payload) => engine.goTo(stepId, payload),
    send: (event, payload) => engine.send(event, payload),
    updateContext: (updater) => engine.updateContext(updater),
    complete: (result) => engine.complete(result),
    cancel: () => engine.cancel(),
    reset: () => engine.reset(),
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlowContext<TContext = any>(): FlowContextValue<TContext> {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlowContext must be used within a <FlowProvider />');
  }
  return context;
}
