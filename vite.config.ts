import { defineConfig } from 'vite';

// Чанки: three и astronomy-engine отдельно (кэшируются между релизами), source maps для Lighthouse/отладки.
export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/three/') && !id.includes('examples/jsm') ? 'three' : id.includes('astronomy-engine') ? 'astro' : undefined) } },
  },
});
