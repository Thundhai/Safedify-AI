import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 3001,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  resolve: {
    alias: {
      // This allows you to use '@' to refer to your 'src' folder
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Charts library - separate chunk
          'recharts': ['recharts'],
          
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // AI/ML libraries 
          'ai-vendor': ['@google/genai', 'react-markdown'],
          
          // UI libraries
          'ui-vendor': ['lucide-react'],
        }
      }
    },
    // Increase chunk size warning limit since we're optimizing manually
    chunkSizeWarningLimit: 1000
  },
  publicDir: 'public'
  // We removed the 'define' section because we are now using 
  // import.meta.env.VITE_GEMINI_API_KEY which is the standard Vite way.
});