/**
 * The shape of every file in content/. The site and the Content Studio both check
 * against these, so anything one accepts, the other accepts too.
 */
import { z } from 'zod';
import {
  day,
  emblem,
  endNotBeforeStart,
  httpsUrl,
  month,
  period,
  slug,
  text,
  uniqueSlugs,
} from './fields';

/** content/education.yaml: degrees. */
export const degreeSchema = z
  .strictObject({
    degree: text,
    school: text,
    ...period,
    coursework: z.array(text).optional(),
  })
  .refine(...endNotBeforeStart);
export const educationFile = z.array(degreeSchema).min(1);

/** content/certifications.yaml: a list of certificates. */
export const certificationSchema = z.strictObject({
  name: text,
  issuer: text,
  date: month.optional(),
  url: httpsUrl.optional(),
});
export const certificationsFile = z.array(certificationSchema).min(1);

/** content/research.yaml: research papers. Each one gets its own page. */
export const publicationSchema = z.strictObject({
  title: text,
  slug,
  venue: text,
  date: day,
  topic: text,
  emblem,
  summary: text,
  context: text,
  approach: text,
  scope: text,
  detail: text.optional(),
  issue: text.optional(),
  doi: text.optional(),
  url: httpsUrl.optional(),
  codeUrl: httpsUrl.optional(),
  coAuthors: z.array(text).optional(),
  sources: z.array(z.strictObject({ label: text, url: httpsUrl })).optional(),
});
export const researchFile = z.array(publicationSchema).min(1).superRefine(uniqueSlugs);

/** content/experience.yaml: jobs, earlier roles, and the headline impact numbers. */
const bullets = z.array(text).min(1);
export const roleSchema = z
  .strictObject({
    title: text,
    ...period,
    /** One line for the home page's career path. */
    summary: text,
    bullets,
  })
  .refine(...endNotBeforeStart);
export const earlierRoleSchema = z
  .strictObject({ title: text, organization: text, ...period, bullets })
  .refine(...endNotBeforeStart);
export const impactSchema = z.strictObject({
  /** Shown large, like ~$100M. */
  value: text,
  label: text,
  /** Which résumé bullet the number comes from. Not shown; it keeps the numbers honest. */
  source: text,
});
export const experienceFile = z.strictObject({
  employers: z.array(z.strictObject({ name: text, roles: z.array(roleSchema).min(1) })).min(1),
  earlierRoles: z.array(earlierRoleSchema).default([]),
  impact: z.array(impactSchema).max(4).default([]),
});
