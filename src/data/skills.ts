/**
 * Skills, drawn as a stack. The content lives in content/capabilities.yaml; this file
 * loads and checks it.
 */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import { capabilitiesFile, type layerSchema } from '../content-files/schemas';

export type SkillLayer = z.output<typeof layerSchema>;

const file = loadContent('capabilities.yaml', capabilitiesFile);

/** Top to bottom: what the owner focuses on now sits on everything underneath it. */
export const skillLayers: readonly SkillLayer[] = file.layers;

/** What the whole stack runs on, shown as a base under the layers. */
export const foundations = file.foundations;
