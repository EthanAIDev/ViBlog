import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import {site} from './site.config.mjs';

export default defineConfig({
  output: 'static',
  site: site.siteUrl,
  integrations: [react()],
  server: { host: '127.0.0.1', port: 3000 },
  devToolbar: { enabled: false },
  vite: { build: { chunkSizeWarningLimit: 1000 } },
});
