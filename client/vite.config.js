import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Project site at https://mukilr.github.io/roots/ — asset URLs need this prefix.
  base: '/roots/',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
