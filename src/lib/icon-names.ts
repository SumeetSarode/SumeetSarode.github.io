/**
 * The names content files may use for icons. Plain data (no components), so the content
 * schema can import it safely. src/lib/icons.ts maps every name here to its component, and
 * TypeScript refuses to compile if the two lists ever disagree.
 */
export const iconNames = [
  'accessibility',
  'award',
  'bot',
  'brain-circuit',
  'car',
  'chart-candlestick',
  'cloud',
  'code',
  'cpu',
  'database',
  'eye-off',
  'graduation-cap',
  'landmark',
  'languages',
  'layers',
  'life-buoy',
  'microscope',
  'monitor',
  'package',
  'plug',
  'scale',
  'scan',
  'scan-search',
  'search',
  'shapes',
  'shield-check',
  'sliders-horizontal',
  'split',
  'sprout',
  'target',
  'terminal',
  'trending-up',
  'wifi',
  'workflow',
] as const;

export type IconName = (typeof iconNames)[number];
