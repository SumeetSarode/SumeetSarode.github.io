/**
 * Crop math shared by the browser UI and the server (single source of truth).
 *
 * A crop is { cx, cy, size, rotation }:
 *   cx, cy   centre of the square window, in pixels of the (EXIF-oriented) source image
 *   size     side of the square window, in source pixels
 *   rotation degrees the image is turned CLOCKWISE inside a fixed, upright window
 *
 * In the source image's own frame the window is therefore a square turned by
 * -rotation. All coordinates are y-down, like images and canvases.
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

/** Half the bounding-box width of a square of side `size` turned by `rotation`. */
function halfExtent(size, rotation) {
  const r = toRadians(rotation);
  return (size / 2) * (Math.abs(Math.cos(r)) + Math.abs(Math.sin(r)));
}

/** Largest window that still sits entirely inside a width x height image. */
export function maxCropSize(width, height, rotation) {
  const r = toRadians(rotation);
  return Math.min(width, height) / (Math.abs(Math.cos(r)) + Math.abs(Math.sin(r)));
}

/** The four corners of the crop window, in source-image coordinates. */
export function cropCorners({ cx, cy, size, rotation }) {
  const h = size / 2;
  return [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ].map(([x, y]) => {
    const p = rotatePoint(x, y, -rotation);
    return { x: cx + p.x, y: cy + p.y };
  });
}

/**
 * Returns an error message, or null when the crop is acceptable.
 * Rejects anything that would pull in empty (transparent) corners.
 */
export function validateCrop(crop, width, height) {
  const values = [crop?.cx, crop?.cy, crop?.size, crop?.rotation];
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return 'Crop values must be finite numbers.';
  }
  if (crop.size < MIN_CROP_SIZE) return `Crop is too small (minimum ${MIN_CROP_SIZE}px).`;
  if (Math.abs(crop.rotation) > 360) return 'Rotation is out of range.';
  const inside = cropCorners(crop).every(
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
export function clampCrop(crop, width, height) {
  const rotation = normalizeRotation(crop.rotation);
  const size = Math.max(
    Math.min(MIN_CROP_SIZE, maxCropSize(width, height, rotation)),
    Math.min(crop.size, maxCropSize(width, height, rotation)),
  );
  const ext = halfExtent(size, rotation);
  return {
    cx: Math.min(Math.max(crop.cx, ext), width - ext),
    cy: Math.min(Math.max(crop.cy, ext), height - ext),
    size,
    rotation,
  };
}

/**
 * Maps a crop onto the canvas produced by rotating the whole image clockwise
 * by `rotation` (the canvas grows to hold the turned image). Returns the
 * pixel rectangle to extract from that rotated canvas.
 */
export function extractRegion(crop, srcWidth, srcHeight, rotatedWidth, rotatedHeight) {
  const offset = rotatePoint(crop.cx - srcWidth / 2, crop.cy - srcHeight / 2, crop.rotation);
  const centreX = rotatedWidth / 2 + offset.x;
  const centreY = rotatedHeight / 2 + offset.y;
  const side = Math.round(crop.size);
  const left = Math.min(Math.max(Math.round(centreX - side / 2), 0), rotatedWidth - side);
  const top = Math.min(Math.max(Math.round(centreY - side / 2), 0), rotatedHeight - side);
  return { left, top, width: side, height: side };
}
