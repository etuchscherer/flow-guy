import { useEffect, useMemo, useRef } from 'react';
import { getActiveABAdapter } from '../provider';
import { journeyABRegistry, resolveJourneyVariant } from '../registry';
import type { ABAdapter, ExperimentUser, ResolvedJourneyVariant } from '../types';

export interface UseABJourneyOptions {
  user?: ExperimentUser;
  adapter?: ABAdapter;
  forceVariant?: string;
  autoLogExposure?: boolean;
}

export interface UseABJourneyReturn<TParams = Record<string, any>> {
  resolved: ResolvedJourneyVariant<TParams>;
  variant: string;
  experimentName?: string;
  inExperiment: boolean;
  value?: TParams;
  logExposure: () => void;
  logEvent: (
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>
  ) => void;
}

/**
 * React hook to resolve an A/B experiment variant for a Journey,
 * automatically reporting exposure when mounted.
 */
export function useABJourney<TParams = Record<string, any>>(
  journeyId: string,
  options?: UseABJourneyOptions
): UseABJourneyReturn<TParams> {
  const adapter = options?.adapter ?? getActiveABAdapter();
  const user = options?.user;
  const mapping = journeyABRegistry.get(journeyId);

  const resolved = useMemo(() => {
    if (options?.forceVariant) {
      return {
        journeyId,
        experimentName: mapping?.experimentName,
        experimentVariant: options.forceVariant,
        resolvedVariant: options.forceVariant,
        inExperiment: true,
        user,
      } as ResolvedJourneyVariant<TParams>;
    }
    return resolveJourneyVariant<TParams>(journeyId, user, adapter);
  }, [journeyId, user, adapter, options?.forceVariant, mapping]);

  const hasLoggedExposureRef = useRef(false);

  const logExposure = () => {
    if (resolved.experimentName && resolved.experimentVariant) {
      adapter.logExposure(
        resolved.experimentName,
        resolved.experimentVariant,
        user,
        {
          journeyId,
          resolvedVariant: resolved.resolvedVariant,
        }
      );
    }
  };

  const shouldAutoLog =
    options?.autoLogExposure ?? mapping?.autoLogExposure ?? true;

  useEffect(() => {
    if (shouldAutoLog && !hasLoggedExposureRef.current) {
      hasLoggedExposureRef.current = true;
      logExposure();
    }
  }, [shouldAutoLog, resolved]);

  const logEvent = (
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>
  ) => {
    adapter.logEvent(eventName, value, metadata, user);
  };

  return {
    resolved,
    variant: resolved.resolvedVariant,
    experimentName: resolved.experimentName,
    inExperiment: resolved.inExperiment,
    value: resolved.value,
    logExposure,
    logEvent,
  };
}
