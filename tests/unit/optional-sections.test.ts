/**
 * Builds practice sites with sections left out, and checks the site adjusts: no page for a
 * missing section, no menu link, no home tile, and numbering without gaps.
 *
 * Each build copies content/ to a temporary folder, changes it, and builds that copy into
 * another temporary folder, so the real content and the real dist/ are never touched.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ASTRO = join(process.cwd(), 'node_modules', 'astro', 'bin', 'astro.mjs');
const BUILD_TIMEOUT = 120_000;
const made: string[] = [];

function practiceContent(change: (folder: string) => void): string {
  const folder = mkdtempSync(join(tmpdir(), 'portfolio-content-'));
  made.push(folder);
  cpSync('content', folder, { recursive: true });
  change(folder);
  return folder;
}

function build(content: string) {
  const out = mkdtempSync(join(tmpdir(), 'portfolio-dist-'));
  made.push(out);
  const result = spawnSync(process.execPath, [ASTRO, 'build', '--outDir', out], {
    env: { ...process.env, PORTFOLIO_CONTENT: content },
    encoding: 'utf8',
  });
  const read = (path: string) => readFileSync(join(out, path), 'utf8');
  return {
    ok: result.status === 0,
    log: `${result.stdout}${result.stderr}`,
    has: (path: string) => existsSync(join(out, path)),
    read,
    /** The labels in the header menu, in order. */
    menu: () =>
      [...read('index.html').matchAll(/<nav aria-label="Primary"[\s\S]*?<\/nav>/g)]
        .flatMap(([nav]) => [...nav.matchAll(/<a [^>]*>([^<]+)<\/a>/g)])
        .map(([, label]) => label!.trim()),
    /** The home tiles' number and label, like "03 Research". */
    tiles: () =>
      [
        ...read('index.html').matchAll(
          /<span class="number"[^>]*>(\d+)<\/span>\s*<span class="label"[^>]*>([^<]+)<\/span>/g,
        ),
      ].map(([, number, label]) => `${number} ${label}`),
    checkDist: () =>
      execFileSync(process.execPath, ['scripts/check-dist.mjs', out], { encoding: 'utf8' }),
  };
}

afterAll(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const remove =
  (...files: string[]) =>
  (folder: string) => {
    for (const file of files) rmSync(join(folder, file), { recursive: true, force: true });
  };

describe('a site with sections left out', () => {
  it(
    'with only a name and email, has just the home and contact pages',
    () => {
      const site = build(
        practiceContent((folder) => {
          rmSync(folder, { recursive: true });
          cpSync('content/resume', join(folder, 'resume'), { recursive: true });
          writeFileSync(join(folder, 'profile.yaml'), 'name: Jane Doe\nemail: jane@doe.dev\n');
        }),
      );
      expect(site.ok, site.log).toBe(true);
      expect(site.has('index.html') && site.has('contact/index.html')).toBe(true);
      for (const page of ['experience', 'projects', 'research', 'education']) {
        expect(site.has(`${page}/index.html`), page).toBe(false);
      }
      expect(site.menu()).toEqual(['Contact']);
      expect(site.tiles()).toEqual(['01 Contact']);
      expect(site.read('index.html')).toContain('One chapter.</h2>');
      expect(site.read('contact/index.html')).toContain('01 / Contact');
      // The header shows the profile photo, as decoration (the name beside it names the link).
      // The browser-tab icon is drawn from the name's initials.
      const header = site.read('index.html').match(/<a class="identity".*?<\/a>/s)?.[0] ?? '';
      expect(header).toMatch(/class="avatar"[^>]*><img/);
      expect(header).toMatch(/<img[^>]*\salt[\s>]/); // an empty description, as decoration
      expect(header).not.toMatch(/\salt="[^"]+"/);
      expect(header).toContain('Jane Doe');
      expect(site.read('favicon.svg')).toContain('>JD</text>');
      // No address yet: no canonical link, no sitemap, and robots.txt doesn't name one.
      expect(site.read('index.html')).not.toContain('rel="canonical"');
      expect(site.has('sitemap-index.xml')).toBe(false);
      expect(site.read('robots.txt')).not.toContain('Sitemap:');
      expect(site.checkDist()).toContain('Built site is clean');
    },
    BUILD_TIMEOUT,
  );

  it(
    'without research, closes up the numbering and widens the last tile',
    () => {
      const site = build(practiceContent(remove('research.yaml')));
      expect(site.ok, site.log).toBe(true);
      expect(site.has('research/index.html')).toBe(false);
      expect(site.has('research/smart-irrigation/index.html')).toBe(false);
      expect(site.menu()).toEqual(['Experience', 'Projects', 'Education', 'Contact']);
      expect(site.tiles()).toEqual(['01 Experience', '02 Projects', '03 Education', '04 Contact']);
      expect(site.read('index.html')).toContain('Four chapters. Start with the career.</h2>');
      expect(site.read('index.html')).toMatch(/class="slot-contact wide"/);
      expect(site.read('education/index.html')).toContain('03 / Education');
      expect(site.checkDist()).toContain('Built site is clean');
    },
    BUILD_TIMEOUT,
  );

  it(
    'with GitHub links but no case studies, keeps a Projects page without the case-study grid',
    () => {
      const site = build(practiceContent(remove('projects')));
      expect(site.ok, site.log).toBe(true);
      expect(site.has('projects/index.html')).toBe(true);
      expect(site.has('projects/dalal-street/index.html')).toBe(false);
      expect(site.read('projects/index.html')).not.toContain('id="work"');
      expect(site.read('projects/index.html')).toContain('Also on GitHub');
      expect(site.read('index.html')).toContain('aria-label="Projects on GitHub"');
    },
    BUILD_TIMEOUT,
  );

  it(
    'with capabilities but no jobs, and certificates but no degrees, shows what there is',
    () => {
      const site = build(
        practiceContent((folder) => {
          rmSync(join(folder, 'experience.yaml'));
          writeFileSync(join(folder, 'education.yaml'), '');
        }),
      );
      expect(site.ok, site.log).toBe(true);
      const experience = site.read('experience/index.html');
      expect(experience).not.toContain('id="career-title"');
      expect(experience).toContain('id="capabilities-title"');
      expect(site.read('index.html')).toContain('aria-label="Capabilities"');
      const education = site.read('education/index.html');
      expect(education).not.toContain('id="degrees-title"');
      expect(education).toContain('id="certifications-title"');
    },
    BUILD_TIMEOUT,
  );

  it(
    'refuses to build without profile.yaml, and says why',
    () => {
      const site = build(practiceContent(remove('profile.yaml')));
      expect(site.ok).toBe(false);
      expect(site.log).toContain('content/profile.yaml is missing or empty');
    },
    BUILD_TIMEOUT,
  );
});
