/**
 * Packs the built game into one self-contained HTML file.
 *
 * This single file is the playtest build, the artifact Emil opens on his phone,
 * and the basis of the playable ad. Nothing is fetched at runtime: the Rapier
 * WASM is already base64 inside the bundle, and the bundle is inlined here.
 *
 * Emits a FRAGMENT, not a document: the artifact host wraps it in its own
 * doctype, head and body, and a nested <html> would be dropped.
 *
 * Usage: node scripts/build-single.mjs [outputPath]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const dist = process.env.CW_DIST ?? join(homedir(), 'cw-build', 'dist')
const out = process.argv[2] ?? join(dist, 'chain-wreck.html')

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const match = html.match(/src="([^"]+\.js)"/)
if (!match) throw new Error(`No script tag found in ${join(dist, 'index.html')}`)

const bundle = readFileSync(join(dist, match[1].replace(/^\.\//, '')), 'utf8')
// A literal </script> anywhere in the bundle would close the tag early.
const safe = bundle.replaceAll('</script', '<\\/script')

writeFileSync(
  out,
  `<title>Chain Wreck</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #6f8ba8; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
<canvas id="stage"></canvas>
<script type="module">${safe}</script>
`,
)

const bytes = Buffer.byteLength(readFileSync(out))
console.log(`${out}  ${(bytes / 1024 / 1024).toFixed(2)} MB`)
if (bytes > 5 * 1024 * 1024) {
  console.error('Over the 5MB budget in SPEC section 7.')
  process.exit(1)
}
