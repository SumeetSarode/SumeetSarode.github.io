/**
 * Crop math shared by the browser UI and the server (single source of truth).
 *
 * A crop is { cx, cy, size, rotation }:
 *   cx, cy   centre of the crop window, in pixels of the (EXIF-oriented) source image
 *   size     WIDTH of the window, in source pixels. Its height is size * aspect.
 *   rotation degrees the image is turned CLOCKWISE inside a fixed, upright window
 *
 * `aspect` is height / width of the page's photo frame (see src/config/photo-frame.json).
 * It defaults to 1 (a square) only so the maths can be tested in isolation; the server
 * and the editor always pass the real frame.
 *
 * In the source image's own frame the window is a rectangle turned by -rotation.
 * All coordinates are y-down, like images and canvases.
 */

export const MIN_CROP_SIZE = 300;
const EDGE_TOLERANCE = 0.5;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Rotates (x, y) clockwise by `degrees` around the origin (y-down axes). */
export function rotatePoint(x, y, degrees) {
  const r = toRadians(degrees);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** Wraps any angle into the range (-180, 180]. */
export function normalizeRotation(degrees) {
  let d = ((degrees % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Half the width and half the height of the bounding box of a window turned by `rotation`. */
function halfExtents(size, rotation, aspect) {
  const r = toRadians(rotation);
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return {
    x: (size / 2) * (cos + aspect * sin),
    y: (size / 2) * (sin + aspect * cos),
  };
}

/** Widest window that still sits entirely inside a width x height image. */
export function maxCropSize(width, height, rotation, aspect = 1) {
  const r = toRadians(rotation);
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return Math.min(width / (cos + aspect * sin), height / (sin + aspect * cos));
}

/** The four corners of the crop window, in source-image coordinates. */
export function cropCorners({ cx, cy, size, rotation }, aspect = 1) {
  const halfWidth = size / 2;
  const halfHeight = (size * aspect) / 2;
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([x, y]) => {
    const p = rotatePoint(x, y, -rotation);
    return { x: cx + p.x, y: cy + p.y };
  });
}

/**
 * Returns an error message, or null when the crop is acceptable.
 * Rejects anything that would pull in empty (transparent) corners.
 */
export function validateCrop(crop, width, height, aspect = 1) {
  const values = [crop?.cx, crop?.cy, crop?.size, crop?.rotation];
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return 'Crop values must be finite numbers.';
  }
  if (crop.size < MIN_CROP_SIZE) return `Crop is too small (minimum ${MIN_CROP_SIZE}px).`;
  if (Math.abs(crop.rotation) > 360) return 'Rotation is out of range.';
  const inside = cropCorners(crop, aspect).every(
    (p) =>
      p.x >= -EDGE_TOLERANCE &&
      p.y >= -EDGE_TOLERANCE &&
      p.x <= width + EDGE_TOLERANCE &&
      p.y <= height + EDGE_TOLERANCE,
  );
  return inside ? null : 'Crop reaches outside the photo.';
}

/**
 * Forces a crop to be valid: shrinks it to fit, then nudges the centre so
 * every corner stays inside the image. Used by the UI after every gesture.
 */
export function clampCrop(crop, width, height, aspect = 1) {
  const rotation = normalizeRotation(crop.rotation);
  const largest = maxCropSize(width, height, rotation, aspect);
  const size = Math.max(Math.min(MIN_CROP_SIZE, largest), Math.min(crop.size, largest));
  const ext = halfExtents(size, rotation, aspect);
  return {
    cx: Math.min(Math.max(crop.cx, ext.x), width - ext.x),
    cy: Math.min(Math.max(crop.cy, ext.y), height - ext.y),
    size,
    rotation,
  };
}

/**
 * Maps a crop onto the canvas produced by rotating the whole image clockwise
 * by `rotation` (the canvas grows to hold the turned image). Returns the
 * pixel rectangle to extract from that rotated canvas.
 */
export function extractRegion(crop, srcWidth, srcHeight, rotatedWidth, rotatedHeight, aspect = 1) {
  const offset = rotatePoint(crop.cx - srcWidth / 2, crop.cy - srcHeight / 2, crop.rotation);
  const centreX = rotatedWidth / 2 + offset.x;
  const centreY = rotatedHeight / 2 + offset.y;
  const width = Math.min(Math.round(crop.size), rotatedWidth);
  const height = Math.min(Math.round(crop.size * aspect), rotatedHeight);
  const left = Math.min(Math.max(Math.round(centreX - width / 2), 0), rotatedWidth - width);
  const top = Math.min(Math.max(Math.round(centreY - height / 2), 0), rotatedHeight - height);
  return { left, top, width, height };
}
