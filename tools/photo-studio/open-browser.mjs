import { execFile } from 'node:child_process';

/**
 * The command that opens a URL in the user's default browser.
 * Pure, so every operating system's branch can be unit-tested anywhere.
 * Arguments are always an array: nothing is ever passed through a shell string.
 * @param {NodeJS.Platform} platform
 * @param {string} url
 * @returns {[string, string[]]}
 */
export function browserCommand(platform, url) {
  if (platform === 'darwin') return ['open', [url]];
  // The empty string is the window title that `start` expects before a URL.
  if (platform === 'win32') return ['cmd.exe', ['/c', 'start', '', url]];
  return ['xdg-open', [url]];
}

/**
 * Opens the default browser. Resolves when the opener has finished, so callers
 * can safely exit afterwards. Never throws: if it fails, the URL is printed.
 */
export function openBrowser(url, { platform = process.platform, env = process.env } = {}) {
  if (env['NO_OPEN'] === '1') return Promise.resolve();
  const [command, args] = browserCommand(platform, url);
  return new Promise((done) => {
    execFile(command, args, (error) => {
      if (error) console.log(`Could not open a browser. Open this address yourself: ${url}`);
      done();
    });
  });
}
