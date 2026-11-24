export interface ProjectWorkspaceFile {
  id: string;
  name: string;
  path: string; // e.g., 'src/models/classifier.py' or 'data/iris.csv'
  content: string;
  fileType: 'python' | 'json' | 'csv' | 'markdown' | 'text' | 'generic';
  isEntrypoint?: boolean;
  isReadOnly?: boolean;
  updatedAt: string;
}

export interface ProjectWorkspaceFolder {
  id: string;
  name: string;
  path: string; // e.g., 'models' or 'data'
  isExpanded?: boolean;
}

export interface ProjectWorkspace {
  projectId: string;
  entrypointPath: string; // e.g., 'main.py'
  files: ProjectWorkspaceFile[];
  folders: ProjectWorkspaceFolder[];
  openFilePaths: string[];
  activeFilePath: string;
  lastModified: string;
}

export function detectFileType(filename: string): ProjectWorkspaceFile['fileType'] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return 'csv';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.txt')) return 'text';
  return 'generic';
}

export function createDefaultWorkspace(projectId: string): ProjectWorkspace {
  const now = new Date().toISOString();
  return {
    projectId,
    entrypointPath: 'main.py',
    openFilePaths: ['main.py', 'models/classifier.py', 'data/benchmark.csv'],
    activeFilePath: 'main.py',
    lastModified: now,
    folders: [
      { id: 'f-models', name: 'models', path: 'models', isExpanded: true },
      { id: 'f-utils', name: 'utils', path: 'utils', isExpanded: true },
      { id: 'f-data', name: 'data', path: 'data', isExpanded: true },
    ],
    files: [
      {
        id: 'file-main',
        name: 'main.py',
        path: 'main.py',
        fileType: 'python',
        isEntrypoint: true,
        updatedAt: now,
        content: `# ResearchOS Multi-File Python Experiment
# Tip: Output a JSON dictionary on the final line to auto-extract experiment metrics!
from models.classifier import DecisionTreeExperiment
from utils.metrics import compute_classification_metrics
import json
import csv

print("=== Starting Project Experiment Run ===")

# 1. Load dataset from project's data/ folder
dataset_rows = []
with open('data/benchmark.csv', mode='r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        dataset_rows.append(row)

print(f"Loaded {len(dataset_rows)} samples from data/benchmark.csv")

# 2. Initialize and evaluate classifier model
model = DecisionTreeExperiment(max_depth=4, criterion='gini')
eval_results = model.run(dataset_rows)

# 3. Calculate scientific benchmark metrics
metrics = compute_classification_metrics(
    eval_results['predictions'],
    eval_results['ground_truth']
)

print(f"Evaluation Completed: Accuracy={metrics['accuracy']}, F1-Score={metrics['f1_score']}")
print(json.dumps(metrics))
`,
      },
      {
        id: 'file-classifier',
        name: 'classifier.py',
        path: 'models/classifier.py',
        fileType: 'python',
        updatedAt: now,
        content: `"""
Decision Tree / Baseline Classifier Model Architecture
"""
import math

class DecisionTreeExperiment:
    def __init__(self, max_depth=4, criterion='gini'):
        self.max_depth = max_depth
        self.criterion = criterion
        print(f"[Model Initialized] DecisionTree(depth={max_depth}, criterion='{criterion}')")

    def run(self, samples):
        predictions = []
        ground_truth = []
        
        for i, sample in enumerate(samples):
            feature_a = float(sample.get('feature_a', 0.5))
            feature_b = float(sample.get('feature_b', 0.5))
            actual_label = int(sample.get('label', 1))
            
            # Simple heuristic prediction simulation
            score = (feature_a * 1.4) + (feature_b * 0.8) - 0.95
            predicted_label = 1 if score >= 0 else 0
            
            predictions.append(predicted_label)
            ground_truth.append(actual_label)
            
        return {
            "predictions": predictions,
            "ground_truth": ground_truth,
            "total_evaluated": len(samples)
        }
`,
      },
      {
        id: 'file-metrics',
        name: 'metrics.py',
        path: 'utils/metrics.py',
        fileType: 'python',
        updatedAt: now,
        content: `"""
Research Metric Computation Helpers
"""
import math

def compute_classification_metrics(predictions, ground_truth):
    if not predictions or len(predictions) != len(ground_truth):
        return {"error": "Invalid prediction array length"}
        
    tp = sum(1 for p, y in zip(predictions, ground_truth) if p == 1 and y == 1)
    fp = sum(1 for p, y in zip(predictions, ground_truth) if p == 1 and y == 0)
    fn = sum(1 for p, y in zip(predictions, ground_truth) if p == 0 and y == 1)
    tn = sum(1 for p, y in zip(predictions, ground_truth) if p == 0 and y == 0)
    
    total = len(predictions)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    loss = 0.142 + (0.05 * math.sin(f1 * math.pi))
    
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "val_loss": round(loss, 4),
        "total_samples": total
    }
`,
      },
      {
        id: 'file-data',
        name: 'benchmark.csv',
        path: 'data/benchmark.csv',
        fileType: 'csv',
        updatedAt: now,
        content: `sample_id,feature_a,feature_b,label
001,0.85,0.72,1
002,0.12,0.34,0
003,0.91,0.68,1
004,0.44,0.51,0
005,0.78,0.88,1
006,0.25,0.19,0
007,0.67,0.94,1
008,0.31,0.42,0
009,0.82,0.61,1
010,0.15,0.22,0
`,
      },
      {
        id: 'file-config',
        name: 'config.json',
        path: 'config.json',
        fileType: 'json',
        updatedAt: now,
        content: `{
  "experiment_name": "DecisionTree_Baseline_Sweep",
  "max_depth": 4,
  "criterion": "gini",
  "dataset_path": "data/benchmark.csv",
  "seed": 42
}
`,
      },
    ],
  };
}

const STORAGE_PREFIX = 'researchos_workspace_';

export function loadProjectWorkspace(projectId: string): ProjectWorkspace {
  if (typeof window === 'undefined') {
    return createDefaultWorkspace(projectId);
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Failed to load workspace for project ${projectId}:`, err);
  }

  const defaultWs = createDefaultWorkspace(projectId);
  saveProjectWorkspace(defaultWs);
  return defaultWs;
}

export function saveProjectWorkspace(workspace: ProjectWorkspace): void {
  if (typeof window === 'undefined') return;
  try {
    workspace.lastModified = new Date().toISOString();
    localStorage.setItem(`${STORAGE_PREFIX}${workspace.projectId}`, JSON.stringify(workspace));
  } catch (err) {
    console.error('Failed to save project workspace:', err);
  }
}
