/**
 * Turns Word and other document formats into PDF with LibreOffice (free, libreoffice.org),
 * which is the only outside program the résumé pipeline needs, and only for non-PDF files.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const INSTALLED_AT = {
  darwin: ['/Applications/LibreOffice.app/Contents/MacOS/soffice'],
  win32: [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ],
};

const run = (command, args, timeout) =>
  new Promise((resolve, reject) => {
    execFile(command, args, { timeout }, (error, stdout, stderr) =>
      error ? reject(Object.assign(error, { stderr })) : resolve(stdout),
    );
  });

/** The LibreOffice program, or undefined when it isn't installed. */
export async function findLibreOffice({ platform = process.platform, env = process.env } = {}) {
  if (env['SOFFICE']) return env['SOFFICE'];
  for (const path of INSTALLED_AT[platform] ?? []) if (existsSync(path)) return path;
  for (const name of ['soffice', 'libreoffice']) {
    try {
      await run(name, ['--version'], 20_000);
      return name;
    } catch {
      // not on the PATH under that name
    }
  }
  return undefined;
}

/** @param {string} file a .docx, .doc, .odt or .rtf  @returns {Promise<Uint8Array>} the PDF */
export async function convertToPdf(file) {
  const soffice = await findLibreOffice();
  if (!soffice) {
    throw new Error(
      'Turning a Word file into a PDF needs LibreOffice, which is free from libreoffice.org. ' +
        'Install it, or save your résumé as a PDF yourself and put that in the folder instead.',
    );
  }
  const work = await mkdtemp(join(tmpdir(), 'portfolio-resume-'));
  try {
    // Its own settings folder, so this works even while LibreOffice is open on the computer.
    const profile = pathToFileURL(join(work, 'profile')).href;
    await run(
      soffice,
      [
        `-env:UserInstallation=${profile}`,
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        work,
        file,
      ],
      180_000,
    );
    const pdf = join(work, `${basename(file, extname(file))}.pdf`);
    if (!existsSync(pdf)) throw new Error('LibreOffice could not convert this file to PDF.');
    return new Uint8Array(await readFile(pdf));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
