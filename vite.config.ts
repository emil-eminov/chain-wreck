import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Build output goes OUTSIDE the synced project folder.
 *
 * The folder is mounted without delete permission, so Vite cannot clear its
 * own out-dir there and every rebuild after the first fails with EPERM.
 * Keeping dist out of the mount also stops a 3MB bundle from churning in the
 * user's Downloads folder on every build.
 */
const OUT_DIR = process.env.CW_DIST ?? join(homedir(), 'cw-build', 'dist')

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
