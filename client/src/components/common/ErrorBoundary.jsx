import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Edusphere ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearLoginAndReload = () => {
    try {
      localStorage.removeItem('edusphere_token');
      localStorage.removeItem('edusphere_user');
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === 'string' ? this.state.error : 'An unexpected error occurred.');

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 transition-colors">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/60 text-center animate-in fade-in zoom-in-95 duration-150">
            
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Something went wrong
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4">
              Edusphere encountered an unexpected issue while rendering this page.
            </p>

            <div className="p-3.5 mb-6 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-left font-mono text-xs text-rose-600 dark:text-rose-400 break-words max-h-40 overflow-y-auto">
              <span className="font-semibold block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
                Error Message:
              </span>
              {errorMessage}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearLoginAndReload}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Clear saved login and reload</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-5">
              Edusphere Campus Governance Platform • Tech Fest 2026
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
