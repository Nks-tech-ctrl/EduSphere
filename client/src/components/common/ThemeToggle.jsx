import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '', size = 'md' }) {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative inline-flex items-center justify-center rounded-xl transition-all duration-200 border ${
        isDark
          ? 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700/80 hover:text-amber-200 shadow-inner'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span className="sr-only">Toggle theme</span>
      <div className="relative flex items-center justify-center transition-transform duration-300 transform">
        {isDark ? (
          <Sun className={`${iconSizes[size] || iconSizes.md} animate-in fade-in zoom-in-75 duration-200`} />
        ) : (
          <Moon className={`${iconSizes[size] || iconSizes.md} animate-in fade-in zoom-in-75 duration-200 text-slate-600`} />
        )}
      </div>
    </button>
  );
}
