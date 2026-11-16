/**
 * Photo Studio server. LOCAL ONLY: binds to 127.0.0.1, lives outside src/ and
 * public/ so Astro never builds or deploys it.
 *
 * It can write exactly two files, both at fixed paths, and never accepts a
 * file path from the browser.
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCrop } from './crop-math.mjs';
import { validateFilters } from './filters.mjs';
import { loadFrame } from './frame.mjs';
import { HttpError, readBody, readJson as readJsonBody, send } from '../shared/http.mjs';
import { writeFileAtomic } from '../shared/write-atomic.mjs';
import { decodeToMaster, renderProfile } from './process.mjs';
import {
  MAX_JSON_BYTES,
  MAX_UPLOAD_BYTES,
  cleanAltText,
  detectImageType,
  isAllowedHost,
  isAllowedOrigin,
  isValidUploadId,
} from './validate.mjs';

export const DEFAULT_PORT = 4322;
const HERE = dirname(fileURLToPath(import.meta.url));

/** POST routes that only tell the lifecycle manager what the page is doing. */
const LIFECYCLE_ROUTES = { '/api/ping': 'ping', '/api/closing': 'closing', '/api/quit': 'quit' };

const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/studio.js': ['studio.js', 'text/javascript; charset=utf-8'],
  '/studio.css': ['studio.css', 'text/css; charset=utf-8'],
  '/crop-math.mjs': ['crop-math.mjs', 'text/javascript; charset=utf-8'],
  '/filters.mjs': ['filters.mjs', 'text/javascript; charset=utf-8'],
};

const readJson = (req) => readJsonBody(req, MAX_JSON_BYTES);

/**
 * @param {{ projectRoot: string, lifecycle?: { ping(): void, closing(): void, quit(): void } | undefined }} options
 */
export function createStudioServer({ projectRoot, lifecycle }) {
  const root = resolve(projectRoot);
  const outputPhoto = join(root, 'src/assets/profile/profile.jpg');
  const outputAlt = join(root, 'src/config/profile-photo.json');
  const tempDir = join(root, 'tools/photo-studio/.tmp');
  /** @type {Map<string, { path: string, width: number, height: number }>} */
  const uploads = new Map();

  const clearTemp = async () => {
    uploads.clear();
    // Windows can hold a file open briefly after it is closed, so retry.
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };

  const currentAlt = async () => JSON.parse(await readFile(outputAlt, 'utf8')).alt ?? '';

  async function handleDecode(req, res) {
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    const type = detectImageType(body);
    if (!type) throw new HttpError(415, 'That file is not a JPEG, PNG, WebP, or HEIC photo.');
    let decoded;
    try {
      decoded = await decodeToMaster(body, type);
    } catch (error) {
      console.error('Decode failed:', error.message);
      throw new HttpError(422, 'That photo could not be read. Try exporting it as JPEG.');
    }
    const id = randomUUID();
    await mkdir(tempDir, { recursive: true });
    const path = join(tempDir, `${id}.jpg`);
    await writeFile(path, decoded.master);
    uploads.set(id, { path, width: decoded.width, height: decoded.height });
    send(res, 200, { id, width: decoded.width, height: decoded.height });
  }

  async function handleSave(req, res) {
    const input = await readJson(req);
    const upload = isValidUploadId(input.id) ? uploads.get(input.id) : undefined;
    if (!upload) throw new HttpError(404, 'Unknown photo. Choose it again.');
    const frame = await loadFrame(root);
    const crop = { cx: input.cx, cy: input.cy, size: input.size, rotation: input.rotation };
    const problem = validateCrop(crop, upload.width, upload.height, frame.aspect);
    if (problem) throw new HttpError(400, problem);
    let alt = null;
    if (input.alt !== undefined) {
      alt = cleanAltText(input.alt);
      if (alt === null) throw new HttpError(400, 'Alt text must be 1 to 200 plain characters.');
    }
    let filters;
    try {
      filters = validateFilters(input.filters);
    } catch (error) {
      throw new HttpError(400, error.message);
    }
    const image = await renderProfile(
      await readFile(upload.path),
      crop,
      upload.width,
      upload.height,
      filters,
      frame,
    );
    await mkdir(dirname(outputPhoto), { recursive: true });
    await writeFileAtomic(outputPhoto, image);
    if (alt !== null) await writeFileAtomic(outputAlt, `${JSON.stringify({ alt }, null, 2)}\n`);
    await rm(upload.path, { force: true });
    uploads.delete(input.id);
    send(res, 200, { ok: true, bytes: image.length });
  }

  async function handleCancel(req, res) {
    const input = await readJson(req);
    const upload = isValidUploadId(input.id) ? uploads.get(input.id) : undefined;
    if (upload) {
      await rm(upload.path, { force: true });
      uploads.delete(input.id);
    }
    send(res, 200, { ok: true });
  }

  async function route(req, res, port) {
    if (!isAllowedHost(req.headers.host, port)) throw new HttpError(403, 'Forbidden host.');
    const { pathname } = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

    if (req.method === 'GET' && pathname in STATIC_FILES) {
      const [file, type] = STATIC_FILES[pathname];
      const csp =
        "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'";
      return send(res, 200, await readFile(join(HERE, file)), {
        'Content-Type': type,
        'Content-Security-Policy': csp,
      });
    }
    if (req.method === 'GET' && pathname === '/api/state')
      return send(res, 200, { alt: await currentAlt(), frame: await loadFrame(root) });
    if (req.method === 'GET' && pathname.startsWith('/api/image/')) {
      const id = pathname.slice('/api/image/'.length);
      const upload = isValidUploadId(id) ? uploads.get(id) : undefined;
      if (!upload) throw new HttpError(404, 'Not found.');
      return send(res, 200, await readFile(upload.path), { 'Content-Type': 'image/jpeg' });
    }
    if (req.method === 'POST') {
      if (!isAllowedOrigin(req.headers.origin, port)) throw new HttpError(403, 'Forbidden origin.');
      if (pathname in LIFECYCLE_ROUTES) {
        req.resume();
        lifecycle?.[LIFECYCLE_ROUTES[pathname]]();
        return send(res, 204, '');
      }
      if (pathname === '/api/decode') return handleDecode(req, res);
      if (pathname === '/api/save') return handleSave(req, res);
      if (pathname === '/api/cancel') return handleCancel(req, res);
    }
    throw new HttpError(404, 'Not found.');
  }

  const server = createServer((req, res) => {
    route(req, res, server.address().port).catch((error) => {
      if (res.headersSent) return;
      if (error instanceof HttpError) return send(res, error.status, { error: error.message });
      console.error('Unexpected error:', error);
      send(res, 500, { error: 'Something went wrong.' });
    });
  });
  server.on('listening', clearTemp);
  server.on('close', clearTemp);
  // `cleanup` lets the entry point wait for temp files to be deleted before exiting.
  return Object.assign(server, { cleanup: clearTemp });
}
