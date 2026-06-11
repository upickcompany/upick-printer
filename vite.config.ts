import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['escpos', 'escpos-network', 'electron-store', '@supabase/supabase-js']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'esm',
                entryFileNames: '[name].mjs'
              }
            }
          }
        },
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
})
