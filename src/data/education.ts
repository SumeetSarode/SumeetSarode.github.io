/**
 * Degrees and certifications. The content lives in content/education.yaml and
 * content/certifications.yaml; this file loads, checks, and sorts it.
 */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import {
  certificationsFile,
  educationFile,
  type certificationSchema,
  type degreeSchema,
} from '../content-files/schemas';
import { newestFirst } from '../lib/months';

export type Degree = z.output<typeof degreeSchema>;
export type Certification = z.output<typeof certificationSchema>;

/** Most recent first. */
export const degrees: readonly Degree[] = newestFirst(
  loadContent('education.yaml', educationFile),
  (degree) => degree.start,
);

/** Newest first; undated ones last. */
export const certifications: readonly Certification[] = newestFirst(
  loadContent('certifications.yaml', certificationsFile),
  (cert) => cert.date,
);
