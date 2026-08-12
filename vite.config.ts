/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const release = env.VERCEL_GIT_COMMIT_SHA || env.VITE_APP_RELEASE || 'local'
  const canUploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT)

  return {
  define: {
    __APP_RELEASE__: JSON.stringify(release),
  },
  plugins: [
    react(),
    tailwindcss(),
    canUploadSourceMaps && sentryVitePlugin({
      authToken: env.SENTRY_AUTH_TOKEN,
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      release: { name: release },
      sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      telemetry: false,
    }),
  ].filter(Boolean),
  build: {
    sourcemap: canUploadSourceMaps ? 'hidden' : false,
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
  }
})
