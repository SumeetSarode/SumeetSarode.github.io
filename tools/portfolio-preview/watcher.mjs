/**
 * Notices when the owner saves a content file (or changes the photo in Photo Studio), and asks
 * for one rebuild once things have been quiet for a moment.
 */
import { existsSync, watch } from 'node:fs';
import { join, sep } from 'node:path';

/** Editors' and the OS's scratch files: saving them isn't a content change. */
export const isNoise = (path) =>
  /(^|[\\/])(\.DS_Store|Thumbs\.db|~\$[^\\/]*|\.~lock[^\\/]*|[^\\/]*\.(swp|swx|tmp|partial|crdownload)|[^\\/]*~)$/i.test(
    path,
  );

/**
 * @param {{ contentDir: string, resumeDir: string, alsoWatch?: string[], delayMs?: number,
 *   onChange: (change: { resume: boolean }) => void }} options
 */
export function watchContent({ contentDir, resumeDir, alsoWatch = [], delayMs = 400, onChange }) {
  let timer;
  let resume = false;

  const noticed = (path) => {
    if (isNoise(path)) return;
    if (path === resumeDir || path.startsWith(resumeDir + sep)) resume = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const change = { resume };
      resume = false;
      onChange(change);
    }, delayMs);
  };

  const watchers = [
    watch(contentDir, { recursive: true }, (_, name) => noticed(join(contentDir, name ?? ''))),
    ...alsoWatch
      .filter((folder) => existsSync(folder))
      .map((folder) => watch(folder, (_, name) => noticed(join(folder, name ?? '')))),
  ];
  return {
    close() {
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    },
  };
}
