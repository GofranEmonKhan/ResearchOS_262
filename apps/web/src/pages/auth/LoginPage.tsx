import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Logo } from '../../components/brand/Logo.js';
import { NeuralGalaxyBackground } from '../../components/effects/NeuralGalaxyBackground.js';
import { 
  LogIn, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  FlaskConical,
  GraduationCap
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { user, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      onNavigate('/dashboard');
    }
  }, [user, onNavigate]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsGoogleLoading(false);
      if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider') || (error as any)?.status === 400) {
        setErrorMsg('Google OAuth Provider is not enabled in your Supabase project. To enable Google Sign-In: go to Supabase Dashboard > Authentication > Providers > Google and toggle it ON with your Google Client ID.');
      } else {
        setErrorMsg(error.message || 'Google sign in failed. Please check network and browser settings.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to sign in. Please verify your credentials.');
    } else {
      onNavigate('/dashboard');
    }
  };

  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password123!');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Living Neural Galaxy Background Layer */}
      <NeuralGalaxyBackground />

      {/* Header Logo */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <Logo size="md" onClick={() => onNavigate('/')} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Sign In to Your Workspace
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Access your research projects, supervisor oversight, or platform console.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-md bg-[#0E1118]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 relative z-10">
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In with Credentials</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-[#0E1118] px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
            or continue with
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-[#141824] border border-slate-700/60 hover:border-slate-600 text-slate-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Demo Fast Account Switcher for Instant Testing */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Demo Test Credentials
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('researcher@mit.edu')}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-slate-800 border border-slate-700/50 text-left transition-colors flex items-center gap-1.5"
            >
              <FlaskConical className="w-3 h-3 text-cyan-400 shrink-0" />
              <div className="truncate">
                <div className="font-semibold text-slate-200">Researcher</div>
                <div className="text-[10px] text-slate-500 truncate">Alex Chen</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor@stanford.edu')}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-slate-800 border border-slate-700/50 text-left transition-colors flex items-center gap-1.5"
            >
              <GraduationCap className="w-3 h-3 text-indigo-400 shrink-0" />
              <div className="truncate">
                <div className="font-semibold text-slate-200">Supervisor (Active)</div>
                <div className="text-[10px] text-slate-500 truncate">Prof. Vance</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('supervisor.pending@oxford.edu')}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-slate-800 border border-slate-700/50 text-left transition-colors flex items-center gap-1.5"
            >
              <GraduationCap className="w-3 h-3 text-amber-400 shrink-0" />
              <div className="truncate">
                <div className="font-semibold text-slate-200">Supervisor (Pending)</div>
                <div className="text-[10px] text-slate-500 truncate">Dr. Pendelton</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@researchos.edu')}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-slate-800 border border-slate-700/50 text-left transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3 h-3 text-rose-400 shrink-0" />
              <div className="truncate">
                <div className="font-semibold text-slate-200">Admin Console</div>
                <div className="text-[10px] text-slate-500 truncate">Dr. Vance</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('/signup')}
          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Create account
        </button>
      </div>
    </div>
  );
};
