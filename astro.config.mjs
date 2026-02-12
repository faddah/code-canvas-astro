// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
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