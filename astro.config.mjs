// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  // Astro 5 enables CSRF origin-checking by default (security.checkOrigin: true).
  // That middleware intercepts DELETE/PUT/PATCH/POST and validates the Origin header.
  // Browsers often omit Origin on same-origin DELETE requests with no body, causing
  // spurious 403s before the route handler is ever reached.  This app has no
  // auth cookies, so CSRF is not a meaningful attack surface here.
  security: {
    checkOrigin: false,
  },

  integrations: [
    react({
      experimentalReactChildren: true
    })
  ],

  vite: {
    // @ts-ignore - Vite plugin version mismatch between Astro and @tailwindcss/vite
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': './src',
        '@shared': './src/shared',
        '@assets': './src/assets',
      }
    }
  },

  adapter: node({
    mode: 'standalone'
  })
});