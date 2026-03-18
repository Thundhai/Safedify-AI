import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || '4500'}`,  // matches server default port
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Performance optimizations
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
    // Report chunk sizes
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // @reduxjs/toolkit@2.11.2 ships incomplete dist (missing modern.mjs)
      '@reduxjs/toolkit': path.resolve(__dirname, 'node_modules/@reduxjs/toolkit/dist/redux-toolkit.legacy-esm.js'),
    },
  },
});