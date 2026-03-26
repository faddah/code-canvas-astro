// @ts-check
import { defineConfig } from 'astro/config';
import { createRequire } from 'node:module';

import clerk from '@clerk/astro';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

const require = createRequire(import.meta.url);
const astroMiddlewarePath = require.resolve('astro/virtual-modules/middleware.js');

// https://astro.build/config
export default defineConfig({
  output: 'server',

  // Astro 5 enables CSRF origin-checking by default (security.checkOrigin: true).
  // That middleware intercepts DELETE/PUT/PATCH/POST and validates the Origin header.
  // Browsers often omit Origin on same-origin DELETE requests with no body, causing
  // spurious 403s before the route handler is ever reached.  Clerk's signed session
  // tokens provide CSRF protection for authenticated endpoints.
  security: {
    checkOrigin: false,
  },

  integrations: [
    clerk(),
    react({
      experimentalReactChildren: true,
    }),
  ],

  vite: {
    // @ts-ignore - Vite plugin version mismatch between Astro and @tailwindcss/vite
    plugins: [
      tailwindcss(),
      // Workaround: Astro 6 + Vite 7 fails to resolve astro:middleware inside virtual
      // modules during build, and the built-in alias plugin crashes on null-byte prefixed
      // virtual module IDs. This plugin handles both issues.
      {
        name: 'fix-astro6-resolve',
        enforce: 'pre',
        resolveId(id) {
          if (id === 'astro:middleware') {
            return astroMiddlewarePath;
          }
        },
      },
    ],
    resolve: {
      alias: [],
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});
