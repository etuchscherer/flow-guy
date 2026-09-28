import React from 'react';
import type { ViewStyle } from 'react-native';
import { FlowRenderer, type FlowRendererProps } from '../../react/FlowRenderer';
import { journeyABRegistry } from '../registry';
import type { ABAdapter, ExperimentUser } from '../types';
import { useABJourney } from './useABJourney';

export interface ABFlowRendererProps<TContext = any>
  extends Omit<FlowRendererProps<TContext>, 'variant' | 'journey'> {
  journey: string;
  user?: ExperimentUser;
  adapter?: ABAdapter;
  forceVariant?: string;
  autoLogExposure?: boolean;
  style?: ViewStyle;
}

/**
 * Component that resolves an A/B variant for a journey,
 * logs exposure, hooks lifecycle analytics events, and renders the flow.
 */
export function ABFlowRenderer<TContext = any>({
  journey,
  user,
  adapter,
  forceVariant,
  autoLogExposure = true,
  onComplete,
  onCancel,
  initialContext,
  style,
  renderCompleted,
  renderCancelled,
}: ABFlowRendererProps<TContext>) {
  const { variant, logEvent, experimentName } = useABJourney(journey, {
    user,
    adapter,
    forceVariant,
    autoLogExposure,
  });

  const mapping = journeyABRegistry.get(journey);
  const completedEventName =
    mapping?.events?.completed ?? `${journey}_completed`;
  const cancelledEventName =
    mapping?.events?.cancelled ?? `${journey}_cancelled`;

  const handleComplete = (context: TContext, result?: any) => {
    logEvent(completedEventName, undefined, {
      journeyId: journey,
      variant,
      experimentName,
      result,
    });
    onComplete?.(context, result);
  };

  const handleCancel = (context: TContext) => {
    logEvent(cancelledEventName, undefined, {
      journeyId: journey,
      variant,
      experimentName,
    });
    onCancel?.(context);
  };

  return (
    <FlowRenderer<TContext>
      key={`${journey}-${variant}-${user?.userId ?? 'anon'}`}
      journey={journey}
      variant={variant}
      initialContext={initialContext}
      onComplete={handleComplete}
      onCancel={handleCancel}
      style={style}
      renderCompleted={renderCompleted}
      renderCancelled={renderCancelled}
    />
  );
}
