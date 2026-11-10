import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Case studies. The schema is strict on purpose: a case study that is missing
 * a required piece (like the date its facts were last checked) fails the build
 * instead of shipping half-finished.
 */
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.strictObject({
    title: z.string().min(1),
    /** One-line angle shown under the title. */
    tagline: z.string().min(1),
    /** Text for the card on the home page. Keep to one or two sentences. */
    summary: z.string().min(1).max(220),
    /** <meta name="description">; search engines cut off around 155 characters. */
    metaDescription: z.string().min(1).max(155),
    /** Lower numbers appear first. */
    order: z.number().int().positive(),
    repoUrl: z.url(),
    status: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1).max(10),
    /** The date every fact on the page was last compared with the repo. */
    checkedOn: z.coerce.date(),
    /** Shown prominently, e.g. "Educational project, not financial advice." */
    disclaimer: z.string().optional(),
    /** Credit for third-party models and datasets. */
    attribution: z.string().optional(),
    facts: z
      .array(z.strictObject({ value: z.string().min(1), label: z.string().min(1) }))
      .min(2)
      .max(4),
    diagram: z.strictObject({
      caption: z.string().min(1),
      layers: z
        .array(
          z.strictObject({
            name: z.string().min(1),
            items: z.array(z.string().min(1)).min(1),
          }),
        )
        .min(3),
    }),
  }),
});

export const collections = { projects };
