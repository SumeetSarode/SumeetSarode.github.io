/** Short list of other public repos. Each line is based on the repo's own contents. */
export interface MoreProject {
  name: string;
  url: string;
  description: string;
}

export const moreProjects: readonly MoreProject[] = [
  {
    name: 'Glomeruli Detection with Faster R-CNN',
    url: 'https://github.com/SumeetSarode/Glomeruli-Detection-using-Faster-RCNN',
    description:
      "Detecting glomeruli, a kidney structure, with Faster R-CNN in TensorFlow's object-detection pipeline.",
  },
  {
    name: 'Cashflow Prediction Optimization',
    url: 'https://github.com/SumeetSarode/Cashflow-Prediction-Optimization',
    description:
      'Three research questions on invoice payments: will a customer pay over 30 days late, will they pay at all, and will it be in full, in part, or not at all?',
  },
  {
    name: 'Sentence Classification using BERT',
    url: 'https://github.com/SumeetSarode/Sentence-Classification-using-BERT',
    description: 'Fine-tuning BERT to classify sentences, using the CoLA dataset.',
  },
];
