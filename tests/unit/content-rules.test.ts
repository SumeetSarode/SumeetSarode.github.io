import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANNED_WORDS,
  PHONE,
  PRIVACY_RULES,
  PRIVATE_FILES,
  UNFINISHED,
} from '../../scripts/lib/content-rules.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const TEXT_EXTENSIONS = new Set(['.astro', '.md', '.ts', '.json', '.css', '.svg', '.txt', '.mjs']);

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const full = join(directory, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const textFiles = (directory: string) =>
  walk(directory).filter((file) => TEXT_EXTENSIONS.has(extname(file)));

/** Everything that ends up on the public site, as text. */
const publicSource = [...textFiles(join(root, 'src')), ...textFiles(join(root, 'public'))];
/** The words visitors read: pages, components, content, and data (not CSS). */
const writtenWords = publicSource.filter(
  (file) => !file.endsWith('.css') && !file.endsWith('.svg'),
);

describe('the rules can actually catch things', () => {
  it('flags the phone formats people actually write', () => {
    for (const sample of ['212-555-0142', '(212) 555-0142', '212.555.0142', '+1 212 555 0142']) {
      expect(PHONE.test(sample), sample).toBe(true);
    }
  });
  it('does not flag dates, years, or version numbers', () => {
    for (const sample of ['2019-08-17', 'Oct 2025', '1,744 unit tests', 'Python 3.13', '2,300+']) {
      expect(PHONE.test(sample), sample).toBe(false);
    }
  });
  it('flags work-network addresses but not the plain employer name', () => {
    const address = PRIVACY_RULES.find((rule) => rule.name === 'a work-network address')!;
    for (const sample of [
      'a@walmart.com',
      'https://intranet.walmart.com/x',
      'wal-mart.com',
      'x@samsclub.com',
    ]) {
      expect(address.pattern.test(sample), sample).toBe(true);
    }
    for (const sample of ['Walmart Inc.', "Sam's Club", 'every U.S. Walmart location']) {
      expect(address.pattern.test(sample), sample).toBe(false);
    }
  });
  it('flags banned words, including every form of "leverage"', () => {
    for (const word of ['passionate', 'Results-driven', 'cutting-edge', 'leverage', 'leveraging']) {
      expect(BANNED_WORDS.test(word), word).toBe(true);
    }
    expect(BANNED_WORDS.test('guardrails')).toBe(false);
  });
});

describe('privacy: nothing private in the public source', () => {
  it('scans a meaningful number of files', () => {
    expect(publicSource.length).toBeGreaterThan(30);
  });
  for (const rule of PRIVACY_RULES) {
    it(`contains no ${rule.name}`, () => {
      const offenders = publicSource.filter((file) =>
        rule.pattern.test(readFileSync(file, 'utf8')),
      );
      expect(offenders.map((file) => relative(root, file))).toEqual([]);
    });
  }
});

describe('writing rules', () => {
  it('uses none of the banned filler words', () => {
    const offenders = writtenWords.filter((file) => BANNED_WORDS.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
  it('has no unfinished-work markers', () => {
    const offenders = writtenWords.filter((file) => UNFINISHED.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
  it('has no style guide or other temporary page', () => {
    expect(existsSync(join(root, 'src/pages/styleguide.astro'))).toBe(false);
  });
});

describe('no employer branding', () => {
  it('has no logo or brand image files', () => {
    const files = [...walk(join(root, 'src')), ...walk(join(root, 'public'))];
    expect(files.filter((file) => /walmart|sams?-?club/i.test(relative(root, file)))).toEqual([]);
  });
});

describe('the repository holds only what should be public', () => {
  // Tracked files PLUS new files git would add, so a bad file is caught before it is committed.
  const tracked = (() => {
    try {
      return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
        cwd: root,
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean);
    } catch {
      return null; // not a git checkout (for example a downloaded zip)
    }
  })();

  it.skipIf(tracked === null)('tracks no handoff documents, Word files, or original photos', () => {
    const offenders = (tracked ?? []).filter((file) =>
      PRIVATE_FILES.some((pattern) => pattern.test(file.split('/').pop() ?? '')),
    );
    expect(offenders).toEqual([]);
  });

  it.skipIf(tracked === null)('tracks only one PDF: the public résumé', () => {
    const pdfs = (tracked ?? []).filter((file) => file.toLowerCase().endsWith('.pdf'));
    expect(pdfs).toEqual(['public/resume/sumeet-sarode-resume.pdf']);
  });
});
