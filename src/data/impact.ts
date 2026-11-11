/**
 * Headline impact numbers. Each one is lifted from a résumé bullet in
 * src/data/experience.ts or the profile summary in src/config/site.ts.
 * Never round up, combine, or add a figure that is not in those sources.
 */
export interface Impact {
  value: string;
  label: string;
  /** Where the figure comes from, for whoever edits this next. */
  source: string;
}

export const impacts: readonly Impact[] = [
  {
    value: '~$100M',
    label: "in annual sales protected across every U.S. Sam's Club",
    source: 'Senior Data Scientist, bullet 1',
  },
  {
    value: '~$16M',
    label: 'in supplier-related losses reduced with machine learning',
    source: 'Data Scientist, bullet 2',
  },
  {
    value: 'Nationwide',
    label: 'multi-agent AI platform deployed to every U.S. Walmart location',
    source: 'Principal Data Scientist, bullet 1',
  },
  {
    value: '5+ years',
    label: 'from hands-on modeling to enterprise AI architecture',
    source: 'Profile summary',
  },
];
