import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import devBarIntegration from './src/integrations/dev_bar_integration';
import sitemap from '@astrojs/sitemap';

// pm2 start ecosystem.config.js --env development
// pm2 start npm --name stoertebeker-astro-preview -- run preview --node-args="--max-old-space-size=6000"
// pm2 save

import devOnlyRoutes from "astro-dev-only-routes";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  site: 'https:/booking.stoertebeker.de',
  trailingSlash: 'ignore',
  redirects: {
    "/": "/de"
  },
  integrations: [tailwind(), react(), sitemap(), devBarIntegration(), devOnlyRoutes(),],
  vite: {
    server: {
      allowedHosts: ['booking.stoertebeker.de'],
      // If behind a reverse proxy, these can also help:
      // host: true,            // listen on all interfaces
      // hmr: { clientPort: 443 } // or your public port
    },
  }
});