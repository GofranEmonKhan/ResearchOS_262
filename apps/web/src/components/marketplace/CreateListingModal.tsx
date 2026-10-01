import React, { useState } from 'react';
import {
  X,
  Server,
  Database,
  Plus,
} from 'lucide-react';
import {
  ListingType,
  CreateListingDTO,
  HardwareAccessMethod,
} from '@researchos/shared-types';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateListingDTO) => Promise<void>;
  isSupervisor?: boolean;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<ListingType>('Hardware');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Hardware fields
  const [gpuCpuModel, setGpuCpuModel] = useState('');
  const [vram, setVram] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('Ubuntu 22.04 LTS');
  const [location, setLocation] = useState('Institutional Data Center');
  const [accessMethod, setAccessMethod] = useState<HardwareAccessMethod>('SSH');
  const [hourlyPrice, setHourlyPrice] = useState<number | ''>('');
  const [dailyPrice, setDailyPrice] = useState<number | ''>('');

  // Dataset fields
  const [domain, setDomain] = useState('');
  const [sizeBytes, setSizeBytes] = useState<number | ''>('');
  const [format, setFormat] = useState('CSV / Parquet');
  const [license, setLicense] = useState('CC BY-SA 4.0');
  const [onlinePrice, setOnlinePrice] = useState<number | ''>('');

  // Flags
  const [isFree, setIsFree] = useState(false);
  const [isInstitutional, setIsInstitutional] = useState(false);
  const [freeForInstitutionStudents, setFreeForInstitutionStudents] = useState(false);
  const [institutionName, setInstitutionName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a listing title.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dto: CreateListingDTO = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        isFree,
        isInstitutional,
        freeForInstitutionStudents,
        institutionName: isInstitutional ? institutionName.trim() || undefined : undefined,
      };

      if (type === 'Hardware') {
        dto.gpuCpuModel = gpuCpuModel.trim() || undefined;
        dto.vram = vram.trim() || undefined;
        dto.ram = ram.trim() || undefined;
        dto.storage = storage.trim() || undefined;
        dto.os = os.trim() || undefined;
        dto.location = location.trim() || undefined;
        dto.accessMethod = accessMethod;
        dto.hourlyPrice = isFree ? 0 : typeof hourlyPrice === 'number' ? hourlyPrice : undefined;
        dto.dailyPrice = isFree ? 0 : typeof dailyPrice === 'number' ? dailyPrice : undefined;
      } else {
        dto.domain = domain.trim() || undefined;
        dto.sizeBytes = typeof sizeBytes === 'number' ? sizeBytes : undefined;
        dto.format = format.trim() || undefined;
        dto.license = license.trim() || undefined;
        dto.onlinePrice = isFree ? 0 : typeof onlinePrice === 'number' ? onlinePrice : undefined;
      }

      await onSubmit(dto);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Post Marketplace Resource Listing
              </h3>
              <p className="text-xs text-slate-400">
                Share GPU/compute clusters or publish curated research datasets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resource Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('Hardware')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'Hardware'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              Hardware / GPU Compute
            </button>
            <button
              type="button"
              onClick={() => setType('Dataset')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'Dataset'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              Research Dataset
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Listing Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'Hardware'
                    ? 'e.g. Dedicated Dual RTX 4090 (48GB VRAM) for LLM Fine-Tuning'
                    : 'e.g. Annotated High-Resolution Retinal OCT Dataset (15,000 Scans)'
                }
                className="mt-1 w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Description & Usage Guidelines</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail software environment (CUDA, PyTorch, Ollama), network bandwidth, or data collection method..."
                className="mt-1 w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Hardware Specs Section */}
          {type === 'Hardware' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div>
                <label className="text-[11px] text-slate-400">GPU / CPU Model</label>
                <input
                  type="text"
                  value={gpuCpuModel}
                  onChange={(e) => setGpuCpuModel(e.target.value)}
                  placeholder="e.g. RTX 4090 24GB"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">VRAM</label>
                <input
                  type="text"
                  value={vram}
                  onChange={(e) => setVram(e.target.value)}
                  placeholder="e.g. 24GB GDDR6X"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">System RAM</label>
                <input
                  type="text"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  placeholder="e.g. 64GB DDR5"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Storage</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="e.g. 2TB NVMe SSD"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">OS</label>
                <input
                  type="text"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  placeholder="e.g. Ubuntu 22.04"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Access Method</label>
                <select
                  value={accessMethod}
                  onChange={(e) => setAccessMethod(e.target.value as HardwareAccessMethod)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="SSH">SSH Terminal</option>
                  <option value="RemoteDesktop">Remote Desktop / VNC</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400">Location / Datacenter Node</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Biomedical Informatics Pod 4"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Dataset Specs Section */}
          {type === 'Dataset' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div>
                <label className="text-[11px] text-slate-400">Research Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Medical Imaging / NLP"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Format</label>
                <input
                  type="text"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  placeholder="e.g. CSV, Parquet, NIfTI"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Approx. Size (Bytes)</label>
                <input
                  type="number"
                  value={sizeBytes}
                  onChange={(e) => setSizeBytes(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 524288000"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">License</label>
                <input
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="e.g. CC BY-SA 4.0 / MIT"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Pricing Config */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Pricing & Monetization</label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-400 font-medium">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                Mark as Completely Free / Open
              </label>
            </div>

            {!isFree && (
              <div className="grid grid-cols-2 gap-3">
                {type === 'Hardware' ? (
                  <>
                    <div>
                      <label className="text-[11px] text-slate-400">Hourly Rate ($ USD)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={hourlyPrice}
                        onChange={(e) => setHourlyPrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 1.50"
                        className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Daily Rate ($ USD)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={dailyPrice}
                        onChange={(e) => setDailyPrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 25.00"
                        className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400">One-Time Download Price ($ USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={onlinePrice}
                      onChange={(e) => setOnlinePrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 15.00"
                      className="mt-1 w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Institutional badge for Supervisors */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isInstitutional}
                  onChange={(e) => setIsInstitutional(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                Post as Lab/Institution Resource
              </label>

              {isInstitutional && (
                <div className="pl-5 space-y-2">
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Lab or Department Name (e.g. Neural Systems Laboratory)"
                    className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-cyan-400">
                    <input
                      type="checkbox"
                      checked={freeForInstitutionStudents}
                      onChange={(e) => setFreeForInstitutionStudents(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    Make 100% Free for students of this institution
                  </label>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-950/50"
            >
              {submitting ? 'Submitting for Approval...' : 'Publish Listing (Pending Review)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
