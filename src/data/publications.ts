/**
 * Research papers. The content lives in content/research.yaml; this file loads,
 * checks, and sorts it, and formats the bits of text built from it.
 */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import { researchFile, type publicationSchema } from '../content-files/schemas';
import { newestFirst } from '../lib/months';

export type Publication = z.output<typeof publicationSchema>;

/** Newest first, everywhere: the list, the home tile, and next/previous on paper pages. */
export const publications: readonly Publication[] = newestFirst(
  loadContent('research.yaml', researchFile),
  (paper) => paper.date,
);

export const publicationYear = (publication: Publication): string => publication.date.slice(0, 4);

/** The short name in brackets at the end of a venue, e.g. "(IJSR)", or the whole venue. */
export const shortVenue = (publication: Publication): string =>
  publication.venue.match(/\(([^)]+)\)$/)?.[1] ?? publication.venue;

/** The grey line under a title: venue and year, then any detail, then co-authors. */
export const publicationMeta = (publication: Publication): string => {
  const parts = [
    `${publication.venue}, ${publicationYear(publication)}`,
    publication.detail,
    publication.coAuthors && `With ${publication.coAuthors.join(', ')}`,
  ];
  return `${parts.filter(Boolean).join('. ')}.`;
};
