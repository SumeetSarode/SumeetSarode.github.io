import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const contentDir = fileURLToPath(new URL('./content/', import.meta.url));

// The published address lives in content/profile.yaml, so there is one place to change it.
const { url } = parse(readFileSync(`${contentDir}profile.yaml`, 'utf8'));

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
  site: url,
  trailingSlash: 'always',
  // The sitemap automatically leaves out 404.html.
  integrations: [sitemap()],
  vite: { plugins: [reloadOnContentChange] },
});
