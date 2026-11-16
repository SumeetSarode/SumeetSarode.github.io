/**
 * The LinkedIn import, from reading the download to saving what you ticked.
 *
 *   review()  reads content/linkedin/ and says what could be added (saves nothing)
 *   apply()   adds only the items whose ids you ticked, keeping your comments and layout
 *
 * The browser only ever sends back ids. What gets saved is recomputed here from the files, so a
 * page can't make this write anything the review didn't show.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Scalar, isMap, isSeq, parse, parseDocument } from 'yaml';
import { writeFileAtomic } from '../shared/write-atomic.mjs';
import { propose, sameName } from './propose.mjs';
import { readExport } from './source.mjs';

/** Where each kind of item is saved. */
const TARGETS = {
  education: 'education.yaml',
  certification: 'certifications.yaml',
  role: 'experience.yaml',
};

/** A content file as plain data, or `fallback` if it doesn't exist yet. */
async function readContent(contentDir, name, fallback) {
  const text = await readFile(join(contentDir, name), 'utf8').catch(() => '');
  try {
    return parse(text) ?? fallback;
  } catch {
    throw new Error(
      `content/${name} has a mistake in it, so nothing could be compared. Fix that file first.`,
    );
  }
}

async function loadCurrent(contentDir) {
  const experience = await readContent(contentDir, 'experience.yaml', {});
  return {
    education: await readContent(contentDir, 'education.yaml', []),
    certifications: await readContent(contentDir, 'certifications.yaml', []),
    research: await readContent(contentDir, 'research.yaml', []),
    profile: await readContent(contentDir, 'profile.yaml', {}),
    experience: {
      employers: experience.employers ?? [],
      earlierRoles: experience.earlierRoles ?? [],
    },
  };
}

/**
 * What the review page shows.
 * @returns {Promise<{ state: 'none' | 'error' | 'ready', message: string, changes?: object[],
 *   already?: string[], notes?: string[] }>}
 */
export async function review({ contentDir, linkedinDir }) {
  let linkedin;
  try {
    linkedin = await readExport(linkedinDir);
  } catch (error) {
    return { state: 'error', message: error.message };
  }
  if (linkedin.found.length === 0) {
    return {
      state: 'none',
      message: 'To import from LinkedIn, put the download (the .zip) in content/linkedin/.',
    };
  }
  if (Object.keys(linkedin.data).length === 0) {
    return {
      state: 'error',
      message:
        `LinkedIn's ${linkedin.unreadable.join(', ')} could not be read: the columns weren't ` +
        'recognised. LinkedIn may have changed its format.',
    };
  }
  let result;
  try {
    result = propose(linkedin, await loadCurrent(contentDir));
  } catch (error) {
    return { state: 'error', message: error.message };
  }
  const readNote = linkedin.unreadable.length
    ? [`These LinkedIn files couldn't be read and were skipped: ${linkedin.unreadable.join(', ')}.`]
    : [];
  const count = result.changes.length;
  // LinkedIn's "Profile" option gives only Profile.csv. Say so, instead of "nothing new".
  const missing = ['Positions.csv', 'Education.csv', 'Certifications.csv'].filter(
    (name) => !(name in linkedin.data),
  );
  const incomplete = missing.length > 0 && count === 0;
  const message = incomplete
    ? 'This download has no jobs, degrees or certificates in it, so there is nothing to add. ' +
      'In LinkedIn, request the larger archive (the first option) to import those.'
    : count === 0
      ? 'Nothing new to add: your site already has everything LinkedIn has that it can use.'
      : `${count} thing${count === 1 ? '' : 's'} from LinkedIn could be added to your site.`;
  return {
    state: 'ready',
    message,
    // The entries themselves stay on the server; the page only needs to show and tick them.
    changes: result.changes.map(({ id, kind, heading, details }) => ({
      id,
      kind,
      heading,
      details,
    })),
    already: result.already,
    notes: [...readNote, ...result.notes],
  };
}

/** Long text is written the way the guides in each file recommend: ">-" blocks. */
function styled(value) {
  if (typeof value === 'string' && value.length > 70) {
    const scalar = new Scalar(value);
    scalar.type = 'BLOCK_FOLDED';
    return scalar;
  }
  if (Array.isArray(value)) return value.map(styled);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, styled(item)]));
  }
  return value;
}

/** A new list item, set apart from the one before it by a blank line, like the others. */
function newItem(doc, entry) {
  const node = doc.createNode(styled(entry));
  node.spaceBefore = true;
  return node;
}

function listIn(doc, path) {
  let list = doc.getIn(path, true);
  if (!isSeq(list)) {
    list = doc.createNode([]);
    if (path.length === 0) doc.contents = list;
    else doc.setIn(path, list);
  }
  return list;
}

/** Adds one change to a parsed file. */
function addTo(doc, change) {
  if (change.kind !== 'role') return listIn(doc, []).add(newItem(doc, change.entry));
  const { company, role } = change.entry;
  const employers = listIn(doc, ['employers']);
  const employer = employers.items.find(
    (item) => isMap(item) && sameName(String(item.get('name')), company),
  );
  if (employer) return listIn(employer, ['roles']).add(newItem(doc, role));
  return employers.add(newItem(doc, { name: company, roles: [role] }));
}

let queue = Promise.resolve();

/**
 * Adds the ticked items. Each changed file is backed up first, into content/linkedin/backup/.
 * @param {{ contentDir: string, linkedinDir: string, ids: string[] }} options
 * @returns {Promise<{ added: number, files: string[], skipped: number }>}
 */
export function apply({ contentDir, linkedinDir, ids }) {
  const run = queue.then(async () => {
    const linkedin = await readExport(linkedinDir);
    const { changes } = propose(linkedin, await loadCurrent(contentDir));
    const chosen = changes.filter((change) => ids.includes(change.id));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const files = [];

    for (const file of new Set(chosen.map((change) => TARGETS[change.kind]))) {
      const path = join(contentDir, file);
      const before = await readFile(path, 'utf8').catch(() => '');
      const doc = parseDocument(before);
      if (doc.errors.length > 0) {
        throw new Error(`content/${file} has a mistake in it. Fix that first, then try again.`);
      }
      for (const change of chosen.filter((item) => TARGETS[item.kind] === file)) addTo(doc, change);
      const after = doc.toString({ lineWidth: 90 });
      if (parseDocument(after).errors.length > 0) {
        throw new Error(`Adding to content/${file} would have broken it, so nothing was saved.`);
      }
      const backups = join(linkedinDir, 'backup');
      await mkdir(backups, { recursive: true });
      await writeFileAtomic(join(backups, `${stamp}-${file}`), before);
      await writeFileAtomic(path, after);
      files.push(file);
    }
    return { added: chosen.length, files, skipped: ids.length - chosen.length };
  });
  queue = run.catch(() => undefined);
  return run;
}
