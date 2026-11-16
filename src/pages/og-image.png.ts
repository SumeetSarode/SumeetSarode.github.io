/**
 * The picture shown when someone shares the site. It's drawn from profile.yaml on every
 * build, so it always shows the current name and title. Text only on purpose: no photo,
 * no logos, nothing that needs permission.
 */
import sharp from 'sharp';
import { site } from '../config/site';

const WIDTH = 1200;
const HEIGHT = 630;
const BG = '#fafaf7';
const TEXT = '#16181d';
const MUTED = '#555b66';
const ACCENT = '#2346d8';

const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET = async (): Promise<Response> => {
  const [role = '', specialty = ''] = (site.title ?? '').split('\u00b7').map((part) => part.trim());
  const address = site.url?.replace('https://', '') ?? '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="0" y="0" width="16" height="${HEIGHT}" fill="${ACCENT}"/>
  <text x="96" y="270" font-family="Georgia, 'Times New Roman', serif" font-size="96" font-weight="700" fill="${TEXT}">${escape(site.name)}</text>
  <text x="96" y="352" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${MUTED}">${escape(role)}</text>
  <text x="96" y="412" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${MUTED}">${escape(specialty)}</text>
  <text x="96" y="544" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="${ACCENT}">${escape(address)}</text>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
