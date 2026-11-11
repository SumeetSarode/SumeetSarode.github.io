/** Field rules shared by every content file, so "a link" or "a month" means the same everywhere. */
import { z } from 'zod';
import { emblemTones } from '../lib/emblem';
import { iconNames } from '../lib/icon-names';

export const text = z.string().trim().min(1, 'cannot be empty');

export const httpsUrl = z.url({
  protocol: /^https$/,
  error: 'must be a full link that starts with https://',
});

/** A month as YYYY-MM (2020-06). Shown on the site as "Jun 2020". */
export const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be a month written like 2020-06');

/** A day as YYYY-MM-DD (2019-08-17). */
export const day = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'must be a date written like 2019-08-17');

/** The end of a page address: lowercase words joined by hyphens. */
export const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lowercase words joined by hyphens, like smart-irrigation',
  );

export const icon = z.enum(iconNames);

/** A picture made of a big symbol, a small badge, and a colour. See src/lib/emblem.ts. */
export const emblem = z.strictObject({ main: icon, badge: icon, tone: z.enum(emblemTones) });

/** For lists whose entries become pages: two entries with the same slug would collide. */
export const uniqueSlugs = (
  entries: readonly { slug: string }[],
  context: z.RefinementCtx,
): void => {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (seen.has(entry.slug)) {
      context.addIssue({
        code: 'custom',
        message: `"${entry.slug}" is already used by another entry; each needs its own`,
        path: [index, 'slug'],
      });
    }
    seen.add(entry.slug);
  });
};
