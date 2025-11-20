## Objectives
1. Generate embeddings, chunk pages, and index into Qdrant with payloads.
2. Add an in‑app Settings page to manage site AI visibility and cloud sync credentials.
3. Define and implement a WebSocket protocol and minimal backend to bridge the Coordinator client to the Chromium host and agent sandbox; stream DOM snapshots to the AI layer.

## Embeddings & Qdrant Integration
- Embedder Module:
  - File: `src/services/embeddings/Embedder.ts`
  - Methods: `embedText(text: string): Promise<number[]>`, `embedChunks(chunks: string[]): Promise<number[][]>`
  - Implementation: start with remote embeddings via GPT‑4o embeddings API; later add ONNX.js for local fallback. Use batching and caching.
- Chunking Pipeline:
  - File: `src/services/ai/SemanticIndexer.ts`
  - Steps: DOM snapshot → text extraction (exclude boilerplate) → tokenize → semantic compression (~40% reduction) → chunk by tokens (~512–1024) → per‑chunk metadata (page_id, url, title, section).
  - Use accessibility tree hints and heuristics for interactive elements; include bounding boxes for potential vision linkage.
- Qdrant Indexing:
  - Use existing `QdrantClient` (`src/services/qdrant/QdrantClient.ts`).
  - Ensure collection: `ensureCollection(size: 1536, distance: 'Cosine')` (or match chosen embedding size).
  - Upsert points: `{ id, vector, payload: { page_id, url, title, ts, section, token_count } }`.
  - Namespacing: `embeddings_{domain}` collection per domain or single collection with `domain` in payload.
- Data Flow:
  - On page snapshot: `SemanticIndexer.index(snapshot) → Embedder.embedChunks(chunks) → QdrantClient.upsert(points)`.
  - Query flow for NTP suggestions: `QdrantClient.search(vector, limit, filterByDomain)`.
- Performance & Storage Controls:
  - Batch embeds in groups of 8–16; parallel upserts.
  - TTL via payload field and periodic cleanup job.
  - Deduplicate chunks by content hash.

## Settings Page
- Route & Structure:
  - File: `src/pages/Settings.tsx` and route wiring in `src/main.tsx`.
  - Sections: Site AI Visibility, Cloud Sync.
- Site AI Visibility:
  - Use `SiteAiVisibility` service (`src/services/settings/SiteAiVisibility.ts`).
  - UI: domain list with add/remove, toggle visible/hidden, search/filter.
- Cloud Sync Credentials:
  - Use `Encryptor` and `CloudSync` (`src/services/crypto/Encryptor.ts`, `src/services/sync/CloudSync.ts`).
  - Fields: sync endpoint URL, bearer token (optional), local passphrase for encryption.
  - Save credentials encrypted locally: `CloudSync.saveLocalEncrypted('creds', { url, token }, passphrase)`.
  - Test sync: button triggers `CloudSync.push(url, samplePayload, passphrase, token)` and reports status.
- UX & Safety:
  - Warn on missing passphrase; never store plaintext tokens.
  - Export/import visibility settings as JSON (encrypted optional).

## WS Protocol & Backend Bridge
- Protocol Definition (JSON messages):
  - Handshake: `{ type: 'hello', agent: 'ntp', version: 1 }` → `{ type: 'welcome', sessionId }`.
  - Heartbeat: `{ type: 'ping' }` ↔ `{ type: 'pong' }`.
  - Tab Control (requests): `{ type: 'createTab', req: { url? } }`, `{ type: 'navigate', req: { tabId, url } }`.
  - Events (from backend): `{ type: 'tabCreated', id }`, `{ type: 'navigated', id, url }`.
  - DOM Snapshot streaming: `{ type: 'domSnapshot', id, snapshot: { title, html } }` with optional binary frames for screenshots.
  - Agent sandbox:
    - Plan: `{ type: 'agentPlan', id, steps }`.
    - Action exec: `{ type: 'agentAction', id, action, params }` → `{ type: 'agentResult', id, status, observation }`.
- Backend Implementation (Phase 1 minimal):
  - Language: Node.js service (later C++/Rust for tight Chromium integration).
  - Bridges:
    - Chromium host via DevTools Protocol (CDP) for tab creation/navigation and DOM snapshot.
    - Agent sandbox via Playwright in a separate browser context (logged‑out mode default).
  - Security:
    - Auth token for WS; domain allowlist and rate limiting on automation.
    - Logged‑out mode enforced unless explicitly approved.
  - Transport:
    - Text frames for control and DOM HTML; binary frames or base64 for screenshots.
    - Backpressure: queue with max in‑flight messages; drop or compress snapshots when congested.
- Client Wiring:
  - Extend `Coordinator` (`src/services/ipc/Coordinator.ts`) with handshake, ping/pong, auth header via query param.
  - Add `getDomSnapshot(tabId)` request; route `domSnapshot` events to `SemanticIndexer`.

## Testing & Verification
- Unit tests: Embedder chunking and Qdrant upsert/search mocks; SiteAiVisibility list ops; Encryptor encrypt/decrypt.
- Integration tests: WS protocol round‑trip against mock backend; DOM snapshot → index → search.
- Performance budgets: Indexing pipeline <200ms per typical page (excluding remote embed latency); WS round‑trip <100ms local.
- Security tests: Ensure no plaintext token storage; passphrase required for cloud sync; agent domain constraints.

## Milestones
1. Implement `Embedder` and `SemanticIndexer`; run indexing on mock snapshots.
2. Add `Settings` page with site visibility management and encrypted sync credentials.
3. Define WS protocol and implement minimal Node backend for tab/nav and DOM snapshots; hook Coordinator.
4. Verify end‑to‑end: navigate → snapshot → index → query suggestions; agent mock actions logged and gated.
