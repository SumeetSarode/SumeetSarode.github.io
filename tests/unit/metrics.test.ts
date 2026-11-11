import { describe, expect, it } from 'vitest';
import { splitMetrics } from '../../src/lib/metrics';
import { earlierRoles, employers } from '../../src/data/experience';

const metrics = (text: string) =>
  splitMetrics(text)
    .filter((part) => part.metric)
    .map((part) => part.text);

describe('splitMetrics', () => {
  it('finds money and percentages', () => {
    expect(metrics('protecting ~$100M in sales')).toEqual(['~$100M']);
    expect(metrics('reducing losses by approximately $16M.')).toEqual(['$16M']);
    expect(metrics('cut time by 40% and lifted it 8%')).toEqual(['40%', '8%']);
  });

  it('leaves years, counts, and plain words alone', () => {
    expect(metrics('Since 2021, across 3 teams and every U.S. location')).toEqual([]);
  });

  it('never drops or reorders a character', () => {
    const roles = [...employers.flatMap((employer) => employer.roles), ...earlierRoles];
    for (const bullet of roles.flatMap((role) => role.bullets)) {
      expect(
        splitMetrics(bullet)
          .map((part) => part.text)
          .join(''),
      ).toBe(bullet);
    }
  });
});
