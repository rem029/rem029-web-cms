import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'payload/node'
import { defineConfig } from 'vitest/config'

// Tests run on their own database: `.env.test` (git-ignored, copy `.env.test.example`).
if (process.env.NODE_ENV !== 'test') {
  throw new Error('tests: run tests with pnpm test, it sets NODE_ENV=test')
}
if (!existsSync('.env.test')) {
  throw new Error(
    'tests: missing .env.test: copy .env.test.example and point DATABASE_URI at a local *_test database',
  )
}
loadEnv()

const dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@payload-config': path.resolve(dirname, 'src/payload.config.ts'),
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globalSetup: ['tests/common/globalSetup.ts'],
    setupFiles: ['tests/common/setup.ts'],
    // one shared test db: files run one after another
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})
