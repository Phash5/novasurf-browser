## Objectives
- Set `QDRANT_HOST`, verify collection dimensions vs embedding size, and wire queries.
- Replace the deterministic `Embedder` with an API/ONNX-backed provider and add caching.
- Expand the WS protocol for agent planning/execution with approval flows and safety gates.
- Introduce a proper router (`react-router-dom`) for clean navigation.

## Qdrant Configuration & Validation
- Config: Use env-driven Vite variables (`import.meta.env.VITE_QDRANT_HOST`, `VITE_QDRANT_API_KEY`, `VITE_QDRANT_COLLECTION`).
- Dimension match: Choose `text-embedding-3-small` (1536 dims) or your preferred model size; set `EMBEDDING_SIZE` accordingly.
- Validation: On startup, call `ensureCollection(size, 'Cosine')` and read back schema to confirm vector size; log mismatch and block indexing until aligned.
- Namespacing: Single collection with `domain` payload field, or per-domain collections if preferred.

## Embeddings Provider (API + ONNX Fallback)
- Interface: `src/services/embeddings/EmbeddingsProvider.ts` with `embedText`, `embedChunks`.
- API Impl: `OpenAIEmbeddingsProvider` using `text-embedding-3-small` (1536) via REST; batch requests (8–16), retry/backoff, cache by content hash.
- ONNX Impl: `OnnxEmbeddingsProvider` using `onnxruntime-web` and a small sentence-transformers model; quantized weights, lazy-loaded.
- Provider Resolver: `Embeddings.use()` chooses API if key present; otherwise ONNX; export a single facade to callers.
- Migration: Replace all `Embedder` usages with `EmbeddingsProvider` facade; remove deterministic hashing.

## WS Protocol Expansion (Agent Planning/Execution + Approvals)
- Messages (client→backend):
  - `{ type: 'agentIntent', intent }`
  - `{ type: 'agentPlanRequest', tabId, context }`
  - `{ type: 'agentExecute', id, action, params }`
  - `{ type: 'approvalResponse', requestId, approved, reason? }`
- Messages (backend→client):
  - `{ type: 'agentPlan', id, steps }`
  - `{ type: 'approvalRequest', requestId, action, params, risk }`
  - `{ type: 'agentResult', id, status, observation }`
  - `{ type: 'agentLog', id, event, ts }`
- Safety:
  - Domain allowlist, rate limits, logged-out mode default; elevate only via approval.
  - Sensitive actions (form submit, downloads, clipboard, navigation off-domain) always require approval.
- Client changes:
  - Extend `Coordinator` to send/receive new messages and expose hooks.
  - Add an approvals UI panel in the app to show pending requests and allow/deny.
- Backend changes:
  - Update the mock server with new message types; later bridge to Playwright/Chromium host.

## Routing with `react-router-dom`
- Install and add `BrowserRouter` with routes: `/` (NTP), `/settings`, `/agent` (future panel), `/approvals`.
- Replace in-memory switcher with `Link`-based nav; preserve existing NTP and Settings pages.

## Testing & Verification
- Qdrant: Collection ensure/read-back and dimension assertion; upsert/search smoke tests.
- Embeddings: Unit tests for batching, caching, and ONNX fallback; hash-based cache hit ratio.
- Protocol: WS round-trip tests with mock server for plan/approval/action and DOM snapshot indexing.
- Routing: Navigation tests ensuring URLs reflect views and back/forward works.

## Risks & Mitigations
- API key leakage: Use env vars; never store plaintext; require passphrase for cloud-synced creds.
- Embedding latency: Batch, cache, and defer indexing when offline; run background jobs.
- Qdrant size/perf: TTL payloads, periodic cleanup, filter by domain for queries.
- WS reliability: Heartbeats and reconnection; backpressure on snapshot streaming.

## Deliverables
1. Env-configured Qdrant host with dimension validation and indexing enabled.
2. Embeddings provider (API + ONNX) integrated into the semantic pipeline.
3. Expanded WS protocol with approvals and agent message handling in `Coordinator` and mock backend.
4. Router installed with clean routes for NTP and Settings (foundation for agent/approvals UI).