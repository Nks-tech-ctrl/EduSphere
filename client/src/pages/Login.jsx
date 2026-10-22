import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import DemoGuideModal from '../components/common/DemoGuideModal';
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const DEFAULT_DEMO_ACCOUNTS = [
  { role: 'admin', roleLabel: 'Central Admin', email: 'admin@edusphere.edu', password: 'Admin@123', badge: 'Admin' },
  { role: 'hod', roleLabel: 'HOD (CSE)', email: 'hod.cse@edusphere.edu', password: 'Hod@123', badge: 'HOD' },
  { role: 'faculty', roleLabel: 'Faculty (CSE)', email: 'faculty.sharma@edusphere.edu', password: 'Faculty@123', badge: 'Faculty' },
  { role: 'student', roleLabel: 'Student (CSE)', email: 'student1@edusphere.edu', password: 'Student@123', badge: 'Student' }
];

export default function Login() {
  const [email, setEmail] = useState('admin@edusphere.edu');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState(DEFAULT_DEMO_ACCOUNTS);
  const [guideOpen, setGuideOpen] = useState(false);

  const { login, isAuthenticated, user, getRoleDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Sign In | Edusphere';
  }, []);

  // Check for expired=1 in query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === '1') {
      setSessionExpiredNotice(true);
    }
  }, [location.search]);

  // If already authenticated, redirect to role dashboard (or redirect query param)
  useEffect(() => {
    if (isAuthenticated && user) {
      const params = new URLSearchParams(location.search);
      const redirectParam = params.get('redirect');
      if (redirectParam) {
        navigate(decodeURIComponent(redirectParam), { replace: true });
      } else {
        navigate(getRoleDashboardPath(user.role), { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, getRoleDashboardPath, location.search]);

  // Load demo accounts for 1-click testing (safe fallback if network/api fails)
  useEffect(() => {
    let mounted = true;
    async function loadDemo() {
      try {
        const res = await authApi.getDemoAccounts();
        if (mounted && res?.success && Array.isArray(res.demoAccounts) && res.demoAccounts.length > 0) {
          setDemoAccounts(res.demoAccounts);
        }
      } catch (err) {
        console.warn('Demo accounts fetch failed, keeping default demo accounts:', err);
      }
    }
    loadDemo();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSessionExpiredNotice(false);
    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      const params = new URLSearchParams(location.search);
      const redirectParam = params.get('redirect');
      if (redirectParam) {
        navigate(decodeURIComponent(redirectParam), { replace: true });
      } else {
        const redirectPath = getRoleDashboardPath(loggedUser.role);
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      // Wrong password or invalid credentials must show "Invalid email or password" on the login form
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('credential') ||
        msg.toLowerCase().includes('password') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('401')
      ) {
        setError('Invalid email or password');
      } else {
        setError(msg || 'Invalid email or password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDemoAccount = (demo, autoSubmit = false) => {
    if (!demo) return;
    setEmail(demo.email || '');
    setPassword(demo.password || '');
    setError('');
    setSessionExpiredNotice(false);

    if (autoSubmit && demo.email && demo.password) {
      setSubmitting(true);
      login(demo.email, demo.password)
        .then((loggedUser) => {
          const params = new URLSearchParams(location.search);
          const redirectParam = params.get('redirect');
          if (redirectParam) {
            navigate(decodeURIComponent(redirectParam), { replace: true });
          } else {
            navigate(getRoleDashboardPath(loggedUser?.role || 'student'), { replace: true });
          }
        })
        .catch((err) => {
          setError(err?.message || 'Demo login failed');
          setSubmitting(false);
        });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between py-6 px-3 sm:px-6 lg:px-8 transition-colors duration-150">
      
      {/* Background Decorative Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-300/30 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-300/30 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Top Bar with Demo Guide & Theme Toggle */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/90 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Campus Tech Fest 2026 Showcase</span>
            <span className="sm:hidden">Tech Fest 2026</span>
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Demo Guide</span>
          </button>
        </div>

        <ThemeToggle size="sm" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full my-auto">
        
        {/* Session Expired Banner */}
        {sessionExpiredNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Your session has expired. Please sign in with your credentials to continue.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/60 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          
          {/* Left Column: Brand Hero & Tagline */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-6 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Logo size="lg" showText={false} />
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Edusphere</h1>
                  <p className="text-blue-200 text-xs font-medium">Campus Governance Platform</p>
                </div>
              </div>

              <div className="space-y-4 my-6 sm:my-8">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  Smart College Management with Transparent Grievance Redressal
                </h2>
                <p className="text-blue-100 text-xs leading-relaxed opacity-90">
                  A high-performance institutional portal supporting autonomous attendance, curriculum gradebooks, notices, and verifiable 3-day SLA grievance tracking.
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-blue-100">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Real-time Attendance, Marks & Curriculum tracking</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-blue-100">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Anonymous student grievances with automated category routing</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-blue-100">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Central Admin 3-day SLA escalation engine with full audit trail</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-5 border-t border-white/10 text-[11px] text-blue-200 flex justify-between items-center">
              <span>SQLite + Express + React</span>
              <span className="font-semibold text-white">Autumn 2026</span>
            </div>
          </div>

          {/* Right Column: Interactive Login & 1-Click Demo Buttons */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sign In to Your Portal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your institutional credentials or select any demo role below for 1-click instant login.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@edusphere.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quick Demo Accounts (1-Click Login)
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Instant Access
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(Array.isArray(demoAccounts) && demoAccounts.length > 0 ? demoAccounts : DEFAULT_DEMO_ACCOUNTS).map((demo) => {
                  const badgeStyles = {
                    admin: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:border-purple-300',
                    hod: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-300',
                    faculty: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:border-blue-300',
                    student: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300',
                  };

                  return (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => handleSelectDemoAccount(demo, true)}
                      className={`text-left p-2 sm:p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between ${
                        badgeStyles[demo.role] || 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <span className="text-xs font-bold block truncate">{demo.roleLabel}</span>
                        <p className="text-[10px] opacity-75 truncate">{demo.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800/90 shadow-2xs border border-current flex-shrink-0">
                        Login
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Login Footer */}
      <footer className="relative z-10 text-center py-3 text-xs text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Built for {import.meta.env.VITE_COLLEGE_NAME || 'Edusphere Institute of Technology'} Tech Fest 2026
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          Edusphere • Modern College Management & Transparent Grievance Redressal Platform
        </p>
      </footer>

      {/* Demo Guide Modal */}
      <DemoGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onSelectDemo={handleSelectDemoAccount}
      />
    </div>
  );
}
