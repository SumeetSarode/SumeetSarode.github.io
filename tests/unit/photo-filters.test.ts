import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  applyFilters,
  DEFAULT_FILTERS,
  validateFilters,
} from '../../tools/photo-studio/filters.mjs';
import { renderProfile } from '../../tools/photo-studio/process.mjs';
import { parseFrame } from '../../tools/photo-studio/frame.mjs';

describe('photo filters', () => {
  it('keeps pixels unchanged with the defaults', () => {
    const pixels = new Uint8ClampedArray([180, 90, 40, 123]);
    applyFilters(pixels, 4);
    expect([...pixels]).toEqual([180, 90, 40, 123]);
  });
  it('creates grayscale without changing alpha', () => {
    const pixels = new Uint8ClampedArray([180, 90, 40, 123]);
    applyFilters(pixels, 4, { ...DEFAULT_FILTERS, grayscale: true });
    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[3]).toBe(123);
  });
  it('applies brightness and clamps channels', () => {
    const pixels = new Uint8ClampedArray([100, 150, 200]);
    applyFilters(pixels, 3, { ...DEFAULT_FILTERS, brightness: 200 });
    expect([...pixels]).toEqual([200, 255, 255]);
  });
  it('rejects invalid adjustment values', () => {
    for (const value of [
      null,
      [],
      { brightness: -1 },
      { contrast: 201 },
      { saturation: NaN },
      { grayscale: 'yes' },
    ]) {
      expect(() => validateFilters(value)).toThrow();
    }
    expect(validateFilters(undefined)).toEqual(DEFAULT_FILTERS);
  });
  it('applies filters to the saved JPEG, not only the preview', async () => {
    const input = await sharp({
      create: { width: 600, height: 600, channels: 3, background: '#c04020' },
    })
      .jpeg()
      .toBuffer();
    const result = await renderProfile(
      input,
      { cx: 300, cy: 300, size: 600, rotation: 0 },
      600,
      600,
      { ...DEFAULT_FILTERS, grayscale: true },
      parseFrame({ ratioWidth: 1, ratioHeight: 1, outputWidth: 600 }),
    );
    const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    expect(Math.abs(data[0]! - data[1]!)).toBeLessThan(3);
    expect(Math.abs(data[1]! - data[2]!)).toBeLessThan(3);
    expect((await sharp(result).metadata()).exif).toBeUndefined();
  });
});
