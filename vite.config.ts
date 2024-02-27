import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react-swc'
import NodePolyfills from 'rollup-plugin-polyfill-node'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    NodePolyfills({
      include: ['crypto', 'buffer']
    }),
    nodePolyfills()
  ],
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      crypto2: path.resolve(__dirname, './src/polyfills/crypto.ts')
    }
  },
  define: {
    'process.env': {},
    global: {}
  },
  build: {
    rollupOptions: {
      plugins: [
        // Include the polyfill plugin in the Rollup build as well
        NodePolyfills()
      ]
    }
  }
})
