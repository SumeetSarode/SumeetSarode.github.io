import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sumeetsarode.github.io',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The style guide is a temporary design page; never list it.
      filter: (page) => !page.includes('/styleguide'),
    }),
  ],
});
