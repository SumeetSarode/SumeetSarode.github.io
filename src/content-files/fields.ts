/** Field rules shared by every content file, so "a link" or "a month" means the same everywhere. */
import { z } from 'zod';

export const text = z.string().trim().min(1, 'cannot be empty');

export const httpsUrl = z.url({
  protocol: /^https$/,
  error: 'must be a full link that starts with https://',
});

/** A month as YYYY-MM (2020-06). Shown on the site as "Jun 2020". */
export const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be a month written like 2020-06');
