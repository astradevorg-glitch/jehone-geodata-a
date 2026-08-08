# jehone-geodata-a

Part A of the Jehonë offline global dataset. Chunks for the WDPA protected-areas PMTiles archive (`wdpa.pmtiles`, ~9.3 GB, z0–14). Source: UNEP-WCMC World Database on Protected Areas.

## Main file

`wdpa.pmtiles.manifest.json` is the **single source of truth** for the Jehonë PWA download manager and the verification tools. It lists every chunk of all three repos — `name`, `size`, `sha256`, and the raw URL for each part.

## Repo layout

| Repo | Chunks | Files |
|---|---|---|
| `jehone-geodata-a` (this repo) | part0000 … part0137 | 138 parts + manifest + tools |
| `jehone-geodata-b` | part0138 … part0275 | 138 parts + README |
| `jehone-geodata-c` | part0276 … part0413 | 138 parts + README |

Chunk size is 23 MiB (24,117,248 bytes), chosen to stay under the 25 MB GitHub browser upload limit per file.

## PWA usage

1. Fetch `wdpa.pmtiles.manifest.json` from this repo (`main` branch).
2. Download every chunk from its `url`, verify its `sha256`, store in IndexedDB.
3. Concatenate chunks in order = the original PMTiles archive; serve it via the `pmtiles` Maplibre protocol.

Tools (Node.js):

- `tools/split-parts.mjs` — split an archive into fixed-size parts.
- `tools/join-chunks.mjs` — verify sha256 of local parts and rejoin into the original archive.
- `tools/verify-remote.mjs` — download every chunk from `raw.githubusercontent.com`, verify sha256, optionally rejoin.

## Data license / attribution

Data © UNEP-WCMC and IUCN (WDPA). Used by Jehonë for conservation-education purposes.

Browse this staging on your desktop. Upload via GitHub's "Add file → Upload files" page (each drag accepts up to 100 files; this repo needs 2 drags + 1 for README/manifest/tools).