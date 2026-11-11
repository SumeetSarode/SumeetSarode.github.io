import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ContentError, parseContent } from '../../src/content-files/load';
import { certificationsFile } from '../../src/content-files/schemas';
import { formatMonth, newestFirst } from '../../src/lib/months';

const errorFor = (text: string): string => {
  try {
    parseContent('certifications.yaml', text, certificationsFile);
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return (error as Error).message;
  }
  throw new Error('expected the content to be rejected');
};

describe('parseContent', () => {
  it('returns typed data for a valid file', () => {
    const data = parseContent(
      'x.yaml',
      '- name: A\n  issuer: B\n  date: 2020-06\n',
      certificationsFile,
    );
    expect(data).toEqual([{ name: 'A', issuer: 'B', date: '2020-06' }]);
  });

  it('names the file, the line, and the entry when a field is missing', () => {
    const message = errorFor('- name: A\n  issuer: B\n\n- name: C\n');
    expect(message).toContain('content/certifications.yaml');
    expect(message).toMatch(/line 4, #2 › issuer: is missing/);
  });

  it('points at the exact line of a bad value', () => {
    const message = errorFor('- name: A\n  issuer: B\n  date: June 2020\n');
    expect(message).toMatch(/line 3, #1 › date: must be a month written like 2020-06/);
  });

  it('rejects typos in field names instead of silently ignoring them', () => {
    expect(errorFor('- name: A\n  issuer: B\n  dte: 2020-06\n')).toMatch(
      /unknown field "dte"; check the spelling/,
    );
  });

  it('only accepts https links', () => {
    expect(errorFor('- name: A\n  issuer: B\n  url: http://example.org\n')).toMatch(/https:\/\//);
  });

  it('explains broken YAML', () => {
    expect(errorFor('- name: A\n issuer: [B\n')).toMatch(/not valid YAML/);
  });

  it('works with any schema', () => {
    expect(parseContent('y.yaml', 'title: Hi\n', z.strictObject({ title: z.string() }))).toEqual({
      title: 'Hi',
    });
  });
});

describe('months', () => {
  it('formats YYYY-MM without time-zone surprises', () => {
    expect(formatMonth('2020-06')).toBe('Jun 2020');
    expect(formatMonth('2019-01')).toBe('Jan 2019');
    expect(formatMonth('2021-12')).toBe('Dec 2021');
  });

  it('sorts newest first, undated last, and keeps file order for ties', () => {
    const items = [
      { id: 'undated' },
      { id: 'old', month: '2019-01' },
      { id: 'tieA', month: '2020-06' },
      { id: 'tieB', month: '2020-06' },
    ];
    expect(newestFirst(items, (item) => item.month).map((item) => item.id)).toEqual([
      'tieA',
      'tieB',
      'old',
      'undated',
    ]);
  });
});
