const THEME_KEY = 'macro_guru_theme';
export type Theme = 'light' | 'dark';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'system') localStorage.removeItem(THEME_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getInitialTheme();
  const next: Theme = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}
