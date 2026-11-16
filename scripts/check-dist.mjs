// Checks the BUILT site (dist/) for anything that must never be published.
// Run after `npm run build`:   npm run check:dist   (or pass another build folder to check)
// Exits with an error, and a list of problems, if any rule is broken.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_WORDS, BUILD_LEAKS, PRIVACY_RULES, UNFINISHED } from './lib/content-rules.mjs';

const dist = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(dist)) {
  console.error('There is no dist/ folder. Run `npm run build` first.');
  process.exit(1);
}

const KB = 1024;
/** Largest allowed size, per file type. The whole site is under 1 MB, so these are tight. */
const BUDGET_KB = { '.html': 60, '.css': 40, '.js': 30, '.pdf': 300, '.woff2': 120, default: 100 };
const TEXT = new Set(['.html', '.xml', '.txt', '.css', '.js', '.json', '.svg']);
const WORDS_CHECKED = new Set(['.html', '.xml']);

const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const full = join(directory, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(dist);
const problems = [];
const report = (file, message) => problems.push(`${relative(dist, file)}: ${message}`);

for (const file of files) {
  const extension = extname(file).toLowerCase();
  const size = statSync(file).size;
  const budget = (BUDGET_KB[extension] ?? BUDGET_KB.default) * KB;
  if (size > budget)
    report(file, `is ${Math.round(size / KB)} KB, over its ${budget / KB} KB budget`);
  if (/\.hei[cf]$/i.test(file)) report(file, 'an original iPhone photo must never be published');

  if (extension === '.pdf') {
    if (readFileSync(file).includes('tel:')) report(file, 'contains a tel: link');
    continue;
  }
  if (!TEXT.has(extension)) continue;

  const text = readFileSync(file, 'utf8');
  for (const rule of [...PRIVACY_RULES, ...BUILD_LEAKS]) {
    if (rule.pattern.test(text)) report(file, `contains ${rule.name}`);
  }
  if (UNFINISHED.test(text)) report(file, 'contains an unfinished-work marker');
  if (WORDS_CHECKED.has(extension) && BANNED_WORDS.test(text)) report(file, 'uses a banned word');
}

// Total JavaScript, across all files, stays tiny.
const totalJs = files
  .filter((file) => extname(file) === '.js')
  .reduce((sum, file) => sum + statSync(file).size, 0);
if (totalJs > BUDGET_KB['.js'] * KB)
  problems.push(`total JavaScript is ${Math.round(totalJs / KB)} KB`);

// Every internal link and image in every page must point at a file that exists.
const exists = (path) => {
  const target = join(dist, decodeURIComponent(path.split('#')[0].split('?')[0]));
  return (
    existsSync(target) &&
    (!statSync(target).isDirectory() || existsSync(join(target, 'index.html')))
  );
};
const pages = files.filter((file) => file.endsWith('.html'));
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, , value] of html.matchAll(/\b(href|src)="(\/[^"]*)"/g)) {
    if (!exists(value)) report(page, `links to ${value}, which does not exist`);
  }
}

// Search-engine files. They need the site's address (url in content/profile.yaml); the home
// page's canonical link says what it is, or that there isn't one yet.
const home = readFileSync(join(dist, 'index.html'), 'utf8');
const siteUrl = home.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const sitemapPath = join(dist, 'sitemap-0.xml');
const robots = existsSync(join(dist, 'robots.txt'))
  ? readFileSync(join(dist, 'robots.txt'), 'utf8')
  : '';
if (!robots.includes('User-agent: *')) problems.push('robots.txt is missing');
if (!siteUrl) {
  if (existsSync(sitemapPath)) problems.push('there is a sitemap, but the site has no address');
  if (/Sitemap:/.test(robots)) problems.push('robots.txt names a sitemap, but there is none');
} else if (!existsSync(sitemapPath)) {
  problems.push('sitemap-0.xml is missing');
} else {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expected = pages.filter((page) => !page.endsWith('404.html')).length;
  if (urls.length !== expected)
    problems.push(`sitemap lists ${urls.length} pages, but ${expected} exist`);
  for (const url of urls) {
    if (/404|styleguide/.test(url)) problems.push(`sitemap lists ${url}`);
    if (!url.startsWith(siteUrl)) problems.push(`sitemap has a wrong address: ${url}`);
  }
  if (!robots.includes(`Sitemap: ${new URL('/sitemap-index.xml', siteUrl).href}`)) {
    problems.push('robots.txt does not point at the sitemap');
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) in the built site:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `Built site is clean: ${files.length} files, ${pages.length} pages, ${Math.round(totalJs / KB)} KB of JavaScript.`,
);
