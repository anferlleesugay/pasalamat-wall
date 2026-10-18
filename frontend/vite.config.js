import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development (npm run dev), forward API calls to the
// containers on your laptop. In Docker, the Nginx proxy does this instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/notes': 'http://localhost:8080',
      '/api/studio': 'http://localhost:4000',
    },
  },
});
