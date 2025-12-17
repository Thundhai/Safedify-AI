import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      // This allows you to use '@' to refer to your 'src' folder
      '@': path.resolve(__dirname, './src'),
    },
  },
  // We removed the 'define' section because we are now using 
  // import.meta.env.VITE_GEMINI_API_KEY which is the standard Vite way.
});