/**
 * The LinkedIn import: reading the export, working out what could be added, and saving only
 * what was ticked. Sample files use invented people and companies.
 */
import { strToU8, zipSync } from 'fflate';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { certificationsFile, educationFile, experienceFile } from '../../src/content-files/schemas';
import { parseCsv, readRecords } from '../../tools/linkedin/csv.mjs';
import { toDay, toMonth } from '../../tools/linkedin/dates.mjs';
import { apply, review } from '../../tools/linkedin/import.mjs';
import { bulletsFrom, sameName, summaryFrom } from '../../tools/linkedin/propose.mjs';
import { readExport } from '../../tools/linkedin/source.mjs';

const PROFILE = `First Name,Last Name,Address,Birth Date,Headline,Summary
Jane,Doe,"12 Secret Lane, Springfield",1 January 1990,Data Scientist | AI,"Hello, I am Jane."
`;
const EDUCATION = `School Name,Start Date,End Date,Notes,Degree Name,Activities
Indiana University Bloomington,Aug 2019,May 2021,,Master of Science - MS,
Newtown College,Aug 2010,May 2012,,Bachelor of Arts,
Year Only College,2008,2010,,Diploma,
`;
const CERTIFICATIONS = `Name,Url,Authority,Started On,Finished On,License Number
Deep Learning with PyTorch,,Udacity,Jul 2020,,
Kubernetes Basics,,CNCF,Mar 2022,,
Mystery Course,,,Mar 2022,,
`;
const POSITIONS = `Company Name,Title,Description,Location,Started On,Finished On
Walmart,Principal Data Scientist,"Built the thing.",Remote,Oct 2025,
Acme Corp,Engineer,"• Built bridges.
• Cut costs by 10%.",Austin,Jan 2018,Dec 2019
Acme Corp,Intern,,Austin,Jun 2017,Aug 2017
`;
const PUBLICATIONS = `Name,Published On,Description,Publisher,Url
Stock price prediction using machine learning,"Nov 21, 2019",,IEEE,
A Brand New Paper,"Mar 3, 2024",,Journal,
`;
const CONTACTS = 'First Name,Phone\nPal,555-000-9999\n';

const exportZip = () =>
  zipSync({
    'Profile.csv': strToU8(PROFILE),
    'Education.csv': strToU8(EDUCATION),
    'Certifications.csv': strToU8(CERTIFICATIONS),
    'Positions.csv': strToU8(POSITIONS),
    'Publications.csv': strToU8(PUBLICATIONS),
    'Contacts.csv': strToU8(CONTACTS),
  });

type Change = { id: string; kind: string; heading: string };
const changesOf = async (paths: { contentDir: string; linkedinDir: string }) =>
  ((await review(paths)).changes ?? []) as Change[];

const SITE = {
  'education.yaml': `# Degrees: hand-written guide that must survive.\n\n- degree: M.S. in Data Science\n  school: Indiana University, Bloomington\n  start: 2019-08\n  end: 2021-05\n`,
  'certifications.yaml': `# Certifications guide.\n\n- name: Introduction to Machine Learning with PyTorch Nanodegree\n  issuer: Udacity\n  date: 2020-07\n`,
  'experience.yaml': `# Experience guide.\nemployers:\n  - name: Walmart Inc.\n    roles:\n      - title: Principal Data Scientist\n        start: 2025-10\n        summary: Architecting AI.\n        bullets:\n          - Built the platform.\n`,
  'research.yaml': `- title: Stock price prediction using machine learning techniques\n  slug: stock-price-prediction\n`,
  'profile.yaml': `name: Jane Doe\ntitle: Principal Data Scientist\nemail: jane@doe.dev\n`,
};

describe('reading CSV', () => {
  it('handles quotes, commas, line breaks inside fields, a BOM and Windows line ends', () => {
    expect(parseCsv('\ufeffa,b\r\n"x, y","line1\nline2"\r\n"say ""hi""",z\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'line1\nline2'],
      ['say "hi"', 'z'],
    ]);
  });

  it('finds the header below a note, matches column names loosely, and keeps only asked-for columns', () => {
    const records = readRecords(
      'Notes:\n"a note, with a comma"\n\nName,SECRET,started on\nA,hush,Jan 2020\n',
      { name: ['Name'], start: ['Started On'] },
      ['name'],
    );
    expect(records).toEqual([{ name: 'A', start: 'Jan 2020' }]);
  });

  it('says so when a required column is missing', () => {
    expect(readRecords('x,y\n1,2\n', { name: ['Name'] }, ['name'])).toBeUndefined();
  });
});

