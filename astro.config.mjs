import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import path from 'node:path';
import { site } from './site.config.mjs';
import { AVATAR_RELATIVE_PATH, syncAvatarFavicons } from './scripts/sync-favicon.mjs';

const avatarFaviconWatcher = {
  name: 'sync-avatar-favicon',
  configureServer(server) {
    const avatarFile = path.resolve(process.cwd(), AVATAR_RELATIVE_PATH);
    server.watcher.add(avatarFile);
    const onAvatarChange = (changedPath) => {
      if (path.resolve(changedPath) !== avatarFile) return;
      void syncAvatarFavicons(process.cwd()).then(() => {
        server.ws.send({ type: 'full-reload' });
      });
    };
    server.watcher.on('change', onAvatarChange);
    server.watcher.on('add', onAvatarChange);
  },
};

export default defineConfig({
  output: 'static',
  site: site.siteUrl,
  integrations: [react()],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  server: { host: '127.0.0.1', port: 3000 },
  devToolbar: { enabled: false },
  vite: {
    plugins: [avatarFaviconWatcher],
    build: { chunkSizeWarningLimit: 1000 },
  },
});
