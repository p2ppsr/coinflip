import { defineConfig } from 'vite'
import nodeResolve from '@rollup/plugin-node-resolve' // Helps in resolving the 'crypto-browserify'
import commonjs from '@rollup/plugin-commonjs' // Convert CommonJS modules to ES6
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true
      }
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ],
  server: {
    port: 3000,
    watch: {
      usePolling: true,
    }
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      buffer: 'buffer/'
    }
  }
})
