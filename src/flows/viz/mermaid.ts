import { registry } from '../core/registry';
import type { FlowDefinition, JourneyDefinition, StepDefinition } from '../core/types';

export interface ResolvedBranch {
  target: string;
  label?: string;
  condition?: string;
}

export interface ResolvedTransition {
  isConditional: boolean;
  decisionLabel?: string;
  branches: ResolvedBranch[];
}

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function escapeLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;');
}

/**
 * Resolves static or dynamic transitions (next / onComplete) into concrete target steps
 * and human-readable branch decision labels.
 */
export function resolveStepTransition(
  transition: any,
  knownStepIds: string[],
  stepTitle?: string,
  explicitBranches?: Array<{ target: string; label?: string; condition?: string }>,
  explicitDecisionLabel?: string
): ResolvedTransition {
  if (explicitBranches && explicitBranches.length > 0) {
    return {
      isConditional: explicitBranches.length > 1,
      decisionLabel: explicitDecisionLabel ?? (stepTitle ? `${stepTitle}?` : 'Decision?'),
      branches: explicitBranches,
    };
  }

  if (!transition) {
    return { isConditional: false, branches: [] };
  }

  if (typeof transition === 'string') {
    return {
      isConditional: false,
      branches: [{ target: transition }],
    };
  }

  if (typeof transition === 'function') {
    const fnStr = transition.toString().trim();

    // 1. Single unconditional return: () => 'target' or (ctx) => 'target'
    const simpleReturnMatch = fnStr.match(
      /^(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*(?:\{\s*return\s+)?['"`]([a-zA-Z0-9_-]+)['"`]/
    );
    if (simpleReturnMatch && !fnStr.includes('?') && !fnStr.includes('if')) {
      const target = simpleReturnMatch[1];
      if (knownStepIds.includes(target)) {
        return {
          isConditional: false,
          branches: [{ target }],
        };
      }
    }

    // 2. Ternary conditional: condition ? 'targetTrue' : 'targetFalse'
    const ternaryMatch = fnStr.match(
      /([a-zA-Z0-9_$.?!=<>\s'"()]+?)\s*\?\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*:\s*['"`]([a-zA-Z0-9_-]+)['"`]/
    );

    if (ternaryMatch) {
      const rawCondition = ternaryMatch[1].trim();
      const targetTrue = ternaryMatch[2];
      const targetFalse = ternaryMatch[3];

      let trueLabel = 'True';
      let falseLabel = 'False';
      let decisionLabel = stepTitle ? `${stepTitle}?` : 'Condition?';

      if (rawCondition.includes('isExistingUser')) {
        decisionLabel = 'Existing User?';
        trueLabel = 'Existing User';
        falseLabel = 'New User';
      } else if (rawCondition.includes('firstName')) {
        decisionLabel = 'First Name Provided?';
        trueLabel = 'Has Name';
        falseLabel = 'Missing Name';
      } else if (rawCondition.includes('otp')) {
        decisionLabel = 'Auth Method?';
        trueLabel = 'Email OTP';
        falseLabel = 'Password';
      } else {
        const cleanCond = rawCondition
          .replace(/^.*[?.]([a-zA-Z0-9_]+)$/, '$1')
          .replace(/===/g, '=');
        decisionLabel = `${cleanCond}?`;
        trueLabel = 'Yes';
        falseLabel = 'No';
      }

      return {
        isConditional: true,
        decisionLabel,
        branches: [
          { target: targetTrue, label: trueLabel, condition: rawCondition },
          { target: targetFalse, label: falseLabel, condition: `not (${rawCondition})` },
        ],
      };
    }

    // 3. Fallback: extract string literals matching knownStepIds
    const matches: string[] = [];
    const regex = /['"`]([a-zA-Z0-9_-]+)['"`]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(fnStr)) !== null) {
      if (knownStepIds.includes(match[1])) {
        matches.push(match[1]);
      }
    }

    const uniqueTargets = Array.from(new Set(matches));
    if (uniqueTargets.length === 1) {
      return {
        isConditional: false,
        branches: [{ target: uniqueTargets[0] }],
      };
    } else if (uniqueTargets.length > 1) {
      return {
        isConditional: true,
        decisionLabel: stepTitle ? `${stepTitle}?` : 'Decision?',
        branches: uniqueTargets.map((target) => ({
          target,
          label: target,
        })),
      };
    }
  }

  return { isConditional: false, branches: [] };
}

/**
 * Generates a clean, top-down Mermaid flowchart (flowchart TD) for a given flow definition.
 */
export function flowToMermaid(flow: FlowDefinition, indent = '  '): string {
  const lines: string[] = [];
  const knownStepIds = Object.keys(flow.steps);

  const decisionNodes: string[] = [];
  const terminalNodes: string[] = ['Start'];
  const subflowStepNodes: string[] = [];

  let hasTerminalTransition = false;

  // Entry point at the top
  const initialSafeId = sanitizeId(flow.initial);
  lines.push(`${indent}Start([Start]) --> ${initialSafeId}`);

  for (const [stepId, step] of Object.entries(flow.steps)) {
    const safeId = sanitizeId(stepId);
    const title = escapeLabel(step.title ?? stepId);

    if (step.type === 'subflow') {
      try {
        const subflowDef = registry.resolveFlow(step.subflow, step.variant);
        const subflowKnownIds = Object.keys(subflowDef.steps);

        lines.push('');
        lines.push(`${indent}subgraph ${safeId} ["${title} (Subflow)"]`);
        lines.push(`${indent}  direction TB`);

        for (const [subStepId, subStep] of Object.entries(subflowDef.steps)) {
          const innerNodeId = `${safeId}__${sanitizeId(subStepId)}`;
          const innerTitle = escapeLabel(subStep.title ?? subStepId);

          const innerTransition = resolveStepTransition(
            (subStep as any).next,
            subflowKnownIds,
            subStep.title,
            (subStep as any).branches,
            (subStep as any).decisionLabel
          );

          if (subStep.type === 'action' && innerTransition.isConditional) {
            // Render action as decision diamond directly
            const decId = innerNodeId;
            const decLabel = escapeLabel(innerTransition.decisionLabel ?? innerTitle);
            lines.push(`${indent}  ${decId}{"${decLabel}"}`);
            decisionNodes.push(decId);

            for (const branch of innerTransition.branches) {
              const targetNodeId = `${safeId}__${sanitizeId(branch.target)}`;
              const branchLabel = branch.label ? `|${escapeLabel(branch.label)}| ` : '';
              lines.push(`${indent}  ${decId} -->${branchLabel}${targetNodeId}`);
            }
          } else {
            lines.push(`${indent}  ${innerNodeId}["${innerTitle}"]`);
            subflowStepNodes.push(innerNodeId);

            if (innerTransition.isConditional) {
              const decId = `decision_${innerNodeId}`;
              const decLabel = escapeLabel(innerTransition.decisionLabel ?? 'Decision?');
              lines.push(`${indent}  ${decId}{"${decLabel}"}`);
              decisionNodes.push(decId);

              lines.push(`${indent}  ${innerNodeId} --> ${decId}`);
              for (const branch of innerTransition.branches) {
                const targetNodeId = `${safeId}__${sanitizeId(branch.target)}`;
                const branchLabel = branch.label ? `|${escapeLabel(branch.label)}| ` : '';
                lines.push(`${indent}  ${decId} -->${branchLabel}${targetNodeId}`);
              }
            } else if (innerTransition.branches.length === 1) {
              const targetNodeId = `${safeId}__${sanitizeId(innerTransition.branches[0].target)}`;
              lines.push(`${indent}  ${innerNodeId} --> ${targetNodeId}`);
            }
          }
        }

        lines.push(`${indent}end`);

        // Connect subflow onComplete
        const subflowTransition = resolveStepTransition(
          (step as any).onComplete,
          knownStepIds,
          step.title,
          (step as any).branches,
          (step as any).decisionLabel
        );

        if (subflowTransition.isConditional) {
          const decId = `decision_${safeId}`;
          const decLabel = escapeLabel(subflowTransition.decisionLabel ?? 'Decision?');
          lines.push(`${indent}${safeId} --> ${decId}{"${decLabel}"}`);
          decisionNodes.push(decId);

          for (const branch of subflowTransition.branches) {
            const branchLabel = branch.label ? `|${escapeLabel(branch.label)}| ` : '';
            lines.push(`${indent}${decId} -->${branchLabel}${sanitizeId(branch.target)}`);
          }
        } else if (subflowTransition.branches.length === 1) {
          lines.push(`${indent}${safeId} --> ${sanitizeId(subflowTransition.branches[0].target)}`);
        } else {
          lines.push(`${indent}${safeId} --> Finish([Complete])`);
          hasTerminalTransition = true;
        }
      } catch {
        lines.push(`${indent}${safeId}["${title} (External Subflow)"]`);
      }
    } else if (step.type === 'action') {
      const stepTransition = resolveStepTransition(
        (step as any).next,
        knownStepIds,
        step.title,
        (step as any).branches,
        (step as any).decisionLabel
      );

      if (stepTransition.isConditional) {
        const decId = safeId;
        const decLabel = escapeLabel(stepTransition.decisionLabel ?? title);
        lines.push(`${indent}${decId}{"${decLabel}"}`);
        decisionNodes.push(decId);

        for (const branch of stepTransition.branches) {
          const branchLabel = branch.label ? `|${escapeLabel(branch.label)}| ` : '';
          lines.push(`${indent}${decId} -->${branchLabel}${sanitizeId(branch.target)}`);
        }
      } else {
        lines.push(`${indent}${safeId}["${title}"]`);
        if (stepTransition.branches.length === 1) {
          lines.push(`${indent}${safeId} --> ${sanitizeId(stepTransition.branches[0].target)}`);
        } else {
          lines.push(`${indent}${safeId} --> Finish([Complete])`);
          hasTerminalTransition = true;
        }
      }
    } else {
      // Screen step
      lines.push(`${indent}${safeId}["${title}"]`);

      const stepTransition = resolveStepTransition(
        (step as any).next,
        knownStepIds,
        step.title,
        (step as any).branches,
        (step as any).decisionLabel
      );

      if (stepTransition.isConditional) {
        const decId = `decision_${safeId}`;
        const decLabel = escapeLabel(stepTransition.decisionLabel ?? 'Decision?');
        lines.push(`${indent}${safeId} --> ${decId}{"${decLabel}"}`);
        decisionNodes.push(decId);

        for (const branch of stepTransition.branches) {
          const branchLabel = branch.label ? `|${escapeLabel(branch.label)}| ` : '';
          lines.push(`${indent}${decId} -->${branchLabel}${sanitizeId(branch.target)}`);
        }
      } else if (stepTransition.branches.length === 1) {
        lines.push(`${indent}${safeId} --> ${sanitizeId(stepTransition.branches[0].target)}`);
      } else {
        lines.push(`${indent}${safeId} --> Finish([Complete])`);
        hasTerminalTransition = true;
      }

      // Event transitions
      if ('on' in step && step.on) {
        for (const [event, target] of Object.entries(step.on)) {
          if (typeof target === 'string') {
            lines.push(`${indent}${safeId} -->|on: ${escapeLabel(event)}| ${sanitizeId(target)}`);
          } else {
            const eventTransition = resolveStepTransition(target, knownStepIds, event);
            if (eventTransition.branches.length > 0) {
              for (const b of eventTransition.branches) {
                lines.push(`${indent}${safeId} -->|on: ${escapeLabel(event)}| ${sanitizeId(b.target)}`);
              }
            } else {
              lines.push(`${indent}${safeId} -->|on: ${escapeLabel(event)}| Finish([Complete])`);
              hasTerminalTransition = true;
            }
          }
        }
      }
    }
  }

  if (hasTerminalTransition) {
    terminalNodes.push('Finish');
  }

  // Theme styling classes
  lines.push('');
  lines.push(`${indent}classDef default fill:#1e293b,stroke:#38bdf8,stroke-width:1.5px,color:#f8fafc;`);
  lines.push(`${indent}classDef decision fill:#0f172a,stroke:#f59e0b,stroke-width:1.5px,color:#f8fafc;`);
  lines.push(`${indent}classDef terminal fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#f8fafc;`);
  lines.push(`${indent}classDef subflowStep fill:#1e1b4b,stroke:#a855f7,stroke-width:1.5px,color:#f8fafc;`);

  if (terminalNodes.length > 0) {
    lines.push(`${indent}class ${Array.from(new Set(terminalNodes)).join(',')} terminal;`);
  }
  if (decisionNodes.length > 0) {
    lines.push(`${indent}class ${Array.from(new Set(decisionNodes)).join(',')} decision;`);
  }
  if (subflowStepNodes.length > 0) {
    lines.push(`${indent}class ${Array.from(new Set(subflowStepNodes)).join(',')} subflowStep;`);
  }

  return lines.join('\n');
}

/**
 * Generates Mermaid code for an entire journey variant.
 */
export function journeyToMermaid(
  journey: JourneyDefinition,
  variant = 'control'
): string {
  const flow = journey.variants[variant] ?? journey.variants.control;
  if (!flow) {
    throw new Error(`Variant "${variant}" not found for journey "${journey.id}".`);
  }

  const lines: string[] = [];
  lines.push('flowchart TD');
  lines.push(`  %% Journey: ${journey.name} (Variant: ${variant})`);
  lines.push(flowToMermaid(flow, '  '));

  return lines.join('\n');
}

/**
 * Generates Mermaid code with diff highlighting comparing the variant to control.
 */
export function journeyToDiffMermaid(
  journey: JourneyDefinition,
  variant = 'control',
  diff?: import('./diff').FlowDiffResult
): string {
  const flow = journey.variants[variant] ?? journey.variants.control;
  if (!flow) {
    throw new Error(`Variant "${variant}" not found for journey "${journey.id}".`);
  }

  if (variant === 'control') {
    return journeyToMermaid(journey, 'control');
  }

  const diffResult = diff ?? require('./diff').computeJourneyDiff(journey, variant);
  const baseLines = flowToMermaid(flow, '  ');

  const lines: string[] = [];
  lines.push('flowchart TD');
  lines.push(`  %% Journey: ${journey.name} (Variant: ${variant} - Diff vs Control)`);
  lines.push(baseLines);

  // Render bypassed nodes if any
  if (diffResult.bypassedSteps.length > 0) {
    lines.push('');
    lines.push('  subgraph bypassedSection ["⚡ Bypassed / Skipped in this Variant"]');
    lines.push('    direction TB');
    for (const bStep of diffResult.bypassedSteps) {
      const bId = `bypassed_${sanitizeId(bStep.id)}`;
      lines.push(`    ${bId}["~ ${escapeLabel(bStep.title)} (Skipped) ~"]`);
      lines.push(`    class ${bId} diffBypassed;`);
    }
    lines.push('  end');
    lines.push('  class bypassedSection diffBypassedSub;');
  }

  // Highlight added nodes
  const addedNodeIds: string[] = [];
  for (const aStep of diffResult.addedSteps) {
    if (aStep.subflowId) {
      addedNodeIds.push(`${sanitizeId(aStep.subflowId)}__${sanitizeId(aStep.id.split('__')[1] || aStep.id)}`);
    } else {
      addedNodeIds.push(sanitizeId(aStep.id));
    }
  }

  // Highlight modified nodes
  const modNodeIds: string[] = [];
  for (const mStep of diffResult.modifiedTransitions) {
    modNodeIds.push(sanitizeId(mStep.stepId));
  }

  lines.push('');
  lines.push('  classDef diffAdded fill:#064e3b,stroke:#10b981,stroke-width:2.5px,color:#a7f3d0;');
  lines.push('  classDef diffBypassed fill:#450a0a,stroke:#ef4444,stroke-width:1.5px,stroke-dasharray: 4 4,color:#fca5a5;');
  lines.push('  classDef diffBypassedSub fill:#1c1917,stroke:#78350f,stroke-width:1px,stroke-dasharray: 4 4,color:#fed7aa;');
  lines.push('  classDef diffModified fill:#1e293b,stroke:#f59e0b,stroke-width:2.5px,color:#fde68a;');

  if (addedNodeIds.length > 0) {
    lines.push(`  class ${addedNodeIds.join(',')} diffAdded;`);
  }
  if (modNodeIds.length > 0) {
    lines.push(`  class ${modNodeIds.join(',')} diffModified;`);
  }

  return lines.join('\n');
}
