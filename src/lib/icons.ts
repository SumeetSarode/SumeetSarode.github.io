/**
 * The icons the site uses, in one place. Content files (content/projects, publications)
 * name icons as strings; this registry turns a name into a component, and the content schema
 * only accepts names that exist here, so a typo fails the build instead of showing an empty box.
 *
 * Lucide icons render to inline SVG at build time: visitors download no JavaScript for them.
 * To use a new icon, import it here and add its name to src/lib/icon-names.ts too.
 */
import type { IconName } from './icon-names';
import Accessibility from '@lucide/astro/icons/accessibility';
import Award from '@lucide/astro/icons/award';
import Bot from '@lucide/astro/icons/bot';
import BrainCircuit from '@lucide/astro/icons/brain-circuit';
import Car from '@lucide/astro/icons/car';
import ChartCandlestick from '@lucide/astro/icons/chart-candlestick';
import Cloud from '@lucide/astro/icons/cloud';
import Code from '@lucide/astro/icons/code';
import Cpu from '@lucide/astro/icons/cpu';
import Database from '@lucide/astro/icons/database';
import EyeOff from '@lucide/astro/icons/eye-off';
import GraduationCap from '@lucide/astro/icons/graduation-cap';
import Landmark from '@lucide/astro/icons/landmark';
import Languages from '@lucide/astro/icons/languages';
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
import Shapes from '@lucide/astro/icons/shapes';
import ShieldCheck from '@lucide/astro/icons/shield-check';
import SlidersHorizontal from '@lucide/astro/icons/sliders-horizontal';
import Split from '@lucide/astro/icons/split';
import Sprout from '@lucide/astro/icons/sprout';
import Target from '@lucide/astro/icons/target';
import Terminal from '@lucide/astro/icons/terminal';
import TrendingUp from '@lucide/astro/icons/trending-up';
import Wifi from '@lucide/astro/icons/wifi';
import Workflow from '@lucide/astro/icons/workflow';

/** Every name in icon-names.ts must appear here, and nothing else may. */
export const icons: Record<IconName, typeof ShieldCheck> = {
  accessibility: Accessibility,
  award: Award,
  bot: Bot,
  'brain-circuit': BrainCircuit,
  car: Car,
  'chart-candlestick': ChartCandlestick,
  cloud: Cloud,
  code: Code,
  cpu: Cpu,
  database: Database,
  'eye-off': EyeOff,
  'graduation-cap': GraduationCap,
  landmark: Landmark,
  languages: Languages,
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
  sprout: Sprout,
  target: Target,
  terminal: Terminal,
  'trending-up': TrendingUp,
  wifi: Wifi,
  workflow: Workflow,
};
