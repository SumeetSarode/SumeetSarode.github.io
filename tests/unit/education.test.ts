import { describe, expect, it } from 'vitest';
import { certifications, certificationsByIssuer } from '../../src/data/education';

describe('certificationsByIssuer', () => {
  it('groups by issuer and keeps the original order', () => {
    const groups = certificationsByIssuer([
      { name: 'A', issuer: 'X' },
      { name: 'B', issuer: 'Y' },
      { name: 'C', issuer: 'X' },
    ]);
    expect(groups).toEqual([
      {
        issuer: 'X',
        items: [
          { name: 'A', issuer: 'X' },
          { name: 'C', issuer: 'X' },
        ],
      },
      { issuer: 'Y', items: [{ name: 'B', issuer: 'Y' }] },
    ]);
  });

  it('loses no certification', () => {
    const total = certificationsByIssuer().reduce((sum, group) => sum + group.items.length, 0);
    expect(total).toBe(certifications.length);
  });
});

describe('certifications', () => {
  it('only links to https pages', () => {
    for (const cert of certifications) {
      if (cert.url) expect(cert.url).toMatch(/^https:\/\//);
    }
  });
});
