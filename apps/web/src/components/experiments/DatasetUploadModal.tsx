import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { ProjectWorkspaceFile, detectFileType } from '../../lib/workspaceStorage';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadDataset: (file: ProjectWorkspaceFile) => void;
}

export const DatasetUploadModal: React.FC<DatasetUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadDataset,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [rowCount, setRowCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum browser dataset size is 50MB.');
      return;
    }

    const name = file.name;
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = sanitizedName.startsWith('data/') ? sanitizedName : `data/${sanitizedName}`;

    setSelectedFileName(name);
    setTargetPath(path);
    setFileSize(file.size);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text || '');

      // Estimate row count
      if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
        const lines = text.trim().split('\n');
        setRowCount(lines.length > 1 ? lines.length - 1 : lines.length);
      } else if (name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setRowCount(parsed.length);
          } else {
            setRowCount(Object.keys(parsed).length);
          }
        } catch {
          setRowCount(0);
        }
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSave = () => {
    if (!targetPath.trim() || !fileContent) {
      setError('Please select a valid dataset file.');
      return;
    }

    const filename = targetPath.split('/').pop() || 'dataset.csv';
    const newFile: ProjectWorkspaceFile = {
      id: `file-data-${crypto.randomUUID()}`,
      name: filename,
      path: targetPath.trim(),
      content: fileContent,
      fileType: detectFileType(filename),
      updatedAt: new Date().toISOString(),
    };

    onUploadDataset(newFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111319] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Upload Project Dataset</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  data/
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Add local CSV, JSON, or TSV data directly to this research project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-white/10 hover:border-indigo-500/40 hover:bg-surface-2/60 bg-surface-2/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.tsv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Drag & drop dataset file here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports .csv, .json, .tsv, .txt (up to 50MB in-browser)
            </p>
          </div>

          {/* Selected File Details */}
          {selectedFileName && (
            <div className="p-4 bg-surface-2 border border-white/[0.08] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{selectedFileName}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(fileSize / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Target Path in Workspace</label>
                  <input
                    type="text"
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                    className="w-full bg-surface-3 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Estimated Rows / Records</label>
                  <div className="w-full bg-surface-3/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{rowCount > 0 ? `${rowCount} records` : 'Parsed'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Preview Snippet */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Preview (first 4 lines)</label>
                <div className="p-2.5 bg-[#181a20] border border-white/[0.06] rounded-lg font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre">
                  {fileContent.split('\n').slice(0, 4).join('\n')}
                </div>
              </div>
            </div>
          )}

          {/* Quick Tip for Python usage */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">How to read in Python:</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                with open('{targetPath || 'data/dataset.csv'}', 'r') as f: ...
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-[#0d0e12]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!fileContent}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Add to Project Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
