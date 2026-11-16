import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ContentError, parseContent } from '../../src/content-files/load';
import {
  capabilitiesFile,
  certificationsFile,
  educationFile,
  experienceFile,
  moreProjectsFile,
  profileFile,
  researchFile,
} from '../../src/content-files/schemas';
import { countPhrase } from '../../src/lib/count';
import { formatMonth, formatRange, newestFirst } from '../../src/lib/months';

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

  it('formats a range, with "Present" when there is no end', () => {
    expect(formatRange('2019-08', '2021-05')).toBe('Aug 2019 \u2013 May 2021');
    expect(formatRange('2024-03')).toBe('Mar 2024 \u2013 Present');
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

describe('education.yaml', () => {
  it('rejects a degree that ends before it starts, pointing at the end line', () => {
    const yaml = '- degree: X\n  school: Y\n  start: 2021-05\n  end: 2019-08\n';
    expect(() => parseContent('education.yaml', yaml, educationFile)).toThrow(
      /line 4, #1 › end: end must not be before start/,
    );
  });
});

describe('research.yaml', () => {
  const paper = (slug: string, icon = 'cpu') =>
    `- title: T\n  slug: ${slug}\n  venue: V\n  date: 2019-08-17\n  topic: X\n` +
    `  emblem: { main: ${icon}, badge: wifi, tone: cyan }\n` +
    '  summary: S\n  context: C\n  approach: A\n  scope: O\n';

  it('accepts a complete paper', () => {
    expect(parseContent('research.yaml', paper('a-b'), researchFile)).toHaveLength(1);
  });

  it('refuses two papers with the same slug, since their pages would collide', () => {
    expect(() =>
      parseContent('research.yaml', paper('same') + paper('same'), researchFile),
    ).toThrow(/#2 › slug: "same" is already used/);
  });

  it('refuses a slug that would make a messy web address', () => {
    expect(() => parseContent('research.yaml', paper('Smart Irrigation'), researchFile)).toThrow(
      /slug: must be lowercase words joined by hyphens/,
    );
  });

  it('refuses an icon name that does not exist', () => {
    expect(() => parseContent('research.yaml', paper('a', 'rocketship'), researchFile)).toThrow(
      /emblem › main/,
    );
  });
});

describe('countPhrase', () => {
  it('spells out small numbers and handles one and none', () => {
    expect(countPhrase(4, 'paper')).toBe('Four papers');
    expect(countPhrase(1, 'paper')).toBe('One paper');
    expect(countPhrase(0, 'paper')).toBe('No papers');
    expect(countPhrase(12, 'paper')).toBe('12 papers');
  });
});

describe('experience.yaml', () => {
  const role = (extra = '') =>
    `employers:\n  - name: Acme\n    roles:\n      - title: Engineer\n        start: 2021-01\n        summary: S\n        bullets:\n          - Did a thing\n${extra}`;

  it('needs only employers; earlier roles and impact numbers are optional', () => {
    const data = parseContent('experience.yaml', role(), experienceFile);
    expect(data.earlierRoles).toEqual([]);
    expect(data.impact).toEqual([]);
  });

  it('allows at most four impact numbers, so the row stays readable', () => {
    const item = '  - value: ~$1M\n    label: L\n    source: S\n';
    expect(() =>
      parseContent('experience.yaml', role('impact:\n' + item.repeat(5)), experienceFile),
    ).toThrow(/impact/);
  });

  it('requires a source for every impact number', () => {
    expect(() =>
      parseContent(
        'experience.yaml',
        role('impact:\n  - value: 1\n    label: L\n'),
        experienceFile,
      ),
    ).toThrow(/source: is missing/);
  });

  it('refuses a role that ends before it starts', () => {
    const bad = role().replace('start: 2021-01', 'start: 2021-01\n        end: 2020-01');
    expect(() => parseContent('experience.yaml', bad, experienceFile)).toThrow(
      /end must not be before start/,
    );
  });
});

describe('capabilities.yaml', () => {
  const layer = (name: string) =>
    `  - name: ${name}\n    icon: cpu\n    summary: S\n    skills: [A]\n`;

  it('accepts one layer and no foundations', () => {
    expect(
      parseContent('c.yaml', 'layers:\n' + layer('One'), capabilitiesFile).foundations,
    ).toEqual([]);
  });

  it('refuses more than five layers, which the stack colours are not made for', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map(layer).join('');
    expect(() => parseContent('c.yaml', 'layers:\n' + six, capabilitiesFile)).toThrow(/layers/);
  });
});

describe('more-projects.yaml', () => {
  it('may be empty', () => {
    expect(parseContent('m.yaml', '[]\n', moreProjectsFile)).toEqual([]);
  });

  it('only accepts https links', () => {
    expect(() =>
      parseContent(
        'm.yaml',
        '- name: N\n  url: http://x.org\n  description: D\n',
        moreProjectsFile,
      ),
    ).toThrow(/https:\/\//);
  });
});

describe('profile.yaml', () => {
  const profile = (extra = '', email = 'a@b.org') =>
    `name: N\ntitle: T\nurl: https://x.org\nemail: ${email}\nmetaDescription: M\n` +
    'hero: { role: R, setup: S, highlight: H, rest: E, intro: I }\n' +
    'signature:\n  headline: H\n  highlights:\n    - { title: A, description: B }\n' +
    extra;

  it('needs no LinkedIn, GitHub, or contact notes', () => {
    const data = parseContent('profile.yaml', profile(), profileFile);
    expect(data.linkedin).toBeUndefined();
    expect(data.contactNotes).toEqual({});
  });

  it('checks the email address', () => {
    expect(() => parseContent('profile.yaml', profile('', 'not-an-email'), profileFile)).toThrow(
      /email: must be an email address/,
    );
  });

  it('keeps the search description short enough to show in full', () => {
    expect(() =>
      parseContent(
        'profile.yaml',
        profile().replace('metaDescription: M', `metaDescription: ${'x'.repeat(156)}`),
        profileFile,
      ),
    ).toThrow(/metaDescription/);
  });

  it('only accepts https profile links', () => {
    expect(() =>
      parseContent('profile.yaml', profile('github: http://github.com/x\n'), profileFile),
    ).toThrow(/github: must be a full link that starts with https:\/\//);
  });

  it('allows at most three signature highlights, which is what the layout holds', () => {
    const four = '    - { title: A, description: B }\n'.repeat(3);
    expect(() => parseContent('profile.yaml', profile(four), profileFile)).toThrow(/highlights/);
  });
});
