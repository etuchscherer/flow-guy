import { getActiveABAdapter } from './provider';
import type {
  ABAdapter,
  ExperimentUser,
  JourneyExperimentMapping,
  ResolvedJourneyVariant,
} from './types';

class JourneyExperimentRegistry {
  private mappings = new Map<string, JourneyExperimentMapping>();

  register(mapping: JourneyExperimentMapping): this {
    this.mappings.set(mapping.journeyId, mapping);
    return this;
  }

  get(journeyId: string): JourneyExperimentMapping | undefined {
    return this.mappings.get(journeyId);
  }

  getAll(): JourneyExperimentMapping[] {
    return Array.from(this.mappings.values());
  }

  clear(): void {
    this.mappings.clear();
  }

  /**
   * Resolves the target flow variant for a given journey and user using the A/B adapter.
   */
  resolveVariant<TParams = Record<string, any>>(
    journeyId: string,
    user?: ExperimentUser,
    customAdapter?: ABAdapter
  ): ResolvedJourneyVariant<TParams> {
    const adapter = customAdapter ?? getActiveABAdapter();
    const mapping = this.mappings.get(journeyId);

    // If no A/B mapping exists for this journey, default directly to control
    if (!mapping) {
      return {
        journeyId,
        resolvedVariant: 'control',
        inExperiment: false,
        user,
      };
    }

    const evaluation = adapter.getExperiment<TParams>(
      mapping.experimentName,
      user,
      { autoExposure: false } // Exposure should only be logged when flow actually starts
    );

    const expVariant = evaluation.variant;
    let resolvedVariant = mapping.defaultVariant ?? 'control';

    if (mapping.variantMap && mapping.variantMap[expVariant]) {
      resolvedVariant = mapping.variantMap[expVariant];
    } else if (expVariant) {
      resolvedVariant = expVariant;
    }

    return {
      journeyId,
      experimentName: mapping.experimentName,
      experimentVariant: expVariant,
      resolvedVariant,
      inExperiment: evaluation.inExperiment,
      value: evaluation.value,
      user,
    };
  }
}

export const journeyABRegistry = new JourneyExperimentRegistry();

/**
 * Register a journey's experiment mapping.
 */
export function registerJourneyExperiment(
  mapping: JourneyExperimentMapping
): JourneyExperimentMapping {
  journeyABRegistry.register(mapping);
  return mapping;
}

/**
 * Resolve which variant to run for a journey based on the active A/B adapter.
 */
export function resolveJourneyVariant<TParams = Record<string, any>>(
  journeyId: string,
  user?: ExperimentUser,
  adapter?: ABAdapter
): ResolvedJourneyVariant<TParams> {
  return journeyABRegistry.resolveVariant<TParams>(journeyId, user, adapter);
}

// ---------------------------------------------------------------------------
// Pre-register default mappings for the application's journeys
// ---------------------------------------------------------------------------

// 1. Classic Auth Journey -> exp_auth_v2
registerJourneyExperiment({
  journeyId: 'auth',
  experimentName: 'exp_auth_v2',
  variantMap: {
    control: 'control',
    upgrade_sheet: 'auth-with-upgrade-sheet',
    'auth-with-upgrade-sheet': 'auth-with-upgrade-sheet',
  },
  defaultVariant: 'control',
  autoLogExposure: true,
  events: {
    started: 'auth_flow_started',
    completed: 'auth_flow_completed',
    cancelled: 'auth_flow_cancelled',
  },
});

// 2. Sticker Smash Workflow -> exp_sticker_editor
registerJourneyExperiment({
  journeyId: 'sticker-workflow',
  experimentName: 'exp_sticker_editor',
  variantMap: {
    control: 'control',
    quick_smash: 'quick-smash',
    'quick-smash': 'quick-smash',
  },
  defaultVariant: 'control',
  autoLogExposure: true,
  events: {
    started: 'sticker_flow_started',
    completed: 'sticker_flow_completed',
    cancelled: 'sticker_flow_cancelled',
  },
});
