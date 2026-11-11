import { publications } from '../../src/data/publications';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectsDir = fileURLToPath(new URL('../../src/content/projects/', import.meta.url));

/** One slug per case study file, so a new case study is tested automatically. */
export const projectSlugs = readdirSync(projectsDir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.replace(/\.md$/, ''));

export const projectPaths = projectSlugs.map((slug) => `/projects/${slug}/`);

/** Every real page of the site. */
export const researchPaths = publications.map((paper) => `/research/${paper.slug}/`);
export const allPaths = [
  '/',
  '/experience/',
  '/projects/',
  '/research/',
  '/contact/',
  ...projectPaths,
  ...researchPaths,
];

export const themes = ['light', 'dark'] as const;
export type ThemeName = (typeof themes)[number];
