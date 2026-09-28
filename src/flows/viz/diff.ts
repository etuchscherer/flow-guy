import { registry } from '../core/registry';
import type { FlowDefinition, JourneyDefinition, StepDefinition } from '../core/types';
import { resolveStepTransition } from './mermaid';

export interface StepDiffItem {
  id: string;
  title: string;
  type: string;
  subflowId?: string;
  description?: string;
  nextDesc?: string;
  componentName?: string;
  isReachable: boolean;
}

export interface TransitionDiffItem {
  stepId: string;
  stepTitle: string;
  controlTarget: string;
  variantTarget: string;
}

export interface FlowDiffResult {
  journeyId: string;
  variantKey: string;
  controlStepCount: number;
  variantStepCount: number;
  stepCountDelta: number;
  addedSteps: StepDiffItem[];
  bypassedSteps: StepDiffItem[];
  modifiedTransitions: TransitionDiffItem[];
  impactNarrative: string;
  tags: string[];
}

/**
 * Computes the set of reachable top-level step IDs from the flow initial step.
 */
function computeReachableTopSteps(flow: FlowDefinition): Set<string> {
  const reachable = new Set<string>();
  const queue = [flow.initial];
  const knownIds = Object.keys(flow.steps);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const step = flow.steps[current];
    if (!step) continue;

    const transition = step.type === 'subflow' ? (step as any).onComplete : (step as any).next;
    const res = resolveStepTransition(
      transition,
      knownIds,
      step.title,
      (step as any).branches,
      (step as any).decisionLabel
    );
    for (const b of res.branches) {
      if (!reachable.has(b.target) && flow.steps[b.target]) {
        queue.push(b.target);
      }
    }
  }

  return reachable;
}

/**
 * Extracts a record of steps for a flow, including reachable flag and subflow inner steps.
 */
function extractAllSteps(flow: FlowDefinition): Map<string, StepDiffItem & { targetString: string }> {
  const stepMap = new Map<string, StepDiffItem & { targetString: string }>();
  const knownIds = Object.keys(flow.steps);
  const reachableTopSteps = computeReachableTopSteps(flow);

  for (const [stepId, step] of Object.entries(flow.steps)) {
    const isReachable = reachableTopSteps.has(stepId);
    const transition = step.type === 'subflow' ? (step as any).onComplete : (step as any).next;
    const res = resolveStepTransition(
      transition,
      knownIds,
      step.title,
      (step as any).branches,
      (step as any).decisionLabel
    );

    let nextDesc = '[Terminal]';
    if (!res || res.branches.length === 0) {
      nextDesc = '[Terminal]';
    } else if (!res.isConditional && res.branches.length === 1) {
      nextDesc = res.branches[0].target;
    } else {
      nextDesc = res.branches
        .map((b) => (b.label ? `${b.label} → ${b.target}` : b.target))
        .join(' | ');
    }

    const component = (step as any).component;
    const componentName = component?.displayName || component?.name || undefined;

    stepMap.set(stepId, {
      id: stepId,
      title: step.title ?? stepId,
      type: step.type ?? 'screen',
      description: step.description,
      nextDesc,
      targetString: res.branches.map((b) => b.target).sort().join(','),
      componentName,
      isReachable,
    });

    // If subflow, also inspect inner steps
    if (step.type === 'subflow') {
      try {
        const subflowDef = registry.resolveFlow(step.subflow, step.variant);
        const subflowKnownIds = Object.keys(subflowDef.steps);
        for (const [subId, subStep] of Object.entries(subflowDef.steps)) {
          const qualifiedId = `${stepId}__${subId}`;
          const subTransition = resolveStepTransition(
            (subStep as any).next,
            subflowKnownIds,
            subStep.title,
            (subStep as any).branches,
            (subStep as any).decisionLabel
          );

          let subNextDesc = '[Completes Subflow]';
          if (subTransition.branches.length === 1) {
            subNextDesc = subTransition.branches[0].target;
          } else if (subTransition.branches.length > 1) {
            subNextDesc = subTransition.branches
              .map((b) => (b.label ? `${b.label} → ${b.target}` : b.target))
              .join(' | ');
          }

          const subComponent = (subStep as any).component;
          const subComponentName = subComponent?.displayName || subComponent?.name || undefined;

          stepMap.set(qualifiedId, {
            id: qualifiedId,
            title: subStep.title ?? subId,
            type: subStep.type ?? 'screen',
            subflowId: stepId,
            description: subStep.description,
            nextDesc: subNextDesc,
            targetString: subTransition.branches.map((b) => b.target).sort().join(','),
            componentName: subComponentName,
            isReachable,
          });
        }
      } catch {
        // Subflow resolution fallback
      }
    }
  }

  return stepMap;
}

/**
 * Computes difference between a Journey's Control flow and a target Variant flow.
 */
