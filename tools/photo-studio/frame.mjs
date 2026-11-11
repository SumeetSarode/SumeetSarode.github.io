/**
 * The shape of the photo on the page, read from src/config/photo-frame.json.
 *
 * The PAGE decides this shape; Photo Studio only follows it. Change the numbers in
 * that one file and the page frame, the editor, and the saved picture all change
 * together.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const FRAME_FILE = 'src/config/photo-frame.json';

const isWholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

/**
 * Validates the raw JSON and adds the derived values.
 * @returns {{ ratioWidth: number, ratioHeight: number, aspect: number, outputWidth: number, outputHeight: number }}
 */
export function parseFrame(raw) {
  const { ratioWidth, ratioHeight, outputWidth } = raw ?? {};
  if (!isWholeNumber(ratioWidth, 1, 100) || !isWholeNumber(ratioHeight, 1, 100)) {
    throw new Error('photo-frame.json: ratioWidth and ratioHeight must be whole numbers (1-100).');
  }
  if (!isWholeNumber(outputWidth, 400, 4000)) {
    throw new Error('photo-frame.json: outputWidth must be a whole number from 400 to 4000.');
  }
  const aspect = ratioHeight / ratioWidth;
  return {
    ratioWidth,
    ratioHeight,
    aspect,
    outputWidth,
    outputHeight: Math.round(outputWidth * aspect),
  };
}

export async function loadFrame(projectRoot) {
  return parseFrame(JSON.parse(await readFile(join(projectRoot, FRAME_FILE), 'utf8')));
}
