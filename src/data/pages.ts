/**
 * The words at the top of each page. They live in content/pages.yaml; anything left out there
 * falls back to the plain wording below, so a brand-new site reads sensibly from day one.
 */
import { loadContent } from '../content-files/load';
import { pagesFile } from '../content-files/schemas';
import { site } from '../config/site';

const file = loadContent('pages.yaml', pagesFile);
const { name } = site;

const defaults = {
  experience: {
    title: 'Experience',
    lead: 'Where I have worked and what I built there.',
    metaDescription: `${name}'s work experience.`,
    careerHeadline: 'The career so far',
  },
  projects: {
    title: 'Projects',
    lead: 'Personal projects, each explained as a case study.',
    metaDescription: `Personal projects by ${name}.`,
  },
  research: {
    title: 'Research',
    lead: 'Published work. Open a publication to read more.',
    metaDescription: `{publications} by ${name}.`,
  },
  education: {
    title: 'Education and certifications',
    lead: 'Degrees and certifications.',
    metaDescription: `${name}'s education and certifications.`,
  },
  contact: {
    title: 'Get in touch',
    lead: 'The best ways to reach me.',
    metaDescription: `How to get in touch with ${name}.`,
  },
};

/** Keep the defaults for any field the file leaves out. */
const withDefaults = <D extends object>(
  base: D,
  given: Partial<Record<keyof D, string | undefined>>,
) =>
  ({
    ...base,
    ...Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)),
  }) as D;

export const pages = {
  experience: withDefaults(defaults.experience, file.experience),
  projects: withDefaults(defaults.projects, file.projects),
  research: withDefaults(defaults.research, file.research),
  education: withDefaults(defaults.education, file.education),
  contact: withDefaults(defaults.contact, file.contact),
};

export const tiles = {
  experience: file.tiles.experience ?? 'My work history and the impact of each role.',
  projects: file.tiles.projects ?? 'Personal projects, explained as case studies.',
  research: file.tiles.research ?? 'Published research.',
  education: file.tiles.education ?? 'Degrees and certifications.',
  contact: file.tiles.contact ?? 'The best ways to reach me.',
};

export const closing = {
  before: file.closing.before ?? 'Want to work together',
  highlight: file.closing.highlight ?? 'today?',
  lead: file.closing.lead ?? 'I am glad to hear from you.',
};

/** "Experience | Jane Doe", the text in the browser tab. */
export const tabTitle = (page: string): string => `${page} | ${name}`;
