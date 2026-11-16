/**
 * Rebuilds the site whenever content changes, exactly as it will be published, and keeps
 * the last version that worked on screen when a change has a mistake in it.
 *
 * One rebuild at a time. Changes that arrive during a rebuild are gathered into exactly one
 * more, so saving five times quickly costs two builds, not five.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { explainBuildFailure, publishCheckProblems } from './build-output.mjs';

/** Runs a Node script and collects everything it prints. Never throws. */
function runNode(script, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on('close', (code) => resolve({ code, output }));
  });
}

/**
 * @param {{ root: string, workRoot: string, buildResume: () => Promise<object>,
 *   onUpdate: (status: object) => void }} options
 */
export function createBuilder({ root, workRoot, buildResume, onUpdate }) {
  const astro = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const publishCheck = join(root, 'scripts', 'check-dist.mjs');

  let status = {
    site: { state: 'building', message: 'Building your site for the first time…' },
    resume: { state: 'building', message: 'Checking your résumé…' },
    warnings: [],
    /** Goes up by one with every successful build, so the page knows when to reload. */
    version: 0,
    builtAt: undefined,
    /** The folder holding the last good build. Never sent to the browser. */
    siteDir: undefined,
  };
  const update = (changes) => {
    status = { ...status, ...changes };
    onUpdate(status);
  };

  async function rebuildSite() {
    update({ site: { state: 'building', message: 'Updating the preview…' } });
    const out = await mkdtemp(join(workRoot, 'build-'));
    const build = await runNode(astro, ['build', '--outDir', out], root);
    if (build.code !== 0) {
      await rm(out, { recursive: true, force: true });
      update({ site: { state: 'error', message: explainBuildFailure(build.output) } });
      return;
    }
    const check = await runNode(publishCheck, [out], root);
    const previous = status.siteDir;
    update({
      site: { state: 'ready', message: 'Up to date.' },
      warnings: check.code === 0 ? [] : publishCheckProblems(check.output),
      siteDir: out,
      version: status.version + 1,
      builtAt: new Date().toISOString(),
    });
    if (previous) await rm(previous, { recursive: true, force: true });
  }

  async function cycle({ resume }) {
    if (resume) {
      update({ resume: { state: 'building', message: 'Checking your résumé…' } });
      update({ resume: await buildResume() });
    }
    await rebuildSite();
  }

  let running = false;
  let pending;
  /** Ask for a rebuild. `resume: true` when content/resume/ changed too. */
  async function request({ resume = false } = {}) {
    pending = { resume: Boolean(pending?.resume || resume) };
    if (running) return;
    running = true;
    try {
      while (pending) {
        const next = pending;
        pending = undefined;
        try {
          await cycle(next);
        } catch (error) {
          update({
            site: { state: 'error', message: `Something unexpected went wrong: ${error.message}` },
          });
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    request,
    get status() {
      return status;
    },
  };
}
