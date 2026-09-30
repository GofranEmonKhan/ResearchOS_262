import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Check,
  Code,
  AlertCircle,
} from 'lucide-react';

interface InsertFigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFigure: (snippet: string) => void;
}

export const InsertFigureModal: React.FC<InsertFigureModalProps> = ({
  isOpen,
  onClose,
  onInsertFigure,
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url' | 'presets'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [caption, setCaption] = useState('');
  const [label, setLabel] = useState('fig:overview');
  const [width, setWidth] = useState<'0.9\\linewidth' | '0.75\\linewidth' | '\\linewidth' | '0.5\\linewidth'>('0.9\\linewidth');
  const [syntaxFormat, setSyntaxFormat] = useState<'latex' | 'markdown'>('latex');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Scientific Preset Figures for rapid prototyping and paper drafting
  const presetFigures = [
    {
      title: 'Neural Architecture Search DAG',
      label: 'fig:nas-cell',
      caption: 'Continuous relaxation architecture search over directed acyclic graph cells.',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Model Training & Validation Curves',
      label: 'fig:loss-curves',
      caption: 'Convergence trajectories of cross-entropy loss and top-1 accuracy over 200 epochs.',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Genomic Sequence Alignment & Heatmap',
      label: 'fig:genomics-heatmap',
      caption: 'Saturation mutagenesis impact scores across transcription factor binding motifs.',
      url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Benchmark Performance Comparison',
      label: 'fig:benchmark-comparison',
      caption: 'Comparative throughput (FPS) vs parameters (M) on standardized benchmark datasets.',
      url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1000&q=80',
    },
  ];

  const handleFileChange = (file: File) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      return;
    }

    setFileName(file.name);
    // Derive initial label from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!label || label === 'fig:overview') {
      setLabel(`fig:${cleanName}`);
    }
    if (!caption) {
      setCaption(`Figure diagram illustrating ${cleanName.replace(/-/g, ' ')}.`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const generateSnippet = () => {
    const src = imageUrl || 'https://example.com/figure.png';
    const cap = caption.trim() || 'Scholarly illustration and experimental diagram.';
    const cleanLabel = (label.trim().startsWith('fig:') ? label.trim() : `fig:${label.trim()}`) || 'fig:figure1';

    if (syntaxFormat === 'latex') {
      return `\\begin{figure}[h]
  \\centering
  \\includegraphics[width=${width}]{${src}}
  \\caption{${cap}}
  \\label{${cleanLabel}}
\\end{figure}\n`;
    } else {
      return `![${cap}](${src})\n*\\label{${cleanLabel}}*\n`;
    }
  };

  const handleInsert = () => {
    if (!imageUrl.trim()) {
      setUploadError('Please select or upload an image first.');
      return;
    }
    const snippet = generateSnippet();
    onInsertFigure(snippet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0A0E1A] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#070A12] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Insert Scholarly Figure
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  LaTeX & Markdown
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Embed scientific diagrams, architecture DAGs, and plots with LaTeX figure environments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800/80 bg-[#080C16] flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setSourceType('upload'); setUploadError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              sourceType === 'upload'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => { setSourceType('url'); setUploadError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              sourceType === 'url'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>

          <button
            onClick={() => { setSourceType('presets'); setUploadError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              sourceType === 'presets'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Scientific Presets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Upload */}
          {sourceType === 'upload' && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700/80 bg-slate-900/40 hover:border-amber-500/50 hover:bg-slate-900/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-200">
                      {fileName ? fileName : 'Click or drop an image file here'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PNG, JPG, SVG, WebP up to 10MB
                    </p>
                  </div>
                  {fileName && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Image loaded ready for insertion
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Image URL */}
          {sourceType === 'url' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Image Web URL / Storage Path</label>
              <div className="relative">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (!caption) setCaption('Figure illustrating experimental results.');
                  }}
                  placeholder="https://example.com/figures/architecture.png"
                  className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You can link to figures hosted on arXiv, GitHub, or project storage.
              </p>
            </div>
          )}

          {/* TAB 3: Scientific Presets */}
          {sourceType === 'presets' && (
            <div className="grid grid-cols-2 gap-2.5">
              {presetFigures.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setImageUrl(preset.url);
                    setCaption(preset.caption);
                    setLabel(preset.label);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    imageUrl === preset.url
                      ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="h-20 w-full rounded-lg overflow-hidden mb-2 bg-slate-950 border border-slate-800">
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 truncate">{preset.title}</h4>
                  <span className="text-[10px] font-mono text-amber-400">{preset.label}</span>
                </div>
              ))}
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Metadata Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Figure Caption <span className="text-amber-400">*</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                placeholder="Figure 1: Describe the methodology, key visual components, and findings..."
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Reference Label (<code className="text-amber-400 text-[10px]">\label&#123;...&#125;</code>)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="fig:overview"
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cite in text as <code className="text-slate-400 font-mono">\ref&#123;{label || 'fig:overview'}&#125;</code>
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Display Width
                </label>
                <select
                  value={width}
                  onChange={(e) => setWidth(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="0.9\linewidth">0.9\linewidth (Recommended 90%)</option>
                  <option value="\linewidth">\linewidth (Full Column 100%)</option>
                  <option value="0.75\linewidth">0.75\linewidth (Centered 75%)</option>
                  <option value="0.5\linewidth">0.5\linewidth (Compact 50%)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Syntax Format:</span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSyntaxFormat('latex')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      syntaxFormat === 'latex'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LaTeX \begin&#123;figure&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyntaxFormat('markdown')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      syntaxFormat === 'markdown'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Markdown ![ ]( )
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Code Snippet Preview */}
          <div className="bg-[#05070D] rounded-xl p-3 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Code className="w-3.5 h-3.5" /> Generated Insertion Snippet
              </span>
              <span>At Cursor</span>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto p-2 rounded bg-slate-950/70 border border-slate-900">
              {generateSnippet()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#070A12] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleInsert}
            disabled={!imageUrl.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Insert Figure in Section</span>
          </button>
        </div>
      </div>
    </div>
  );
};
