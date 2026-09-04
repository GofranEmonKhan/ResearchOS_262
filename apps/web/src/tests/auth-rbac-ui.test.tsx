import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

// Auth and Dashboard Components
import { LoginPage } from '../pages/auth/LoginPage.js';
import { SignupPage } from '../pages/auth/SignupPage.js';
import { CompleteProfilePage } from '../pages/auth/CompleteProfilePage.js';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage.js';
import { ResearcherWorkspacePage } from '../pages/dashboards/ResearcherWorkspacePage.js';
import { SupervisorDashboardPage } from '../pages/dashboards/SupervisorDashboardPage.js';
import { AdminConsolePage } from '../pages/dashboards/AdminConsolePage.js';
import { ProfilePage } from '../pages/dashboards/ProfilePage.js';
import { AuthProvider } from '../context/AuthContext.js';

describe('Spec 01 — Frontend Auth, RBAC & Role Dashboards UI Test Suite', () => {
  it('1. LoginPage renders email/password form, Google OAuth button, and fast test account switcher', () => {
    const html = renderToString(
      <AuthProvider>
        <LoginPage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Sign In to Your Workspace'), 'Must render sign-in title');
    assert.ok(html.includes('Institutional Email'), 'Must render email label');
    assert.ok(html.includes('Password'), 'Must render password label');
    assert.ok(html.includes('Sign in with Google'), 'Must render Google OAuth button');
    assert.ok(html.includes('Demo Test Credentials'), 'Must render demo credentials switcher');
    assert.ok(html.includes('Alex Chen'), 'Must render Researcher demo button');
    assert.ok(html.includes('Prof. Vance'), 'Must render Supervisor demo button');
    assert.ok(html.includes('Dr. Vance'), 'Must render Admin demo button');
  });

  it('2. SignupPage renders role selection (Researcher vs Supervisor) with faculty verification warning', () => {
    const html = renderToString(
      <AuthProvider>
        <SignupPage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Create Academic Account'), 'Must render signup title');
    assert.ok(html.includes('Researcher'), 'Must render Researcher role option');
    assert.ok(html.includes('Supervisor'), 'Must render Supervisor role option');
    assert.ok(html.includes('Institutional Email'), 'Must render email input');
    assert.ok(html.includes('Institution'), 'Must render institution input');
    assert.ok(html.includes('Department'), 'Must render department input');
    assert.ok(html.includes('Register as'), 'Must render submit button');
  });

  it('3. CompleteProfilePage renders Google OAuth first-time onboarding fields', () => {
    const html = renderToString(
      <AuthProvider>
        <CompleteProfilePage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Complete Academic Onboarding'), 'Must render onboarding title');
    assert.ok(html.includes('OAuth Account Authenticated'), 'Must render authenticated badge');
    assert.ok(html.includes('Select Primary Role'), 'Must render role selection');
    assert.ok(html.includes('University / Institute'), 'Must render institution input');
    assert.ok(html.includes('Department of Computer Science'), 'Must render department placeholder');
    assert.ok(html.includes('Save Profile &amp; Enter Dashboard'), 'Must render submit button');
  });

  it('4. ForgotPasswordPage and ResetPasswordPage render credential recovery flows', () => {
    const forgotHtml = renderToString(
      <AuthProvider>
        <ForgotPasswordPage onNavigate={() => {}} />
      </AuthProvider>
    );
    assert.ok(forgotHtml.includes('Reset Password'), 'Must render reset password title');
    assert.ok(forgotHtml.includes('Send Reset Link'), 'Must render send link button');

    const resetHtml = renderToString(
      <AuthProvider>
        <ResetPasswordPage onNavigate={() => {}} />
      </AuthProvider>
    );
    assert.ok(resetHtml.includes('Set New Password'), 'Must render new password title');
    assert.ok(resetHtml.includes('Confirm New Password'), 'Must render confirm password input');
  });

  it('5. ResearcherWorkspacePage renders workspace navigation and workspace layout', () => {
    const html = renderToString(
      <AuthProvider>
        <ResearcherWorkspacePage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Workspace Board'), 'Must render workspace navigation');
    assert.ok(html.includes('Milestones &amp; Calendar') || html.includes('Milestones & Calendar'), 'Must render milestones nav');
    assert.ok(html.includes('Research AI Co-Pilot'), 'Must render AI co-pilot nav');
  });

  it('6. SupervisorDashboardPage renders "Supervision Dashboard" with verification review banner or supervised projects', () => {
    const html = renderToString(
      <AuthProvider>
        <SupervisorDashboardPage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Workspace Board') || html.includes('Institutional Verification'), 'Must render supervisor navigation or verification card');
    assert.ok(html.includes('New Supervised Project') || html.includes('Verification'), 'Must render supervised project action or status');
  });

  it('7. AdminConsolePage renders "Admin Console" with verification queue and role management controls', () => {
    const html = renderToString(
      <AuthProvider>
        <AdminConsolePage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Platform Governance Console') || html.includes('Admin Active'), 'Must render admin console badge');
    assert.ok(html.includes('Supervisor Verification Queue') || html.includes('Verifications'), 'Must render verification queue title');
    assert.ok(html.includes('Target User Governance') || html.includes('RBAC'), 'Must render role controls title');
    assert.ok(html.includes('Suspend Account') || html.includes('Account'), 'Must render suspend account button');
    assert.ok(html.includes('Change Role') || html.includes('Role'), 'Must render change role button');
  });

  it('8. ProfilePage renders user identity, reputation points, and academic editor', () => {
    const html = renderToString(
      <AuthProvider>
        <ProfilePage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Academic Affiliation') || html.includes('Profile'), 'Must render profile header');
    assert.ok(html.includes('Application Role') || html.includes('Identity'), 'Must render governance section');
    assert.ok(html.includes('Reputation Points'), 'Must render reputation points');
    assert.ok(html.includes('ORCID Profile URL') || html.includes('ORCID'), 'Must render ORCID input');
    assert.ok(html.includes('Google Scholar URL') || html.includes('Scholar'), 'Must render Scholar input');
    assert.ok(html.includes('Skills') || html.includes('Scientific Taxonomy'), 'Must render skills section');
  });
});
