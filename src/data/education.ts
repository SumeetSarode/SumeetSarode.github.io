/**
 * Degrees and certifications.
 *
 * Degrees use the résumé wording (the B.E. field is "Computer Science Engineering" there;
 * LinkedIn says "Computer Engineering").
 * Certifications live in content/certifications.yaml.
 */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import { certificationsFile, type certificationSchema } from '../content-files/schemas';
import { newestFirst } from '../lib/months';

export interface Degree {
  school: string;
  degree: string;
  dates: string;
  /** Optional highlights, from LinkedIn. */
  coursework?: readonly string[];
}

export type Certification = z.output<typeof certificationSchema>;

export const degrees: readonly Degree[] = [
  {
    school: 'Indiana University, Bloomington',
    degree: 'M.S. in Data Science',
    dates: 'Aug 2019 \u2013 May 2021',
    coursework: [
      'Artificial Intelligence',
      'Applied Machine Learning',
      'Deep Learning',
      'Statistics',
      'Advanced Database Concepts',
    ],
  },
  {
    school: 'University of Mumbai, India',
    degree: 'B.E. in Computer Science Engineering',
    dates: 'Jul 2015 \u2013 May 2019',
  },
];

/** Newest first; undated ones last. */
export const certifications: readonly Certification[] = newestFirst(
  loadContent('certifications.yaml', certificationsFile),
  (cert) => cert.date,
);
