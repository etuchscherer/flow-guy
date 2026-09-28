/**
 * User context representation for experimentation and targeting.
 * Modeled after modern experimentation platforms (such as Statsig, LaunchDarkly).
 */
export interface ExperimentUser {
  userId: string;
  email?: string;
  country?: string;
  locale?: string;
  appVersion?: string;
  custom?: Record<string, string | number | boolean | Array<string | number>>;
  customIDs?: Record<string, string>;
}

/**
 * Result of evaluating an experiment for a given user.
 */
export interface ExperimentEvaluation<TParams = Record<string, any>> {
  experimentName: string;
  variant: string;
  ruleId?: string;
  groupName?: string;
  inExperiment: boolean;
  value?: TParams;
}

/**
 * Record of an exposure event logged by the adapter.
 */
export interface ExposureRecord {
  experimentName: string;
  variant: string;
  user?: ExperimentUser;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Record of an analytics / conversion event logged by the adapter.
 */
export interface EventRecord {
  eventName: string;
  value?: string | number;
  metadata?: Record<string, any>;
  user?: ExperimentUser;
  timestamp: number;
}

/**
 * A/B Adapter interface that abstracts any experimentation or feature flag provider.
 * Keeps the flow orchestration engine completely agnostic of vendor SDKs.
 */
export interface ABAdapter {
  readonly name: string;

  /**
   * Evaluates an experiment and retrieves the assigned variant and optional parameters.
   * @param experimentName Experiment identifier (e.g. 'exp_auth_v2')
   * @param user User context for targeting and deterministic bucketing
   * @param options Evaluation options (e.g. autoExposure)
   */
  getExperiment<TParams = Record<string, any>>(
    experimentName: string,
    user?: ExperimentUser,
    options?: { autoExposure?: boolean }
  ): ExperimentEvaluation<TParams>;

  /**
   * Explicitly logs an exposure for an experiment variant.
   */
  logExposure(
    experimentName: string,
    variant: string,
    user?: ExperimentUser,
    metadata?: Record<string, any>
  ): void;

  /**
   * Logs a conversion, lifecycle, or metric event (e.g. flow completed, step visited).
   */
  logEvent(
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>,
    user?: ExperimentUser
  ): void;

  /**
   * Optional evaluation for boolean feature flags / gates.
   */
  checkGate?(gateName: string, user?: ExperimentUser): boolean;
}

/**
 * Mapping configuration linking an application Journey to an A/B Experiment.
 */
export interface JourneyExperimentMapping {
  /** Identifier of the registered journey (e.g. 'auth') */
  journeyId: string;
  /** Identifier of the experiment in the A/B system (e.g. 'exp_auth_v2') */
  experimentName: string;
  /**
   * Optional map from experiment variant key to journey variant ID.
   * Example: { 'control': 'control', 'upsell_sheet': 'auth-with-upgrade-sheet' }
   * If omitted, assumes the experiment variant string directly matches a journey variant.
   */
  variantMap?: Record<string, string>;
  /**
   * Fallback variant if user is not in experiment or variant is undefined (default: 'control').
   */
  defaultVariant?: string;
  /**
   * Parameter name in experiment config value that holds the variant, if using dynamic configs.
   */
  variantParamKey?: string;
  /**
   * Whether to automatically report exposure when the journey is started (default: true).
   */
  autoLogExposure?: boolean;
  /**
   * Custom event name overrides emitted by this journey.
   */
  events?: {
    started?: string;
    completed?: string;
    cancelled?: string;
    stepEntered?: string;
  };
}

/**
 * Result of resolving a journey's variant through an A/B adapter.
 */
export interface ResolvedJourneyVariant<TParams = Record<string, any>> {
  journeyId: string;
  experimentName?: string;
  experimentVariant?: string;
  resolvedVariant: string;
  inExperiment: boolean;
  value?: TParams;
  user?: ExperimentUser;
}
