/**
 * Work history. The content lives in content/experience.yaml; this file loads,
 * checks, and sorts it.
 */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import {
  experienceFile,
  type earlierRoleSchema,
  type impactSchema,
  type roleSchema,
} from '../content-files/schemas';
import { newestFirst } from '../lib/months';

export type Role = z.output<typeof roleSchema>;
export type EarlierRole = z.output<typeof earlierRoleSchema>;
export type Impact = z.output<typeof impactSchema>;
export interface Employer {
  name: string;
  roles: readonly Role[];
}

const file = loadContent('experience.yaml', experienceFile);

/** Each employer's roles newest first; employers ordered by their most recent role. */
export const employers: readonly Employer[] = newestFirst(
  file.employers.map((employer) => ({
    name: employer.name,
    roles: newestFirst(employer.roles, (role) => role.start),
  })),
  (employer) => employer.roles[0]?.start,
);

export const earlierRoles: readonly EarlierRole[] = newestFirst(
  file.earlierRoles,
  (role) => role.start,
);

/** The headline numbers on the Experience page, each traceable to a résumé line. */
export const impacts: readonly Impact[] = file.impact;
