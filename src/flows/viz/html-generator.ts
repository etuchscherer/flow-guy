import type { JourneyDefinition } from '../core/types';
import type { JourneyExperimentMapping } from '../ab/types';
import { computeJourneyDiff } from './diff';
import { journeyToDiffMermaid, journeyToMermaid, resolveStepTransition } from './mermaid';

export function generateHtmlVisualizer(
  journeys: JourneyDefinition[],
  abMappings: JourneyExperimentMapping[] = []
): string {
  const mappingMap = new Map<string, JourneyExperimentMapping>();
  for (const m of abMappings) {
    mappingMap.set(m.journeyId, m);
  }

  const journeysData = journeys.map((j) => {
    const abMapping = mappingMap.get(j.id);
    const variantsData: Record<string, any> = {};

    for (const [vKey, flow] of Object.entries(j.variants)) {
      const knownStepIds = Object.keys(flow.steps);
      const steps = Object.entries(flow.steps).map(([stepId, s]) => {
        const transition = s.type === 'subflow' ? (s as any).onComplete : (s as any).next;
        const res = resolveStepTransition(
          transition,
          knownStepIds,
          s.title,
          (s as any).branches,
          (s as any).decisionLabel
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

        const component = (s as any).component;
        const componentName = component?.displayName || component?.name || undefined;

        return {
          id: stepId,
          title: s.title ?? stepId,
          type: s.type ?? 'screen',
          description: s.description ?? '',
          next: nextDesc,
          componentName,
        };
      });

      const diff = computeJourneyDiff(j, vKey);
      const standardMermaid = journeyToMermaid(j, vKey);
      const diffMermaid = journeyToDiffMermaid(j, vKey, diff);

      variantsData[vKey] = {
        mermaid: standardMermaid,
        diffMermaid,
        diff,
        steps,
      };
    }

    return {
      id: j.id,
      name: j.name,
      description: j.description ?? '',
      defaultVariant: j.defaultVariant ?? 'control',
      experiment: abMapping
        ? {
            name: abMapping.experimentName,
            variantMap: abMapping.variantMap,
            events: abMapping.events,
          }
        : null,
      variants: variantsData,
    };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Orchestrator & A/B Diff Workbench</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-elevated: #1e293b;
      --border: #334155;
      --border-subtle: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --accent: #a855f7;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      padding: 0.75rem 1.5rem;
      background-color: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .brand-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .badge {
      font-size: 0.7rem;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 700;
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-transform: uppercase;
    }
    .view-modes {
      display: flex;
      background: #0b1120;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--border);
      gap: 2px;
    }
    .mode-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.35rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mode-btn.active {
      background: var(--primary);
      color: #0b1120;
      font-weight: 700;
    }
    .presets-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .preset-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .preset-btn {
      background: #1e293b;
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preset-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    /* Left Panel: Matrix */
    .matrix-panel {
      width: 320px;
      min-width: 280px;
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .matrix-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .journey-card {
      background: #0b1120;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }
    .journey-card.selected {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .journey-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .journey-card-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text);
    }
    .exp-badge {
      font-size: 0.65rem;
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.4);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
    }
    .variant-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.45rem 0.6rem;
      border-radius: 6px;
      background: #111827;
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.15s ease;
    }
    .variant-option:hover {
      border-color: var(--border);
    }
    .variant-option.active {
      background: rgba(56, 189, 248, 0.1);
      border-color: var(--primary);
    }
    .variant-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tag-chip {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .tag-baseline {
      background: #1e293b;
      color: #94a3b8;
    }
    .tag-added {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .tag-bypassed {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .tag-monetization {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    /* Canvas / Center */
    .canvas-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      background: radial-gradient(circle at 50% 50%, #1e293b 0%, #090d16 100%);
    }
    .canvas-toolbar {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 10;
      display: flex;
      gap: 0.4rem;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(8px);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .tool-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .tool-btn:hover {
      background: #1e293b;
      color: var(--text);
    }
    .diagram-scroll-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }
    .diagram-split-container {
      flex: 1;
      display: none;
      overflow: auto;
      gap: 1.5rem;
      padding: 2rem;
    }
    .split-col {
      flex: 1;
      min-width: 480px;
      background: rgba(17, 24, 39, 0.7);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .split-col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }
    .split-col-title {
      font-size: 1rem;
      font-weight: 800;
    }
    .diagram-wrapper {
      background: rgba(17, 24, 39, 0.7);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
      transform-origin: center center;
      transition: transform 0.1s ease;
      min-width: 550px;
      display: flex;
      justify-content: center;
    }
    .mermaid {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    /* Right Panel: Impact & Step Inspector */
    .inspector-panel {
      width: 380px;
      min-width: 320px;
      background: var(--card-bg);
      border-left: 1px solid var(--border);
      overflow-y: auto;
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .impact-card {
      background: #0b1120;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .impact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .impact-badge {
      font-size: 0.7rem;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .impact-narrative {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.45;
    }
    .stat-row {
      display: flex;
      gap: 0.6rem;
      margin-top: 0.3rem;
    }
    .stat-box {
      flex: 1;
      background: #111827;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-label {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
    }
    .stat-value {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text);
    }
    .stat-delta {
      font-size: 0.75rem;
      font-weight: 700;
    }
    .delta-plus { color: #34d399; }
    .delta-minus { color: #f87171; }
    .delta-neutral { color: #94a3b8; }
    /* Diff Breakdown Lists */
    .diff-list-section {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .diff-list-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .diff-pill {
      font-size: 0.75rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pill-added {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #a7f3d0;
    }
    .pill-bypassed {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      text-decoration: line-through;
    }
    .pill-modified {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fde68a;
    }
    /* Steps Table */
    .steps-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .steps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .steps-table th, .steps-table td {
      padding: 0.5rem 0.4rem;
      text-align: left;
      border-bottom: 1px solid var(--border-subtle);
    }
    .steps-table th {
      color: var(--text-muted);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .component-tag {
      font-size: 0.7rem;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="brand-title">⚡ Flow Orchestrator Workbench</span>
      <span class="badge">A/B Diff Visualizer</span>
    </div>

    <!-- Mode Selector: Single, Diff, Side-by-Side -->
    <div class="view-modes">
      <button id="mode-single" class="mode-btn" onclick="setViewMode('single')">Single View</button>
      <button id="mode-diff" class="mode-btn active" onclick="setViewMode('diff')">Visual Diff vs Control</button>
      <button id="mode-split" class="mode-btn" onclick="setViewMode('split')">Side-by-Side (Split)</button>
    </div>

    <!-- Persona App Presets -->
    <div class="presets-group">
      <span class="preset-label">Presets:</span>
      <button class="preset-btn" onclick="applyPreset('control')">All Control</button>
      <button class="preset-btn" onclick="applyPreset('all-treatments')">All Treatments</button>
      <button class="preset-btn" onclick="applyPreset('monetization')">Monetization Focus</button>
      <button class="preset-btn" onclick="applyPreset('fast-track')">Fast-Track</button>
    </div>
  </header>

  <main>
    <!-- Left Panel: Variant Matrix & Checkbox Controller -->
    <aside class="matrix-panel">
      <div class="matrix-header">
        <span class="matrix-title">Variant Matrix</span>
        <span id="matrix-summary" style="font-size: 0.7rem; color: var(--text-muted);"></span>
      </div>

      <div id="journeys-matrix-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
    </aside>

    <!-- Center Canvas -->
    <section class="canvas-panel">
      <div class="canvas-toolbar">
        <button class="tool-btn" onclick="zoomIn()" title="Zoom In">+</button>
        <button class="tool-btn" onclick="zoomOut()" title="Zoom Out">-</button>
        <button class="tool-btn" onclick="resetZoom()" title="Reset Zoom">1:1</button>
        <div style="width: 1px; height: 18px; background: var(--border); margin: 0 4px; align-self: center;"></div>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.7rem; padding: 0 4px;">
          <span style="display: flex; align-items: center; gap: 4px; color: #a7f3d0;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #10b981;"></span>+ Added</span>
          <span style="display: flex; align-items: center; gap: 4px; color: #fde68a;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #f59e0b;"></span>↔ Path Altered</span>
          <span style="display: flex; align-items: center; gap: 4px; color: #fca5a5;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #ef4444;"></span>⚡ Bypassed</span>
        </div>
      </div>

      <!-- Single / Diff View Canvas -->
      <div id="single-canvas" class="diagram-scroll-container">
        <div id="diagram-wrapper" class="diagram-wrapper">
          <div id="mermaid-graph" class="mermaid"></div>
        </div>
      </div>

      <!-- Side-by-Side Split View Canvas -->
      <div id="split-canvas" class="diagram-split-container">
        <div class="split-col">
          <div class="split-col-header">
            <span class="split-col-title">Control (Baseline)</span>
            <span class="tag-chip tag-baseline">Default</span>
          </div>
          <div id="mermaid-control-split" class="mermaid"></div>
        </div>

        <div class="split-col">
          <div class="split-col-header">
            <span class="split-col-title" id="split-variant-title">Variant</span>
            <span class="tag-chip tag-added" id="split-variant-tag">Treatment</span>
          </div>
          <div id="mermaid-variant-split" class="mermaid"></div>
        </div>
      </div>
    </section>

    <!-- Right Panel: Impact & Step Inspector -->
    <aside class="inspector-panel">
      <div class="impact-card">
        <div class="impact-header">
          <span class="impact-badge" id="inspector-variant-title">Variant Impact</span>
          <span id="inspector-tag-container"></span>
        </div>
        <p class="impact-narrative" id="inspector-narrative"></p>

        <div class="stat-row">
          <div class="stat-box">
            <span class="stat-label">Steps in Flow</span>
            <span class="stat-value" id="stat-steps">0</span>
            <span class="stat-delta" id="stat-delta">0</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Statsig Experiment</span>
            <span class="stat-value" id="stat-exp" style="font-size: 0.8rem; font-family: monospace;">None</span>
          </div>
        </div>
      </div>

      <!-- Diff Breakdown Section -->
      <div id="diff-breakdown-section" class="diff-list-section">
        <span class="diff-list-title" style="color: var(--primary);">Variant Changes vs Baseline</span>
        <div id="diff-pills-container" style="display: flex; flex-direction: column; gap: 0.35rem;"></div>
      </div>

      <!-- Steps Table -->
      <div class="steps-section">
        <span class="diff-list-title" style="color: var(--text-muted);">Step Navigation & Components</span>
        <table class="steps-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Type</th>
              <th>Next Target</th>
            </tr>
          </thead>
          <tbody id="steps-tbody"></tbody>
        </table>
      </div>
    </aside>
  </main>

  <script>
    const journeys = ${JSON.stringify(journeysData, null, 2)};

    let activeJourneyId = journeys[0]?.id || '';
    // Store user choices per journey: { [journeyId]: variantKey }
    const selectedVariants = {};
    journeys.forEach(j => {
      selectedVariants[j.id] = j.defaultVariant || 'control';
    });

    let viewMode = 'diff'; // 'single' | 'diff' | 'split'
    let zoomLevel = 1.0;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis'
      }
    });

    // Zoom Helpers
    function zoomIn() {
      zoomLevel = Math.min(2.5, zoomLevel + 0.15);
      applyZoom();
    }
    function zoomOut() {
      zoomLevel = Math.max(0.4, zoomLevel - 0.15);
      applyZoom();
    }
    function resetZoom() {
      zoomLevel = 1.0;
      applyZoom();
    }
    function applyZoom() {
      const wrapper = document.getElementById('diagram-wrapper');
      if (wrapper) wrapper.style.transform = 'scale(' + zoomLevel + ')';
    }

    // View Mode Setter
    function setViewMode(mode) {
      viewMode = mode;
      document.getElementById('mode-single').classList.toggle('active', mode === 'single');
      document.getElementById('mode-diff').classList.toggle('active', mode === 'diff');
      document.getElementById('mode-split').classList.toggle('active', mode === 'split');

      const singleCanvas = document.getElementById('single-canvas');
      const splitCanvas = document.getElementById('split-canvas');

      if (mode === 'split') {
        singleCanvas.style.display = 'none';
        splitCanvas.style.display = 'flex';
      } else {
        singleCanvas.style.display = 'flex';
        splitCanvas.style.display = 'none';
      }

      render();
    }

    // Presets
    function applyPreset(presetName) {
      if (presetName === 'control') {
        journeys.forEach(j => {
          selectedVariants[j.id] = 'control';
        });
      } else if (presetName === 'all-treatments') {
        journeys.forEach(j => {
          const keys = Object.keys(j.variants).filter(k => k !== 'control');
          selectedVariants[j.id] = keys[0] || 'control';
        });
      } else if (presetName === 'monetization') {
        journeys.forEach(j => {
          if (j.id === 'auth') selectedVariants[j.id] = 'auth-with-upgrade-sheet';
          else selectedVariants[j.id] = 'control';
        });
      } else if (presetName === 'fast-track') {
        journeys.forEach(j => {
          if (j.id === 'sticker-workflow') selectedVariants[j.id] = 'quick-smash';
          else selectedVariants[j.id] = 'control';
        });
      }
      renderMatrix();
      render();
    }

    // Render Matrix Panel
    function renderMatrix() {
      const list = document.getElementById('journeys-matrix-list');
      list.innerHTML = '';

      let treatmentCount = 0;

      journeys.forEach(j => {
        const isSelected = j.id === activeJourneyId;
        const currentVariant = selectedVariants[j.id];
        if (currentVariant !== 'control') treatmentCount++;

        const card = document.createElement('div');
        card.className = 'journey-card' + (isSelected ? ' selected' : '');
        card.onclick = () => {
          activeJourneyId = j.id;
          renderMatrix();
          render();
        };

        const expBadge = j.experiment
          ? '<span class="exp-badge">' + j.experiment.name + '</span>'
          : '';

        let variantsHtml = '';
        Object.keys(j.variants).forEach(vKey => {
          const vData = j.variants[vKey];
          const isActive = currentVariant === vKey;
          let tagClass = 'tag-baseline';
          let tagText = 'Baseline';

          if (vData.diff && vData.diff.tags && vData.diff.tags.length > 0) {
            tagText = vData.diff.tags[0];
            if (tagText.startsWith('+')) tagClass = 'tag-added';
            else if (tagText.startsWith('-')) tagClass = 'tag-bypassed';
            else if (tagText === 'Monetization') tagClass = 'tag-monetization';
          }

          variantsHtml += \`
            <div class="variant-option \${isActive ? 'active' : ''}" onclick="selectVariant('\${j.id}', '\${vKey}', event)">
              <div class="variant-left">
                <input type="radio" name="matrix-\${j.id}" \${isActive ? 'checked' : ''} style="cursor: pointer;" />
                <span>\${vKey}</span>
              </div>
              <span class="tag-chip \${tagClass}">\${tagText}</span>
            </div>
          \`;
        });

        card.innerHTML = \`
          <div class="journey-card-header">
            <span class="journey-card-title">\${j.name}</span>
            \${expBadge}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.2rem;">
            \${variantsHtml}
          </div>
        \`;

        list.appendChild(card);
      });

      document.getElementById('matrix-summary').textContent =
        treatmentCount + ' of ' + journeys.length + ' in Treatment';
    }

    function selectVariant(journeyId, variantKey, event) {
      if (event) event.stopPropagation();
      selectedVariants[journeyId] = variantKey;
      activeJourneyId = journeyId;
      renderMatrix();
      render();
    }

    // Render Canvas & Inspector
    function render() {
      const journey = journeys.find(j => j.id === activeJourneyId) || journeys[0];
      if (!journey) return;

      const variantKey = selectedVariants[journey.id] || 'control';
      const variantData = journey.variants[variantKey] || journey.variants['control'];
      const controlData = journey.variants['control'];
      const diff = variantData.diff;

      // 1. Update Inspector Panel
      document.getElementById('inspector-variant-title').textContent =
        journey.name + ' (' + variantKey + ')';

      const tagContainer = document.getElementById('inspector-tag-container');
      tagContainer.innerHTML = '';
      if (diff && diff.tags) {
        diff.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 'tag-chip ' + (t.startsWith('+') ? 'tag-added' : t.startsWith('-') ? 'tag-bypassed' : 'tag-monetization');
          span.textContent = t;
          span.style.marginLeft = '4px';
          tagContainer.appendChild(span);
        });
      }

      document.getElementById('inspector-narrative').textContent =
        diff ? diff.impactNarrative : 'Standard baseline flow.';

      document.getElementById('stat-steps').textContent = variantData.steps.length;
      const deltaEl = document.getElementById('stat-delta');
      if (diff && diff.stepCountDelta !== 0) {
        deltaEl.textContent = (diff.stepCountDelta > 0 ? '+' : '') + diff.stepCountDelta + ' vs control';
        deltaEl.className = 'stat-delta ' + (diff.stepCountDelta > 0 ? 'delta-plus' : 'delta-minus');
      } else {
        deltaEl.textContent = 'Identical to control';
        deltaEl.className = 'stat-delta delta-neutral';
      }

      document.getElementById('stat-exp').textContent =
        journey.experiment ? journey.experiment.name : 'Unmapped';

      // Diff Breakdown Pills
      const pillsContainer = document.getElementById('diff-pills-container');
      pillsContainer.innerHTML = '';

      if (diff && (diff.addedSteps.length > 0 || diff.bypassedSteps.length > 0 || diff.modifiedTransitions.length > 0)) {
        diff.addedSteps.forEach(s => {
          const div = document.createElement('div');
          div.className = 'diff-pill pill-added';
          div.innerHTML = '<span><strong>+ ADDED:</strong> ' + s.title + '</span><span class="badge" style="font-size: 0.6rem;">New</span>';
          pillsContainer.appendChild(div);
        });
        diff.bypassedSteps.forEach(s => {
          const div = document.createElement('div');
          div.className = 'diff-pill pill-bypassed';
          div.innerHTML = '<span><strong>⚡ BYPASSED:</strong> ' + s.title + '</span><span class="badge" style="font-size: 0.6rem; color: #f87171; border-color: #f87171;">Skipped</span>';
          pillsContainer.appendChild(div);
        });
        diff.modifiedTransitions.forEach(t => {
          const div = document.createElement('div');
          div.className = 'diff-pill pill-modified';
          div.innerHTML = '<span><strong>↔ MODIFIED:</strong> ' + t.stepTitle + '</span><span style="font-size: 0.65rem;">' + t.variantTarget + '</span>';
          pillsContainer.appendChild(div);
        });
      } else {
        const div = document.createElement('div');
        div.className = 'diff-pill';
        div.style.background = '#111827';
        div.style.color = '#94a3b8';
        div.textContent = 'No structural step differences in this variant.';
        pillsContainer.appendChild(div);
      }

      // Steps Table
      const tbody = document.getElementById('steps-tbody');
      tbody.innerHTML = '';
      variantData.steps.forEach(s => {
        const tr = document.createElement('tr');
        const compHtml = s.componentName ? '<br><span class="component-tag">' + s.componentName + '</span>' : '';
        tr.innerHTML = \`
          <td><strong>\${s.title}</strong><br><small style="color: #64748b;">\${s.id}</small>\${compHtml}</td>
          <td><span class="badge" style="font-size: 0.65rem;">\${s.type}</span></td>
          <td style="color: var(--primary);">\${s.next}</td>
        \`;
        tbody.appendChild(tr);
      });

      // 2. Render Mermaid Graphs
      if (viewMode === 'split') {
        const ctrlGraph = document.getElementById('mermaid-control-split');
        ctrlGraph.removeAttribute('data-processed');
        ctrlGraph.innerHTML = controlData.mermaid;

        document.getElementById('split-variant-title').textContent = variantKey.toUpperCase();
        const vGraph = document.getElementById('mermaid-variant-split');
        vGraph.removeAttribute('data-processed');
        vGraph.innerHTML = variantData.diffMermaid || variantData.mermaid;

        mermaid.run({ nodes: [ctrlGraph, vGraph] });
      } else {
        const graph = document.getElementById('mermaid-graph');
        graph.removeAttribute('data-processed');
        graph.innerHTML = viewMode === 'diff' ? variantData.diffMermaid : variantData.mermaid;
        mermaid.run({ nodes: [graph] });
      }
    }

    // Initial Bootstrap
    renderMatrix();
    setViewMode('diff');
  </script>
</body>
</html>`;
}
