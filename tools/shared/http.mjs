/** Small pieces both local servers (Photo Studio, Portfolio Preview) need. */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Sends text, or an object as JSON. Never cached, never sniffed. */
export function send(res, status, body, headers = {}) {
  const isJson = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

/** Reads a request body, refusing anything over `limit` bytes. */
export function readBody(req, limit) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let total = 0;
    let overflowed = false;
    req.on('data', (chunk) => {
      if (overflowed) return; // keep draining so the client can still read our 413
      total += chunk.length;
      if (total > limit) {
        overflowed = true;
        chunks.length = 0;
        reject(new HttpError(413, 'File is too large.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** A JSON request body, at most `limit` bytes. */
export async function readJson(req, limit) {
  try {
    return JSON.parse((await readBody(req, limit)).toString('utf8'));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}
