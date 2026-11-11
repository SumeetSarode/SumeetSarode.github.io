/**
 * Reads one file from the content/ folder, checks it against its schema, and returns typed data.
 *
 * Mistakes stop the build with the file, the line, and the field, in plain words, so whoever
 * edits the content never has to read a stack trace.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LineCounter, parseDocument, type Document } from 'yaml';
import type { z } from 'zod';

/** npm scripts run from the site folder, so content/ sits next to package.json. */
export const CONTENT_DIR = join(process.cwd(), 'content');

export class ContentError extends Error {
  override name = 'ContentError';
}

/** "#4 › date" instead of "[3, 'date']". People count from 1. */
const describePath = (path: readonly PropertyKey[]): string =>
  path.length === 0
    ? 'the file'
    : path.map((key) => (typeof key === 'number' ? `#${key + 1}` : String(key))).join(' › ');

/** The line of the deepest part of `path` that exists (a missing field points at its parent). */
function lineOf(
  doc: Document,
  lines: LineCounter,
  path: readonly PropertyKey[],
): number | undefined {
  const keys = path.filter((key): key is string | number => typeof key !== 'symbol');
  for (let depth = keys.length; depth >= 0; depth--) {
    const node = doc.getIn(keys.slice(0, depth), true) as
      { range?: [number, number, number] } | undefined;
    if (node?.range) return lines.linePos(node.range[0]).line;
  }
  return undefined;
}

/** Zod's wording, translated for people who don't write code. */
function friendly(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    const keys = issue.keys.map((key) => `"${key}"`).join(', ');
    return `unknown field ${keys}; check the spelling against the guide`;
  }
  return /received undefined/.test(issue.message) ? 'is missing' : issue.message;
}

/** Parse and check YAML text. Exported separately so tests need no files on disk. */
export function parseContent<Schema extends z.ZodType>(
  fileName: string,
  text: string,
  schema: Schema,
): z.output<Schema> {
  const lines = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: true });
  if (doc.errors.length > 0) {
    throw new ContentError(`content/${fileName} is not valid YAML: ${doc.errors[0]!.message}`);
  }
  const result = schema.safeParse(doc.toJS());
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const line = lineOf(doc, lines, issue.path);
    return `  - ${line ? `line ${line}, ` : ''}${describePath(issue.path)}: ${friendly(issue)}`;
  });
  throw new ContentError(
    `content/${fileName} needs fixing:\n${problems.join('\n')}\n` +
      'The guide at the top of the file lists every field.',
  );
}

/** Read and check content/<fileName>. */
export function loadContent<Schema extends z.ZodType>(
  fileName: string,
  schema: Schema,
): z.output<Schema> {
  return parseContent(fileName, readFileSync(join(CONTENT_DIR, fileName), 'utf8'), schema);
}
