/**
 * Reads LinkedIn's export from content/linkedin/: the .zip as downloaded, or loose .csv files.
 *
 * Only five files are ever read, by exact name. Everything else in a LinkedIn archive (contacts,
 * phone numbers, messages, inferred data) is skipped without being decompressed, so it is never
 * in memory here. Nothing is extracted to disk.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { readRecords } from './csv.mjs';

/** Largest single file that will be read, so a strange archive can't use up memory. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * file name -> the columns used, and which must exist. Only these columns are kept: the profile
 * file also holds an address and a birth date, which this never reads.
 */
export const FILES = {
  'Profile.csv': { columns: { headline: ['Headline'] }, required: ['headline'] },
  'Positions.csv': {
    columns: {
      company: ['Company Name', 'Company'],
      title: ['Title'],
      description: ['Description'],
      start: ['Started On', 'Start Date'],
      end: ['Finished On', 'End Date'],
    },
    required: ['company', 'title'],
  },
  'Education.csv': {
    columns: {
      school: ['School Name', 'School'],
      degree: ['Degree Name', 'Degree'],
      start: ['Start Date', 'Started On'],
      end: ['End Date', 'Finished On'],
    },
    required: ['school'],
  },
  'Certifications.csv': {
    columns: {
      name: ['Name'],
      issuer: ['Authority', 'Issuer', 'Company'],
      start: ['Started On', 'Issued On', 'Start Date'],
    },
    required: ['name'],
  },
  'Publications.csv': {
    columns: {
      title: ['Name', 'Title'],
      publisher: ['Publisher'],
      date: ['Published On', 'Date'],
    },
    required: ['title'],
  },
};

/** Which file this is, or undefined if it isn't one of the five (a folder prefix is ignored). */
const wanted = (path) => Object.keys(FILES).find((name) => path.split('/').pop() === name);

/** @returns {Promise<Map<string, string>>} file name -> text, for the files found */
async function readTexts(folder) {
  const texts = new Map();
  const names = await readdir(folder).catch(() => []);
  for (const name of names.sort()) {
    const path = join(folder, name);
    if (name.toLowerCase().endsWith('.zip')) {
      const archive = unzipSync(new Uint8Array(await readFile(path)), {
        filter: (entry) => wanted(entry.name) !== undefined && entry.originalSize <= MAX_FILE_BYTES,
      });
      for (const [entry, bytes] of Object.entries(archive)) {
        texts.set(wanted(entry), strFromU8(bytes));
      }
    } else if (wanted(name) && (await stat(path)).size <= MAX_FILE_BYTES) {
      texts.set(wanted(name), await readFile(path, 'utf8'));
    }
  }
  return texts;
}

/**
 * @param {string} folder
 * @returns {Promise<{ found: string[], data: Record<string, Record<string, string>[]>,
 *   unreadable: string[] }>}
 *   `data` is keyed by file name; `unreadable` lists files whose columns weren't recognised.
 */
export async function readExport(folder) {
  const texts = await readTexts(folder).catch((error) => {
    throw new Error(
      `Could not open the LinkedIn download (${error.message}). ` +
        'Check that it is the .zip exactly as LinkedIn sent it.',
    );
  });
  const data = {};
  const unreadable = [];
  for (const [name, text] of texts) {
    const records = readRecords(text, FILES[name].columns, FILES[name].required);
    if (records) data[name] = records;
    else unreadable.push(name);
  }
  return { found: [...texts.keys()], data, unreadable };
}
