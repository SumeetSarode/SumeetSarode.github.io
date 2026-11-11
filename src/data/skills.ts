import type { IconName } from '../lib/icon-names';

/**
 * Skills from the owner's résumé (CONTENT.md §5), drawn as a stack: each layer builds on the
 * ones beneath it, the way the career did. No ratings, bars, or logos.
 * Every `summary` restates a résumé bullet; don't add claims that aren't there.
 */
export interface SkillLayer {
  name: string;
  icon: IconName;
  summary: string;
  skills: readonly string[];
}

/** Top to bottom: what I focus on now sits on everything underneath it. */
export const skillLayers: readonly SkillLayer[] = [
  {
    name: 'LLM reliability',
    icon: 'shield-check',
    summary:
      'Model routing, evaluation, guardrails, and human review, so unchecked model output never triggers an operational action.',
    skills: [
      'Multi-Provider Model Routing',
      'LLM Evaluation',
      'Guardrails',
      'Human-in-the-Loop Validation',
    ],
  },
  {
    name: 'GenAI and agentic AI',
    icon: 'bot',
    summary:
      'Multi-agent platforms, and a natural-language-to-Cypher agent over a Neo4j knowledge graph.',
    skills: [
      'Multi-Agent Systems',
      'LLM Agents',
      'RAG',
      'GraphRAG',
      'Knowledge Graphs',
      'Neo4j',
      'Text-to-Cypher',
      'Semantic Search',
      'Vector Databases',
      'Embeddings',
      'Prompt Engineering',
    ],
  },
  {
    name: 'MLOps',
    icon: 'workflow',
    summary:
      'Production GCP services, a Kubeflow AutoML platform, and automated monitoring and drift detection.',
    skills: [
      'Kubeflow',
      'Vertex AI',
      'MLflow',
      'Model Monitoring and Drift Detection',
      'Feature Pipelines',
      'CI/CD (GitHub Actions, Jenkins)',
      'Docker',
      'Kubernetes',
    ],
  },
  {
    name: 'Machine learning',
    icon: 'brain-circuit',
    summary: 'Prioritization, confidence-scoring, anomaly-detection, and forecasting models.',
    skills: [
      'TensorFlow',
      'PyTorch',
      'Scikit-learn',
      'XGBoost',
      'H2O AutoML',
      'BERT',
      'NLP',
      'Time Series Forecasting',
      'Anomaly Detection',
      'Computer Vision',
      'A/B Testing',
    ],
  },
  {
    name: 'Data engineering',
    icon: 'database',
    summary: 'Daily predictive and ETL pipelines that feed every layer above.',
    skills: [
      'Spark',
      'BigQuery',
      'Airflow',
      'Kafka',
      'PostgreSQL',
      'MySQL',
      'Azure SQL',
      'MongoDB',
    ],
  },
];

/** What the whole stack runs on, shown as a base under the layers. */
export const foundations: readonly { name: string; icon: IconName; skills: readonly string[] }[] = [
  {
    name: 'Cloud',
    icon: 'cloud',
    skills: ['GCP', 'Azure (Databricks, Azure ML)', 'AWS (S3, Lambda)'],
  },
  { name: 'Languages', icon: 'code', skills: ['Python', 'SQL', 'PySpark', 'R'] },
];
