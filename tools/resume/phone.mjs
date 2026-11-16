/**
 * What counts as a phone number, for the résumé pipeline. Used to tidy Word files, to find
 * what to remove from PDFs, and for the final check, so the definition exists exactly once.
 *
 * It errs towards catching too much. A false alarm costs a removed number that wasn't a phone
 * (the status lists everything removed, masked); a miss would publish a phone number.
 */

const PHONE_SOURCE = [
  // International, written with a +: +1 (555) 123-4567, +44 20 7946 0958, +91 98765 43210
  String.raw`\+\d{1,3}(?:[\s.-]?\(?\d{1,5}\)?){2,5}`,
  // North American: (555) 123-4567, 555.123.4567, 555 123 4567
  String.raw`(?<!\d)\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}(?!\d)`,
  // Five and five, common for mobile numbers in India: 98765 43210
  String.raw`(?<!\d)\d{5}[\s-]\d{5}(?!\d)`,
  // A long run of digits: 5551234567
  String.raw`(?<!\d)\d{10,13}(?!\d)`,
].join('|');

/** A fresh global regex each time, so callers never share `lastIndex`. */
export const phonePattern = () => new RegExp(PHONE_SOURCE, 'g');

/** Every phone-like number in some text, in order. Line breaks count as spaces. */
export const findPhones = (text) =>
  [...text.replace(/\s+/g, ' ').matchAll(phonePattern())].map(([match]) => match.trim());

/** "•••-•••-4567": enough for the owner to recognise it, without repeating the number. */
export const mask = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return `•••-•••-${digits.slice(-4)}`;
};

// A phone number between separators, as in: email | phone | linkedin
const SEPARATORS = String.raw`[|•·]`;
const BETWEEN_SEPARATORS = new RegExp(
  String.raw`\s*${SEPARATORS}\s*(?:${PHONE_SOURCE})\s*(?=${SEPARATORS})`,
  'g',
);
// A labelled one, as in: Phone: 555 123 4567
const LABELLED = new RegExp(
  String.raw`(?:phone|tel|mobile|cell)\.?\s*(?:no\.?|number)?\s*[:.]?\s*(?:${PHONE_SOURCE})\s*${SEPARATORS}?\s*`,
  'gi',
);

/**
 * The same text without its phone numbers, tidying the separators and labels around them, so
 * "a@b.dev | 555 123 4567 | github" becomes "a@b.dev | github".
 */
export const withoutPhones = (text) =>
  text
    .replace(BETWEEN_SEPARATORS, ' ')
    .replace(LABELLED, '')
    .replace(phonePattern(), '')
    .replace(/[ \t]{2,}/g, ' ');
