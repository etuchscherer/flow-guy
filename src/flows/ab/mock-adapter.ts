import type {
  ABAdapter,
  EventRecord,
  ExperimentEvaluation,
  ExperimentUser,
  ExposureRecord,
} from './types';

export interface MockExperimentOptions<TParams = Record<string, any>> {
  defaultVariant?: string;
  userOverrides?: Record<string, string>; // userId -> variant
  values?: Record<string, TParams>; // variant -> config value
  inExperiment?: boolean;
}

/**
 * In-memory Mock A/B Testing Engine.
 * Provides deterministic variant assignments, overrides, exposure logging,
 * and event tracking for testing and local dev harnesses.
 */
export class MockABAdapter implements ABAdapter {
  readonly name = 'MockABAdapter';

  private experimentConfigs = new Map<string, MockExperimentOptions>();
  private globalOverrides = new Map<string, string>(); // experimentName -> variant
  private userOverrides = new Map<string, Map<string, string>>(); // userId -> (experimentName -> variant)
  private gates = new Map<string, boolean>();

  private exposures: ExposureRecord[] = [];
  private events: EventRecord[] = [];

  private exposureListeners = new Set<(record: ExposureRecord) => void>();
  private eventListeners = new Set<(record: EventRecord) => void>();

  /**
   * Pre-configure an experiment's default variant and user assignments.
   */
  setExperimentConfig<TParams extends Record<string, any> = Record<string, any>>(
    experimentName: string,
    options: MockExperimentOptions<TParams>
  ): this {
    this.experimentConfigs.set(experimentName, options as MockExperimentOptions<Record<string, any>>);
    return this;
  }

  /**
   * Force a specific variant for an experiment across all users.
   */
  overrideVariant(experimentName: string, variant: string): this {
    this.globalOverrides.set(experimentName, variant);
    return this;
  }

  /**
   * Force a specific variant for a specific user.
   */
  overrideUserVariant(userId: string, experimentName: string, variant: string): this {
    let userMap = this.userOverrides.get(userId);
    if (!userMap) {
      userMap = new Map();
      this.userOverrides.set(userId, userMap);
    }
    userMap.set(experimentName, variant);
    return this;
  }

  /**
   * Clear all global and user-level variant overrides.
   */
  clearOverrides(): this {
    this.globalOverrides.clear();
    this.userOverrides.clear();
    return this;
  }

  /**
   * Configure a mock gate value.
   */
  setGate(gateName: string, enabled: boolean): this {
    this.gates.set(gateName, enabled);
    return this;
  }

  // --- ABAdapter Implementation ---

  getExperiment<TParams = Record<string, any>>(
    experimentName: string,
    user?: ExperimentUser,
    options?: { autoExposure?: boolean }
  ): ExperimentEvaluation<TParams> {
    const config = this.experimentConfigs.get(experimentName);
    let assignedVariant = config?.defaultVariant ?? 'control';
    let inExperiment = config?.inExperiment ?? true;

    // 1. Check user-level overrides
    if (user?.userId && this.userOverrides.has(user.userId)) {
      const userMap = this.userOverrides.get(user.userId)!;
      if (userMap.has(experimentName)) {
        assignedVariant = userMap.get(experimentName)!;
      }
    }
    // 2. Check global override
    else if (this.globalOverrides.has(experimentName)) {
      assignedVariant = this.globalOverrides.get(experimentName)!;
    }
    // 3. Check pre-configured user rules
    else if (user?.userId && config?.userOverrides?.[user.userId]) {
      assignedVariant = config.userOverrides[user.userId];
    }

    const value = (config?.values?.[assignedVariant] ?? {}) as TParams;

    if (options?.autoExposure) {
      this.logExposure(experimentName, assignedVariant, user);
    }

    return {
      experimentName,
      variant: assignedVariant,
      groupName: assignedVariant,
      ruleId: `mock_rule_${assignedVariant}`,
      inExperiment,
      value,
    };
  }

  logExposure(
    experimentName: string,
    variant: string,
    user?: ExperimentUser,
    metadata?: Record<string, any>
  ): void {
    const record: ExposureRecord = {
      experimentName,
      variant,
      user,
      timestamp: Date.now(),
      metadata,
    };

    this.exposures.push(record);
    for (const listener of this.exposureListeners) {
      try {
        listener(record);
      } catch (e) {
        console.error('[MockABAdapter] Error in exposure listener:', e);
      }
    }
  }

  logEvent(
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>,
    user?: ExperimentUser
  ): void {
    const record: EventRecord = {
      eventName,
      value,
      metadata,
      user,
      timestamp: Date.now(),
    };

    this.events.push(record);
    for (const listener of this.eventListeners) {
      try {
        listener(record);
      } catch (e) {
        console.error('[MockABAdapter] Error in event listener:', e);
      }
    }
  }

  checkGate(gateName: string, _user?: ExperimentUser): boolean {
    return this.gates.get(gateName) ?? false;
  }

  // --- Inspection & Test Helpers ---

  getExposures(filter?: { experimentName?: string; userId?: string }): ExposureRecord[] {
    return this.exposures.filter((exp) => {
      if (filter?.experimentName && exp.experimentName !== filter.experimentName) {
        return false;
      }
      if (filter?.userId && exp.user?.userId !== filter.userId) {
        return false;
      }
      return true;
    });
  }

  getEvents(filter?: { eventName?: string; userId?: string }): EventRecord[] {
    return this.events.filter((evt) => {
      if (filter?.eventName && evt.eventName !== filter.eventName) {
        return false;
      }
      if (filter?.userId && evt.user?.userId !== filter.userId) {
        return false;
      }
      return true;
    });
  }

  getLastExposure(): ExposureRecord | undefined {
    return this.exposures[this.exposures.length - 1];
  }

  getLastEvent(): EventRecord | undefined {
    return this.events[this.events.length - 1];
  }

  clearRecords(): void {
    this.exposures = [];
    this.events = [];
  }

  reset(): void {
    this.clearRecords();
    this.clearOverrides();
    this.experimentConfigs.clear();
    this.gates.clear();
  }

  // --- Subscriptions for Devtools & UI ---

  onExposure(listener: (record: ExposureRecord) => void): () => void {
    this.exposureListeners.add(listener);
    return () => {
      this.exposureListeners.delete(listener);
    };
  }

  onEvent(listener: (record: EventRecord) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }
}

export const defaultMockABAdapter = new MockABAdapter();
