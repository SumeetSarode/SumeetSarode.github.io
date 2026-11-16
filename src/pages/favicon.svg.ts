/** The browser-tab icon: the owner's initials, drawn from profile.yaml on every build. */
import { site } from '../config/site';

const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET = (): Response =>
  new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2346d8" />
  <text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="30" fill="#ffffff">${escape(site.initials)}</text>
</svg>
`,
    { headers: { 'Content-Type': 'image/svg+xml' } },
  );
