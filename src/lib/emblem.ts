import type { IconName } from './icon-names';

/** The colours an emblem can glow in. */
export const emblemTones = ['indigo', 'violet', 'cyan'] as const;
export type EmblemTone = (typeof emblemTones)[number];

/**
 * An emblem is a picture made of two symbols: a big one for what the work is about, and a
 * small badge for what makes it special. Projects and research papers both use them.
 */
export interface EmblemSpec {
  main: IconName;
  badge: IconName;
  tone: EmblemTone;
}
