#!/usr/bin/env node
// Recombines chunked parts back into a single PMTiles archive.
// Usage: node join-chunks.mjs <partsDir> [outputFile]
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const [partsDir, outArg] = process.argv.slice(2)
if (!partsDir) {
  console.error('Usage: node join-chunks.mjs <partsDir> [outputFile.pmtiles]')
  process.exit(1)
}

const manifestPath = path.join(partsDir, fs.readdirSync(partsDir).find((f) => f.endsWith('.manifest.json')) ?? '')
if (!fs.existsSync(manifestPath)) {
  console.error(`No manifest found in ${partsDir}`)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const outPath = outArg ?? path.join(partsDir, manifest.archive)

const out = fs.openSync(outPath, 'w')
let total = 0
for (const part of manifest.parts) {
  const p = path.join(partsDir, part.name)
  const hash = createHash('sha256')
  const data = fs.readFileSync(p)
  hash.update(data)
  if (hash.digest('hex') !== part.sha256) {
    console.error(`Checksum mismatch: ${part.name} — aborting`)
    process.exit(1)
  }
  fs.writeSync(out, data)
  total += data.length
  console.log(`ok ${part.name}`)
}
fs.closeSync(out)

if (total !== manifest.totalBytes) {
  console.error(`Size mismatch: got ${total}, expected ${manifest.totalBytes}`)
  process.exit(1)
}
console.log(`\nDone: ${outPath} (${(total / 1024 / 1024 / 1024).toFixed(2)}GB)`)