describe('reading LinkedIn dates', () => {
  it.each([
    ['Oct 2025', '2025-10'],
    ['October 2025', '2025-10'],
    ['2019-08', '2019-08'],
    ['08/2019', '2019-08'],
    ['2019-08-17', '2019-08'],
  ])('%s is %s', (input, expected) => expect(toMonth(input)).toBe(expected));

  it.each(['2019', '', 'Smarch 2019', '13/2019', '1/2/2019', undefined])(
    'does not guess a month from %s',
    (input) => expect(toMonth(input)).toBeUndefined(),
  );

  it('reads full days', () => {
    expect(toDay('Nov 21, 2019')).toBe('2019-11-21');
    expect(toDay('2019-11-21')).toBe('2019-11-21');
    expect(toDay('Nov 2019')).toBeUndefined();
  });
});

describe('matching names and text', () => {
  it('treats a name inside a longer one as the same', () => {
    expect(sameName('Walmart', 'Walmart Inc.')).toBe(true);
    expect(sameName('Indiana University Bloomington', 'Indiana University, Bloomington')).toBe(
      true,
    );
    expect(sameName('Acme', 'Acme Corp')).toBe(true);
    expect(sameName('Acme Corp', 'Zenith Corp')).toBe(false);
    expect(sameName('', 'x')).toBe(false);
  });

  it('turns a description into bullets, and a bullet into a short summary', () => {
    expect(bulletsFrom('• One.\n- Two\n\n* Three')).toEqual(['One.', 'Two', 'Three']);
    expect(summaryFrom('Short sentence. And more detail follows.')).toBe('Short sentence.');
    const long = summaryFrom(`${'word '.repeat(60)}end.`);
    expect(long.length).toBeLessThanOrEqual(150);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('importing', () => {
  let work: string;
  const setup = (zip: Uint8Array | null = exportZip()) => {
    work = mkdtempSync(join(tmpdir(), 'portfolio-linkedin-'));
    const contentDir = join(work, 'content');
    const linkedinDir = join(contentDir, 'linkedin');
    mkdirSync(linkedinDir, { recursive: true });
    for (const [name, text] of Object.entries(SITE)) writeFileSync(join(contentDir, name), text);
    if (zip) writeFileSync(join(linkedinDir, 'Basic_LinkedInDataExport.zip'), zip);
    return { contentDir, linkedinDir };
  };
  afterEach(() => rmSync(work, { recursive: true, force: true }));

  it('says what to do when the folder is empty', async () => {
    const result = await review(setup(null));
    expect(result.state).toBe('none');
    expect(result.message).toContain('content/linkedin/');
  });

  it('says so when the download holds only the profile file, rather than "nothing new"', async () => {
    const result = await review(setup(zipSync({ 'Profile.csv': strToU8(PROFILE) })));
    expect(result.state).toBe('ready');
    expect(result.message).toContain('no jobs, degrees or certificates');
    expect(result.message).toContain('larger archive');
  });

  it('proposes only what is genuinely new, and explains the rest', async () => {
    const result = await review(setup());
    expect(result.state).toBe('ready');
    expect((result.changes as Change[]).map((change) => change.heading)).toEqual([
      'Bachelor of Arts, Newtown College',
      'Kubernetes Basics',
      'Engineer, Acme Corp',
    ]);
    expect(result.already).toEqual(
      expect.arrayContaining([
        'M.S. in Data Science at Indiana University, Bloomington',
        'Introduction to Machine Learning with PyTorch Nanodegree (Udacity)',
        'Principal Data Scientist at Walmart',
      ]),
    );
    const notes = result.notes!.join('\n');
    expect(notes).toContain('Year Only College');
    expect(notes).toContain('only a year');
    expect(notes).toContain('Mystery Course: LinkedIn has no issuer');
    expect(notes).toContain('Intern at Acme Corp');
    expect(notes).toContain('A Brand New Paper');
    expect(notes).toContain('headline');
    expect(notes).not.toContain('Stock price prediction'); // already on the Research page
  });

  it('never reads or shows private data: address, birth date, contacts, phone numbers', async () => {
    const { linkedinDir } = setup();
    const everything = JSON.stringify(
      await review({ contentDir: join(linkedinDir, '..'), linkedinDir }),
    );
    for (const secret of [
      'Secret Lane',
      'Springfield',
      '1990',
      '555-000-9999',
      'Pal',
      'Hello, I am Jane',
    ]) {
      expect(everything).not.toContain(secret);
    }
    const { found } = await readExport(linkedinDir);
    expect(found).not.toContain('Contacts.csv');
  });

  it('also reads loose CSV files, in or out of a folder', async () => {
    const { linkedinDir } = setup(null);
    writeFileSync(join(linkedinDir, 'Certifications.csv'), CERTIFICATIONS);
    expect((await readExport(linkedinDir)).found).toEqual(['Certifications.csv']);
  });

  it('refuses a damaged download and a format it does not recognise, in plain words', async () => {
    const damaged = await review(setup(strToU8('this is not a zip')));
    expect(damaged.state).toBe('error');
    expect(damaged.message).toContain('exactly as LinkedIn sent it');
    rmSync(work, { recursive: true, force: true });
    const odd = await review(setup(zipSync({ 'Education.csv': strToU8('Foo,Bar\n1,2\n') })));
    expect(odd.state).toBe('error');
    expect(odd.message).toContain("columns weren't recognised");
  });

  it('saves only what was ticked, keeps comments, backs up, and the result passes the site’s own checks', async () => {
    const paths = setup();
    const changes = await changesOf(paths);
    const id = (heading: string) => changes.find((change) => change.heading === heading)!.id;

    const result = await apply({
      ...paths,
      ids: [id('Bachelor of Arts, Newtown College'), id('Engineer, Acme Corp'), 'not-a-real-id'],
    });
    expect(result).toEqual({ added: 2, files: ['education.yaml', 'experience.yaml'], skipped: 1 });

    const education = readFileSync(join(paths.contentDir, 'education.yaml'), 'utf8');
    expect(education).toContain('hand-written guide that must survive');
    expect(educationFile.parse(parse(education))).toHaveLength(2);
    expect(education).toContain('school: Newtown College');

    const experience = readFileSync(join(paths.contentDir, 'experience.yaml'), 'utf8');
    expect(experience).toContain('# Experience guide.');
    const parsed = experienceFile.parse(parse(experience));
    expect(parsed.employers.map((employer) => employer.name)).toEqual([
      'Walmart Inc.',
      'Acme Corp',
    ]);
    expect(parsed.employers[1]!.roles[0]).toMatchObject({
      title: 'Engineer',
      start: '2018-01',
      end: '2019-12',
      summary: 'Built bridges.',
      bullets: ['Built bridges.', 'Cut costs by 10%.'],
    });

    // Not ticked, so not touched.
    expect(readFileSync(join(paths.contentDir, 'certifications.yaml'), 'utf8')).toBe(
      SITE['certifications.yaml'],
    );
    // Backups of exactly what was there before.
    const backups = readdirSync(join(paths.linkedinDir, 'backup'));
    expect(backups).toHaveLength(2);
    const backupOfEducation = backups.find((name) => name.endsWith('-education.yaml'))!;
    expect(readFileSync(join(paths.linkedinDir, 'backup', backupOfEducation), 'utf8')).toBe(
      SITE['education.yaml'],
    );
  });

  it('adds a role to an employer you already have, and a certificate, in valid form', async () => {
    const paths = setup(
      zipSync({
        'Positions.csv': strToU8(
          'Company Name,Title,Description,Started On,Finished On\nWalmart Inc.,Staff Scientist,"• Did a ""quoted"" thing, with a comma.",Jan 2026,\n',
        ),
        'Certifications.csv': strToU8(CERTIFICATIONS),
      }),
    );
    const changes = await changesOf(paths);
    await apply({ ...paths, ids: changes.map((change) => change.id) });
    const experience = experienceFile.parse(
      parse(readFileSync(join(paths.contentDir, 'experience.yaml'), 'utf8')),
    );
    expect(experience.employers).toHaveLength(1);
    expect(experience.employers[0]!.roles.map((role) => role.title)).toEqual([
      'Principal Data Scientist',
      'Staff Scientist',
    ]);
    expect(experience.employers[0]!.roles[1]!.bullets).toEqual([
      'Did a "quoted" thing, with a comma.',
    ]);
    const certifications = certificationsFile.parse(
      parse(readFileSync(join(paths.contentDir, 'certifications.yaml'), 'utf8')),
    );
    expect(certifications.map((entry) => entry.name)).toContain('Kubernetes Basics');
  });

  it('is safe to apply twice: the second time finds nothing new', async () => {
    const paths = setup();
    const changes = await changesOf(paths);
    const ids = changes.map((change) => change.id);
    await apply({ ...paths, ids });
    expect((await apply({ ...paths, ids })).added).toBe(0);
    expect(
      educationFile.parse(parse(readFileSync(join(paths.contentDir, 'education.yaml'), 'utf8'))),
    ).toHaveLength(2);
    expect(existsSync(join(paths.linkedinDir, 'backup'))).toBe(true);
  });

  it('refuses to touch a file that already has a mistake in it', async () => {
    const paths = setup();
    const changes = await changesOf(paths);
    writeFileSync(join(paths.contentDir, 'education.yaml'), 'degree: [unclosed\n');
    await expect(
      apply({
        ...paths,
        ids: changes
          .filter((change: { kind: string }) => change.kind === 'education')
          .map((change: { id: string }) => change.id),
      }),
    ).rejects.toThrow(/comparing|mistake/);
  });
});
