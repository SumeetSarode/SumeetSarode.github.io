import { describe, expect, it } from 'vitest';
import {
  MIN_CROP_SIZE,
  clampCrop,
  cropCorners,
  extractRegion,
  maxCropSize,
  normalizeRotation,
  rotatePoint,
  validateCrop,
} from '../../tools/photo-studio/crop-math.mjs';

const W = 3024;
const H = 4032;

describe('rotatePoint', () => {
  it('turns clockwise in y-down coordinates', () => {
    const p = rotatePoint(1, 0, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
  it('is undone by the opposite angle', () => {
    const p = rotatePoint(rotatePoint(3, 4, 33).x, rotatePoint(3, 4, 33).y, -33);
    expect(p.x).toBeCloseTo(3);
    expect(p.y).toBeCloseTo(4);
  });
});

describe('normalizeRotation', () => {
  it.each([
    [0, 0],
    [190, -170],
    [-190, 170],
    [360, 0],
    [-180, 180],
    [450, 90],
  ])('%d -> %d', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });
});

describe('maxCropSize', () => {
  it('is the short side when upright', () => {
    expect(maxCropSize(W, H, 0)).toBe(W);
    expect(maxCropSize(W, H, 90)).toBeCloseTo(W);
  });
  it('shrinks by sqrt(2) at 45 degrees', () => {
    expect(maxCropSize(W, H, 45)).toBeCloseTo(W / Math.SQRT2);
  });
});

describe('validateCrop', () => {
  const good = { cx: 1697, cy: 1125, size: 1250, rotation: 0 };

  it('accepts the verified head-and-shoulders crop', () => {
    expect(validateCrop(good, W, H)).toBeNull();
  });
  it('rejects non-numbers', () => {
    expect(validateCrop({ ...good, cx: Number.NaN }, W, H)).toMatch(/finite/);
    expect(validateCrop({ ...good, size: '1250' }, W, H)).toMatch(/finite/);
    expect(validateCrop(null, W, H)).toMatch(/finite/);
  });
  it('rejects crops below the minimum size', () => {
    expect(validateCrop({ ...good, size: MIN_CROP_SIZE - 1 }, W, H)).toMatch(/too small/);
  });
  it('rejects crops that leave the photo', () => {
    expect(validateCrop({ ...good, cx: 100 }, W, H)).toMatch(/outside/);
    expect(validateCrop({ ...good, size: W + 10 }, W, H)).toMatch(/outside/);
  });
  it('rejects rotated crops whose corners leave the photo', () => {
    const nearEdge = { cx: 700, cy: 1000, size: 1250, rotation: 0 };
    expect(validateCrop(nearEdge, W, H)).toBeNull();
    expect(validateCrop({ ...nearEdge, rotation: 45 }, W, H)).toMatch(/outside/);
  });
  it('rejects absurd rotations', () => {
    expect(validateCrop({ ...good, rotation: 400 }, W, H)).toMatch(/range/);
  });
});

describe('clampCrop', () => {
  it('always yields a crop that validates (randomised)', () => {
    let seed = 42;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2000; i++) {
      const raw = {
        cx: (random() - 0.2) * W * 1.4,
        cy: (random() - 0.2) * H * 1.4,
        size: random() * W * 1.5,
        rotation: (random() - 0.5) * 1200,
      };
      const clamped = clampCrop(raw, W, H);
      expect(validateCrop(clamped, W, H), JSON.stringify({ raw, clamped })).toBeNull();
    }
  });
  it('accepts an infinite size as "as big as possible"', () => {
    const c = clampCrop({ cx: W / 2, cy: H / 2, size: Infinity, rotation: 0 }, W, H);
    expect(c.size).toBe(W);
  });
  it('leaves an already-valid crop alone', () => {
    const crop = { cx: 1697, cy: 1125, size: 1250, rotation: 0 };
    expect(clampCrop(crop, W, H)).toEqual(crop);
  });
  it('shrinks below the minimum rather than leave a photo that is smaller than it', () => {
    const c = clampCrop({ cx: 100, cy: 100, size: 50, rotation: 0 }, 200, 200);
    expect(c.size).toBe(200);
    expect(c.cx).toBe(100);
    expect(c.cy).toBe(100);
  });
});

describe('cropCorners', () => {
  it('are the axis-aligned square when not rotated', () => {
    const corners = cropCorners({ cx: 500, cy: 400, size: 200, rotation: 0 });
    expect(corners.map((p) => [p.x, p.y])).toEqual([
      [400, 300],
      [600, 300],
      [600, 500],
      [400, 500],
    ]);
  });
});

describe('extractRegion', () => {
  it('is centred on the crop when not rotated', () => {
    const region = extractRegion({ cx: 1697, cy: 1125, size: 1250, rotation: 0 }, W, H, W, H);
    expect(region).toEqual({ left: 1072, top: 500, width: 1250, height: 1250 });
  });
  it('never extracts outside the rotated canvas', () => {
    const region = extractRegion({ cx: 5, cy: 5, size: 400, rotation: 0 }, 1000, 1000, 1000, 1000);
    expect(region.left).toBeGreaterThanOrEqual(0);
    expect(region.top).toBeGreaterThanOrEqual(0);
  });
});
