/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'supabase-vendor', test: /node_modules[\\/](?:@supabase|iceberg-js)[\\/]/, priority: 25 },
            { name: 'router-vendor', test: /node_modules[\\/]react-router/, priority: 20 },
            { name: 'validation-vendor', test: /node_modules[\\/]zod[\\/]/, priority: 15 },
            { name: 'state-vendor', test: /node_modules[\\/]zustand[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
