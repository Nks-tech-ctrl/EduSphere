import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle, Compass } from 'lucide-react';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Page Not Found | Edusphere';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Logo size="md" />
        <ThemeToggle />
      </header>

      <main className="max-w-lg mx-auto w-full text-center py-12 px-4 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mx-auto">
            <Compass className="w-14 h-14 animate-spin-slow" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black tracking-wider uppercase shadow-md">
            404
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          The institutional resource or page you requested does not exist or has been relocated within the Edusphere portal.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 dark:text-slate-600 pb-2">
        Edusphere College Management System • Error Code 404
      </footer>
    </div>
  );
}
