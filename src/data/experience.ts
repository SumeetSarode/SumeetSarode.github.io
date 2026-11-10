/**
 * Work history, in the owner's exact résumé wording (CONTENT.md §3).
 * Do not add internal project names, systems, or metrics beyond what is here.
 * The employer name is plain text on purpose: no logos or branding.
 */
export interface Role {
  title: string;
  /** Display text, e.g. "Oct 2025 – Present" (en dash). */
  dates: string;
  bullets: readonly string[];
}

export interface Employer {
  name: string;
  roles: readonly Role[];
}

export interface EarlierRole {
  title: string;
  organization: string;
  dates: string;
  bullets: readonly string[];
}

export const employers: readonly Employer[] = [
  {
    name: 'Walmart Inc.',
    roles: [
      {
        title: 'Principal Data Scientist',
        dates: 'Oct 2025 \u2013 Present',
        bullets: [
          'Architected, built, and deployed a multi-agent AI platform across every U.S. Walmart location, transforming process guides from documents, chats, and forms into governed, prioritized operational actions.',
          'Established a provider-agnostic LLM architecture integrating model routing, evaluation, guardrails, and human-in-the-loop validation to prevent unchecked model output from triggering operational actions.',
          'Developed a real-time natural-language-to-Cypher agent over a Neo4j knowledge graph, connecting live operational signals with process guidance to generate context-aware, compliant recommendations.',
        ],
      },
      {
        title: 'Senior Data Scientist',
        dates: 'Nov 2023 \u2013 Oct 2025',
        bullets: [
          "Led multiple workstreams across inventory intelligence and ML platform engineering, protecting ~$100M in annual sales across all U.S. Sam's Club locations.",
          'Scaled item-prioritization models into a production GCP service and delivered a Kubeflow AutoML platform adopted across data science teams.',
          'Owned delivery of confidence-scoring, anomaly-detection, and location-intelligence pipelines, embedding automated monitoring and drift detection into production.',
        ],
      },
      {
        title: 'Data Scientist',
        dates: 'Aug 2021 \u2013 Oct 2023',
        bullets: [
          "Engineered a daily predictive pipeline ranking priority items for store associates, deployed across all U.S. Sam's Club locations.",
          'Developed ML models identifying potentially incorrect shipments, reducing supplier-related losses by approximately $16M.',
          'Integrated model outputs into restocking and receiving workflows with engineering, product, and operations teams, improving execution across clubs.',
        ],
      },
    ],
  },
];

export const earlierRoles: readonly EarlierRole[] = [
  {
    title: 'Data Science Intern',
    organization: 'Siemens',
    dates: 'Jun 2021 \u2013 Jul 2021',
    bullets: [
      'Built an ETL pipeline extracting project data to predict risks across active engagements, giving auditors early visibility.',
      'Quantified risk components and their revenue impact to inform audit-team prioritization.',
    ],
  },
  {
    title: 'Data Science Intern',
    organization: 'Trust Lab',
    dates: 'Jan 2021 \u2013 Apr 2021',
    bullets: [
      'Prototyped an NLP pipeline analyzing social media data to flag malicious intent with 85% recall; deployed on AWS for a rental-lodging client.',
      'Measured the spread and impact of COVID misinformation across social platforms using crowdsourced data.',
    ],
  },
  {
    title: 'Research Assistant',
    organization: 'Societal Computing Lab',
    dates: 'Oct 2020 \u2013 May 2021',
    bullets: [
      'Uncovered wildlife migratory patterns by analyzing social-media imagery through spatial-temporal visualization.',
      'Modeled migration drivers using Geographically Weighted Regression and time series forecasting for the Smithsonian Museum.',
    ],
  },
  {
    title: 'Graduate Researcher',
    organization: 'Cyberinfrastructure for Network Science Center',
    // LinkedIn says Mar–Aug 2020; the résumé says Mar–Oct 2020. The résumé wins until the owner says otherwise.
    dates: 'Mar 2020 \u2013 Oct 2020',
    bullets: [
      'Applied computer vision and deep learning to process 3D prototypes for the HuBMAP consortium alongside UPenn researchers.',
      'Slashed object-detection training time by 40% via distributed GPU training and boosted model performance by 8% through transfer learning.',
    ],
  },
];
