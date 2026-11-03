// Copies MediaPipe's WASM runtime into public/ so the site serves it itself.
// MediaPipe's default CDN isn't reachable everywhere (e.g. mainland China).
// Runs before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const to = join(root, 'public', 'mediapipe', 'wasm')

// Only the files the browser loads: the SIMD build and the fallback for older browsers
const files = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

mkdirSync(to, { recursive: true })
for (const file of files) {
  const source = join(from, file)
  if (!existsSync(source)) {
    console.error(`Missing ${source}; run npm install first.`)
    process.exit(1)
  }
  copyFileSync(source, join(to, file))
}
console.log(`Copied MediaPipe WASM to ${to}`)
