/**
 * Content files are plain text, so this gives them the two bits of formatting they need:
 * **bold** and `code`. Nothing else is interpreted, and the result is rendered as real
 * elements by Rich.astro (never as raw HTML), so content can't inject markup.
 */
export type InlinePart = { kind: 'text' | 'bold' | 'code'; text: string };

const PATTERN = /\*\*(.+?)\*\*|`(.+?)`/g;

export function parseInline(source: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let cursor = 0;
  for (const match of source.matchAll(PATTERN)) {
    if (match.index > cursor) parts.push({ kind: 'text', text: source.slice(cursor, match.index) });
    parts.push(
      match[1] !== undefined
        ? { kind: 'bold', text: match[1] }
        : { kind: 'code', text: match[2] ?? '' },
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) parts.push({ kind: 'text', text: source.slice(cursor) });
  return parts;
}
