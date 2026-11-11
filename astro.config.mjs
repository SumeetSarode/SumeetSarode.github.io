import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const contentDir = fileURLToPath(new URL('./content/', import.meta.url));

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
  site: 'https://sumeetsarode.github.io',
  trailingSlash: 'always',
  // The sitemap automatically leaves out 404.html.
  integrations: [sitemap()],
  vite: { plugins: [reloadOnContentChange] },
});
