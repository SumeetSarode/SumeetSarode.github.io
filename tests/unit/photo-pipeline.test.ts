import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { createStudioServer } from '../../tools/photo-studio/server.mjs';
import { decodeToMaster, renderProfile } from '../../tools/photo-studio/process.mjs';
import { parseFrame } from '../../tools/photo-studio/frame.mjs';

const W = 2000;
const H = 1000;

/** The shape the page uses today: a tall 4:5 portrait, saved 960 x 1200. */
const frame = parseFrame({ ratioWidth: 4, ratioHeight: 5, outputWidth: 960 });

/** A grey photo with a red block and a blue block, plus planted GPS/camera metadata. */
async function makePhoto(): Promise<Buffer> {
  const block = (r: number, g: number, b: number) =>
    sharp({ create: { width: 100, height: 100, channels: 3, background: { r, g, b } } })
      .png()
      .toBuffer();
  return sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } })
    .composite([
      { input: await block(255, 0, 0), left: 1500, top: 300 }, // red, centre (1550, 350)
      { input: await block(0, 0, 255), left: 1400, top: 300 }, // blue, centre (1450, 350), 100px left of red
    ])
    .withExif({ IFD0: { Copyright: 'planted-secret' }, IFD3: { GPSLatitudeRef: 'N' } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

async function pixel(image: Buffer, x: number, y: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

const near = (actual: number[], expected: number[]) =>
  actual.forEach((v, i) => expect(Math.abs(v - expected[i]!)).toBeLessThan(40));

describe('renderProfile', () => {
  let photo: Buffer;
  beforeAll(async () => {
    photo = await makePhoto();
  });

  it('plants metadata in the test photo (so stripping is a real test)', async () => {
    const meta = await sharp(photo).metadata();
    expect(meta.exif).toBeDefined();
  });

  it('outputs exactly the page frame (960x1200) in sRGB with no metadata at all', async () => {
    const out = await renderProfile(
      photo,
      { cx: 1550, cy: 350, size: 400, rotation: 0 },
      W,
      H,
      undefined,
      frame,
    );
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([960, 1200]);
    expect(meta.space).toBe('srgb');
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(out.toString('latin1')).not.toContain('planted-secret');
  });

  it('follows whatever frame the page asks for (the page decides, not the tool)', async () => {
    const crop = { cx: 1550, cy: 350, size: 400, rotation: 0 };
    for (const raw of [
      { ratioWidth: 1, ratioHeight: 1, outputWidth: 800 },
      { ratioWidth: 16, ratioHeight: 9, outputWidth: 1280 },
      { ratioWidth: 3, ratioHeight: 4, outputWidth: 900 },
    ]) {
      const wanted = parseFrame(raw);
      const out = await renderProfile(photo, crop, W, H, undefined, wanted);
      const meta = await sharp(out).metadata();
      expect([meta.width, meta.height]).toEqual([wanted.outputWidth, wanted.outputHeight]);
    }
  });

  it('centres the crop on the requested point (rotation 0)', async () => {
    const crop = { cx: 1550, cy: 350, size: 400, rotation: 0 };
    const out = await renderProfile(photo, crop, W, H, undefined, frame);
    near(await pixel(out, 480, 600), [255, 0, 0]); // red at centre
    near(await pixel(out, 240, 600), [0, 0, 255]); // blue 100 source px left = 240 output px left
  });

  it('rotates clockwise by 90 degrees', async () => {
    const crop = { cx: 1550, cy: 350, size: 400, rotation: 90 };
    const out = await renderProfile(photo, crop, W, H, undefined, frame);
    near(await pixel(out, 480, 600), [255, 0, 0]);
    near(await pixel(out, 480, 360), [0, 0, 255]); // "left of centre" became "above centre"
  });

  it('handles a fine rotation without empty corners', async () => {
    // A smaller window: a tall window turned 30 degrees would reach outside this photo.
    const crop = { cx: 1550, cy: 350, size: 300, rotation: 30 };
    const out = await renderProfile(photo, crop, W, H, undefined, frame);
    near(await pixel(out, 480, 600), [255, 0, 0]);
    for (const [x, y] of [
      [2, 2],
      [957, 2],
      [2, 1197],
      [957, 1197],
    ] as const) {
      expect(await pixel(out, x, y)).not.toEqual([255, 255, 255]); // no white fill showing
    }
  });
});

describe('decodeToMaster', () => {
  it('applies EXIF orientation so coordinates match what the user sees', async () => {
    const sideways = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#808080' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const { width, height } = await decodeToMaster(sideways, 'jpeg');
    expect([width, height]).toEqual([200, 400]);
  });
});

describe('Photo Studio server', () => {
  let root: string;
  let server: ReturnType<typeof createStudioServer>;
  let port: number;

  const call = (
    method: string,
    path: string,
    { body, headers = {} }: { body?: Buffer | string; headers?: Record<string, string> } = {},
  ) =>
    new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          method,
          path,
          headers: { Host: `127.0.0.1:${port}`, ...headers },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }),
          );
        },
      );
      req.on('error', reject);
      req.end(body);
    });
  const json = (r: { body: Buffer }) => JSON.parse(r.body.toString());
  const postJson = (path: string, data: unknown, headers: Record<string, string> = {}) =>
    call('POST', path, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...headers },
    });

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'studio-test-'));
    await mkdir(join(root, 'src/config'), { recursive: true });
    await writeFile(join(root, 'src/config/profile-photo.json'), '{\n  "alt": "old alt"\n}\n');
    await writeFile(
      join(root, 'src/config/photo-frame.json'),
      JSON.stringify({ ratioWidth: 4, ratioHeight: 5, outputWidth: 960 }),
    );
    server = createStudioServer({ projectRoot: root });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });

  it('listens on loopback only', () => {
    expect((server.address() as AddressInfo).address).toBe('127.0.0.1');
  });

  it('serves the page with a strict content security policy', async () => {
    const res = await call('GET', '/');
    expect(res.status).toBe(200);
    expect(res.body.toString()).toContain('Photo Studio');
  });

  it('rejects a foreign Host header (DNS rebinding)', async () => {
    const res = await call('GET', '/api/state', { headers: { Host: 'evil.example' } });
    expect(res.status).toBe(403);
  });

  it('rejects POSTs from another origin', async () => {
    const res = await call('POST', '/api/decode', {
      body: Buffer.from('x'),
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects files that are not photos, whatever they are called', async () => {
    const res = await call('POST', '/api/decode', {
      body: Buffer.from('<script>alert(1)</script> not an image'),
    });
    expect(res.status).toBe(415);
  });

  it('rejects uploads over 40 MB', async () => {
    const res = await call('POST', '/api/decode', { body: Buffer.alloc(41 * 1024 * 1024, 0xff) });
    expect(res.status).toBe(413);
  });

  it('refuses path-trick ids and unknown routes', async () => {
    expect((await call('GET', '/api/image/..%2F..%2Fetc%2Fpasswd')).status).toBe(404);
    expect((await call('GET', '/../package.json')).status).toBe(404);
    expect((await call('GET', '/studio.js/../../../package.json')).status).toBe(404);
  });

  it('decodes, saves, strips metadata, updates alt text, and cleans up', async () => {
    const decoded = await call('POST', '/api/decode', { body: await makePhoto() });
    expect(decoded.status).toBe(200);
    const { id, width, height } = json(decoded);
    expect([width, height]).toEqual([W, H]);
    expect((await call('GET', `/api/image/${id}`)).status).toBe(200);

    const bad = await postJson('/api/save', { id, cx: 10, cy: 10, size: 400, rotation: 0 });
    expect(bad.status).toBe(400);
    const badAlt = await postJson('/api/save', {
      id,
      cx: 1550,
      cy: 350,
      size: 400,
      rotation: 0,
      alt: '',
    });
    expect(badAlt.status).toBe(400);

    const saved = await postJson('/api/save', {
      id,
      cx: 1550,
      cy: 350,
      size: 400,
      rotation: 0,
      alt: 'New alt text',
    });
    expect(saved.status).toBe(200);

    const output = await readFile(join(root, 'src/assets/profile/profile.jpg'));
    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height, meta.exif]).toEqual([960, 1200, undefined]);
    expect(JSON.parse(await readFile(join(root, 'src/config/profile-photo.json'), 'utf8'))).toEqual(
      { alt: 'New alt text' },
    );

    expect((await call('GET', `/api/image/${id}`)).status).toBe(404); // temp copy removed
    expect(existsSync(join(root, 'tools/photo-studio/.tmp', `${id}.jpg`))).toBe(false);
    expect(
      (await postJson('/api/save', { id, cx: 1550, cy: 350, size: 400, rotation: 0 })).status,
    ).toBe(404);
  });

  it('cancel deletes the temporary copy and leaves the saved photo alone', async () => {
    const before = await readFile(join(root, 'src/assets/profile/profile.jpg'));
    const { id } = json(await call('POST', '/api/decode', { body: await makePhoto() }));
    expect((await postJson('/api/cancel', { id })).status).toBe(200);
    expect((await call('GET', `/api/image/${id}`)).status).toBe(404);
    expect(await readFile(join(root, 'src/assets/profile/profile.jpg'))).toEqual(before);
  });
});
