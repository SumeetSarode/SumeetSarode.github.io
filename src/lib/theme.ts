export const THEME_STORAGE_KEY = 'theme';

export type Theme = 'light' | 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

/** Accessible name states the action the button will perform. */
export function toggleLabel(current: Theme): string {
  return `Switch to ${oppositeTheme(current)} theme`;
}

/**
 * Runs inline in <head>, before first paint, so there is no theme flash.
 * Stored explicit choice wins; otherwise follow the system setting.
 * Storage access is wrapped in try/catch for privacy modes that block it.
 * This string is the single source of truth: the page inlines it and the
 * unit tests execute it.
 */
export const THEME_INIT_SCRIPT = `(function () {
  var theme = null;
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (e) {}
  if (!theme) {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = dark ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();`;
