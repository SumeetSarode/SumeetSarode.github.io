/** Skills, grouped, from the owner's résumé (CONTENT.md §5). No ratings, bars, or logos. */
export interface SkillGroup {
  name: string;
  skills: readonly string[];
}

export const skillGroups: readonly SkillGroup[] = [
  {
    name: 'GenAI and agentic AI',
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
    name: 'LLM reliability',
    skills: [
      'Multi-Provider Model Routing',
      'LLM Evaluation',
      'Guardrails',
      'Human-in-the-Loop Validation',
    ],
  },
  {
    name: 'Machine learning',
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
    name: 'MLOps',
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
    name: 'Data engineering',
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
  {
    name: 'Cloud',
    skills: ['GCP', 'Azure (Databricks, Azure ML)', 'AWS (S3, Lambda)'],
  },
  { name: 'Languages', skills: ['Python', 'SQL', 'PySpark', 'R'] },
];
