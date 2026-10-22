import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, title, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, message, title, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <aside aria-label="Notifications" className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              border: 'border-emerald-200 dark:border-emerald-800/80',
              bg: 'bg-white/95 dark:bg-slate-900/95',
              iconColor: 'text-emerald-500 dark:text-emerald-400',
              badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
            },
            error: {
              icon: AlertCircle,
              border: 'border-rose-200 dark:border-rose-800/80',
              bg: 'bg-white/95 dark:bg-slate-900/95',
              iconColor: 'text-rose-500 dark:text-rose-400',
              badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
            },
            warning: {
              icon: AlertTriangle,
              border: 'border-amber-200 dark:border-amber-800/80',
              bg: 'bg-white/95 dark:bg-slate-900/95',
              iconColor: 'text-amber-500 dark:text-amber-400',
              badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
            },
            info: {
              icon: Info,
              border: 'border-blue-200 dark:border-blue-800/80',
              bg: 'bg-white/95 dark:bg-slate-900/95',
              iconColor: 'text-blue-500 dark:text-blue-400',
              badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
            },
          }[t.type] || {
            icon: Info,
            border: 'border-slate-200 dark:border-slate-700',
            bg: 'bg-white dark:bg-slate-900',
            iconColor: 'text-slate-500',
            badge: 'bg-slate-100 text-slate-700',
          };

          const Icon = typeConfig.icon;

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl backdrop-blur-md border ${typeConfig.border} ${typeConfig.bg} flex items-start gap-3 transition-all duration-200 transform translate-y-0 opacity-100 animate-in slide-in-from-top-3`}
            >
              <div className={`p-1.5 rounded-xl ${typeConfig.badge} flex-shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${typeConfig.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words font-medium">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 -mr-1 -mt-1"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
