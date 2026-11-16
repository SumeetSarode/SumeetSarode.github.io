/**
 * Builds the site's résumé PDF from whatever the owner put in content/resume/, and says what
 * happened in plain words. The original file is only ever read, never changed.
 *
 *   Word (.docx)            -> phone numbers removed from the text -> PDF (LibreOffice) -> PDF check
 *   .doc / .odt / .rtf      -> PDF (LibreOffice) -> PDF check
 *   PDF                     -> PDF check
 *
 * The PDF check (pdf.mjs) removes anything phone-like that's left, resets the metadata, and
 * refuses to publish if it can't prove the result is clean. Used by the Portfolio Preview app
 * and by `npm run resume`.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { parse } from 'yaml';
import { CONTENT_DIR, RESUME_INPUT_DIR, RESUME_OUTPUT } from '../../src/content-files/paths.mjs';
import { convertToPdf } from './convert.mjs';
import { cleanDocx } from './docx.mjs';
import { cleanPdf } from './pdf.mjs';

export const SUPPORTED = ['.docx', '.pdf', '.doc', '.odt', '.rtf'];
/** Bump when the pipeline changes, so every résumé is rebuilt once with the new rules. */
const PIPELINE_VERSION = 2;
const DEFAULT_STAMP = join(process.cwd(), 'node_modules', '.cache', 'portfolio-resume.json');

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The files the owner put in the folder: not the README, hidden files, or Word's ~$ lock files. */
async function candidates(folder) {
  if (!existsSync(folder)) return [];
  return (await readdir(folder)).filter(
    (name) => !name.startsWith('.') && !name.startsWith('~$') && name.toLowerCase() !== 'readme.md',
  );
}

/** The owner's name from profile.yaml, for the PDF's title and author. Never fails. */
async function ownerName(profileFile) {
  try {
    const name = parse(await readFile(profileFile, 'utf8'))?.name;
    return typeof name === 'string' && name.trim() ? name.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function readStamp(stampFile) {
  try {
    return JSON.parse(await readFile(stampFile, 'utf8'));
  } catch {
    return undefined;
  }
}

/** Writes to a temporary name first, so the site never sees half a file. */
async function writeSafely(file, bytes) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(`${file}.partial`, bytes);
  await rename(`${file}.partial`, file);
}

async function toPdf(source, extension) {
  if (extension === '.pdf') return { pdf: new Uint8Array(await readFile(source)), removed: [] };
  if (extension !== '.docx') return { pdf: await convertToPdf(source), removed: [] };
  const { bytes, removed } = cleanDocx(new Uint8Array(await readFile(source)));
  const work = await mkdtemp(join(tmpdir(), 'portfolio-resume-docx-'));
  try {
    const copy = join(work, 'resume.docx');
    await writeFile(copy, bytes);
    return { pdf: await convertToPdf(copy), removed };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

function readyMessage({ source, pages, removed, fromPdf }) {
  const found =
    removed.length === 0
      ? 'No phone number was found.'
      : `Removed ${plural(removed.length, 'phone number')} (${removed.join(', ')}).`;
  const gap =
    fromPdf && removed.length > 0
      ? ' A small gap is left where it was; a Word file gives a cleaner result.'
      : '';
  return `Résumé ready, made from “${source}” (${plural(pages, 'page')}). ${found}${gap}`;
}

/**
 * @returns {Promise<{ state: 'ready' | 'none' | 'error', message: string, source?: string,
 *   pages?: number, removed?: string[], changed?: boolean }>}
 */
export async function buildResume({
  inputDir = RESUME_INPUT_DIR,
  output = RESUME_OUTPUT,
  profileFile = join(CONTENT_DIR, 'profile.yaml'),
  stampFile = DEFAULT_STAMP,
} = {}) {
  const files = await candidates(inputDir);
  const usable = files.filter((name) => SUPPORTED.includes(extname(name).toLowerCase()));

  if (usable.length === 0 && files.length > 0) {
    return {
      state: 'error',
      message:
        `“${files[0]}” isn’t a résumé format this can read. Use a Word file (.docx) or a PDF. ` +
        'From Pages or Google Docs, export as PDF or Word.',
    };
  }
  if (usable.length === 0) {
    const removedOld = existsSync(output);
    if (removedOld) await rm(output);
    await rm(stampFile, { force: true });
    return {
      state: 'none',
      message:
        'No résumé in content/resume/, so the site has no download button.' +
        (removedOld ? ' The old PDF was taken off the site.' : ''),
    };
  }
  if (usable.length > 1) {
    return {
      state: 'error',
      message: `There’s more than one résumé in content/resume/ (${usable.join(', ')}). Keep just one.`,
    };
  }

  const [source] = usable;
  const path = join(inputDir, source);
  const name = await ownerName(profileFile);
  const title = name ? `${name} — Résumé` : 'Résumé';
  const fingerprint = createHash('sha256')
    .update(await readFile(path))
    .update(`${PIPELINE_VERSION}\n${title}`)
    .digest('hex');

  const stamp = await readStamp(stampFile);
  if (stamp?.fingerprint === fingerprint && existsSync(output)) {
    return { ...stamp.status, changed: false };
  }

  const extension = extname(source).toLowerCase();
  try {
    const { pdf, removed: fromWord } = await toPdf(path, extension);
    const cleaned = cleanPdf(pdf, { title, author: name });
    await writeSafely(output, cleaned.bytes);
    const removed = [...new Set([...fromWord, ...cleaned.removed])];
    const status = {
      state: 'ready',
      source,
      pages: cleaned.pages,
      removed,
      message: readyMessage({
        source,
        pages: cleaned.pages,
        removed,
        fromPdf: extension === '.pdf',
      }),
    };
    await writeSafely(stampFile, JSON.stringify({ fingerprint, status }));
    return { ...status, changed: true };
  } catch (error) {
    return {
      state: 'error',
      source,
      message: `${error.message} The site keeps the résumé it had before.`,
    };
  }
}
