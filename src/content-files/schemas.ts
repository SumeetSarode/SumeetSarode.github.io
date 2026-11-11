/**
 * The shape of every file in content/. The site and the Content Studio both check
 * against these, so anything one accepts, the other accepts too.
 */
import { z } from 'zod';
import { httpsUrl, month, text } from './fields';

/** content/certifications.yaml: a list of certificates. */
export const certificationSchema = z.strictObject({
  name: text,
  issuer: text,
  date: month.optional(),
  url: httpsUrl.optional(),
});
export const certificationsFile = z.array(certificationSchema).min(1);
