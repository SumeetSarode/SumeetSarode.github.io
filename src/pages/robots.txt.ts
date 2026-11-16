/** robots.txt: everything may be indexed, and here's the sitemap (once the site has an address). */
import { site } from '../config/site';

export const GET = (): Response => {
  const sitemap = site.url ? `\nSitemap: ${new URL('/sitemap-index.xml', site.url).href}\n` : '';
  return new Response(`User-agent: *\nAllow: /\n${sitemap}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
