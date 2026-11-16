/**
 * Serves the built site from a folder, like the real host would: /about/ means
 * /about/index.html, and a missing page gets the site's own 404 page.
 */
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const isFile = async (path) => (await stat(path).catch(() => undefined))?.isFile() ?? false;
const isFolder = async (path) => (await stat(path).catch(() => undefined))?.isDirectory() ?? false;

/**
 * @param {string} folder  the built site
 * @param {string} pathname  from the request URL
 * @returns {Promise<{ status: number, body?: Buffer, type?: string, location?: string }>}
 */
export async function resolveSiteFile(folder, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { status: 400 };
  }
  const root = resolve(folder);
  const target = resolve(root, `.${decoded}`);
  // Nothing outside the built site, however the address is written.
  if (decoded.includes('\0') || (target !== root && !target.startsWith(root + sep))) {
    return { status: 403 };
  }

  if (await isFolder(target)) {
    if (!pathname.endsWith('/')) return { status: 301, location: `${pathname}/` };
    const index = join(target, 'index.html');
    if (await isFile(index))
      return { status: 200, body: await readFile(index), type: TYPES['.html'] };
  } else if (await isFile(target)) {
    const type = TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream';
    return { status: 200, body: await readFile(target), type };
  }

  const notFound = join(root, '404.html');
  return (await isFile(notFound))
    ? { status: 404, body: await readFile(notFound), type: TYPES['.html'] }
    : { status: 404 };
}
