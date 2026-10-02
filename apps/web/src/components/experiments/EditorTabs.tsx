import React from 'react';
import {
  FileCode,
  FileSpreadsheet,
  FileJson,
  FileText,
  File,
  X,
  Rocket,
} from 'lucide-react';
import { ProjectWorkspaceFile } from '../../lib/workspaceStorage';

interface EditorTabsProps {
  openFilePaths: string[];
  activeFilePath: string;
  files: ProjectWorkspaceFile[];
  entrypointPath: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  openFilePaths,
  activeFilePath,
  files,
  entrypointPath,
  onSelectTab,
  onCloseTab,
}) => {
  const getFileIcon = (file?: ProjectWorkspaceFile) => {
    if (!file) return <File className="w-3.5 h-3.5 text-slate-400" />;
    if (file.fileType === 'python') return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
    if (file.fileType === 'csv') return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />;
    if (file.fileType === 'json') return <FileJson className="w-3.5 h-3.5 text-amber-400" />;
    if (file.fileType === 'markdown' || file.fileType === 'text') return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
    return <File className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="flex items-center bg-[#252526] border-b border-white/[0.08] overflow-x-auto no-scrollbar select-none">
      {openFilePaths.map((path) => {
        const file = files.find((f) => f.path === path);
        const isActive = path === activeFilePath;
        const isEntrypoint = path === entrypointPath;
        const fileName = path.split('/').pop() || path;

        return (
          <div
            key={path}
            onClick={() => onSelectTab(path)}
            className={`group flex items-center gap-2 px-3 py-2 text-xs border-r border-white/[0.06] cursor-pointer transition-all shrink-0 ${
              isActive
                ? 'bg-[#1e1e1e] text-slate-100 font-semibold border-t-2 border-t-indigo-500 shadow-sm'
                : 'bg-[#2d2d2d]/60 text-slate-400 hover:bg-[#2d2d2d] hover:text-slate-200'
            }`}
          >
            {getFileIcon(file)}
            <span className="font-mono text-[11px] truncate max-w-[140px]">{fileName}</span>

            {isEntrypoint && (
              <span title="Entrypoint File" className="text-indigo-400">
                <Rocket className="w-3 h-3" />
              </span>
            )}

            {openFilePaths.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
                className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
