/**
 * LinkedIn writes dates in several ways ("Oct 2025", "2019", "08/2019", "2019-08", sometimes
 * a full date). The site wants months like 2019-08.
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (number) => String(number).padStart(2, '0');

/**
 * A month like "2019-08", or undefined if the text isn't a date this can read exactly.
 * A bare year is not guessed into a month: that would be inventing a fact.
 * @param {string | undefined} text
 */
export function toMonth(text) {
  const value = (text ?? '').trim();
  const named = value.match(/^([A-Za-z]{3})[A-Za-z]*\.?,? (\d{4})$/);
  if (named) {
    const month = MONTHS.indexOf(named[1].toLowerCase());
    return month === -1 ? undefined : `${named[2]}-${pad(month + 1)}`;
  }
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (iso) return validMonth(iso[1], iso[2]);
  const slashed = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashed) return validMonth(slashed[2], slashed[1]);
  // 1/2/2019 could be January 2nd or the 1st of February: not guessed.
  return undefined;
}

function validMonth(year, month) {
  const number = Number(month);
  return number >= 1 && number <= 12 ? `${year}-${pad(number)}` : undefined;
}

/** The year in a LinkedIn date of any of those shapes, for matching entries by year. */
export const yearOf = (text) => (text ?? '').match(/\b(\d{4})\b/)?.[1];

/** A full day like "2019-08-17" (for papers), or undefined. */
export function toDay(text) {
  const value = (text ?? '').trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const named = value.match(/^([A-Za-z]{3})[A-Za-z]*\.? (\d{1,2}),? (\d{4})$/);
  if (named) {
    const month = MONTHS.indexOf(named[1].toLowerCase());
    return month === -1 ? undefined : `${named[3]}-${pad(month + 1)}-${pad(Number(named[2]))}`;
  }
  return undefined;
}
