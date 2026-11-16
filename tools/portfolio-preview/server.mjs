/**
 * Portfolio Preview server. LOCAL ONLY: binds to 127.0.0.1 and refuses requests addressed to
 * any other host name, so other web pages can't reach it.
 *
 *   /__preview/          the preview page: status bar + the site
 *   /__preview/events    live status updates (server-sent events)
 *   everything else      the last good build of the site, at its real addresses
 *
 * It never writes a file the browser asks for; it only reads the build it made.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedHost, isAllowedOrigin } from '../photo-studio/validate.mjs';
import { HttpError, readJson, send } from '../shared/http.mjs';
import { resolveSiteFile } from './static.mjs';

export const DEFAULT_PORT = 4323;
export const PREVIEW_PATH = '/__preview/';
const UI = join(dirname(fileURLToPath(import.meta.url)), 'ui');

const UI_FILES = {
  [PREVIEW_PATH]: ['index.html', 'text/html; charset=utf-8'],
  [`${PREVIEW_PATH}preview.js`]: ['preview.js', 'text/javascript; charset=utf-8'],
  [`${PREVIEW_PATH}preview.css`]: ['preview.css', 'text/css; charset=utf-8'],
  [`${PREVIEW_PATH}import.js`]: ['import.js', 'text/javascript; charset=utf-8'],
};
/** The apply request is a list of ids; nothing bigger than this is ever sensible. */
const MAX_IMPORT_REQUEST_BYTES = 64 * 1024;
const UI_POLICY =
  "default-src 'self'; frame-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'";
const LIFECYCLE = {
  [`${PREVIEW_PATH}api/ping`]: 'ping',
  [`${PREVIEW_PATH}api/closing`]: 'closing',
  [`${PREVIEW_PATH}api/quit`]: 'quit',
};
const WAITING_PAGE = `<!doctype html><meta charset="utf-8"><title>Building…</title>
<body style="font:16px system-ui;padding:3rem;color:#16181d"><p>Your site is being built. This page
updates by itself.</p></body>`;

/** What the browser may know: everything but the build folder's location. */
const publicStatus = ({ siteDir, ...rest }) => ({ ...rest, hasSite: Boolean(siteDir) });

/**
 * @param {{ builder: { status: object }, lifecycle?: object,
 *   linkedin?: { review(): Promise<object>, apply(ids: string[]): Promise<object> } }} options
 */
export function createPreviewServer({ builder, lifecycle, linkedin }) {
  const listeners = new Set();

  /** Tell every open preview page about a new status. */
  const broadcast = (status) => {
    const message = `data: ${JSON.stringify(publicStatus(status))}\n\n`;
    for (const res of listeners) res.write(message);
  };

  function events(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(publicStatus(builder.status))}\n\n`);
    listeners.add(res);
    req.on('close', () => listeners.delete(res));
  }

  async function route(req, res, port) {
    if (!isAllowedHost(req.headers.host, port)) return send(res, 403, 'Forbidden host.');
    const { pathname } = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

    if (req.method === 'POST') {
      if (!isAllowedOrigin(req.headers.origin, port)) return send(res, 403, 'Forbidden origin.');
      if (pathname === `${PREVIEW_PATH}api/import/apply` && linkedin) {
        const { ids } = await readJson(req, MAX_IMPORT_REQUEST_BYTES);
        if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
          throw new HttpError(400, 'Expected a list of ids.');
        }
        return send(res, 200, await linkedin.apply(ids));
      }
      if (!(pathname in LIFECYCLE)) return send(res, 404, 'Not found.');
      req.resume();
      lifecycle?.[LIFECYCLE[pathname]]();
      return send(res, 204, '');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Not allowed.');

    if (pathname === `${PREVIEW_PATH}events`) return events(req, res);
    if (pathname === `${PREVIEW_PATH}api/state`)
      return send(res, 200, publicStatus(builder.status));
    if (pathname === `${PREVIEW_PATH}api/import` && linkedin) {
      return send(res, 200, await linkedin.review());
    }
    if (pathname in UI_FILES) {
      const [file, type] = UI_FILES[pathname];
      return send(res, 200, await readFile(join(UI, file)), {
        'Content-Type': type,
        'Content-Security-Policy': UI_POLICY,
      });
    }
    if (pathname === '/__preview') return send(res, 301, '', { Location: PREVIEW_PATH });

    const { siteDir } = builder.status;
    if (!siteDir)
      return send(res, 503, WAITING_PAGE, { 'Content-Type': 'text/html; charset=utf-8' });
    const file = await resolveSiteFile(siteDir, pathname);
    if (file.location) return send(res, file.status, '', { Location: file.location });
    return send(res, file.status, file.body ?? '', file.type ? { 'Content-Type': file.type } : {});
  }

  const server = createServer((req, res) => {
    route(req, res, server.address().port).catch((error) => {
      if (res.headersSent) return;
      if (error instanceof HttpError) return send(res, error.status, { error: error.message });
      console.error('Unexpected error:', error);
      send(res, 500, { error: 'Something went wrong.' });
    });
  });
  server.on('close', () => {
    for (const res of listeners) res.end();
    listeners.clear();
  });
  return Object.assign(server, { broadcast });
}
