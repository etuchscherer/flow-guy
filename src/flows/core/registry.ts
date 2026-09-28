import type { FlowDefinition, JourneyDefinition } from './types';

function normalizeFlowSteps(flow: FlowDefinition<any>): void {
  if (!flow || !flow.steps) return;
  for (const [stepKey, step] of Object.entries(flow.steps)) {
    if (!step.id) {
      step.id = stepKey;
    }
    if (!step.type) {
      if ('subflow' in step) {
        (step as any).type = 'subflow';
      } else {
        (step as any).type = 'screen';
      }
    }
  }
}


class FlowRegistry {
  private journeys = new Map<string, JourneyDefinition>();
  private standaloneFlows = new Map<string, FlowDefinition>();

  registerJourney<TContext>(journey: JourneyDefinition<TContext>): JourneyDefinition<TContext> {
    if (!journey.variants || !journey.variants.control) {
      throw new Error(
        `[FlowRegistry] Journey "${journey.id}" must define at least a "control" variant.`
      );
    }
    for (const variantFlow of Object.values(journey.variants)) {
      normalizeFlowSteps(variantFlow);
    }
    this.journeys.set(journey.id, journey);
    return journey;
  }

  getJourney(id: string): JourneyDefinition | undefined {
    return this.journeys.get(id);
  }

  getAllJourneys(): JourneyDefinition[] {
    return Array.from(this.journeys.values());
  }

  registerFlow<TContext>(flow: FlowDefinition<TContext>): FlowDefinition<TContext> {
    normalizeFlowSteps(flow);
    this.standaloneFlows.set(flow.id, flow);
    return flow;
  }

  getFlow(id: string): FlowDefinition | undefined {
    return this.standaloneFlows.get(id);
  }

  resolveFlow(flowOrId: FlowDefinition | string, variant = 'control'): FlowDefinition {
    if (typeof flowOrId !== 'string') {
      return flowOrId;
    }

    // Check if it matches a registered journey
    const journey = this.journeys.get(flowOrId);
    if (journey) {
      const selected = journey.variants[variant] ?? journey.variants.control;
      if (!selected) {
        throw new Error(
          `[FlowRegistry] Journey "${flowOrId}" does not have variant "${variant}".`
        );
      }
      return selected;
    }

    // Check standalone flows
    const flow = this.standaloneFlows.get(flowOrId);
    if (flow) {
      return flow;
    }

    throw new Error(`[FlowRegistry] Flow or Journey "${flowOrId}" not found in registry.`);
  }

  clear() {
    this.journeys.clear();
    this.standaloneFlows.clear();
  }
}

export const registry = new FlowRegistry();

/**
 * Type-safe helper to define a journey with convention validation.
 * Enforces the presence of a "control" variant flow.
 */
export function defineJourney<TContext = any>(
  definition: JourneyDefinition<TContext>
): JourneyDefinition<TContext> {
  return registry.registerJourney(definition);
}

/**
 * Type-safe helper to define a flow definition.
 */
export function defineFlow<TContext = any>(
  definition: FlowDefinition<TContext>
): FlowDefinition<TContext> {
  return registry.registerFlow(definition);
}
