import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { iconNames } from './lib/icon-names';
import { emblemTones } from './lib/emblem';

const text = z.string().min(1);
/** Text may use **bold** and `code`; nothing else is interpreted (see src/lib/inline.ts). */
const rich = text;
const icon = z.enum(iconNames);

/** One box in the "how it works" flow. An item is a plain label, or a chain: a, then b, then c. */
const flowStep = z.strictObject({
  icon,
  title: text,
  items: z
    .array(z.union([text, z.strictObject({ label: text.optional(), chain: z.array(text).min(2) })]))
    .min(1),
});

/** One of the three things worth knowing about how the project is built. */
const highlight = z.strictObject({
  icon,
  /** A punchy name, not "Decision 1". */
  title: text,
  /** One bold line that says it all. */
  summary: rich,
  /** Optional short list (for example, the four checks). */
  points: z.array(z.strictObject({ label: text, text: rich })).optional(),
  paragraphs: z.array(rich).min(1),
});

/**
 * Case studies. The schema is strict on purpose: a case study that is missing
 * a required piece (like the date its facts were last checked) fails the build
 * instead of shipping half-finished.
 */
const projects = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/projects' }),
  schema: z.strictObject({
    title: text,
    /** One-line angle shown under the title. */
    tagline: text,
    /** Text for the card on the Projects page. Keep to one or two sentences. */
    summary: text.max(220),
    /** <meta name="description">; search engines cut off around 155 characters. */
    metaDescription: text.max(155),
    /** Lower numbers appear first. */
    order: z.number().int().positive(),
    repoUrl: z.url(),
    status: text,
    tags: z.array(text).min(1).max(10),
    /** The date every fact on the page was last compared with the repo. */
    checkedOn: z.coerce.date(),
    /** Shown prominently, e.g. "Educational project, not financial advice." */
    disclaimer: text.optional(),
    /** Credit for third-party models and datasets. */
    attribution: text.optional(),
    /** The project's picture: a big symbol for what it is, a small badge for what makes it special. */
    emblem: z.strictObject({
      main: icon,
      badge: icon,
      tone: z.enum(emblemTones),
    }),
    challenge: z.strictObject({
      /** The problem in one sentence; shown large. */
      statement: rich,
      paragraphs: z.array(rich).min(1),
    }),
    how: z.strictObject({
      intro: z.array(rich).default([]),
      /** Heading for the optional list below, such as "What it does". */
      listTitle: text.optional(),
      list: z.array(z.strictObject({ label: text.optional(), text: rich })).optional(),
      flow: z.strictObject({
        caption: text,
        steps: z.array(flowStep).min(3).max(6),
      }),
    }),
    highlights: z.array(highlight).length(3),
    /** The honest limits: what the project is not, and which numbers it does not claim. */
    limits: z.array(rich).min(1),
  }),
});

export const collections = { projects };
