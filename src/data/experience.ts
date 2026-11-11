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

/**
 * The three pillars of the current role, shown as "signature work" on the home page.
 * Each is a shortened, faithful restatement of a Principal Data Scientist bullet above.
 * If those bullets change, change these too.
 */
export interface Highlight {
  title: string;
  description: string;
}

export const signatureHeadline =
  'A multi-agent platform that turns process knowledge into safe, governed action.';

export const highlights: readonly Highlight[] = [
  {
    title: 'Multi-agent platform',
    description:
      'Turns process guides from documents, chats, and forms into governed, prioritized operational actions.',
  },
  {
    title: 'Provider-agnostic LLM architecture',
    description:
      'Model routing, evaluation, guardrails, and human-in-the-loop validation, so unchecked model output never triggers an operational action.',
  },
  {
    title: 'Real-time knowledge-graph agent',
    description:
      'Natural language to Cypher over a Neo4j knowledge graph, connecting live operational signals with process guidance.',
  },
];
