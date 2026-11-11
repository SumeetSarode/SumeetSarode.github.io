import { describe, expect, it } from 'vitest';
import { certifications } from '../../src/data/education';

describe('certifications', () => {
  it('only links to https pages', () => {
    for (const cert of certifications) {
      if (cert.url) expect(cert.url).toMatch(/^https:\/\//);
    }
  });

  it('lists dated certifications before undated ones', () => {
    const firstUndated = certifications.findIndex((cert) => !cert.date);
    const lastDated = certifications.findLastIndex((cert) => cert.date);
    expect(firstUndated === -1 || lastDated < firstUndated).toBe(true);
  });
});
