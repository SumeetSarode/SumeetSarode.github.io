/** Input validation for the local Photo Studio server. Pure functions, no I/O. */

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const MAX_JSON_BYTES = 10 * 1024;
export const MAX_ALT_LENGTH = 200;

const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
]);

/**
 * Identifies an image by its first bytes, never by file name or MIME type
 * (both are chosen by whoever sends the file).
 * @returns {'jpeg' | 'png' | 'webp' | 'heic' | null}
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return 'webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && HEIF_BRANDS.has(buffer.toString('ascii', 8, 12)))
    return 'heic';
  return null;
}

/**
 * Blocks DNS-rebinding: only the exact loopback host and port are accepted.
 * @param {string | undefined} hostHeader
 * @param {number} port
 */
export function isAllowedHost(hostHeader, port) {
  return hostHeader === `127.0.0.1:${port}` || hostHeader === `localhost:${port}`;
}

/**
 * Blocks cross-site requests from other web pages. Requests with no Origin
 * (such as the page's own same-origin GETs or curl) are allowed; if an Origin
 * is present it must be this server.
 * @param {string | undefined} originHeader
 * @param {number} port
 */
export function isAllowedOrigin(originHeader, port) {
  if (originHeader === undefined) return true;
  return originHeader === `http://127.0.0.1:${port}` || originHeader === `http://localhost:${port}`;
}

/** Upload ids are random UUIDs; anything else could be a path trick. */
export function isValidUploadId(id) {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  );
}

/** Returns a cleaned alt text, or null when it is not acceptable. */
export function cleanAltText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  // eslint-disable-next-line no-control-regex
  if (text.length === 0 || text.length > MAX_ALT_LENGTH || /[\u0000-\u001f\u007f]/.test(text))
    return null;
  return text;
}
