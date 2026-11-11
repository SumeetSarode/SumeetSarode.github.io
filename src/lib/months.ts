/**
 * Months are stored as YYYY-MM. Formatting uses fixed names instead of Date, so a
 * machine's time zone can never shift "2020-06" into May.
 */
const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2020-06" → "Jun 2020". */
export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  return `${NAMES[Number(month) - 1]} ${year}`;
}

/** "2019-08", "2021-05" → "Aug 2019 – May 2021". No end month means it is still going. */
export function formatRange(start: string, end?: string): string {
  return `${formatMonth(start)} \u2013 ${end ? formatMonth(end) : 'Present'}`;
}

/**
 * Newest first; entries without a month go last. The sort is stable, so entries from
 * the same month keep the order they have in the file.
 */
export function newestFirst<T>(items: readonly T[], monthOf: (item: T) => string | undefined): T[] {
  return [...items].sort((a, b) => (monthOf(b) ?? '').localeCompare(monthOf(a) ?? ''));
}
