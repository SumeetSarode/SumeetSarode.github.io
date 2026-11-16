/**
 * Turns the build's raw output into something a person can act on. Pure text in, text out,
 * so it's easy to test with real samples.
 */

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/g;
/** Lines that are progress or Node's own chatter, never the problem itself. */
const NOISE = [
  /^\d\d:\d\d:\d\d /,
  /^\(node:\d+\)/,
  /^\(Use `node/,
  /^\s*generating static routes\s*$/,
];
/** Where Astro's technical details start: everything from here on is for developers. */
const DETAILS = /^\s*(Location:|Stack trace:|Hint:|Error reference:)/;

const clean = (output) =>
  output
    .replace(ANSI, '')
    .split(/\r?\n/)
    .filter((line) => !NOISE.some((pattern) => pattern.test(line)));

/** Astro's wording for a case study that breaks the rules, rewritten like the other files'. */
function caseStudyProblem(lines) {
  const start = lines.findIndex((line) => /data does not match collection schema/.test(line));
  if (start === -1) return undefined;
  const slug = lines[start].match(/projects → (\S+) data/)?.[1] ?? 'a case study';
  const problems = [];
  for (const line of lines.slice(start + 1)) {
    if (DETAILS.test(line)) break;
    if (!line.trim()) continue;
    // "  title**: **title: Expected type `"string"`, received `"object"`"
    const text = line
      .trim()
      .replace(/^[\w.[\]]+\*\*:\s*\*\*/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '');
    problems.push(`  - ${text}`);
  }
  return [`content/projects/${slug}.yaml needs fixing:`, ...problems].join('\n');
}

/**
 * The part of a failed build's output that explains the problem.
 * @param {string} output  everything the build printed
 */
export function explainBuildFailure(output) {
  const lines = clean(output);
  const caseStudy = caseStudyProblem(lines);
  if (caseStudy) return caseStudy;

  // The site's own content checks name the file first: "content/x.yaml needs fixing:" etc.
  const start = lines.findIndex((line) =>
    /^content\/\S+ (needs fixing|is not valid YAML|is missing)/.test(line),
  );
  if (start !== -1) {
    const end = lines.findIndex((line, index) => index > start && DETAILS.test(line));
    return lines
      .slice(start, end === -1 ? undefined : end)
      .join('\n')
      .trim();
  }

  // Anything else: the last few meaningful lines, minus stack traces.
  const meaningful = lines.filter(
    (line) => line.trim() && !/^\s+at /.test(line) && !DETAILS.test(line),
  );
  return meaningful.slice(-8).join('\n').trim() || 'The build failed without saying why.';
}

/**
 * The publish check's findings (scripts/check-dist.mjs prints them as "  - problem").
 * @param {string} output
 * @returns {string[]}
 */
export function publishCheckProblems(output) {
  return clean(output)
    .filter((line) => /^\s+- /.test(line))
    .map((line) => line.replace(/^\s+- /, '').trim());
}
