/**
 * Image processing for the Photo Studio: decode any supported photo into an
 * upright "master" JPEG, then render the final profile picture from it.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import convert from 'heic-convert';
import { extractRegion } from './crop-math.mjs';
import { applyFilters, validateFilters } from './filters.mjs';

const run = promisify(execFile);

export const PROFILE_SIZE = 1200;
export const PROFILE_QUALITY = 85;
const MASTER_QUALITY = 95;

/** HEIC: WASM decoder first; macOS `sips` (argument array, no shell) as fallback. */
async function heicToJpeg(buffer) {
  try {
    return Buffer.from(await convert({ buffer, format: 'JPEG', quality: 0.98 }));
  } catch (decoderError) {
    if (process.platform !== 'darwin') throw decoderError;
    const dir = await mkdtemp(join(tmpdir(), 'photo-studio-'));
    try {
      const input = join(dir, 'in.heic');
      const output = join(dir, 'out.jpg');
      await writeFile(input, buffer);
      await run('sips', ['-s', 'format', 'jpeg', input, '--out', output]);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

/**
 * Turns an upload into an upright JPEG master (EXIF orientation applied).
 * Crop coordinates are always expressed against this master's pixels.
 * @param {Buffer} buffer
 * @param {'jpeg' | 'png' | 'webp' | 'heic'} type
 */
export async function decodeToMaster(buffer, type) {
  const source = type === 'heic' ? await heicToJpeg(buffer) : buffer;
  const { data, info } = await sharp(source)
    .rotate()
    .jpeg({ quality: MASTER_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { master: data, width: info.width, height: info.height };
}

/**
 * Renders the final profile picture: rotate, crop, resize, sRGB, no metadata.
 * sharp drops EXIF/GPS/XMP/ICC unless asked to keep them, and we never ask.
 */
export async function renderProfile(master, crop, srcWidth, srcHeight, adjustments) {
  const filters = validateFilters(adjustments);
  const rotated = await sharp(master)
    .rotate(crop.rotation, { background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = rotated.info;
  const region = extractRegion(crop, srcWidth, srcHeight, width, height);
  const resized = await sharp(rotated.data, { raw: { width, height, channels } })
    .extract(region)
    .resize(PROFILE_SIZE, PROFILE_SIZE, { fit: 'fill' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  applyFilters(resized.data, resized.info.channels, filters);
  return sharp(resized.data, {
    raw: { width: PROFILE_SIZE, height: PROFILE_SIZE, channels: resized.info.channels },
  })
    .jpeg({ quality: PROFILE_QUALITY, mozjpeg: true })
    .toBuffer();
}

/** Write to a temp name, then rename, so a crash never leaves half a file. */
export async function writeFileAtomic(path, data) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, data);
  await rename(temp, path);
}
