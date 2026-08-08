#!/usr/bin/env node
// Splits a PMTiles archive into <100MB parts for hosting on GitHub as plain repo files.
// Usage: node split-parts.mjs <archive.pmtiles> <outDir> [partSizeMB=95]
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const [archivePath, outDir, sizeArg] = process.argv.slice(2)
if (!archivePath || !outDir) {
  console.error('Usage: node split-parts.mjs <archive.pmtiles> <outDir> [partSizeMB=95]')
  process.exit(1)
}

const PART_MB = Number(sizeArg ?? 95)
const PART_BYTES = PART_MB * 1024 * 1024
const stat = fs.statSync(archivePath)
const total = stat.size

fs.mkdirSync(outDir, { recursive: true })
const parts = []
const fd = fs.openSync(archivePath, 'r')
const buf = Buffer.allocUnsafe(16 * 1024 * 1024)

let index = 0
let offset = 0
while (offset < total) {
  const name = `${path.basename(archivePath)}.part${String(index).padStart(3, '0')}`
  const outPath = path.join(outDir, name)
  const hash = createHash('sha256')
  let written = 0
  const out = fs.openSync(outPath, 'w')
  while (written < PART_BYTES && offset < total) {
    const want = Math.min(buf.length, PART_BYTES - written, total - offset)
    const got = fs.readSync(fd, buf, 0, want, offset)
    if (got <= 0) break
    hash.update(buf.subarray(0, got))
    fs.writeSync(out, buf.subarray(0, got))
    offset += got
    written += got
  }
  fs.closeSync(out)
  parts.push({ name, size: written, sha256: hash.digest('hex') })
  console.log(`${name}  ${(written / 1024 / 1024).toFixed(1)}MB`)
  index++
}
fs.closeSync(fd)

const manifest = {
  archive: path.basename(archivePath),
  totalBytes: total,
  partBytes: PART_BYTES,
  partCount: parts.length,
  parts,
}
const manifestPath = path.join(outDir, `${path.basename(archivePath)}.manifest.json`)
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log(`\nManifest: ${manifestPath}`)
console.log(`Parts: ${parts.length}, total: ${(total / 1024 / 1024 / 1024).toFixed(2)}GB`)
