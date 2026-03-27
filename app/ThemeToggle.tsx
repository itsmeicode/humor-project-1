'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'themeMode';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initialMode: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    setMode(initialMode);
    applyTheme(initialMode);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (initialMode === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const updateMode = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <div className="theme-toggle-shell fixed bottom-4 right-4 z-50 rounded-xl border border-gray-300 bg-white/90 p-1 shadow-md backdrop-blur">
      <div className="flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => updateMode('light')}
          className={`mode-toggle-btn rounded-md px-2 py-1 ${
            mode === 'light' ? 'mode-toggle-btn-active' : 'text-gray-800'
          }`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => updateMode('dark')}
          className={`mode-toggle-btn rounded-md px-2 py-1 ${
            mode === 'dark' ? 'mode-toggle-btn-active' : 'text-gray-800'
          }`}
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => updateMode('system')}
          className={`mode-toggle-btn rounded-md px-2 py-1 ${
            mode === 'system' ? 'mode-toggle-btn-active' : 'text-gray-800'
          }`}
        >
          System
        </button>
      </div>
    </div>
  );
}

