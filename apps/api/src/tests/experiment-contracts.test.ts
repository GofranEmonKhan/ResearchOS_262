import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPERIMENT_PURPOSES,
  EXPERIMENT_STATUSES,
  EXPERIMENT_FLAG_TYPES,
  NOTIFICATION_TYPES,
  Experiment,
  ExperimentConfig,
  ExperimentMetrics,
  ExperimentFlag,
  TaskExperimentLink,
  ExperimentComment,
  CreateExperimentDto,
  UpdateExperimentDto,
  CreateExperimentFlagDto,
  ResolveExperimentFlagDto,
  AddExperimentCommentDto,
  ExperimentComparisonResponse,
  AlignedParameterRow,
  AlignedMetricRow,
} from '@researchos/shared-types';

describe('Phase 4.2 — Experiment Tracker Shared Contracts & Enums', () => {
  it('1. should define all 6 required experiment purposes', () => {
    assert.deepEqual(Object.keys(EXPERIMENT_PURPOSES).sort(), [
      'Baseline',
      'DatasetComparison',
      'Final',
      'HyperparameterTuning',
      'ModelTesting',
      'PerformanceEvaluation',
    ]);
  });

  it('2. should define required experiment statuses', () => {
    assert.equal(EXPERIMENT_STATUSES.Draft, 'Draft');
    assert.equal(EXPERIMENT_STATUSES.Final, 'Final');
  });

  it('3. should define required experiment flag types', () => {
    assert.equal(EXPERIMENT_FLAG_TYPES.NeedsRerun, 'NeedsRerun');
    assert.equal(EXPERIMENT_FLAG_TYPES.NotReproducible, 'NotReproducible');
  });

  it('4. should include ExperimentFlagged and ExperimentCommented in NotificationType', () => {
    assert.equal(NOTIFICATION_TYPES.ExperimentFlagged, 'ExperimentFlagged');
    assert.equal(NOTIFICATION_TYPES.ExperimentCommented, 'ExperimentCommented');
  });

  it('5. should instantiate a valid Experiment entity with typed config and metrics', () => {
    const config: ExperimentConfig = {
      model: 'ResNet-50',
      hyperparameters: {
        learning_rate: 0.001,
        batch_size: 64,
        epochs: 50,
        use_dropout: true,
      },
      dataset: 'ImageNet-1K',
      hardware: 'NVIDIA A100 80GB',
      codeCommit: 'git-commit-abc1234',
      notebookFileId: null,
      environmentNotes: 'PyTorch 2.3.0, CUDA 12.1',
    };

    const metrics: ExperimentMetrics = {
      accuracy: 0.945,
      loss: 0.123,
      latency_ms: 12.4,
      f1_score: 0.941,
    };

    const experiment: Experiment = {
      id: 'exp-uuid-1',
      projectId: 'proj-uuid-1',
      ownerId: 'user-uuid-1',
      name: 'Baseline ResNet-50 Run',
      purpose: 'Baseline',
      hypothesis: 'Standard ResNet-50 will achieve >90% top-1 accuracy on ImageNet subset.',
      date: '2026-09-04',
      config,
      metrics,
      outputFileIds: ['file-uuid-1'],
      observation: 'Loss converged smoothly by epoch 40.',
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerName: 'Alice Researcher',
      flags: [],
      linkedTasks: [],
    };

    assert.equal(experiment.purpose, 'Baseline');
    assert.equal(experiment.config.model, 'ResNet-50');
    assert.equal(experiment.metrics.accuracy, 0.945);
    assert.equal(experiment.status, 'Draft');
  });

  it('6. should validate DTO types for creation, updates, and flagging', () => {
    const createDto: CreateExperimentDto = {
      name: 'Test Run 2',
      purpose: 'HyperparameterTuning',
      hypothesis: 'Higher batch size improves GPU saturation.',
      config: {
        model: 'BERT-base',
        hyperparameters: { batch_size: 128 },
      },
      metrics: { throughput: 450 },
    };

    const updateDto: UpdateExperimentDto = {
      name: 'Test Run 2 - Revised',
      metrics: { throughput: 480 },
      observation: 'Better cache hit rate.',
    };

    const flagDto: CreateExperimentFlagDto = {
      type: 'NeedsRerun',
      note: 'Seed was not explicitly set, results show stochastic variance.',
      createRevisionTask: true,
      taskTitle: 'Rerun BERT with fixed seed 42',
      taskDueDate: '2026-09-10',
    };

    const resolveDto: ResolveExperimentFlagDto = {
      resolutionNote: 'Rerun completed in experiment exp-uuid-2 with seed 42.',
    };

    const commentDto: AddExperimentCommentDto = {
      body: 'Verified that seed was fixed in commit 9e4f1a.',
    };

    assert.equal(createDto.purpose, 'HyperparameterTuning');
    assert.equal(updateDto.name, 'Test Run 2 - Revised');
    assert.equal(flagDto.createRevisionTask, true);
    assert.equal(resolveDto.resolutionNote.length > 0, true);
    assert.equal(commentDto.body.length > 0, true);
  });

  it('7. should validate ExperimentComparisonResponse matrix model', () => {
    const paramRow: AlignedParameterRow = {
      parameterKey: 'hyperparameters.learning_rate',
      group: 'hyperparameter',
      isIdentical: false,
      values: {
        'exp-1': 0.001,
        'exp-2': 0.0001,
      },
    };

    const metricRow: AlignedMetricRow = {
      metricKey: 'accuracy',
      isNumeric: true,
      values: {
        'exp-1': 0.92,
        'exp-2': 0.95,
      },
      min: 0.92,
      max: 0.95,
      bestExperimentId: 'exp-2',
    };

    const comparison: ExperimentComparisonResponse = {
      experiments: [],
      parameterMatrix: [paramRow],
      metricMatrix: [metricRow],
      summary: {
        totalCompared: 2,
        differingParametersCount: 1,
        commonParametersCount: 0,
        commonDataset: 'ImageNet-1K',
      },
    };

    assert.equal(comparison.parameterMatrix[0].isIdentical, false);
    assert.equal(comparison.metricMatrix[0].bestExperimentId, 'exp-2');
    assert.equal(comparison.summary.totalCompared, 2);
  });
});
