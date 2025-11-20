# NovaSurf Browser

NovaSurf is a Windows‑first, AI‑assisted browser new‑tab experience with a real Chromium CDP bridge, domain‑filtered semantic search backed by Qdrant, local/on‑cloud embeddings, approvals for sensitive agent actions, and lightweight observability.

## Features
- CDP bridge backend: launch/connect Chromium via Chrome DevTools Protocol (targets, sessions, per‑tab contexts)
- Tab lifecycle and navigation with DOM snapshots and screenshots streaming
- Domain‑filtered search helpers and UI with snippet + anchor previews
- Embeddings: OpenAI or ONNX (WebGPU/WASM) with warm‑up status
- Memories store in Qdrant: payloads include `domain`, `ts`, `snippet`, `anchor_text`, `anchor_href`
- TTL cleanup and compaction jobs (dedup by `content_hash`, per‑domain quotas)
- Approvals UI with structured outcomes persisted to SQLite

## Requirements
- Node.js 18+ and npm
- Google Chrome (stable) installed
- Optional: Qdrant (Docker or Cloud) for semantic search and storage

## Install
```
npm install
```

## Run (Frontend)
```
npm run dev
```
Open `http://localhost:5173/`.

## Run (Coordinator CDP Bridge)
The backend WS server is implemented at `server/mock-coordinator-server.js`. It launches/attaches to Chromium and exposes a WebSocket API consumed by the frontend Coordinator.

Environment variables (examples in PowerShell):
```
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
$env:CDP_PORT="9222"
$env:WS_PORT="8787"
$env:WS_PATH="/atlas"
$env:CHROME_USER_DATA_DIR=".chrome-profile-cdp"
$env:CHROME_HEADLESS="false"
$env:ALLOWLIST_DOMAINS="example.com,another.com"
$env:LOGGED_OUT_DEFAULT="false"
$env:HEALTH_PORT="8789"
node server/mock-coordinator-server.js
```

Alternative: launch Chrome manually, then start the server.
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir=.chrome-profile-cdp \
  --remote-allow-origins=*
node server/mock-coordinator-server.js
```

Health endpoint: `http://localhost:8789/health` returns CDP connection status and counters.

## Qdrant Setup
- Docker: `docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest`
- Create collection with correct vector size and distance (examples):
  - OpenAI small embeddings: size `1536`, distance `Cosine`
  - ONNX MiniLM: size `384`, distance `Cosine`

Frontend env variables:
```
VITE_QDRANT_HOST=http://localhost:6333
VITE_QDRANT_COLLECTION=atlas
VITE_QDRANT_API_KEY=
VITE_EMBEDDING_SIZE=1536   # or 384 for ONNX
VITE_ONNX_MODEL=Xenova/all-MiniLM-L6-v2
```

## Domain‑Filtered Search & UI
- Type queries like `site:example.com your terms` to enable the domain toggle.
- Results are re‑ranked by anchors (`anchor_text`/`anchor_href`) and recent `ts`, with snippet/anchor previews.

## TTL Cleanup & Compaction
- TTL job deletes points with `ts` older than cutoff using payload filter.
- Compaction deduplicates by `content_hash` per domain and enforces per‑domain quotas to keep the warm tier efficient.

## Approvals & Logs
- Sensitive actions require approval; outcomes are persisted in SQLite and visible in the Approvals/Log viewer.

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck and build
- `npm run preview` — serve built assets on `5173`

## Notes
- Ensure Chrome is launched with the specified `--remote-debugging-port` before the bridge connects, or set `CHROME_PATH` so the server auto‑launches it.
- For Qdrant Cloud, set `VITE_QDRANT_HOST` to the TLS endpoint and provide `VITE_QDRANT_API_KEY`.

## Screenshots
- New Tab: `docs/screenshots/ntp.png`
- Domain‑Filtered Search: `docs/screenshots/domain-filter.png`
- Approvals & Logs: `docs/screenshots/approvals.png`
- CDP Health: `docs/screenshots/health.png`

To add images, create `docs/screenshots/` and save PNGs with the names above, then reference them here:
```
![NovaSurf New Tab](docs/screenshots/ntp.png)
![Domain‑Filtered Search](docs/screenshots/domain-filter.png)
![Approvals & Logs](docs/screenshots/approvals.png)
![CDP Health](docs/screenshots/health.png)
```