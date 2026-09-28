import type {
  ABAdapter,
  ExperimentEvaluation,
  ExperimentUser,
} from './types';

/**
 * Minimal interface representing the Statsig React Native / JS Client SDK.
 * Matches the official Statsig client signature.
 */
export interface StatsigClientLike {
  getExperiment(
    experimentName: string,
    options?: { user?: any; ignoreExposure?: boolean }
  ): {
    getName(): string;
    getGroupName?(): string;
    getRuleID?(): string;
    get<T>(param: string, fallback: T): T;
    value: Record<string, any>;
  };
  manuallyLogExperimentExposure(experimentName: string): void;
  logEvent(
    eventName: string,
    value?: string | number | null,
    metadata?: Record<string, string> | null
  ): void;
  checkGate?(gateName: string): boolean;
  updateUserSync?(user: any): void;
}

/**
 * Production-ready Statsig Adapter.
 *
 * Implements the ABAdapter interface using the official Statsig Client SDK.
 * To use:
 * ```ts
 * import { statsig } from 'statsig-react-native';
 * import { StatsigABAdapter, setActiveABAdapter } from '@/flows/ab';
 *
 * setActiveABAdapter(new StatsigABAdapter(statsig));
 * ```
 */
export class StatsigABAdapter implements ABAdapter {
  readonly name = 'StatsigABAdapter';

  constructor(
    private client: StatsigClientLike,
    private defaultVariantParamKey: string = 'variant'
  ) {}

  private mapUser(user?: ExperimentUser): any {
    if (!user) return undefined;
    return {
      userID: user.userId,
      email: user.email,
      country: user.country,
      locale: user.locale,
      appVersion: user.appVersion,
      custom: user.custom,
      customIDs: user.customIDs,
    };
  }

  getExperiment<TParams = Record<string, any>>(
    experimentName: string,
    user?: ExperimentUser,
    options?: { autoExposure?: boolean }
  ): ExperimentEvaluation<TParams> {
    const statsigUser = this.mapUser(user);

    // If updateUserSync is supported and user is provided, update user context
    if (statsigUser && this.client.updateUserSync) {
      this.client.updateUserSync(statsigUser);
    }

    const exp = this.client.getExperiment(experimentName, {
      user: statsigUser,
      ignoreExposure: options?.autoExposure === false,
    });

    const groupName = exp.getGroupName?.() ?? 'control';
    const variantFromParam = exp.get<string>(this.defaultVariantParamKey, groupName);

    return {
      experimentName,
      variant: variantFromParam || groupName,
      groupName,
      ruleId: exp.getRuleID?.(),
      inExperiment: groupName !== 'Control' && groupName !== 'control',
      value: exp.value as TParams,
    };
  }

  logExposure(
    experimentName: string,
    _variant: string,
    user?: ExperimentUser,
    _metadata?: Record<string, any>
  ): void {
    const statsigUser = this.mapUser(user);
    if (statsigUser && this.client.updateUserSync) {
      this.client.updateUserSync(statsigUser);
    }
    this.client.manuallyLogExperimentExposure(experimentName);
  }

  logEvent(
    eventName: string,
    value?: string | number,
    metadata?: Record<string, any>,
    user?: ExperimentUser
  ): void {
    const statsigUser = this.mapUser(user);
    if (statsigUser && this.client.updateUserSync) {
      this.client.updateUserSync(statsigUser);
    }

    // Convert metadata values to strings as expected by Statsig
    const stringifiedMetadata: Record<string, string> = {};
    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        stringifiedMetadata[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }

    this.client.logEvent(eventName, value ?? null, stringifiedMetadata);
  }

  checkGate(gateName: string, user?: ExperimentUser): boolean {
    const statsigUser = this.mapUser(user);
    if (statsigUser && this.client.updateUserSync) {
      this.client.updateUserSync(statsigUser);
    }
    return this.client.checkGate?.(gateName) ?? false;
  }
}
