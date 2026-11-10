// Regenerates public/og-image.png, the preview card shown when the site is shared.
// Run:  node scripts/make-og-image.mjs
// Text only on purpose: no photo, no logos, nothing that needs permission.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { site } from '../src/config/site.ts';

const WIDTH = 1200;
const HEIGHT = 630;
const BG = '#fafaf7';
const TEXT = '#16181d';
const MUTED = '#555b66';
const ACCENT = '#2346d8';

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const [role, specialty] = site.title.split('\u00b7').map((part) => part.trim());

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="0" y="0" width="16" height="${HEIGHT}" fill="${ACCENT}"/>
  <text x="96" y="270" font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="700" fill="${TEXT}">${escape(site.name)}</text>
  <text x="96" y="352" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${MUTED}">${escape(role ?? '')}</text>
  <text x="96" y="412" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${MUTED}">${escape(specialty ?? '')}</text>
  <text x="96" y="544" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="${ACCENT}">${escape(site.url.replace('https://', ''))}</text>
</svg>`;

const output = fileURLToPath(new URL('../public/og-image.png', import.meta.url));
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
console.log(`Wrote ${output}`);
