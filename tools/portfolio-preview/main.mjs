/**
 * Entry point for Portfolio Preview, shared by every way of starting it: the macOS app, the
 * Windows launcher, and `npm run portfolio-preview`.
 *
 * It builds the site, shows it in the browser with a status bar, rebuilds whenever content
 * changes, and stops by itself when the browser tab is closed (same rules as Photo Studio).
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONTENT_DIR,
  LINKEDIN_INPUT_DIR,
  RESUME_INPUT_DIR,
} from '../../src/content-files/paths.mjs';
import { apply as applyLinkedIn, review as reviewLinkedIn } from '../linkedin/import.mjs';
import { createLifecycle } from '../photo-studio/lifecycle.mjs';
import { openBrowser } from '../photo-studio/open-browser.mjs';
import { buildResume } from '../resume/build.mjs';
import { HttpError } from '../shared/http.mjs';
import { createBuilder } from './builder.mjs';
import { DEFAULT_PORT, PREVIEW_PATH, createPreviewServer } from './server.mjs';
import { watchContent } from './watcher.mjs';

const root = process.cwd();
const port = Number(process.env['PREVIEW_PORT'] ?? DEFAULT_PORT);
const url = `http://127.0.0.1:${port}${PREVIEW_PATH}`;

const workRoot = await mkdtemp(join(tmpdir(), 'portfolio-preview-'));
let server;
const builder = createBuilder({
  root,
  workRoot,
  buildResume,
  onUpdate: (status) => {
    server?.broadcast(status);
    if (status.site.state === 'error') console.log(`Needs a fix:\n${status.site.message}`);
    if (status.site.state === 'ready') console.log(`Preview updated. ${status.resume.message}`);
  },
});
const lifecycle = createLifecycle({ onShutdown: () => shutdown() });
const linkedinDirs = { contentDir: CONTENT_DIR, linkedinDir: LINKEDIN_INPUT_DIR };
server = createPreviewServer({
  builder,
  lifecycle,
  linkedin: {
    review: () => reviewLinkedIn(linkedinDirs),
    // The import's own messages are written for the owner, so they are passed on as they are.
    apply: (ids) =>
      applyLinkedIn({ ...linkedinDirs, ids }).catch((error) => {
        throw new HttpError(422, error.message);
      }),
  },
});

let watcher;
async function shutdown() {
  watcher?.close();
  server.close(async () => {
    await rm(workRoot, { recursive: true, force: true }); // the temporary builds
    process.exit(0);
  });
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 3000).unref();
}

async function isPreviewAlreadyRunning() {
  try {
    const response = await fetch(`${url}api/state`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

server.on('error', async (error) => {
  await rm(workRoot, { recursive: true, force: true });
  if (error.code !== 'EADDRINUSE') {
    console.error(`Portfolio Preview could not start: ${error.message}`);
    process.exit(1);
  }
  // Double-clicked twice? Reuse the running copy and just show its page.
  if (await isPreviewAlreadyRunning()) {
    console.log('Portfolio Preview is already running. Opening it.');
    await openBrowser(url);
    process.exit(0);
  }
  console.error(
    `Port ${port} is used by another program. Close it, or set PREVIEW_PORT to another number.`,
  );
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Portfolio Preview is running at ${url} (this computer only).`);
  console.log('It stops by itself when you close the browser tab, or press Ctrl+C.');
  lifecycle.start();
  openBrowser(url);
  builder.request({ resume: true });
  watcher = watchContent({
    contentDir: CONTENT_DIR,
    resumeDir: RESUME_INPUT_DIR,
    // Photo Studio saves the photo and its description here.
    alsoWatch: [join(root, 'src', 'assets', 'profile'), join(root, 'src', 'config')],
    onChange: (change) => builder.request(change),
  });
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, shutdown);
