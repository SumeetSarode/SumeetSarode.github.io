/**
 * The site's sections, in reading order, and which of them have anything to show.
 *
 * A section with nothing in it disappears everywhere at once: its page isn't built, and it
 * leaves the menu, the footer, and the home page. Contact always stays. Everything that
 * lists, numbers, or links to sections reads this one list.
 */
import { existsSync, readdirSync } from 'node:fs';
import { PROJECTS_DIR } from '../content-files/load';
import { certifications, degrees } from '../data/education';
import { employers } from '../data/experience';
import { moreProjects } from '../data/more-projects';
import { publications } from '../data/publications';
import { skillLayers } from '../data/skills';

/** Case studies are read by Astro's collection; this only asks whether any exist. */
const hasCaseStudies =
  existsSync(PROJECTS_DIR) && readdirSync(PROJECTS_DIR).some((file) => file.endsWith('.yaml'));

const everySection = [
  {
    key: 'experience',
    href: '/experience/',
    label: 'Experience',
    on: employers.length > 0 || skillLayers.length > 0,
  },
  {
    key: 'projects',
    href: '/projects/',
    label: 'Projects',
    on: hasCaseStudies || moreProjects.length > 0,
  },
  { key: 'research', href: '/research/', label: 'Research', on: publications.length > 0 },
  {
    key: 'education',
    href: '/education/',
    label: 'Education',
    on: degrees.length > 0 || certifications.length > 0,
  },
  { key: 'contact', href: '/contact/', label: 'Contact', on: true },
] as const;

export type SectionKey = (typeof everySection)[number]['key'];
export interface Section {
  key: SectionKey;
  href: string;
  label: string;
}

/** Only the sections with something to show, in reading order. */
export const sections: readonly Section[] = everySection
  .filter((section) => section.on)
  .map(({ key, href, label }) => ({ key, href, label }));

const position = (key: SectionKey): number => sections.findIndex((section) => section.key === key);

export const isOn = (key: SectionKey): boolean => position(key) !== -1;

/** "03" for the third section that's on, so the numbering never has gaps. */
export const sectionNumber = (key: SectionKey): string =>
  String(position(key) + 1).padStart(2, '0');

/** The section after this one, for "Next:" links. Undefined for the last one. */
export const nextSection = (key: SectionKey): Section | undefined => sections[position(key) + 1];

/**
 * For a section's page: build it (at its usual address) only when the section is on.
 * Used as `getStaticPaths` in the `[...index].astro` pages.
 */
export const pageIfOn = (key: SectionKey) => () =>
  isOn(key) ? [{ params: { index: undefined } }] : [];
