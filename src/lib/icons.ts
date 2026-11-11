/**
 * The icons the site uses, in one place. Content files (src/content/projects) name icons as
 * strings; this registry turns a name into a component, and the content schema only accepts
 * names that exist here, so a typo fails the build instead of showing an empty box.
 *
 * Lucide icons render to inline SVG at build time: visitors download no JavaScript for them.
 * To use a new icon, import it here and add its name to src/lib/icon-names.ts too.
 */
import type { IconName } from './icon-names';
import ChartCandlestick from '@lucide/astro/icons/chart-candlestick';
import Database from '@lucide/astro/icons/database';
import EyeOff from '@lucide/astro/icons/eye-off';
import BrainCircuit from '@lucide/astro/icons/brain-circuit';
import Landmark from '@lucide/astro/icons/landmark';
import Layers from '@lucide/astro/icons/layers';
import LifeBuoy from '@lucide/astro/icons/life-buoy';
import Microscope from '@lucide/astro/icons/microscope';
import Monitor from '@lucide/astro/icons/monitor';
import Package from '@lucide/astro/icons/package';
import Plug from '@lucide/astro/icons/plug';
import Scale from '@lucide/astro/icons/scale';
import Scan from '@lucide/astro/icons/scan';
import ScanSearch from '@lucide/astro/icons/scan-search';
import Search from '@lucide/astro/icons/search';
import ShieldCheck from '@lucide/astro/icons/shield-check';
import Shapes from '@lucide/astro/icons/shapes';
import SlidersHorizontal from '@lucide/astro/icons/sliders-horizontal';
import Split from '@lucide/astro/icons/split';
import Target from '@lucide/astro/icons/target';
import Terminal from '@lucide/astro/icons/terminal';
import Workflow from '@lucide/astro/icons/workflow';

/** Every name in icon-names.ts must appear here, and nothing else may. */
export const icons: Record<IconName, typeof ShieldCheck> = {
  'brain-circuit': BrainCircuit,
  'chart-candlestick': ChartCandlestick,
  database: Database,
  'eye-off': EyeOff,
  landmark: Landmark,
  layers: Layers,
  'life-buoy': LifeBuoy,
  microscope: Microscope,
  monitor: Monitor,
  package: Package,
  plug: Plug,
  scale: Scale,
  scan: Scan,
  'scan-search': ScanSearch,
  search: Search,
  shapes: Shapes,
  'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal,
  split: Split,
  target: Target,
  terminal: Terminal,
  workflow: Workflow,
};
