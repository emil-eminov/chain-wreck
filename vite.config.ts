import { defineConfig } from 'vitest/config'

const OUT_DIR = process.env.CW_DIST ?? 'dist'

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'node',
    // Underscore-prefixed files are scratch: see tests/core/_probe.test.ts.
    include: ['tests/**/[!_]*.test.ts'],
  },
})
