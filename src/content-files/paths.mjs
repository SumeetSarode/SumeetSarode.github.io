/**
 * Where things live. Plain JavaScript on purpose: the site (TypeScript) and the local tools
 * (plain Node, like the Portfolio Preview app) both import this, so the rules exist once.
 * Paths start from the site folder, where npm scripts and the launchers run.
 */
import { join, resolve } from 'node:path';

const root = process.cwd();

/** content/, or the folder in PORTFOLIO_CONTENT (the tests build practice sites that way). */
export const CONTENT_DIR = resolve(process.env['PORTFOLIO_CONTENT'] ?? join(root, 'content'));

/** Case studies, one file each. */
export const PROJECTS_DIR = join(CONTENT_DIR, 'projects');

/** Where the owner drops their résumé (Word or PDF). Git ignores everything in it but the README. */
export const RESUME_INPUT_DIR = join(CONTENT_DIR, 'resume');

/**
 * Where the owner drops their LinkedIn data download (the .zip). It holds personal data, so git
 * ignores everything in it but the README, and the site never reads it.
 */
export const LINKEDIN_INPUT_DIR = join(CONTENT_DIR, 'linkedin');

/** The cleaned, phone-free PDF the site offers for download, and its address on the site. */
export const RESUME_URL = '/resume/resume.pdf';
export const RESUME_OUTPUT = join(root, 'public', 'resume', 'resume.pdf');
