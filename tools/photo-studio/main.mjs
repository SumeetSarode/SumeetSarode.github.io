/**
 * Entry point for Photo Studio, shared by every way of starting it:
 * the macOS app, the Windows launcher, and `npm run photo`.
 *
 * It starts the local server, opens the browser, and stops by itself when
 * the browser tab is closed (see lifecycle.mjs).
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifecycle } from './lifecycle.mjs';
import { openBrowser } from './open-browser.mjs';
import { DEFAULT_PORT, createStudioServer } from './server.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env['PHOTO_PORT'] ?? DEFAULT_PORT);
const url = `http://127.0.0.1:${port}/`;

const lifecycle = createLifecycle({ onShutdown: () => shutdown() });
const server = createStudioServer({ projectRoot, lifecycle });

function shutdown() {
  server.close(async () => {
    await server.cleanup(); // never leave a decoded copy of a photo on disk
    process.exit(0);
  });
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 3000).unref();
}

async function isStudioAlreadyRunning() {
  try {
    const response = await fetch(`${url}api/state`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

server.on('error', async (error) => {
  if (error.code !== 'EADDRINUSE') {
    console.error(`Photo Studio could not start: ${error.message}`);
    process.exit(1);
  }
  // Double-clicked twice? Reuse the running copy and just show its page.
  if (await isStudioAlreadyRunning()) {
    console.log('Photo Studio is already running. Opening it.');
    await openBrowser(url);
    process.exit(0);
  }
  console.error(
    `Port ${port} is used by another program. Close it, or set PHOTO_PORT to another number.`,
  );
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Photo Studio is running at ${url} (this computer only).`);
  console.log('It stops by itself when you close the browser tab, or press Ctrl+C.');
  lifecycle.start();
  openBrowser(url);
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, shutdown);
