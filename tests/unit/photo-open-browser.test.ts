import { describe, expect, it, vi } from 'vitest';
import { browserCommand, openBrowser } from '../../tools/photo-studio/open-browser.mjs';

const URL_TO_OPEN = 'http://127.0.0.1:4322/';

describe('browserCommand (one branch per operating system)', () => {
  it('uses `open` on macOS', () => {
    expect(browserCommand('darwin', URL_TO_OPEN)).toEqual(['open', [URL_TO_OPEN]]);
  });
  it('uses `cmd /c start` on Windows, with the empty window-title argument', () => {
    expect(browserCommand('win32', URL_TO_OPEN)).toEqual([
      'cmd.exe',
      ['/c', 'start', '', URL_TO_OPEN],
    ]);
  });
  it('uses xdg-open everywhere else', () => {
    expect(browserCommand('linux', URL_TO_OPEN)).toEqual(['xdg-open', [URL_TO_OPEN]]);
  });
  it('always returns an argument array, never a shell string', () => {
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      const [command, args] = browserCommand(platform, URL_TO_OPEN);
      expect(typeof command).toBe('string');
      expect(Array.isArray(args)).toBe(true);
    }
  });
});

describe('openBrowser', () => {
  it('does nothing when NO_OPEN=1', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await openBrowser(URL_TO_OPEN, { platform: 'win32', env: { NO_OPEN: '1' } });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('prints the address instead of throwing when the opener is missing', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Pretend to be a platform whose opener cannot exist on this machine.
    await openBrowser(URL_TO_OPEN, { platform: 'aix' as NodeJS.Platform, env: {} });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(URL_TO_OPEN));
    log.mockRestore();
  });
});
