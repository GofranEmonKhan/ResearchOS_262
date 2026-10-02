import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { ExperimentCard } from '../components/experiments/ExperimentCard.js';
import { CreateExperimentModal } from '../components/experiments/CreateExperimentModal.js';
import { SupervisorFlagModal } from '../components/experiments/SupervisorFlagModal.js';
import { ExperimentDetailModal } from '../components/experiments/ExperimentDetailModal.js';
import { ExperimentComparisonModal } from '../components/experiments/ExperimentComparisonModal.js';
import { ExperimentGraphicalVisualizer } from '../components/experiments/ExperimentGraphicalVisualizer.js';
import { CodePlayground } from '../components/experiments/CodePlayground.js';
import { SaveRunAsExperimentModal } from '../components/experiments/SaveRunAsExperimentModal.js';
import {
  Experiment,
  Project,
  AlignedMetricRow,
} from '@researchos/shared-types';

describe('Spec 04 — Experiment Tracker UI Component Tests', () => {
  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      ownerId: 'user-researcher',
      title: 'Multimodal Foundation Models',
      abstract: 'Investigating vision-language alignment models',
      domainTags: ['Vision', 'NLP'],
      startDate: '2026-01-15T00:00:00.000Z',
      isPersonal: false,
      status: 'Ongoing',
      progressPercent: 45,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    },
  ];

  const mockDraftExperiment: Experiment = {
    id: 'exp-101',
    projectId: 'proj-1',
    ownerId: 'user-researcher',
    name: 'CLIP-ViT-B32 Temperature Sweep',
    purpose: 'HyperparameterTuning',
    hypothesis: 'Lower softmax temperature below 0.05 will stabilize cross-modal contrastive convergence',
    date: '2026-09-02',
    config: {
      model: 'ViT-B/32',
      dataset: 'Conceptual-Captions-3M',
      hardware: '4x NVIDIA A100 80GB SXM4',
      codeCommit: 'a1b2c3d4e5',
      hyperparameters: {
        learning_rate: 0.0005,
        temperature: 0.03,
        batch_size: 256,
      },
    },
    metrics: {
      val_loss: 0.2841,
      top1_accuracy: 0.884,
      f1_macro: 0.867,
    },
    outputFileIds: [],
    observation: 'Contrastive loss stabilized 12 epochs earlier than baseline',
    status: 'Draft',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ownerName: 'Dr. Alice Curie',
  };

  const mockFinalExperiment: Experiment = {
    id: 'exp-102',
    projectId: 'proj-1',
    ownerId: 'user-researcher',
    name: 'ResNet50 Baseline Benchmark',
    purpose: 'Baseline',
    hypothesis: 'Baseline classification benchmark on standard ImageNet-1k',
    date: '2026-08-28',
    config: {
      model: 'ResNet-50-v2',
      dataset: 'ImageNet-1k',
      hardware: '2x NVIDIA RTX 4090',
      codeCommit: '8f9e0a1b2c',
      hyperparameters: {
        learning_rate: 0.01,
        batch_size: 128,
      },
    },
    metrics: {
      val_loss: 0.3812,
      top1_accuracy: 0.762,
    },
    outputFileIds: [],
    observation: 'Standard converged baseline benchmark',
    status: 'Final',
    createdAt: '2026-08-28T09:00:00.000Z',
    updatedAt: '2026-08-28T14:30:00.000Z',
    ownerName: 'Dr. Alice Curie',
  };

  const mockFlaggedExperiment: Experiment = {
    ...mockDraftExperiment,
    id: 'exp-103',
    name: 'BERT Fine-Tuning Run 4',
    flags: [
      {
        id: 'flag-1',
        experimentId: 'exp-103',
        flaggedBy: 'user-supervisor',
        type: 'NeedsRerun',
        note: 'Validation split had data leakage from train fold 3. Please rerun on clean test set.',
        raisedTaskId: 'task-rev-1',
        resolvedAt: null,
        createdAt: '2026-09-03T11:00:00.000Z',
      },
    ],
  };

  it('1. ExperimentCard renders name, purpose badge, status, and metadata', () => {
    const html = renderToString(
      <ExperimentCard
        experiment={mockDraftExperiment}
        isSelectedForCompare={false}
        isCompareMode={false}
      />
    );

    assert.ok(html.includes('CLIP-ViT-B32 Temperature Sweep'), 'Contains experiment name');
    assert.ok(html.includes('Hyperparameter Tuning'), 'Contains purpose badge label');
    assert.ok(html.includes('Draft'), 'Contains Draft status label');
    assert.ok(html.includes('ViT-B/32'), 'Contains model name from config');
    assert.ok(html.includes('Conceptual-Captions-3M'), 'Contains dataset name from config');
    assert.ok(html.includes('Dr. Alice Curie'), 'Contains researcher owner name');
  });

  it('2. ExperimentCard displays lock icon and Final benchmark styling when finalized', () => {
    const html = renderToString(
      <ExperimentCard
        experiment={mockFinalExperiment}
        isSelectedForCompare={false}
        isCompareMode={false}
      />
    );

    assert.ok(html.includes('Baseline'), 'Contains Baseline purpose label');
    assert.ok(html.includes('Final'), 'Contains Final status indicator');
    assert.ok(html.includes('ImageNet-1k'), 'Contains dataset');
  });

  it('3. ExperimentCard displays alert banner when unresolved supervisor flag exists', () => {
    const html = renderToString(
      <ExperimentCard
        experiment={mockFlaggedExperiment}
        isSelectedForCompare={false}
        isCompareMode={false}
      />
    );

    assert.ok(html.includes('Needs Rerun:'), 'Contains flagged warning indicator');
    assert.ok(html.includes('Validation split had data leakage'), 'Contains supervisor note excerpt');
  });

  it('4. ExperimentCard renders compare checkbox when compare mode is enabled', () => {
    const html = renderToString(
      <ExperimentCard
        experiment={mockDraftExperiment}
        isSelectedForCompare={true}
        isCompareMode={true}
      />
    );

    assert.ok(html.includes('compare-checkbox'), 'Contains compare checkbox element');
    assert.ok(html.includes('ring-2 ring-indigo-500'), 'Card has active selection ring highlight');
  });

  it('5. CreateExperimentModal renders all scientific fields, purpose options, and config inputs', () => {
    const html = renderToString(
      <CreateExperimentModal
        isOpen={true}
        onClose={() => {}}
        projects={mockProjects}
        activeProjectId="proj-1"
        onCreate={async () => {}}
      />
    );

    assert.ok(html.includes('Log New Experiment'), 'Modal title is rendered');
    assert.ok(html.includes('Model Testing'), 'Contains Model Testing purpose option');
    assert.ok(html.includes('Hyperparameter Tuning'), 'Contains Hyperparameter Tuning purpose option');
    assert.ok(html.includes('Dataset Comparison'), 'Contains Dataset Comparison purpose option');
    assert.ok(html.includes('Final Benchmark'), 'Contains Final Benchmark purpose option');
    assert.ok(html.includes('Model Architecture'), 'Contains Model input field');
    assert.ok(html.includes('Dataset'), 'Contains Dataset input field');
    assert.ok(html.includes('Hardware Setup'), 'Contains Hardware input field');
    assert.ok(html.includes('Hyperparameters'), 'Contains dynamic hyperparameters section');
    assert.ok(html.includes('Save as Draft'), 'Contains Save as Draft button');
    assert.ok(
      html.includes('Save &amp; Finalize (Lock)') || html.includes('Save & Finalize (Lock)'),
      'Contains scientific integrity finalized lock option'
    );
  });

  it('6. SupervisorFlagModal renders flag types, notes, and automated revision task controls', () => {
    const html = renderToString(
      <SupervisorFlagModal
        isOpen={true}
        onClose={() => {}}
        experiment={mockDraftExperiment}
        onSubmitFlag={async () => {}}
      />
    );

    assert.ok(html.includes('Flag Experiment Run'), 'Modal title is rendered');
    assert.ok(html.includes('Needs Rerun'), 'Contains NeedsRerun option');
    assert.ok(html.includes('Not Reproducible'), 'Contains NotReproducible option');
    assert.ok(html.includes('Automatically generate revision task in project'), 'Contains auto revision task toggle');
    assert.ok(html.includes('Issue Flag'), 'Contains submit button');
  });

  it('7. ExperimentDetailModal renders drawer tabs, configuration, metrics, and actions', () => {
    const html = renderToString(
      <ExperimentDetailModal
        isOpen={true}
        onClose={() => {}}
        experimentId={mockDraftExperiment.id}
        initialExperiment={mockDraftExperiment}
        currentUserRole="Researcher"
        currentUserId="user-researcher"
      />
    );

    assert.ok(
      html.includes('Configuration &amp; Hyperparameters') || html.includes('Configuration & Hyperparameters'),
      'Contains Configuration & Hyperparameters tab'
    );
    assert.ok(
      html.includes('Metrics &amp; Observations') || html.includes('Metrics & Observations'),
      'Contains Metrics & Observations tab'
    );
    assert.ok(html.includes('Linked Tasks'), 'Contains Linked Tasks tab');
    assert.ok(
      html.includes('Flags &amp; Discussion') || html.includes('Flags & Discussion'),
      'Contains Flags & Discussion tab'
    );
  });

  it('8. ExperimentComparisonModal renders comparison matrix shell and controls', () => {
    const html = renderToString(
      <ExperimentComparisonModal
        isOpen={true}
        onClose={() => {}}
        experimentIds={['exp-101', 'exp-102']}
      />
    );

    assert.ok(html.includes('Multi-Run Comparison Matrix'), 'Contains comparison modal title');
    assert.ok(html.includes('Matrix Table'), 'Contains Matrix Table view switcher button');
    assert.ok(html.includes('Graphical Visualizer'), 'Contains Graphical Visualizer view switcher button');
    assert.ok(html.includes('Diffs Only'), 'Contains diff filter toggle button');
    assert.ok(html.includes('Markdown'), 'Contains Copy Markdown button');
    assert.ok(html.includes('CSV'), 'Contains Export CSV button');
  });

  it('9. ExperimentGraphicalVisualizer renders grouped bars, export actions, and Save to Paper Figures', () => {
    const mockMetricMatrix: AlignedMetricRow[] = [
      {
        metricKey: 'top1_accuracy',
        isNumeric: true,
        values: { 'exp-101': 0.884, 'exp-102': 0.762 },
        min: 0.762,
        max: 0.884,
        bestExperimentId: 'exp-101',
      },
      {
        metricKey: 'val_loss',
        isNumeric: true,
        values: { 'exp-101': 0.2841, 'exp-102': 0.3812 },
        min: 0.2841,
        max: 0.3812,
        bestExperimentId: 'exp-101',
      },
    ];

    const html = renderToString(
      <ExperimentGraphicalVisualizer
        experiments={[mockDraftExperiment, mockFinalExperiment]}
        metricMatrix={mockMetricMatrix}
      />
    );

    assert.ok(html.includes('Grouped Bar'), 'Contains grouped bar chart option');
    assert.ok(html.includes('Delta vs Baseline'), 'Contains delta vs baseline option');
    assert.ok(html.includes('Export PNG'), 'Contains PNG export action');
    assert.ok(html.includes('SVG'), 'Contains Vector SVG export action');
    assert.ok(html.includes('LaTeX Table'), 'Contains LaTeX table copy action');
    assert.ok(html.includes('Save to Paper Figures'), 'Contains Save to Paper Figures action button');
    assert.ok(html.includes('Multi-Experiment Metric Comparison Matrix'), 'Contains visualizer chart title');
  });

  it('10. CodePlayground renders Python WASM engine badge, editor container, and tabs', () => {
    const html = renderToString(
      <CodePlayground
        projects={mockProjects}
        activeProjectId="proj-1"
        currentUserRole="Researcher"
      />
    );

    assert.ok(html.includes('Python 3.12 (WASM Engine)'), 'Contains engine badge');
    assert.ok(html.includes('Console'), 'Contains Console tab');
    assert.ok(html.includes('Metrics'), 'Contains Metrics tab');
    assert.ok(html.includes('History'), 'Contains History tab');
    assert.ok(html.includes('Run Code'), 'Contains Run Code button for researcher');
  });

  it('11. CodePlayground in Supervisor view renders in read-only mode without Run/Save buttons', () => {
    const html = renderToString(
      <CodePlayground
        projects={mockProjects}
        activeProjectId="proj-1"
        currentUserRole="Supervisor"
        readOnly={true}
      />
    );

    assert.ok(html.includes('Supervisor View Only'), 'Displays Supervisor View Only indicator');
    assert.ok(!html.includes('Run Code'), 'Run Code button is NOT rendered for supervisor');
  });

  it('12. SaveRunAsExperimentModal renders pre-filled fields from RunRecord', () => {
    const mockRun = {
      id: 'run-uuid-123',
      timestamp: '2026-10-03T01:00:00.000Z',
      code: 'import json\nprint(json.dumps({"accuracy": 0.942}))',
      language: 'python' as const,
      stdout: '{"accuracy": 0.942}\n',
      stderr: '',
      exitCode: 0,
      metrics: { accuracy: 0.942 },
      durationMs: 342,
    };

    const html = renderToString(
      <SaveRunAsExperimentModal
        isOpen={true}
        onClose={() => {}}
        run={mockRun}
        projects={mockProjects}
        activeProjectId="proj-1"
      />
    );

    assert.ok(html.includes('Save Run as Experiment'), 'Contains modal title');
    assert.ok(html.includes('Python WASM'), 'Contains Python WASM badge');
    assert.ok(html.includes('342ms'), 'Displays execution duration');
    assert.ok(html.includes('Tracked Experiment Metrics'), 'Displays metrics section');
    assert.ok(html.includes('Save as Final Experiment'), 'Contains submit action button');
  });
});

