import React from 'react';

export default function Logo({ size = 'md', showText = true, className = '' }) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Sphere & Graduation Cap Emblem */}
      <div className={`relative flex items-center justify-center flex-shrink-0 ${iconSizes[size] || iconSizes.md}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="eduGradPrimary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563eb" />
              <stop offset="0.5" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="eduGradGlow" x1="0" y1="24" x2="48" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="1" stopColor="#818cf8" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="eduCapGrad" x1="12" y1="14" x2="36" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#e0e7ff" />
            </linearGradient>
          </defs>

          {/* Rounded Squircle Container */}
          <rect width="48" height="48" rx="14" fill="url(#eduGradPrimary)" />

          {/* Orbital Sphere Ring */}
          <ellipse
            cx="24"
            cy="26"
            rx="18"
            ry="6"
            stroke="url(#eduGradGlow)"
            strokeWidth="1.8"
            strokeDasharray="4 2"
            transform="rotate(-18 24 26)"
          />

          {/* Spherical Core Glow */}
          <circle cx="24" cy="24" r="10" fill="#ffffff" fillOpacity="0.12" />

          {/* Graduation Cap Motif */}
          {/* Diamond Cap Top */}
          <path
            d="M24 13L37 19.5L24 26L11 19.5L24 13Z"
            fill="url(#eduCapGrad)"
          />
          {/* Cap Base Arch */}
          <path
            d="M16 23.5V28.5C16 31 19.5 33 24 33C28.5 33 32 31 32 28.5V23.5"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M34 20V27.5M34 27.5C34 28.5 33 29 32.5 29M34 27.5C34 28.5 35 29 35.5 29"
            stroke="#fcd34d"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight select-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${textSizes[size] || textSizes.md}`}>
              Edusphere
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700/80 uppercase">
              Pro
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5">
            College Management
          </p>
        </div>
      )}
    </div>
  );
}
