import React, { useState, useRef } from 'react';
import { supabase } from '../../supabase.js';
import { api } from '../../lib/api.js';
import {
  MetadataResult,
  MetadataCandidate,
  Collection,
  Project,
  CreatePaperDto,
} from '@researchos/shared-types';
import {
  X,
  UploadCloud,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface UploadPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaperCreated: () => void;
  collections: Collection[];
  projects?: Project[];
  currentUserId: string;
}

type UploadStep = 'select' | 'uploading' | 'resolving' | 'candidates' | 'confirm';

export const UploadPaperModal: React.FC<UploadPaperModalProps> = ({
  isOpen,
  onClose,
  onPaperCreated,
  collections,
  projects = [],
  currentUserId,
}) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storagePath, setStoragePath] = useState<string | null>(null);

  // Metadata pipeline state
  const [metadataResult, setMetadataResult] = useState<MetadataResult | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<MetadataCandidate | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [authorsText, setAuthorsText] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [venue, setVenue] = useState('');
  const [doi, setDoi] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('select');
    setSelectedFile(null);
    setUploadProgress(0);
    setStoragePath(null);
    setMetadataResult(null);
    setActiveCandidate(null);
    setTitle('');
    setAuthorsText('');
    setYear(undefined);
    setVenue('');
    setDoi('');
    setSelectedCollectionId('');
    setSelectedProjectId('');
    setIsSubmitting(false);
    setErrorMessage(null);
    setDuplicateConflict(false);
  };

  const handleClose = async () => {
    // If user uploaded a PDF to storage but cancelled before creating paper, clean up storage object
    if (storagePath && step !== 'confirm') {
      try {
        await supabase.storage.from('papers').remove([storagePath]);
      } catch {
        // Ignore cleanup errors
      }
    }
    resetState();
    onClose();
  };

  const handleFileChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 50MB limit.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setDuplicateConflict(false);

    // Step 1: Upload to Supabase Storage
    setStep('uploading');
    setUploadProgress(20);

    const uuid = crypto.randomUUID();
    const targetPath = `${currentUserId}/${uuid}.pdf`;

    try {
      setUploadProgress(50);
      const { error: uploadError } = await supabase.storage
        .from('papers')
        .upload(targetPath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setStoragePath(targetPath);
      setUploadProgress(100);

      // Step 2: Resolve Metadata
      setStep('resolving');
      const res = await api.resolveMetadata(targetPath, file.name);
      setMetadataResult(res);

      if (res.status === 'resolved' && res.paper) {
        // High confidence match
        populateForm(res.paper);
        setStep('confirm');
      } else if (res.status === 'candidates' && res.candidates && res.candidates.length > 0) {
        // Show candidate list
        setStep('candidates');
      } else {
        // Manual entry fallback
        setStep('confirm');
        setTitle(file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process PDF upload.');
      setStep('select');
    }
  };

  const populateForm = (candidate: MetadataCandidate) => {
    setActiveCandidate(candidate);
    setTitle(candidate.title || '');
    setAuthorsText((candidate.authors || []).join(', '));
    setYear(candidate.year || undefined);
    setVenue(candidate.venue || '');
    setDoi(candidate.doi || '');
  };

  const handleSelectCandidate = (candidate: MetadataCandidate) => {
    populateForm(candidate);
    setStep('confirm');
  };

  const handleSkipToManual = () => {
    setActiveCandidate(null);
    setStep('confirm');
    if (!title && selectedFile) {
      setTitle(selectedFile.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storagePath || !selectedFile) return;

    if (!title.trim()) {
      setErrorMessage('Paper title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setDuplicateConflict(false);

    const authors = authorsText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const createDto: CreatePaperDto = {
      title: title.trim(),
      authors: authors.length > 0 ? authors : undefined,
      year: year ? Number(year) : undefined,
      venue: venue.trim() || undefined,
      doi: doi.trim() || undefined,
      storagePath,
      fileName: selectedFile.name,
      mimeType: 'application/pdf',
      sizeBytes: selectedFile.size,
      metadataSource: activeCandidate ? activeCandidate.source : 'user',
      metadataConfidence: activeCandidate ? activeCandidate.confidence : undefined,
    };

    try {
      const createdPaper = await api.createPaper(createDto);

      // If user selected a collection, link it
      if (selectedCollectionId) {
        await api.addPaperToCollection(selectedCollectionId, createdPaper.id).catch(() => {});
      }

      // If user selected a project to share with, share it
      if (selectedProjectId) {
        await api.sharePaper(createdPaper.id, selectedProjectId).catch(() => {});
      }

      onPaperCreated();
      resetState();
      onClose();
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('409')) {
        setDuplicateConflict(true);
        setErrorMessage(
          `A paper with DOI "${doi}" already exists in your library. Please verify or use another document.`
        );
      } else {
        setErrorMessage(err.message || 'Failed to add paper to library.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Add Paper to Library</h2>
              <p className="text-[11px] text-slate-400">
                Upload PDF with automated CrossRef & OpenAlex metadata extraction
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                {duplicateConflict && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tip: Search your library for this DOI to locate the existing record.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: File Selection */}
          {step === 'select' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-white/15 hover:border-violet-500/50 bg-white/[0.02] hover:bg-violet-600/[0.03] transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-violet-600/10 group-hover:bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3 transition-colors">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Click or drag & drop research paper PDF
              </h3>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                PDF format up to 50MB. System extracts DOI, authors, venue, and year automatically.
              </p>
            </div>
          )}

          {/* UPLOADING STATE */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-white">Uploading Document...</h3>
                <p className="text-xs text-slate-400">
                  Uploading to secure private storage ({selectedFile?.name})
                </p>
              </div>
              <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* RESOLVING STATE */}
          {step === 'resolving' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-white">Resolving Academic Metadata</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Extracting DOI & querying CrossRef and OpenAlex scholarly indexes...
                </p>
              </div>
            </div>
          )}

          {/* STEP 2b: Candidate Selection (Confidence 0.50–0.84) */}
          {step === 'candidates' && metadataResult?.candidates && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Select Matching Publication
                  </h3>
                  <p className="text-xs text-slate-400">
                    Multiple matching candidates identified. Choose the best match:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSkipToManual}
                  className="text-xs text-violet-400 hover:text-violet-300 underline"
                >
                  Enter Manually
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {metadataResult.candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectCandidate(cand)}
                    className="p-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/[0.08] hover:border-violet-500/40 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[320px]">
                        {cand.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        {Math.round(cand.confidence * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {(cand.authors || []).join(', ')}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      {cand.year && <span>{cand.year}</span>}
                      {cand.venue && <span>• {cand.venue}</span>}
                      {cand.doi && <span>• DOI: {cand.doi}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Review Metadata */}
          {step === 'confirm' && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {activeCandidate && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Resolved via {activeCandidate.source} ({Math.round(activeCandidate.confidence * 100)}% confidence)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Review & edit details below</span>
                </div>
              )}

              {/* Title Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Paper Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Attention Is All You Need"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Authors Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Authors <span className="text-slate-500 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={authorsText}
                  onChange={(e) => setAuthorsText(e.target.value)}
                  placeholder="e.g. Ashish Vaswani, Noam Shazeer, Niki Parmar"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Year & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Publication Year</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={year || ''}
                    onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g. 2017"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Venue / Journal</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. NeurIPS, Nature, arXiv"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* DOI */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Digital Object Identifier (DOI)</label>
                <input
                  type="text"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="e.g. 10.1145/3295222.3295349"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              {/* Optional Collection and Project Assignments */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Add to Collection</label>
                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">None (General Library)</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Share with Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Personal Only</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <span>Add to Library</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
