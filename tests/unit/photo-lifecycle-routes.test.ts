import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createStudioServer } from '../../tools/photo-studio/server.mjs';

type Lifecycle = { ping: () => void; closing: () => void; quit: () => void };

async function start(lifecycle?: Lifecycle) {
  const root = await mkdtemp(join(tmpdir(), 'studio-lifecycle-'));
  await mkdir(join(root, 'src/config'), { recursive: true });
  await writeFile(join(root, 'src/config/profile-photo.json'), '{"alt":"x"}');
  const server = createStudioServer({ projectRoot: root, lifecycle });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const call = (method: string, path: string, headers: Record<string, string> = {}) =>
    new Promise<number>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          method,
          path,
          headers: { Host: `127.0.0.1:${port}`, ...headers },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', reject);
      req.end();
    });
  return { root, server, call };
}

describe('Photo Studio keep-alive and quit routes', () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
  });
  async function setup(lifecycle?: Lifecycle) {
    const ctx = await start(lifecycle);
    cleanups.push(async () => {
      ctx.server.closeAllConnections();
      await new Promise((resolve) => ctx.server.close(resolve));
      await rm(ctx.root, { recursive: true, force: true });
    });
    return ctx;
  }

  it('routes ping, closing and quit to the lifecycle manager', async () => {
    const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
    const { call } = await setup(lifecycle);
    expect(await call('POST', '/api/ping')).toBe(204);
    expect(await call('POST', '/api/closing')).toBe(204);
    expect(await call('POST', '/api/quit')).toBe(204);
    expect(lifecycle.ping).toHaveBeenCalledTimes(1);
    expect(lifecycle.closing).toHaveBeenCalledTimes(1);
    expect(lifecycle.quit).toHaveBeenCalledTimes(1);
  });

  it('lets another website NOT shut the editor down (cross-site POST)', async () => {
    const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
    const { call } = await setup(lifecycle);
    expect(await call('POST', '/api/quit', { Origin: 'https://evil.example' })).toBe(403);
    expect(await call('POST', '/api/ping', { Origin: 'https://evil.example' })).toBe(403);
    expect(lifecycle.quit).not.toHaveBeenCalled();
    expect(lifecycle.ping).not.toHaveBeenCalled();
  });

  it('rejects a foreign Host header on the quit route', async () => {
    const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
    const { call } = await setup(lifecycle);
    expect(await call('POST', '/api/quit', { Host: 'evil.example' })).toBe(403);
    expect(lifecycle.quit).not.toHaveBeenCalled();
  });

  it('accepts the page itself (same-origin POST)', async () => {
    const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
    const { call, server } = await setup(lifecycle);
    const port = (server.address() as AddressInfo).port;
    expect(await call('POST', '/api/ping', { Origin: `http://127.0.0.1:${port}` })).toBe(204);
    expect(lifecycle.ping).toHaveBeenCalledTimes(1);
  });

  it('does not let a plain GET quit the editor', async () => {
    const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
    const { call } = await setup(lifecycle);
    expect(await call('GET', '/api/quit')).toBe(404);
    expect(lifecycle.quit).not.toHaveBeenCalled();
  });

  it('still answers when no lifecycle manager is attached (tests, embedding)', async () => {
    const { call } = await setup();
    expect(await call('POST', '/api/ping')).toBe(204);
    expect(await call('POST', '/api/quit')).toBe(204);
  });

  it('cleanup() deletes decoded photo copies', async () => {
    const { root, server } = await setup();
    const tempDir = join(root, 'tools/photo-studio/.tmp');
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, 'leftover.jpg'), 'data');
    await server.cleanup();
    expect(existsSync(tempDir)).toBe(false);
  });
});
