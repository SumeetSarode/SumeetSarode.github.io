/** Shared pixel adjustments: the preview and saved image use identical maths. */
/** @typedef {{ brightness: number, contrast: number, saturation: number, grayscale: boolean }} Filters */

/** @type {Readonly<Filters>} */
export const DEFAULT_FILTERS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: false,
});

export function validateFilters(value) {
  if (value === undefined) return { ...DEFAULT_FILTERS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Filters must be an object.');
  }
  const result = { ...DEFAULT_FILTERS, ...value };
  for (const key of ['brightness', 'contrast', 'saturation']) {
    if (
      typeof result[key] !== 'number' ||
      !Number.isFinite(result[key]) ||
      result[key] < 0 ||
      result[key] > 200
    ) {
      throw new Error(`${key} must be between 0 and 200.`);
    }
  }
  if (typeof result.grayscale !== 'boolean') throw new Error('Black and white must be on or off.');
  return result;
}

/** Mutates an RGB/RGBA byte array, leaving any alpha channel unchanged. */
export function applyFilters(pixels, channels, filters = DEFAULT_FILTERS) {
  const brightness = filters.brightness / 100;
  const contrast = filters.contrast / 100;
  const saturation = filters.grayscale ? 0 : filters.saturation / 100;
  if (brightness === 1 && contrast === 1 && saturation === 1) return pixels;
  const clamp = (value) => Math.round(Math.min(255, Math.max(0, value)));
  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (let c = 0; c < 3; c++) {
      const saturated = luminance + (pixels[i + c] - luminance) * saturation;
      pixels[i + c] = clamp((saturated * brightness - 127.5) * contrast + 127.5);
    }
  }
  return pixels;
}
