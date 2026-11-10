/**
 * Education and the one certification (CONTENT.md §7).
 * The B.E. field uses the résumé wording ("Computer Science Engineering");
 * LinkedIn says "Computer Engineering". Confirm before launch.
 */
export interface Education {
  school: string;
  degree: string;
  dates: string;
}

export const education: readonly Education[] = [
  {
    school: 'Indiana University, Bloomington',
    degree: 'M.S. in Data Science',
    dates: 'Aug 2019 \u2013 May 2021',
  },
  {
    school: 'University of Mumbai, India',
    degree: 'B.E. in Computer Science Engineering',
    dates: 'Jul 2015 \u2013 May 2019',
  },
];

export const certification = {
  name: 'Deep Learning Nanodegree',
  issuer: 'Udacity',
  date: 'June 2020',
} as const;
