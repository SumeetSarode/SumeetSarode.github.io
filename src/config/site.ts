/**
 * Profile truth for the whole site. The words live in content/profile.yaml; this file loads
 * and checks them, and adds the one thing that isn't content: where the résumé PDF goes.
 */
import { loadContent } from '../content-files/load';
import { profileFile } from '../content-files/schemas';

const profile = loadContent('profile.yaml', profileFile);

/** The last part(s) of a profile link, like "in/SumeetSarode", for display. */
const handle = (url: string, parts: number): string =>
  new URL(url).pathname.split('/').filter(Boolean).slice(-parts).join('/');

export const site = {
  ...profile,
  links: { github: profile.github, linkedin: profile.linkedin },
  /** "Principal Data Scientist" from "Principal Data Scientist · Agentic AI Architect". */
  jobTitle: profile.title.split('\u00b7')[0]!.trim(),
  resumePath: '/resume/sumeet-sarode-resume.pdf',
  handles: {
    github: profile.github && handle(profile.github, 1),
    linkedin: profile.linkedin && handle(profile.linkedin, 2),
  },
};
