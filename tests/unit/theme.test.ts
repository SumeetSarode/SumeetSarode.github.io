import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { THEME_INIT_SCRIPT, isTheme, oppositeTheme, toggleLabel } from '../../src/lib/theme';

interface Options {
  stored?: string | null;
  systemDark?: boolean;
  storageThrows?: boolean;
  noMatchMedia?: boolean;
}

/** Executes the real inline script against a fake browser environment. */
function runInit({
  stored = null,
  systemDark = false,
  storageThrows = false,
  noMatchMedia = false,
}: Options) {
  const documentElement = { dataset: {} as Record<string, string> };
  const sandbox = {
    document: { documentElement },
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error('blocked');
        return stored;
      },
    },
    window: noMatchMedia ? {} : { matchMedia: () => ({ matches: systemDark }) },
  };
  runInNewContext(THEME_INIT_SCRIPT, sandbox);
  return documentElement.dataset['theme'];
}

describe('theme init script (runs before first paint)', () => {
  it('uses an explicit stored choice over the system setting', () => {
    expect(runInit({ stored: 'light', systemDark: true })).toBe('light');
    expect(runInit({ stored: 'dark', systemDark: false })).toBe('dark');
  });

  it('follows the system when nothing is stored', () => {
    expect(runInit({ systemDark: true })).toBe('dark');
    expect(runInit({ systemDark: false })).toBe('light');
  });

  it('ignores garbage in storage', () => {
    expect(runInit({ stored: 'purple', systemDark: true })).toBe('dark');
  });

  it('still works when storage is blocked', () => {
    expect(runInit({ storageThrows: true, systemDark: true })).toBe('dark');
  });

  it('falls back to light when matchMedia is unavailable', () => {
    expect(runInit({ noMatchMedia: true })).toBe('light');
  });
});

describe('theme helpers', () => {
  it('validates themes', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('auto')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it('flips themes', () => {
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('dark')).toBe('light');
  });

  it('labels the toggle with the action it performs', () => {
    expect(toggleLabel('light')).toBe('Switch to dark theme');
    expect(toggleLabel('dark')).toBe('Switch to light theme');
  });
});
