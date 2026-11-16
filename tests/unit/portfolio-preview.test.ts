/**
 * Portfolio Preview: error messages people can act on, safe file serving, ignoring editors'
 * scratch files, and a server that only answers this computer.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  explainBuildFailure,
  publishCheckProblems,
} from '../../tools/portfolio-preview/build-output.mjs';
import { createPreviewServer } from '../../tools/portfolio-preview/server.mjs';
import { resolveSiteFile } from '../../tools/portfolio-preview/static.mjs';
import { isNoise } from '../../tools/portfolio-preview/watcher.mjs';

// Real output from failed builds (trimmed), colours included.
const CONTENT_FAILURE = `(node:35000) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable
11:10:26 [build] Rearranging server assets...

 generating static routes 
\x1b[31mcontent/certifications.yaml needs fixing:
  - line 16, #1 › date: must be a month written like 2020-06
  - line 21, #2 › date: must be a month written like 2020-06
The guide at the top of the file lists every field.\x1b[39m
  Location:
    /site/node_modules/astro/dist/runtime/prerender/static-paths.js:93:61
  Stack trace:
    at parseContent (file:///site/.astro/chunks/site.mjs:57:8)`;

const CASE_STUDY_FAILURE = `11:10:28 [content] Syncing content
[InvalidContentEntryDataError] projects → dalal-street data does not match collection schema.

  title**: **title: Expected type \`"string"\`, received \`"object"\`

  Hint:
    See https://docs.astro.build/en/guides/content-collections/ for more information.
  Location:
    /tmp/pf-err/projects/dalal-street.yaml:0:0`;

describe('explaining a failed build', () => {
  it('keeps the content check’s own words and drops the technical details', () => {
    expect(explainBuildFailure(CONTENT_FAILURE)).toBe(
      [
        'content/certifications.yaml needs fixing:',
        '  - line 16, #1 › date: must be a month written like 2020-06',
        '  - line 21, #2 › date: must be a month written like 2020-06',
        'The guide at the top of the file lists every field.',
      ].join('\n'),
    );
  });

  it('rewrites a case-study problem to name its file', () => {
    expect(explainBuildFailure(CASE_STUDY_FAILURE)).toBe(
      'content/projects/dalal-street.yaml needs fixing:\n  - title: Expected type "string", received "object"',
    );
  });

  it('falls back to the last meaningful lines, never a stack trace', () => {
    const message = explainBuildFailure(
      '11:00:00 [build] start\nSomething broke\n    at foo (bar.js:1:1)',
    );
    expect(message).toBe('Something broke');
  });

  it('lists the publish check’s findings', () => {
    const output =
      '\n2 problem(s) in the built site:\n\n  - index.html: says "passionate"\n  - robots.txt is missing\n';
    expect(publishCheckProblems(output)).toEqual([
      'index.html: says "passionate"',
      'robots.txt is missing',
    ]);
  });
});

describe('serving the built site', () => {
  let site: string;
  beforeAll(() => {
    site = mkdtempSync(join(tmpdir(), 'preview-site-'));
    mkdirSync(join(site, 'projects'));
    writeFileSync(join(site, 'index.html'), 'home');
    writeFileSync(join(site, 'projects', 'index.html'), 'projects');
    writeFileSync(join(site, '404.html'), 'not found');
    writeFileSync(join(site, 'og-image.png'), 'png');
  });
  afterAll(() => rmSync(site, { recursive: true, force: true }));

  it('serves folders as their index page, like the real host', async () => {
    const home = await resolveSiteFile(site, '/');
    expect([home.status, String(home.body)]).toEqual([200, 'home']);
    const projects = await resolveSiteFile(site, '/projects/');
    expect(String(projects.body)).toBe('projects');
    expect(await resolveSiteFile(site, '/projects')).toEqual({
      status: 301,
      location: '/projects/',
    });
  });

  it('sends the right type, and the site’s 404 page for anything missing', async () => {
    expect((await resolveSiteFile(site, '/og-image.png')).type).toBe('image/png');
    const missing = await resolveSiteFile(site, '/nope/');
    expect([missing.status, String(missing.body)]).toEqual([404, 'not found']);
  });

  it('never serves anything outside the built site', async () => {
    for (const trick of ['/../secret', '/%2e%2e/secret', '/..%2fsecret', '/a%00b']) {
      expect([403, 404]).toContain((await resolveSiteFile(site, trick)).status);
    }
    expect((await resolveSiteFile(site, '/%E0%A4%A')).status).toBe(400);
  });
});

describe('noticing changes', () => {
  it.each([
    '.DS_Store',
    '~$resume.docx',
    '.~lock.resume.docx#',
    'profile.yaml.swp',
    'resume.pdf.partial',
    'profile.yaml~',
  ])('ignores the scratch file %s', (name) => expect(isNoise(`/site/content/${name}`)).toBe(true));
  it.each(['profile.yaml', 'projects/dalal-street.yaml', 'resume/my resume.docx'])(
    'notices %s',
    (name) => expect(isNoise(`/site/content/${name}`)).toBe(false),
  );
});

describe('the preview server', () => {
  let site: string;
  let base: string;
  const lifecycle = { ping: vi.fn(), closing: vi.fn(), quit: vi.fn() };
  const builder = {
    status: {
      site: { state: 'ready', message: 'Up to date.' },
      resume: { state: 'none', message: 'No résumé.' },
      warnings: [],
      version: 1,
      siteDir: '',
    },
  };
  const server = createPreviewServer({ builder, lifecycle });

  beforeAll(async () => {
    site = mkdtempSync(join(tmpdir(), 'preview-server-'));
    writeFileSync(join(site, 'index.html'), '<h1>Jane</h1>');
    builder.status.siteDir = site;
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((done) => server.close(done));
    rmSync(site, { recursive: true, force: true });
  });

  it('shows the preview page and the site', async () => {
    const page = await fetch(`${base}/__preview/`);
    expect(page.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(await page.text()).toContain('Portfolio Preview');
    expect(await (await fetch(`${base}/`)).text()).toBe('<h1>Jane</h1>');
  });

  it('reports the status without revealing where the build lives', async () => {
    const state = await (await fetch(`${base}/__preview/api/state`)).json();
    expect(state.site.state).toBe('ready');
    expect(state.hasSite).toBe(true);
    expect(JSON.stringify(state)).not.toContain(site);
  });

  it('refuses other host names and cross-site requests', async () => {
    const { port } = server.address() as AddressInfo;
    const http = await import('node:http');
    const status = await new Promise<number>((done) =>
      http
        .get(
          { host: '127.0.0.1', port, path: '/', headers: { Host: `evil.test:${port}` } },
          (res) => {
            res.resume();
            done(res.statusCode!);
          },
        )
        .end(),
    );
    expect(status).toBe(403);
    const quit = await fetch(`${base}/__preview/api/quit`, {
      method: 'POST',
      headers: { Origin: 'https://evil.test' },
    });
    expect(quit.status).toBe(403);
    expect(lifecycle.quit).not.toHaveBeenCalled();
  });

  it('passes the page’s keep-alive and quit on to the lifecycle', async () => {
    await fetch(`${base}/__preview/api/ping`, { method: 'POST' });
    await fetch(`${base}/__preview/api/quit`, { method: 'POST', headers: { Origin: base } });
    expect(lifecycle.ping).toHaveBeenCalledOnce();
    expect(lifecycle.quit).toHaveBeenCalledOnce();
  });

  it('streams every new status to the open page', async () => {
    const response = await fetch(`${base}/__preview/events`);
    const reader = response.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    expect(first).toMatch(/^data: .*"version":1/);
    server.broadcast({ ...builder.status, version: 2 });
    const next = new TextDecoder().decode((await reader.read()).value);
    expect(next).toMatch(/"version":2/);
    await reader.cancel();
  });
});
