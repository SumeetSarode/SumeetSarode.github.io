import { describe, expect, it } from 'vitest';
import { publicationMeta, publications, type Publication } from '../../src/data/publications';

const base: Publication = {
  slug: 'test-publication',
  title: 'T',
  venue: 'Journal',
  date: '2019-08-17',
  topic: 'Test topic',
  emblem: { main: 'cpu', badge: 'wifi', tone: 'indigo' },
  summary: 'Test summary',
  context: 'Test context',
  approach: 'Test approach',
  scope: 'Test scope',
};

describe('publicationMeta', () => {
  it('joins venue and year with a trailing period', () => {
    expect(publicationMeta(base)).toBe('Journal, 2019.');
  });
  it('puts a period between every part, including before the co-authors', () => {
    const meta = publicationMeta({
      ...base,
      detail: 'A Conference (ABC)',
      coAuthors: ['A. One', 'B. Two'],
    });
    expect(meta).toBe('Journal, 2019. A Conference (ABC). With A. One, B. Two.');
  });
  it('never produces a doubled period or a stray space', () => {
    for (const publication of publications) {
      const meta = publicationMeta(publication);
      expect(meta).not.toMatch(/\.\.|\s{2,}|\.\s*\./);
      expect(meta.endsWith('.')).toBe(true);
    }
  });
});

describe('publication data', () => {
  it('lists the IEEE paper first when sorted newest-first', () => {
    const sorted = [...publications].sort((a, b) => b.date.localeCompare(a.date));
    expect(sorted[0]?.venue).toBe('IEEE');
  });
  it('only links to https addresses', () => {
    for (const publication of publications) {
      if (publication.url) expect(publication.url).toMatch(/^https:\/\//);
    }
  });
});
