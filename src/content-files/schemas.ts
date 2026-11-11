/**
 * The shape of every file in content/. The site and the Content Studio both check
 * against these, so anything one accepts, the other accepts too.
 */
import { z } from 'zod';
import { httpsUrl, month, text } from './fields';

/** content/education.yaml: degrees. */
export const degreeSchema = z
  .strictObject({
    degree: text,
    school: text,
    start: month,
    /** Leave out while still studying; the site then shows "Present". */
    end: month.optional(),
    coursework: z.array(text).optional(),
  })
  .refine((entry) => !entry.end || entry.end >= entry.start, {
    message: 'end must not be before start',
    path: ['end'],
  });
export const educationFile = z.array(degreeSchema).min(1);

/** content/certifications.yaml: a list of certificates. */
export const certificationSchema = z.strictObject({
  name: text,
  issuer: text,
  date: month.optional(),
  url: httpsUrl.optional(),
});
export const certificationsFile = z.array(certificationSchema).min(1);
