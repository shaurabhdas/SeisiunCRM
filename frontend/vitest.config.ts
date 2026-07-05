import { defineConfig } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  test: {
    setupFiles: ['__tests__/setup.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
