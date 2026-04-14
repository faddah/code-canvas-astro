// @ts-check
import { defineConfig } from 'astro/config';

import clerk from '@clerk/astro';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

import fs from 'fs';

const certKey  = '.certs/localhost+2-key.pem';
const certCert = '.certs/localhost+2.pem';
const hasCerts = fs.existsSync(certKey) && fs.existsSync(certCert);

const viteServer = hasCerts
  ? {
      https: {
        key:  fs.readFileSync(certKey),
        cert: fs.readFileSync(certCert),
      },
    }
  : undefined;

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

  // ...existing config...
  vite: {
    ...(viteServer ? { server: viteServer } : {}),
    // @ts-ignore - Vite plugin version mismatch between Astro and @tailwindcss/vite
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: [],
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});
