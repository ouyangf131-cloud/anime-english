import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://ouyangf131-cloud.github.io/anime-english/
export default defineConfig({
  base: process.env.BASE_PATH || '/anime-english/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
  server: { host: true },
});
