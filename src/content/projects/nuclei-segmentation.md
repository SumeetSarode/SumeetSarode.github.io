---
title: Nuclei Segmentation with Mask R-CNN
tagline: Fine-tuning a proven segmentation model to find every cell nucleus in a microscope image.
summary: Instance segmentation of cell nuclei with Mask R-CNN. Start from pretrained nucleus weights, fine-tune the head layers for five epochs, then run detection on microscopy images.
metaDescription: 'Case study: fine-tuning Mask R-CNN to segment cell nuclei in microscopy images with transfer learning and the Kaggle 2018 Data Science Bowl data.'
order: 3
repoUrl: https://github.com/SumeetSarode/Nuclei-Detection-in-Microscopic-Cell-Images
status: Research and learning project. Not used in production.
tags:
  - Python
  - TensorFlow
  - Keras
  - Mask R-CNN
  - Transfer learning
checkedOn: 2026-11-10
attribution: "The Mask R-CNN implementation is Matterport's open-source Keras and TensorFlow version (MIT license). The nucleus training and detection module follows the sample written by Waleed Abdulla for the Kaggle 2018 Data Science Bowl. My work here is applying and fine-tuning that model, not inventing it."
facts:
  - value: '5'
    label: epochs fine-tuning the head layers
  - value: '2018'
    label: Kaggle Data Science Bowl dataset
diagram:
  caption: 'From a microscope image to one outline per nucleus.'
  layers:
    - name: Input
      items:
        - 'Microscopy images (Kaggle training and test sets, plus other microscopy images)'
    - name: Starting point
      items:
        - "Matterport's Mask R-CNN"
        - 'Weights already trained on nuclei'
    - name: Fine-tuning
      items:
        - 'Train the head layers only'
        - 'Five epochs on the Kaggle data'
        - 'Separate training and validation sets'
    - name: Detection
      items:
        - 'For each nucleus: a box, a class, a pixel mask, and a score'
    - name: Output
      items:
        - 'Overlay images with each nucleus outlined'
        - "Run-length-encoded results in Kaggle's submission format"
---

## The problem

To count and measure cells in a microscope image, you first have to find each nucleus on its own. That is **instance segmentation**: not just "there are nuclei in this picture", but one separate outline per nucleus, even when they touch. Outlining them by hand doesn't scale past a few images.

## The approach

Mask R-CNN is a model that, for every object it finds, predicts a bounding box, a class, and a pixel-level mask. I used Matterport's Keras and TensorFlow implementation and started from weights that had already been trained on nuclei, so I didn't have to learn the basics from scratch. This is transfer learning.

From there the work was:

1. **Load the pretrained weights** into the model.
2. **Fine-tune only the head layers** for five epochs on the Kaggle 2018 Data Science Bowl nuclei data, with a training set and a separate validation set. Training only the heads keeps the earlier layers' general visual features and adapts the final stages to the task.
3. **Run detection** on test images and on other microscopy images, which gives an outline for each nucleus.
4. **Write the results** as overlay images and as run-length-encoded masks in the format Kaggle expects.

## Why only the head layers

Training only the head layers is cheaper than training the whole network, and it keeps the general visual features the pretrained weights already learned. The final stages, which decide what counts as a nucleus, are the part that adapts to the task. It is the standard transfer-learning trade-off: reuse what already works and change only what needs to change.

## What it is not

It's a research and learning project, not something running in production. I haven't recorded an accuracy score such as mAP for this run, so I'm not quoting one. The repository includes result overlays for microscopy images from other sources. Those images belong to their original owners, so this page doesn't reproduce them.
