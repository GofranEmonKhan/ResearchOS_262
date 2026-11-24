import { SavedExperimentFigure } from '@researchos/shared-types';

export type { SavedExperimentFigure } from '@researchos/shared-types';

const STORAGE_KEY = 'researchos_saved_experiment_figures';

// Built-in academic starter figures from benchmark runs
export const DEFAULT_EXPERIMENT_FIGURES: SavedExperimentFigure[] = [
  {
    id: 'fig-benchmark-rf-nn-comparison',
    title: 'Model Accuracy & Loss Benchmark Comparison',
    experimentIds: ['exp-baseline-rf', 'exp-deep-nn'],
    experimentNames: ['Baseline Random Forest', 'Deep ResNet Transformer'],
    metrics: ['accuracy', 'f1_score', 'loss', 'latency_ms'],
    dataUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
    suggestedCaption: 'Figure 1: Comparative evaluation of classification accuracy and cross-entropy loss between Baseline Random Forest and Deep ResNet Transformer (Spec 04 Experiment Tracker).',
    suggestedLabel: 'fig:benchmark_rf_nn',
    relativePath: 'figures/exp_benchmark_rf_nn.png',
    chartType: 'grouped-bar',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'fig-throughput-scaling-comparison',
    title: 'Multi-GPU Throughput & Scaling Matrix',
    experimentIds: ['exp-gpu-single', 'exp-gpu-distributed-4x'],
    experimentNames: ['Single GPU Node', 'Distributed 4x RTX 4090'],
    metrics: ['throughput_fps', 'vram_gb', 'training_time_hrs'],
    dataUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1000&q=80',
    suggestedCaption: 'Figure 2: Empirical throughput (samples/sec) and GPU memory scaling across single vs distributed cluster configurations.',
    suggestedLabel: 'fig:throughput_scaling',
    relativePath: 'figures/exp_throughput_scaling.png',
    chartType: 'grouped-bar',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'fig-hyperparameter-radar-profile',
    title: 'Hyperparameter Tuning Performance Radar',
    experimentIds: ['exp-run-adamw', 'exp-run-lion', 'exp-run-sgd'],
    experimentNames: ['AdamW (lr=1e-4)', 'Lion Optimizer (lr=3e-5)', 'SGD Momentum'],
    metrics: ['convergence_epochs', 'f1_score', 'validation_loss', 'stability_index'],
    dataUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1000&q=80',
    suggestedCaption: 'Figure 3: Multi-dimensional performance radar comparing optimizer convergence speed and generalization stability.',
    suggestedLabel: 'fig:optimizer_radar',
    relativePath: 'figures/exp_optimizer_radar.png',
    chartType: 'radar',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Retrieve all saved experiment figures
 */
export function getSavedExperimentFigures(): SavedExperimentFigure[] {
  if (typeof window === 'undefined') return DEFAULT_EXPERIMENT_FIGURES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EXPERIMENT_FIGURES));
      return DEFAULT_EXPERIMENT_FIGURES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_EXPERIMENT_FIGURES;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load saved experiment figures:', err);
    return DEFAULT_EXPERIMENT_FIGURES;
  }
}

/**
 * Save a new experiment comparison figure
 */
export function saveExperimentFigure(
  figure: Omit<SavedExperimentFigure, 'id' | 'createdAt'>
): SavedExperimentFigure {
  const newFigure: SavedExperimentFigure = {
    ...figure,
    id: `fig-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getSavedExperimentFigures();
      const updated = [newFigure, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save experiment figure to storage:', err);
    }
  }

  return newFigure;
}

/**
 * Delete a saved experiment figure by ID
 */
export function deleteSavedExperimentFigure(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedExperimentFigures();
    const updated = existing.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete saved experiment figure:', err);
  }
}

/**
 * Export SVG element as a high-resolution PNG data URL
 */
export async function svgToPngDataUrl(svgElement: SVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const bbox = svgElement.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = (bbox.width || 800) * scale;
        canvas.height = (bbox.height || 450) * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw solid background for academic publication
        ctx.fillStyle = '#0F0E1F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(blobURL);
        resolve(pngUrl);
      };
      image.onerror = (e) => {
        URL.revokeObjectURL(blobURL);
        reject(e);
      };
      image.src = blobURL;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate clean Overleaf LaTeX figure environment code
 */
export function generateLatexFigureSnippet(
  figurePath: string,
  caption: string,
  label: string,
  width = '0.9\\linewidth'
): string {
  return `\\begin{figure}[h]
  \\centering
  \\includegraphics[width=${width}]{${figurePath}}
  \\caption{${caption}}
  \\label{${label}}
\\end{figure}`;
}
