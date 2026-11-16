/**
 * Compares LinkedIn's export with what's already in content/, and works out what could be
 * ADDED. It never proposes changing or removing something you already wrote: your files hold
 * hand-checked wording. Differences are reported as notes for you to act on.
 *
 * Pure functions (no files, no network), so every rule below is tested with plain data.
 */
import { toDay, toMonth, yearOf } from './dates.mjs';

/** One line of tidy text: no control characters, no line breaks, no doubled spaces. */
const tidy = (text) =>
  (text ?? '')
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalise = (text) =>
  tidy(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "Walmart" and "Walmart Inc.", or "Indiana University" and "Indiana University, Bloomington". */
export function sameName(first, second) {
  const a = normalise(first);
  const b = normalise(second);
  if (!a || !b) return false;
  return a === b || (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)));
}

/** The lines of a LinkedIn description, without their bullet characters. */
export function bulletsFrom(description) {
  return (description ?? '')
    .split(/\r?\n/)
    .map((line) => tidy(line.replace(/^\s*[•·▪◦‣*–—-]+\s*/, '')))
    .filter(Boolean);
}

/** A one-line version of a bullet: its first sentence, or a cut at a word if that is long. */
export function summaryFrom(bullet) {
  const sentence = bullet.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? bullet;
  if (sentence.length <= 150) return sentence;
  const cut = sentence.slice(0, 147).replace(/\s+\S*$/, '');
  return `${cut}…`;
}

const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2019-08" as "Aug 2019", the way people read it. */
const monthText = (month) =>
  month ? `${NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}` : 'no date';
const period = (start, end) => `${monthText(start)} to ${end ? monthText(end) : 'Present'}`;

function educationChanges(records, current, out) {
  for (const record of records) {
    const school = tidy(record.school);
    if (!school) continue;
    const degree = tidy(record.degree);
    const start = toMonth(record.start);
    const end = toMonth(record.end);
    const existing = current.education.find((entry) => sameName(entry.school, school));
    if (existing) {
      out.already.push(`${existing.degree} at ${existing.school}`);
      const theirYear = yearOf(record.start);
      if (theirYear && existing.start && !existing.start.startsWith(theirYear)) {
        out.notes.push(
          `${school}: LinkedIn says you started in ${theirYear}, your site says ${existing.start}. Not changed.`,
        );
      }
      continue;
    }
    if (!degree || !start || (end && end < start)) {
      out.notes.push(
        `${school} is on LinkedIn but not on your site. It was left out because ` +
          (!degree
            ? 'LinkedIn has no degree name for it'
            : !start
              ? 'LinkedIn gives only a year, and the site needs a month'
              : 'its end date is before its start date') +
          '. Add it by hand if you want it.',
      );
      continue;
    }
    out.changes.push({
      id: `education|${normalise(school)}|${start}`,
      kind: 'education',
      heading: `${degree}, ${school}`,
      details: [period(start, end)],
      entry: { degree, school, start, ...(end ? { end } : {}) },
    });
  }
}

function certificationChanges(records, current, out) {
  for (const record of records) {
    const name = tidy(record.name);
    if (!name) continue;
    const issuer = tidy(record.issuer);
    const date = toMonth(record.start);
    const existing = current.certifications.find(
      (entry) =>
        sameName(entry.name, name) ||
        (date && entry.date === date && issuer && sameName(entry.issuer, issuer)),
    );
    if (existing) {
      out.already.push(`${existing.name} (${existing.issuer})`);
      continue;
    }
    if (!issuer) {
      out.notes.push(`${name}: LinkedIn has no issuer, and the site needs one. Add it by hand.`);
      continue;
    }
    out.changes.push({
      id: `certification|${normalise(name)}|${normalise(issuer)}`,
      kind: 'certification',
      heading: name,
      details: [
        `${issuer}, ${monthText(date)}`,
        'No link is added: only add one after checking it.',
      ],
      entry: { name, issuer, ...(date ? { date } : {}) },
    });
  }
}

function roleChanges(records, current, out) {
  for (const record of records) {
    const company = tidy(record.company);
    const title = tidy(record.title);
    if (!company || !title) continue;
    const start = toMonth(record.start);
    const end = toMonth(record.end);
    const employer = current.experience.employers.find((item) => sameName(item.name, company));
    const known = (role) => (start && role.start === start) || sameName(role.title, title);
    const exists =
      employer?.roles.some(known) ||
      current.experience.earlierRoles.some(
        (role) => sameName(role.organization, company) && known(role),
      );
    if (exists) {
      out.already.push(`${title} at ${company}`);
      continue;
    }
    const bullets = bulletsFrom(record.description);
    const problem = !start
      ? 'LinkedIn has no start month for it'
      : end && end < start
        ? 'its end date is before its start date'
        : bullets.length === 0
          ? 'LinkedIn has no description to use as bullet points, and the site needs at least one'
          : undefined;
    if (problem) {
      out.notes.push(
        `${title} at ${company} is on LinkedIn but not on your site. It was left out because ${problem}.`,
      );
      continue;
    }
    out.changes.push({
      id: `role|${normalise(company)}|${normalise(title)}|${start}`,
      kind: 'role',
      heading: `${title}, ${company}`,
      details: [
        period(start, end),
        `${bullets.length} bullet point${bullets.length === 1 ? '' : 's'} from your LinkedIn description`,
        'The home-page summary line is made from the first bullet. Edit it afterwards.',
      ],
      entry: {
        company,
        role: { title, start, ...(end ? { end } : {}), summary: summaryFrom(bullets[0]), bullets },
      },
    });
  }
}

function otherNotes(data, current, out) {
  const headline = tidy(data['Profile.csv']?.[0]?.headline);
  if (headline && current.profile.title && !sameName(headline, current.profile.title)) {
    out.notes.push(
      `Your LinkedIn headline is “${headline}”. Your site's title is “${current.profile.title}”. Not changed.`,
    );
  }
  for (const record of data['Publications.csv'] ?? []) {
    const title = tidy(record.title);
    if (!title || current.research.some((paper) => sameName(paper.title, title))) continue;
    const day = toDay(record.date);
    out.notes.push(
      `“${title}”${day ? ` (${day})` : ''} is on LinkedIn but not on your Research page. ` +
        'Papers need a summary, context, approach and scope written by you, so add it by hand.',
    );
  }
}

/**
 * @param {{ data: Record<string, Record<string, string>[]> }} linkedin  from readExport()
 * @param {{ education: any[], certifications: any[], research: any[], profile: any,
 *   experience: { employers: any[], earlierRoles: any[] } }} current  what's in content/ now
 */
export function propose(linkedin, current) {
  const out = { changes: [], already: [], notes: [] };
  const { data } = linkedin;
  educationChanges(data['Education.csv'] ?? [], current, out);
  certificationChanges(data['Certifications.csv'] ?? [], current, out);
  roleChanges(data['Positions.csv'] ?? [], current, out);
  otherNotes(data, current, out);
  const seen = new Set();
  out.changes = out.changes.filter((change) => !seen.has(change.id) && seen.add(change.id));
  out.already = [...new Set(out.already)];
  return out;
}
