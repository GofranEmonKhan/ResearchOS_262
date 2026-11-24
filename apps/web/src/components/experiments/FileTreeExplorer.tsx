import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileSpreadsheet,
  FileJson,
  Plus,
  FolderPlus,
  Upload,
  Trash2,
  Edit2,
  Rocket,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  File,
} from 'lucide-react';
import { ProjectWorkspaceFile, ProjectWorkspaceFolder } from '../../lib/workspaceStorage';

interface FileTreeExplorerProps {
  files: ProjectWorkspaceFile[];
  folders: ProjectWorkspaceFolder[];
  activeFilePath: string;
  entrypointPath: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onSetEntrypoint: (path: string) => void;
  onOpenUploadModal: () => void;
  readOnly?: boolean;
}

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({
  files,
  folders,
  activeFilePath,
  entrypointPath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder: _onDeleteFolder,
  onRenameFile,
  onSetEntrypoint,
  onOpenUploadModal,
  readOnly = false,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFileInput, setNewFileInput] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const getFileIcon = (file: ProjectWorkspaceFile) => {
    if (file.fileType === 'python') return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
    if (file.fileType === 'csv') return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />;
    if (file.fileType === 'json') return <FileJson className="w-3.5 h-3.5 text-amber-400" />;
    if (file.fileType === 'markdown' || file.fileType === 'text') return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
    return <File className="w-3.5 h-3.5 text-slate-400" />;
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileInput.trim()) return;
    const sanitized = newFileInput.trim().replace(/^\/+/, '');
    onCreateFile(sanitized);
    setNewFileInput('');
    setIsCreatingFile(false);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderInput.trim()) return;
    const sanitized = newFolderInput.trim().replace(/^\/+|\/+$/g, '');
    onCreateFolder(sanitized);
    setNewFolderInput('');
    setIsCreatingFolder(false);
  };

  const handleRenameSubmit = (oldPath: string) => {
    if (!renameInput.trim() || renameInput.trim() === oldPath) {
      setEditingFilePath(null);
      return;
    }
    onRenameFile(oldPath, renameInput.trim());
    setEditingFilePath(null);
  };

  // Group files: root files vs files in folders
  const rootFiles = files.filter((f) => !f.path.includes('/'));

  return (
    <div className="flex flex-col h-full bg-[#181a20] border-r border-white/[0.08] text-xs select-none">
      {/* Workspace Header & Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#14161c] border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-400">
          <span>Files</span>
          <span className="px-1.5 py-0.2 rounded bg-surface-3 text-slate-300 font-mono text-[10px]">
            {files.length}
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
              }}
              title="New File"
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-3/80 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
              }}
              title="New Folder"
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-3/80 rounded transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenUploadModal}
              title="Upload Dataset"
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-surface-3/80 rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Inline Create File / Folder Inputs */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-white/[0.06] bg-surface-2/60">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={newFileInput}
              onChange={(e) => setNewFileInput(e.target.value)}
              placeholder="e.g. script.py or utils/helper.py"
              className="w-full bg-[#111318] border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
            <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFile(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}

      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 border-b border-white/[0.06] bg-surface-2/60">
          <div className="flex items-center gap-1.5">
            <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              placeholder="e.g. pipelines"
              className="w-full bg-[#111318] border border-amber-500/50 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
            <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 font-mono text-[11.5px]">
        {/* Render Folders */}
        {folders.map((folder) => {
          const isCollapsed = !!collapsedFolders[folder.path];
          const folderFiles = files.filter((f) => f.path.startsWith(`${folder.path}/`));

          return (
            <div key={folder.id} className="space-y-0.5">
              {/* Folder Row */}
              <div
                onClick={() => toggleFolder(folder.path)}
                className="flex items-center justify-between px-2 py-1 rounded-md text-slate-300 hover:bg-white/[0.04] hover:text-white cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                  {isCollapsed ? (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200 truncate">{folder.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 opacity-60 group-hover:opacity-100">
                  {folderFiles.length}
                </span>
              </div>

              {/* Folder Children Files */}
              {!isCollapsed && (
                <div className="pl-4 space-y-0.5 border-l border-white/[0.06] ml-3">
                  {folderFiles.length === 0 ? (
                    <div className="px-2 py-1 text-[10px] text-slate-500 italic">Empty folder</div>
                  ) : (
                    folderFiles.map((file) => {
                      const isActive = file.path === activeFilePath;
                      const isEntrypoint = file.path === entrypointPath;
                      const isEditing = editingFilePath === file.path;

                      return (
                        <div
                          key={file.id}
                          onClick={() => onSelectFile(file.path)}
                          className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-all ${
                            isActive
                              ? 'bg-indigo-500/20 text-white font-semibold'
                              : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                            {getFileIcon(file)}
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                onBlur={() => handleRenameSubmit(file.path)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameSubmit(file.path);
                                  if (e.key === 'Escape') setEditingFilePath(null);
                                }}
                                className="bg-[#111318] border border-indigo-500 rounded px-1 py-0 text-xs text-white font-mono w-full"
                              />
                            ) : (
                              <span className="truncate">{file.name}</span>
                            )}
                          </div>

                          {/* Badges & Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isEntrypoint && (
                              <span
                                title="Execution Entrypoint"
                                className="px-1 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-sans font-bold flex items-center gap-0.5"
                              >
                                <Rocket className="w-2.5 h-2.5" />
                                <span>RUN</span>
                              </span>
                            )}

                            {!readOnly && !isEditing && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                {!isEntrypoint && file.fileType === 'python' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSetEntrypoint(file.path);
                                    }}
                                    title="Set as Entrypoint"
                                    className="p-1 hover:text-indigo-400 text-slate-400"
                                  >
                                    <Rocket className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFilePath(file.path);
                                    setRenameInput(file.path);
                                  }}
                                  title="Rename"
                                  className="p-1 hover:text-amber-400 text-slate-400"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete file "${file.name}"?`)) {
                                      onDeleteFile(file.path);
                                    }
                                  }}
                                  title="Delete"
                                  className="p-1 hover:text-rose-400 text-slate-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Root Level Files */}
        {rootFiles.map((file) => {
          const isActive = file.path === activeFilePath;
          const isEntrypoint = file.path === entrypointPath;
          const isEditing = editingFilePath === file.path;

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.path)}
              className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-all ${
                isActive
                  ? 'bg-indigo-500/20 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                {getFileIcon(file)}
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onBlur={() => handleRenameSubmit(file.path)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(file.path);
                      if (e.key === 'Escape') setEditingFilePath(null);
                    }}
                    className="bg-[#111318] border border-indigo-500 rounded px-1 py-0 text-xs text-white font-mono w-full"
                  />
                ) : (
                  <span className="truncate">{file.name}</span>
                )}
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isEntrypoint && (
                  <span
                    title="Execution Entrypoint"
                    className="px-1 py-0.2 bg-indigo-500/30 text-indigo-300 rounded text-[9px] font-sans font-bold flex items-center gap-0.5"
                  >
                    <Rocket className="w-2.5 h-2.5" />
                    <span>RUN</span>
                  </span>
                )}

                {!readOnly && !isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    {!isEntrypoint && file.fileType === 'python' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetEntrypoint(file.path);
                        }}
                        title="Set as Entrypoint"
                        className="p-1 hover:text-indigo-400 text-slate-400"
                      >
                        <Rocket className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFilePath(file.path);
                        setRenameInput(file.path);
                      }}
                      title="Rename"
                      className="p-1 hover:text-amber-400 text-slate-400"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete file "${file.name}"?`)) {
                          onDeleteFile(file.path);
                        }
                      }}
                      title="Delete"
                      className="p-1 hover:text-rose-400 text-slate-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
