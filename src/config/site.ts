/**
 * Profile truth for the whole site. The words live in content/profile.yaml; this file loads
 * and checks them, and adds what isn't content: where the résumé PDF lives and whether it's there.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent } from '../content-files/load';
import { profileFile } from '../content-files/schemas';

const profile = loadContent('profile.yaml', profileFile);

/** The last part(s) of a profile link, like "in/SumeetSarode", for display. */
const handle = (url: string, parts: number): string =>
  new URL(url).pathname.split('/').filter(Boolean).slice(-parts).join('/');

/** "sumeet-sarode" from "Sumeet Sarode", for the downloaded résumé's file name. */
const fileSlug = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');

/** "SS" from "Sumeet Sarode": the first letters of the first and last names. */
const initials = (name: string): string => {
  const words = name.split(/\s+/).filter(Boolean);
  const first = (word = '') => Array.from(word)[0] ?? '';
  return (first(words[0]) + (words.length > 1 ? first(words.at(-1)) : '')).toUpperCase();
};

/** The Portfolio Preview app (and `npm run resume`) writes the cleaned résumé here. */
export const RESUME_PATH = '/resume/resume.pdf';

export const site = {
  ...profile,
  /** Shown in the header badge and the browser-tab icon. */
  initials: initials(profile.name),
  metaDescription: profile.metaDescription ?? `The portfolio of ${profile.name}.`,
  /** "Sumeet Sarode — Principal Data Scientist · Agentic AI Architect": the share card's text. */
  cardTitle: [profile.name, profile.title].filter(Boolean).join(' \u2014 '),
  links: { github: profile.github, linkedin: profile.linkedin },
  /** "Principal Data Scientist" from "Principal Data Scientist · Agentic AI Architect". */
  jobTitle: profile.title?.split('\u00b7')[0]?.trim(),
  /** "Principal Data Scientist & Agentic AI Architect", for the home page's browser tab. */
  titleInWords: profile.title?.replaceAll(' \u00b7 ', ' & '),
  resume: existsSync(join(process.cwd(), 'public', RESUME_PATH))
    ? { href: RESUME_PATH, fileName: `${fileSlug(profile.name)}-resume.pdf` }
    : undefined,
  handles: {
    github: profile.github && handle(profile.github, 1),
    linkedin: profile.linkedin && handle(profile.linkedin, 2),
  },
};
