import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { CONTENT_DIR } from './src/content-files/load.ts';
import { site } from './src/config/site.ts';

const contentDir = `${CONTENT_DIR}/`;

// A build of some other content folder (the tests build practice sites) keeps its own cache,
// so nothing from it can leak into a build of the real content.
const cacheDir = process.env.PORTFOLIO_CONTENT
  ? join(
      tmpdir(),
      `portfolio-cache-${createHash('sha1').update(CONTENT_DIR).digest('hex').slice(0, 12)}`,
    )
  : undefined;

/**
 * Pages read content/*.yaml while they are built, which Vite doesn't track. In `npm run dev`,
 * forget the cached copies and reload the browser whenever one of those files changes.
 */
const reloadOnContentChange = {
  name: 'reload-on-content-change',
  configureServer(server) {
    server.watcher.add(contentDir);
    server.watcher.on('change', (file) => {
      if (!file.startsWith(contentDir)) return;
      for (const environment of Object.values(server.environments)) {
        environment.moduleGraph.invalidateAll();
      }
      server.ws.send({ type: 'full-reload' });
    });
  },
};

export default defineConfig({
  // From content/profile.yaml. Without it, the site still builds, minus the sitemap.
  site: site.url,
  trailingSlash: 'always',
  cacheDir,
  // The sitemap needs the site's address, and automatically leaves out 404.html.
  integrations: site.url ? [sitemap()] : [],
  vite: { plugins: [reloadOnContentChange] },
});
