import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_URL = process.env.MANIFEST_URL ||
  'https://raw.githubusercontent.com/astradevorg-glitch/jehone-geodata-a/main/wdpa.pmtiles.manifest.json'
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, '..', 'download')
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '6', 10)
const REJOIN = process.env.REJOIN === '1' || process.argv.includes('--rejoin')

const manifest = await (await fetch(MANIFEST_URL)).json()
if (!manifest.chunks?.length) throw new Error('manifest missing chunks')
console.log(`manifest: ${manifest.totalBytes} bytes across ${manifest.chunks.length} chunks`)

fs.mkdirSync(OUT_DIR, { recursive: true })

let ok = 0
let failed = []
const failedMut = new Set()
let queue = [...manifest.chunks]

async function worker() {
  for (;;) {
    const chunk = queue.shift()
    if (!chunk) return
    const dest = path.join(OUT_DIR, chunk.name)
    try {
      const res = await fetch(chunk.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const digest = crypto.createHash('sha256').update(buf).digest('hex')
      if (digest !== chunk.sha256) throw new Error(`sha256 mismatch: ${digest} != ${chunk.sha256}`)
      if (buf.length !== chunk.size) throw new Error(`size mismatch: ${buf.length} != ${chunk.size}`)
      fs.writeFileSync(dest, buf)
      process.stdout.write(`${chunk.name} ok\n`)
      ok++
    } catch (e) {
      failedMut.add(chunk.name)
      process.stdout.write(`${chunk.name} FAILED ${e.message || e}\n`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
failed = [...failedMut]

console.log(`\nverified: ${ok}/${manifest.chunks.length}  failed: ${failed.length}`)
if (failed.length) {
  console.log('failed:', failed.join(', '))
  process.exit(1)
}

if (REJOIN) {
  const dest = path.join(OUT_DIR, 'wdpa.pmtiles')
  await fs.promises.rm(dest, { force: true })
  const handle = await fs.promises.open(dest, 'w')
  try {
    for (const chunk of manifest.chunks) {
      const buf = await fs.promises.readFile(path.join(OUT_DIR, chunk.name))
      await handle.write(buf)
    }
  } finally {
    await handle.close()
  }
  const { size } = fs.statSync(dest)
  console.log(`rejoined: ${dest} (${size} bytes)`)
  if (size !== manifest.totalBytes) {
    console.error('rejoined size mismatch!')
    process.exit(1)
  }
}