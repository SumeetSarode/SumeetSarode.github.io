import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sumeetsarode.github.io',
  trailingSlash: 'always',
  // The sitemap automatically leaves out 404.html.
  integrations: [sitemap()],
});
