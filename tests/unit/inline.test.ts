import { describe, expect, it } from 'vitest';
import { parseInline } from '../../src/lib/inline';

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('Just words.')).toEqual([{ kind: 'text', text: 'Just words.' }]);
  });

  it('finds bold and code between text', () => {
    expect(parseInline('Use **pure functions** and `--index NIFTY50` today.')).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'bold', text: 'pure functions' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: '--index NIFTY50' },
      { kind: 'text', text: ' today.' },
    ]);
  });

  it('keeps leftover markers as text, and never treats markup as HTML', () => {
    expect(parseInline('2 * 3 and <b>x</b>')).toEqual([
      { kind: 'text', text: '2 * 3 and <b>x</b>' },
    ]);
  });

  it('handles adjacent formatting and empty input', () => {
    expect(parseInline('**a**`b`')).toEqual([
      { kind: 'bold', text: 'a' },
      { kind: 'code', text: 'b' },
    ]);
    expect(parseInline('')).toEqual([]);
  });
});
