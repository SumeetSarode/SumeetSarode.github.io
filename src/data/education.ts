/**
 * Degrees and certifications.
 *
 * Degrees use the résumé wording (the B.E. field is "Computer Science Engineering" there;
 * LinkedIn says "Computer Engineering"). Certifications come from LinkedIn, checked 2026-11-11.
 * Only add a `url` after opening it and confirming it shows the right certificate; never guess.
 */
export interface Degree {
  school: string;
  degree: string;
  dates: string;
  /** Optional highlights, from LinkedIn. */
  coursework?: readonly string[];
}

export interface Certification {
  name: string;
  issuer: string;
  /** Month and year as shown on the certificate. Some LinkedIn entries have no date. */
  date?: string;
  /** A public page that verifies the certificate, if one was confirmed. */
  url?: string;
}

export const degrees: readonly Degree[] = [
  {
    school: 'Indiana University, Bloomington',
    degree: 'M.S. in Data Science',
    dates: 'Aug 2019 \u2013 May 2021',
    coursework: [
      'Artificial Intelligence',
      'Applied Machine Learning',
      'Deep Learning',
      'Statistics',
      'Advanced Database Concepts',
    ],
  },
  {
    school: 'University of Mumbai, India',
    degree: 'B.E. in Computer Science Engineering',
    dates: 'Jul 2015 \u2013 May 2019',
  },
];

/** One list, newest first; entries without a date go last. */
export const certifications: readonly Certification[] = [
  {
    name: 'Deep Learning Nanodegree',
    issuer: 'Udacity',
    date: 'Jun 2020',
    url: 'https://confirm.udacity.com/EU3T6K3D',
  },
  {
    name: 'Deep Learning Specialization',
    issuer: 'DeepLearning.AI',
    date: 'Jun 2020',
    url: 'https://coursera.org/share/7ffdcad290c62a9b4aefff9f414861a5',
  },
  {
    // LinkedIn calls this "Deep Learning with PyTorch"; the certificate itself says this.
    name: 'Introduction to Machine Learning with PyTorch Nanodegree',
    issuer: 'Udacity',
    date: 'May 2020',
    url: 'https://confirm.udacity.com/UGNRKTN',
  },
  // The link on LinkedIn opens a PDF, but its contents could not be checked, so no link yet.
  { name: 'AWS Machine Learning Fundamentals', issuer: 'Udacity', date: 'May 2020' },
  { name: 'Introduction to Programming Using Python', issuer: 'Microsoft', date: 'Jan 2019' },
  // DataCamp pages were behind a bot check, so these have no confirmed link or date yet.
  { name: 'Big Data Fundamentals with PySpark', issuer: 'DataCamp' },
  { name: 'Advanced Deep Learning with Keras', issuer: 'DataCamp' },
  { name: 'Introduction to TensorFlow in Python', issuer: 'DataCamp' },
  { name: 'Feature Engineering using NLP', issuer: 'DataCamp' },
];
