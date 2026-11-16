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
  icon,
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

/** content/capabilities.yaml: the layered stack on the Experience page. */
export const layerSchema = z.strictObject({
  name: text,
  icon,
  summary: text,
  skills: z.array(text).min(1),
});
export const capabilitiesFile = z.strictObject({
  // The stack's colours are tuned for five layers at most.
  layers: z.array(layerSchema).min(1).max(5),
  foundations: z
    .array(z.strictObject({ name: text, icon, skills: z.array(text).min(1) }))
    .max(2)
    .default([]),
});

/** content/more-projects.yaml: the "Also on GitHub" list. */
export const moreProjectsFile = z
  .array(z.strictObject({ name: text, url: httpsUrl, description: text }))
  .default([]);

/** content/profile.yaml: who you are, and the words on the home page and contact page. */
export const profileFile = z.strictObject({
  name: text,
  /** Role and specialty joined by " · ", like "Principal Data Scientist · Agentic AI Architect". */
  title: text,
  /** The address the site is published at, without a trailing path. */
  url: httpsUrl,
  email: z.email({ error: 'must be an email address like name@example.org' }),
  github: httpsUrl.optional(),
  linkedin: httpsUrl.optional(),
  /** What search engines show under the link; they cut off around 155 characters. */
  metaDescription: text.max(155),
  hero: z.strictObject({
    role: text,
    /** The first line of the headline. */
    setup: text,
    /** The word in the second line that gets the colourful gradient. */
    highlight: text,
    /** The rest of the second line. */
    rest: text,
    intro: text,
  }),
  signature: z.strictObject({
    headline: text,
    highlights: z
      .array(z.strictObject({ title: text, description: text }))
      .min(1)
      .max(3),
  }),
  /** The short line under each contact method. Leave out to use the defaults. */
  contactNotes: z
    .strictObject({ email: text.optional(), linkedin: text.optional(), github: text.optional() })
    .default({}),
});

/** content/pages.yaml: the title and intro line of each page. Everything here is optional. */
const pageText = z.strictObject({
  title: text.optional(),
  lead: text.optional(),
  /** What search engines show under the link; they cut off around 155 characters. */
  metaDescription: text.max(155).optional(),
});
export const pagesFile = z.strictObject({
  experience: pageText.extend({ careerHeadline: text.optional() }).default({}),
  projects: pageText.default({}),
  research: pageText.default({}),
  education: pageText.default({}),
  contact: pageText.default({}),
  /** The one-line description on each home-page tile. */
  tiles: z
    .strictObject({
      experience: text.optional(),
      projects: text.optional(),
      research: text.optional(),
      education: text.optional(),
      contact: text.optional(),
    })
    .default({}),
  /** The "Let's talk" band above the footer. */
  closing: z
    .strictObject({ before: text.optional(), highlight: text.optional(), lead: text.optional() })
    .default({}),
});
