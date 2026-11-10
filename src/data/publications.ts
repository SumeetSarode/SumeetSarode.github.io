/**
 * Publications, verified against the owner's LinkedIn on 2026-11-10.
 * Only add a `url` after confirming it opens the right paper; never guess one.
 */
export interface Publication {
  title: string;
  venue: string;
  /** ISO date (yyyy-mm-dd) so the list can be sorted and the year derived. */
  date: string;
  /** Short context shown after the venue, e.g. the conference name. */
  detail?: string;
  coAuthors?: readonly string[];
  url?: string;
}

export const publications: readonly Publication[] = [
  {
    title: 'Stock price prediction using machine learning techniques',
    venue: 'IEEE',
    date: '2019-11-21',
    detail: '2019 International Conference on Intelligent Sustainable Systems (ICISS)',
    coAuthors: ['Harsha G. Tolani', 'Prateek Kak', 'C. S. Lifna'],
  },
  {
    title: 'Smart Irrigation Control System',
    venue: 'International Journal of Science and Research (IJSR)',
    date: '2019-08-19',
    url: 'https://www.ijsr.net/getabstract.php?paperid=ART2020571',
  },
  {
    title: 'Car Automation using IoT',
    venue: 'International Research Journal of Engineering and Technology (IRJET)',
    date: '2019-08-17',
  },
  {
    title: 'Language Learning Device for blind people',
    venue:
      'International Journal of Advanced Research in Computer and Communication Engineering (IJARCCE)',
    date: '2018-07-15',
  },
];

export const publicationYear = (publication: Publication): string => publication.date.slice(0, 4);
