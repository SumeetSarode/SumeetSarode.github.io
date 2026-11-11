/**
 * Publications, verified against the owner's LinkedIn on 2026-11-10.
 * Only add a `url` after confirming it opens the right paper; never guess one.
 */
export interface Publication {
  slug: string;
  title: string;
  venue: string;
  topic: string;
  summary: string;
  context: string;
  approach: string;
  scope: string;
  issue?: string;
  doi?: string;
  sources?: readonly { label: string; url: string }[];
  /** A public code repository that accompanies the paper, if there is one. */
  codeUrl?: string;
  /** ISO date (yyyy-mm-dd) so the list can be sorted and the year derived. */
  date: string;
  /** Short context shown after the venue, e.g. the conference name. */
  detail?: string;
  coAuthors?: readonly string[];
  url?: string;
}

export const publications: readonly Publication[] = [
  {
    slug: 'stock-price-prediction',
    topic: 'Machine learning / Financial forecasting',
    summary:
      'Combining LSTM-based stock-price forecasting with sentiment analysis of business news.',
    context:
      'Stock-price forecasting asks how patterns in historical market data can inform estimates of future prices. This paper explores that problem through machine learning.',
    approach:
      'The abstract describes LSTM-based stock-price prediction using historical and real-time trading data, alongside sentiment analysis of relevant live business news. The two analyses are combined to support investor recommendations. This joins a numerical time-series signal with the contextual signal in news rather than treating prices as the only input.',
    scope:
      'This 2019 publication is separate from my newer Stock Price Predictor software project. The two should not be confused, and results from one do not describe the other.',
    title: 'Stock price prediction using machine learning techniques',
    venue: 'IEEE',
    url: 'https://ieeexplore.ieee.org/document/8907958/',
    doi: '10.1109/ISS1.2019.8907958',
    issue: 'ICISS 2019 · Pages 177–181',
    sources: [
      {
        label: 'Crossref publication record',
        url: 'https://api.crossref.org/works/10.1109/iss1.2019.8907958',
      },
      {
        label: 'OpenAlex abstract record',
        url: 'https://api.openalex.org/works/https://doi.org/10.1109/ISS1.2019.8907958',
      },
    ],
    date: '2019-11-21',
    detail: '2019 International Conference on Intelligent Sustainable Systems (ICISS)',
    coAuthors: ['Harsha G. Tolani', 'Prateek Kak', 'C. S. Lifna'],
  },
  {
    slug: 'smart-irrigation',
    topic: 'IoT / Resource-aware automation',
    summary:
      'An IoT irrigation system that switches the water pump on and off from live soil-moisture readings.',
    context:
      'Irrigation control is a resource-management problem: deciding when water is needed rather than relying only on a fixed schedule.',
    approach:
      'The proposed IoT system measures temperature, humidity, and soil moisture. A microcontroller switches a pumping motor on or off in response to soil dampness, while valves control the flow and direction of water. The abstract also describes a GSM phone connection. The design connects sensing, a control decision, and physical actuation in one loop.',
    scope:
      'This is a proposed system, not a claim of a deployed product or measured water savings.',
    title: 'Smart Irrigation Control System',
    venue: 'International Journal of Science and Research (IJSR)',
    issue: 'Volume 8, Issue 8 · August 2019 · Pages 1312–1316 · Review paper',
    doi: '10.21275/ART2020571',
    date: '2019-08-19',
    url: 'https://www.ijsr.net/getabstract.php?paperid=ART2020571',
  },
  {
    slug: 'car-automation-iot',
    topic: 'IoT / Connected systems',
    summary: 'Exploring vehicle monitoring and control through IoT, Raspberry Pi, and Arduino.',
    context:
      'Connected vehicle systems bring sensing, monitoring, and control into the same workflow. This publication examines that idea through an IoT approach.',
    approach:
      'The paper discusses remote vehicle monitoring and control over an active internet connection from a registered user device. Raspberry Pi, Arduino, and other microcontrollers are described as platforms for controlling operations. It frames the design around concerns including accidents, parking, and theft; these are motivations, not measured safety outcomes.',
    scope:
      'The paper discusses a system approach. This portfolio does not claim a commercial product, production deployment, or verified field-test results.',
    title: 'Car Automation using IoT',
    venue: 'International Research Journal of Engineering and Technology (IRJET)',
    url: 'https://www.irjet.net/archives/V6/i8/IRJET-V6I8133.pdf',
    issue: 'Volume 6, Issue 8 · August 2019 · Starts on page 647',
    sources: [{ label: 'Publisher issue archive', url: 'https://www.irjet.net/volume-6-issue08' }],
    date: '2019-08-17',
  },
  {
    slug: 'accessible-language-learning',
    topic: 'Assistive technology / Speech translation',
    summary:
      'A language-learning device concept for blind people, using speech translation with Python and Raspberry Pi.',
    context:
      'Language-learning tools that depend on visual interfaces can create barriers for blind people. This work explores a speech-oriented approach to language learning.',
    approach:
      'The publisher abstract describes speech translation from one language to another using a Raspberry Pi, with application code written in Python. It discusses speech recognition and speech-to-text processing, framing spoken interaction as a way to support blind users without depending on a visual interface. A related public code repository accompanies the work.',
    scope:
      'The publication and code describe the approach. No clinical validation, measured learning outcomes, or adoption figures are claimed here.',
    title: 'Language Learning Device for blind people',
    venue:
      'International Journal of Advanced Research in Computer and Communication Engineering (IJARCCE)',
    date: '2018-07-15',
    url: 'https://www.ijarcce.com/papers/language-learning-device-for-blind-people/',
    issue: 'Volume 7, Issue 6 · June 2018',
    doi: '10.17148/IJARCCE.2018.7626',
    coAuthors: ['Harsha G. Tolani'],
    codeUrl: 'https://github.com/SumeetSarode/language-learning-device-for-blind',
    sources: [
      {
        label: 'Publisher PDF',
        url: 'https://www.ijarcce.com/wp-content/uploads/2018/08/10.17148.IJARCCE.2018.7626.pdf',
      },
    ],
  },
];

export const publicationYear = (publication: Publication): string => publication.date.slice(0, 4);

/** The short name in brackets at the end of a venue, e.g. "(IJSR)", or the whole venue. */
export const shortVenue = (publication: Publication): string =>
  publication.venue.match(/\(([^)]+)\)$/)?.[1] ?? publication.venue;

/** The grey line under a title: venue and year, then any detail, then co-authors. */
export const publicationMeta = (publication: Publication): string => {
  const parts = [
    `${publication.venue}, ${publicationYear(publication)}`,
    publication.detail,
    publication.coAuthors && `With ${publication.coAuthors.join(', ')}`,
  ];
  return `${parts.filter(Boolean).join('. ')}.`;
};
