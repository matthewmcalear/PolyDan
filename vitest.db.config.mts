import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': import.meta.dirname } },
  test: { include: ['lib/**/*.db.test.ts'], testTimeout: 20000 },
})
