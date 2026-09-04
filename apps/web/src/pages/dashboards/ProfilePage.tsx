import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { Logo } from '../../components/brand/Logo.js';
import { 
  Award, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Save,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { UserAvatar } from '../../components/common/UserAvatar.js';

interface ProfilePageProps {
  onNavigate: (route: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [orcidUrl, setOrcidUrl] = useState(profile?.orcidUrl || '');
  const [scholarUrl, setScholarUrl] = useState(profile?.scholarUrl || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [skills, setSkills] = useState(profile?.skills?.join(', ') || '');
  const [researchInterests, setResearchInterests] = useState(profile?.researchInterests?.join(', ') || '');
  const [researchFieldTags, setResearchFieldTags] = useState(profile?.researchFieldTags?.join(', ') || '');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setInstitution(profile.institution || '');
      setDepartment(profile.department || '');
      setBio(profile.bio || '');
      setOrcidUrl(profile.orcidUrl || '');
      setScholarUrl(profile.scholarUrl || '');
      setPhotoUrl(profile.photoUrl || '');
      setSkills(profile.skills?.join(', ') || '');
      setResearchInterests(profile.researchInterests?.join(', ') || '');
      setResearchFieldTags(profile.researchFieldTags?.join(', ') || '');
    }
  }, [profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB.');
      return;
    }

    setErrorMsg(null);
    setIsUploadingPhoto(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 320; // 320x320 crisp avatar
          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const cropX = (img.width - minSide) / 2;
            const cropY = (img.height - minSide) / 2;
            ctx.drawImage(img, cropX, cropY, minSide, minSide, 0, 0, maxDim, maxDim);
            const optimizedUrl = canvas.toDataURL('image/jpeg', 0.88);
            setPhotoUrl(optimizedUrl);
          } else {
            setPhotoUrl(rawDataUrl);
          }
        } catch {
          setPhotoUrl(rawDataUrl);
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      img.onerror = () => {
        setErrorMsg('Failed to process the selected image.');
        setIsUploadingPhoto(false);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const interestsArray = researchInterests.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const tagsArray = researchFieldTags.split(',').map(s => s.trim()).filter(s => s.length > 0);

      await api.updateProfile({
        fullName,
        institution,
        department,
        bio,
        orcidUrl,
        scholarUrl,
        photoUrl,
        skills: skillsArray,
        researchInterests: interestsArray,
        researchFieldTags: tagsArray,
      });

      await refreshProfile();
      setSuccessMsg(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col">
      {/* Top Header — Identical height, style and logo as Dashboard TopHeader */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-[#0A0914]/95 backdrop-blur-xl px-6 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center space-x-6">
          <Logo
            size="sm"
            showBadge={false}
            onClick={() => onNavigate('/dashboard')}
          />
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <span className="font-bold text-sm text-white hidden sm:inline-block">Academic Profile</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs font-semibold text-violet-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{profile?.role || 'Academic'}</span>
          </div>
          <UserAvatar
            photoUrl={photoUrl || profile?.photoUrl}
            name={fullName || profile?.fullName}
            role={profile?.role}
            size="sm"
          />
        </div>
      </header>

      {/* Main Content with generous top breathing space */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-28 sm:pt-32 pb-16 space-y-6">
        {/* Page Title */}
        <div className="pb-2 border-b border-white/10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Academic Profile & Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your academic credentials, institutional affiliations, and researcher persona.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 shadow-lg shadow-red-500/5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Avatar & Identity Card */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0E1118] border border-slate-800/80 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Interactive Live User Avatar with Social-Media Style Camera Upload Badge */}
              <div className="relative group shrink-0">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-photo-file-input"
                />

                {/* Avatar Display */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer rounded-full group-hover:ring-4 group-hover:ring-indigo-500/40 transition-all duration-300"
                  title="Click to change profile picture"
                >
                  <UserAvatar
                    photoUrl={photoUrl || profile?.photoUrl}
                    name={fullName || profile?.fullName}
                    role={profile?.role}
                    size="2xl"
                    className="ring-4 ring-indigo-500/20 shadow-2xl shadow-indigo-500/10"
                  />

                  {/* Dark hover overlay with camera icon & text */}
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                    <Camera className="w-5 h-5 text-indigo-300 mb-0.5" />
                    <span className="text-[10px] font-medium tracking-wide">Change</span>
                  </div>
                </div>

                {/* Facebook/LinkedIn Style Floating Camera Upload Button Badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/50 border-2 border-[#0E1118] flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-10"
                  title="Upload profile photo"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* User Identity Details & Photo Management Options */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {fullName || profile?.fullName || 'User'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {profile?.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {institution || profile?.institution || 'Institution'} · {department || profile?.department || 'Department'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  ID: {profile?.id}
                </p>

                {/* Photo Action Links */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 hover:underline"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  {(photoUrl || profile?.photoUrl) && (
                    <>
                      <span className="text-slate-600 text-xs">·</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1.5 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-800/60">
              <div className="p-3.5 rounded-xl bg-[#141824] border border-slate-800">
                <div className="text-slate-500 mb-1">Application Role</div>
                <div className="font-bold text-white text-sm">{profile?.role}</div>
                <div className="text-[10px] text-slate-500 mt-1">Controlled via RBAC</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141824] border border-slate-800">
                <div className="text-slate-500 mb-1">Account Status</div>
                <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{profile?.status}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Live Database Verified</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141824] border border-slate-800">
                <div className="text-slate-500 mb-1">Reputation Points</div>
                <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>{profile?.reputationPoints ?? 0} pts</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Earned via Research & Reviews</div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Academic Affiliation & Biography
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institution
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Primary Research Area
                </label>
                <input
                  type="text"
                  value={researchFieldTags}
                  onChange={(e) => setResearchFieldTags(e.target.value)}
                  placeholder="e.g. Computer Science, Machine Learning"
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Biography / Research Summary
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Doctoral candidate working on neural scaling laws, efficient transformers, and distributed deep learning..."
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  ORCID Profile URL
                </label>
                <input
                  type="url"
                  value={orcidUrl}
                  onChange={(e) => setOrcidUrl(e.target.value)}
                  placeholder="https://orcid.org/0000-0002-..."
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Google Scholar URL
                </label>
                <input
                  type="url"
                  value={scholarUrl}
                  onChange={(e) => setScholarUrl(e.target.value)}
                  placeholder="https://scholar.google.com/citations?user=..."
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Skills & Research Focus */}
          <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Skills & Scientific Taxonomy
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Technical Skills <span className="text-slate-500 normal-case">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="PyTorch, JAX, CUDA, Distributed Systems, LaTeX"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Research Interests <span className="text-slate-500 normal-case">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={researchInterests}
                onChange={(e) => setResearchInterests(e.target.value)}
                placeholder="Generative AI, Mechanistic Interpretability, Diffusion Models"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
