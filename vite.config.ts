import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative paths for Chrome extension compatibility
  base: '',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // DevTools panel (React app)
        panel: resolve(__dirname, 'panel.html'),
        // DevTools entry (creates the panel)
        devtools: resolve(__dirname, 'public/devtools.html'),
        // Background service worker
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        // Content script
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
        // Injected interceptor (runs in page context)
        interceptor: resolve(__dirname, 'src/injected/interceptor.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep service worker and scripts at root level
          if (
            chunkInfo.name === 'service-worker' ||
            chunkInfo.name === 'content-script' ||
            chunkInfo.name === 'interceptor'
          ) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Don't minify for easier debugging during development
    minify: false,
  },
});
