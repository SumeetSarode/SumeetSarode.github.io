import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../../src/lib/contrast';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

/** Pulls `--name: #hex;` pairs out of the block that follows `selector`. */
function readTheme(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Selector not found: ${selector}`);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) {
    if (name && value) tokens[name] = value;
  }
  return tokens;
}

const themes = {
  light: readTheme(":root[data-theme='light']"),
  dark: readTheme(":root[data-theme='dark']"),
};

describe('WCAG 2.2 AA colour contrast', () => {
  for (const [themeName, t] of Object.entries(themes)) {
    describe(`${themeName} theme`, () => {
      const textPairs: [string, string, string][] = [
        ['text', 'bg', 'body text'],
        ['text', 'surface', 'body text on cards'],
        ['text-muted', 'bg', 'muted text'],
        ['text-muted', 'surface', 'muted text on cards'],
        ['accent', 'bg', 'links'],
        ['accent', 'surface', 'links on cards'],
        ['accent-contrast', 'accent', 'text on accent buttons'],
      ];
      for (const [fg, bg, label] of textPairs) {
        it(`${label} (${fg} on ${bg}) is at least 4.5:1`, () => {
          const ratio = contrastRatio(t[fg]!, t[bg]!);
          expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        });
      }

      it('focus ring is at least 3:1 against the page and cards', () => {
        expect(contrastRatio(t['focus-ring']!, t['bg']!)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(t['focus-ring']!, t['surface']!)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  describe('ink bands (always dark, in both themes)', () => {
    const ink = readTheme(':root {');
    const pairs: [string, string][] = [
      ['ink-text', 'ink'],
      ['ink-text', 'ink-raised'],
      ['ink-muted', 'ink'],
      ['ink-muted', 'ink-raised'],
      ['ink-accent', 'ink'],
      ['ink-accent', 'ink-raised'],
    ];
    for (const [fg, bg] of pairs) {
      it(`${fg} on ${bg} is at least 4.5:1`, () => {
        const ratio = contrastRatio(ink[fg]!, ink[bg]!);
        expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  it('prints the ratios so they can be recorded in a commit message', () => {
    const rows = Object.entries(themes).map(([name, t]) => {
      const r = (a: string, b: string) => contrastRatio(t[a]!, t[b]!).toFixed(2);
      return `${name}: text/bg ${r('text', 'bg')}, muted/bg ${r('text-muted', 'bg')}, accent/bg ${r('accent', 'bg')}`;
    });
    expect(rows).toHaveLength(2);
    console.log(rows.join('\n'));
  });
});