export function computeJourneyDiff(
  journey: JourneyDefinition,
  variantKey: string
): FlowDiffResult {
  const controlFlow = journey.variants.control;
  const variantFlow = journey.variants[variantKey] ?? controlFlow;

  const controlSteps = extractAllSteps(controlFlow);
  const variantSteps = extractAllSteps(variantFlow);

  const controlReachableCount = Array.from(controlSteps.values()).filter((s) => s.isReachable && !s.subflowId).length;
  const variantReachableCount = Array.from(variantSteps.values()).filter((s) => s.isReachable && !s.subflowId).length;

  if (variantKey === 'control' || controlFlow === variantFlow) {
    return {
      journeyId: journey.id,
      variantKey: 'control',
      controlStepCount: controlReachableCount,
      variantStepCount: controlReachableCount,
      stepCountDelta: 0,
      addedSteps: [],
      bypassedSteps: [],
      modifiedTransitions: [],
      impactNarrative: 'Baseline control experience. All steps and subflows operate standard paths.',
      tags: ['Baseline'],
    };
  }

  const addedSteps: StepDiffItem[] = [];
  const bypassedSteps: StepDiffItem[] = [];
  const modifiedTransitions: TransitionDiffItem[] = [];
  const tags: string[] = [];

  // 1. Detect Added Steps in Variant (present & reachable in variant, but not reachable/present in control)
  for (const [id, vStep] of variantSteps.entries()) {
    if (vStep.isReachable) {
      const cStep = controlSteps.get(id);
      if (!cStep || !cStep.isReachable) {
        addedSteps.push(vStep);
      }
    }
  }

  // 2. Detect Bypassed Steps from Control (reachable in control, but omitted or unreachable in variant)
  for (const [id, cStep] of controlSteps.entries()) {
    if (cStep.isReachable) {
      const vStep = variantSteps.get(id);
      if (!vStep || !vStep.isReachable) {
        bypassedSteps.push(cStep);
      }
    }
  }

  // 3. Detect Modified Transitions for shared reachable steps
  for (const [id, vStep] of variantSteps.entries()) {
    if (vStep.isReachable && controlSteps.has(id)) {
      const cStep = controlSteps.get(id)!;
      if (cStep.isReachable && cStep.targetString !== vStep.targetString && cStep.nextDesc !== vStep.nextDesc) {
        modifiedTransitions.push({
          stepId: id,
          stepTitle: vStep.title,
          controlTarget: cStep.nextDesc ?? '[None]',
          variantTarget: vStep.nextDesc ?? '[None]',
        });
      }
    }
  }

  // Generate impact narrative and tags
  const delta = variantReachableCount - controlReachableCount;
  const narrativeParts: string[] = [];

  if (addedSteps.length > 0) {
    // Only display top-level or significant added steps in summary
    const topAdded = addedSteps.filter((s) => !s.subflowId || addedSteps.length <= 2);
    const addedNames = topAdded.map((s) => `"${s.title}"`).join(', ');
    narrativeParts.push(`Introduces ${topAdded.length} new step${topAdded.length > 1 ? 's' : ''}: ${addedNames}.`);
    tags.push(`+${topAdded.length} Step${topAdded.length > 1 ? 's' : ''}`);
    if (addedNames.toLowerCase().includes('upgrade') || addedNames.toLowerCase().includes('upsell') || addedNames.toLowerCase().includes('pricing')) {
      tags.push('Monetization');
    }
  }

  if (bypassedSteps.length > 0) {
    const topBypassed = bypassedSteps.filter((s) => !s.subflowId || bypassedSteps.length <= 2);
    const bypassedNames = topBypassed.map((s) => `"${s.title}"`).join(', ');
    narrativeParts.push(`Bypasses ${topBypassed.length} step${topBypassed.length > 1 ? 's' : ''}: ${bypassedNames}.`);
    tags.push(`-${topBypassed.length} Step${topBypassed.length > 1 ? 's' : ''}`);
    tags.push('Fast-Track');
  }

  if (modifiedTransitions.length > 0) {
    const transDesc = modifiedTransitions
      .map((t) => `"${t.stepTitle}" redirects to "${t.variantTarget}" instead of "${t.controlTarget}"`)
      .join('; ');
    narrativeParts.push(`Altered path transitions: ${transDesc}.`);
    if (!tags.includes('Altered Paths')) tags.push('Altered Paths');
  }

  if (narrativeParts.length === 0) {
    narrativeParts.push('Step structure matches control with variant-specific configuration values.');
    tags.push('Config Variant');
  }

  return {
    journeyId: journey.id,
    variantKey,
    controlStepCount: controlReachableCount,
    variantStepCount: variantReachableCount,
    stepCountDelta: delta,
    addedSteps,
    bypassedSteps,
    modifiedTransitions,
    impactNarrative: narrativeParts.join(' '),
    tags,
  };
}
