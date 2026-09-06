import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { SignupPage } from './pages/auth/SignupPage.js';
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.js';
import { DashboardRouter } from './pages/dashboards/DashboardRouter.js';
import { ProfilePage } from './pages/dashboards/ProfilePage.js';
import { NotificationsPage } from './pages/dashboards/NotificationsPage.js';
import { LibraryPage } from './pages/dashboards/LibraryPage.js';
import { PaperViewerPage } from './pages/dashboards/PaperViewerPage.js';
import { ExitWorkspaceModal } from './components/workspace/ExitWorkspaceModal.js';

function AppContent() {
  const { user, signOut } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.pathname || '/');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const navigate = useCallback((route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const targetPath = window.location.pathname || '/';

      // 1. If user is authenticated and currently on Dashboard:
      // Clicking browser back MUST directly show the Exit/Sign Out popup,
      // without reversing through previously visited internal pages.
      if (user && currentRoute.startsWith('/dashboard')) {
        window.history.pushState(null, '', currentRoute);
        setIsExitModalOpen(true);
        return;
      }

      // 2. If user is authenticated on a sub-page (e.g. /profile, /notifications) and attempting to exit to auth/landing:
      const isAttemptingToExit = targetPath === '/' || targetPath === '/login' || targetPath === '/signup' || targetPath === '/forgot-password';
      if (user && isAttemptingToExit) {
        window.history.pushState(null, '', currentRoute);
        setIsExitModalOpen(true);
        return;
      }

      setCurrentRoute(targetPath);
    };

    window.addEventListener('popstate', handlePopState);

    // Detect OAuth callback hash/code in URL
    if (typeof window !== 'undefined') {
      const hasAuthParams = window.location.hash?.includes('access_token=') || window.location.search?.includes('code=');
      if (hasAuthParams) {
        if (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/signup') {
          navigate('/dashboard');
        }
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, currentRoute, navigate]);

  const handleConfirmSignOut = async () => {
    setIsExitModalOpen(false);
    try {
      await signOut();
    } catch {
      // Ignore errors on exit
    }
    navigate('/');
  };

  const renderRoute = () => {
    // Auth & Utility pages — exact match
    switch (currentRoute) {
      case '/login':
        return <LoginPage onNavigate={navigate} />;
      case '/signup':
        return <SignupPage onNavigate={navigate} />;
      case '/complete-profile':
        return <CompleteProfilePage onNavigate={navigate} />;
      case '/forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />;
      case '/reset-password':
        return <ResetPasswordPage onNavigate={navigate} />;
      case '/profile':
        return <ProfilePage onNavigate={navigate} />;
      case '/notifications':
        return <NotificationsPage onNavigate={navigate} />;
    }

    // Full Notifications page route with query params
    if (currentRoute.startsWith('/notifications')) {
      return <NotificationsPage onNavigate={navigate} />;
    }

    // Individual Paper In-Browser Reader (Spec 03 Phase 3.8)
    if (currentRoute.startsWith('/papers/')) {
      const paperId = currentRoute.replace('/papers/', '').split('/')[0]?.split('?')[0];
      if (paperId) {
        return <PaperViewerPage paperId={paperId} onNavigate={navigate} />;
      }
    }

    // Literature Review & Paper Manager (Spec 03)
    if (
      currentRoute === '/literature' ||
      currentRoute === '/library' ||
      currentRoute === '/papers' ||
      currentRoute.startsWith('/literature') ||
      currentRoute.startsWith('/library')
    ) {
      return <LibraryPage onNavigate={navigate} />;
    }

    // Dashboard & Project Workspace — any path starting with /projects or /dashboard
    if (currentRoute.startsWith('/projects') || currentRoute.startsWith('/dashboard')) {
      return <DashboardRouter onNavigate={navigate} currentRoute={currentRoute} />;
    }

    // Default: Landing Page
    return (
      <LandingPage
        onNavigate={navigate}
        onNavigateToApp={() => navigate('/dashboard')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {renderRoute()}

      {/* Exit / Sign Out Confirmation Modal when pressing browser back button from workspace */}
      <ExitWorkspaceModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmSignOut={handleConfirmSignOut}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
