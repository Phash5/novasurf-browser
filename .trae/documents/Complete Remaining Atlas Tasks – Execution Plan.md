## Scope & Outcomes
Deliver a working Windows-first Atlas-like browser with: CDP-connected Chromium host, AI search and embeddings, robust memories with Qdrant, safe agent automation, privacy controls, and release-ready performance and QA.

## Phase 1 – Chromium Host Bridge
- Implement Node backend CDP bridge: launcher, session management, tab/context registry, WS routing.
- Features: create/close/activate tabs, navigate, `getDomSnapshot`, `getScreenshot` (viewport/full-page).
- Isolation: per-tab `browserContextId` (logged-out mode), domain allowlists, cleanup on close.
- Reliability: debounce snapshots, cap screenshot FPS, backpressure queues, reconnect on detach.
- Acceptance: 10+ tabs stable; snapshots <200ms, screenshots <300ms; isolation validated.

## Phase 2 – AI Runtime & Chat
- Replace mock chat with GPT‑4o streaming client with retries, caching, and token streaming UI.
- Embeddings: use OpenAI (1536) or ONNX (384) end-to-end; validate Qdrant dimension at startup.
- Semantic compression & batching: chunk size 512–1024, dedupe by `content_hash`, batched embedding (8–16), cache hits.
- Acceptance: <2s perceived responses on typical pages; correct dimension validation; fallbacks when offline.

## Phase 3 – Memories & Qdrant
- Deploy Qdrant (Docker or Cloud) and set envs: host, collection, API key, embedding size.
- Index payloads: `page_id`, `url`, `title`, `domain`, `ts`, `section`, `content_hash`, `snippet`, `anchor_text`, `anchor_href`.
- Domain-filtered search: helper with `payload.domain` filter; ranking boost with anchors and `ts` recency.
- UI affordances: domain toggle pill; display snippet and anchor preview; caching & debounce.
- Acceptance: domain queries return ranked results; panels reflect filter state; stable searches.

## Phase 4 – TTL Cleanup & Compaction
- TTL cleanup: daily deletion by `ts` cutoff via `points/delete` filter; log deleted counts.
- Compaction: per-domain dedup by `content_hash`; quotas (max points/domain), delete oldest beyond limit.
- HNSW tuning: expose `ef_search` override; consider exact mode for small sets; profile latency/recall.
- Acceptance: warm tier stays within quotas; search latency within targets; observable metrics recorded.

## Phase 5 – Agent Sandbox
- Playwright-based control surface bound to CDP/Coordinator; logged-out context; domain allowlists.
- Approvals: request/response loop; sensitive actions gated; action logs persisted with outcomes.
- Observability: screenshots, diffs, agent logs in SQLite; UI for approvals and history with filters.
- Acceptance: end-to-end tasks (navigate/click/type/scroll/extract) succeed with approvals; logs visible.

## Phase 6 – Privacy & Security
- Per-site AI visibility enforcement at runtime; parental controls (categories/time limits).
- Secrets: env-based keys only; encrypted cloud sync; no plaintext storage; audit logging minimal.
- Acceptance: toggles respected; parental controls block as configured; security review passes.

## Phase 7 – Settings & UX Polish
- Full settings page: credentials, visibility lists, sync status; domain badges & filters in panels.
- Loading states: embeddings warm-up badge; error boundaries; router refinements.
- Acceptance: smooth UX across NTP, Settings, Approvals; clear status indicators.

## Phase 8 – Performance & Observability
- Startup pre-warm: host, embeddings; GPU/WebGPU offload paths; model quantization options.
- Telemetry: upsert/search/delete counters; latency histograms; error rates; crash reporting.
- Acceptance: startup <1s UI display; AI <2s perceived; telemetry dashboard shows healthy metrics.

## Phase 9 – Testing & Release
- Tests: unit (IPC, indexers, ranking, approvals), integration (CDP flows, agent tasks), performance gates.
- Packaging: Windows installer; beta hardening; crash-free rate targets.
- Acceptance: all gates green; beta distributed successfully.

## Dependencies & Config
- Env: `VITE_QDRANT_HOST`, `VITE_QDRANT_COLLECTION`, `VITE_QDRANT_API_KEY`, `VITE_EMBEDDING_SIZE`, `VITE_ONNX_MODEL`.
- Backend envs: `CHROME_PATH`, `CDP_PORT`, `WS_PORT`, `ALLOWLIST_DOMAINS`, `LOGGED_OUT_DEFAULT`.

## Timeline (Indicative)
- Phases 1–3: 3–4 weeks (bridge + AI + memories/search). 
- Phases 4–5: 3 weeks (cleanup/compaction/tuning + agent sandbox).
- Phases 6–9: 3–4 weeks (privacy/security, UX, perf/observability, tests/release).

## Deliverables
- Running CDP bridge service and Coordinator integration.
- AI search with embeddings and domain-aware ranking in panels.
- Qdrant cleanup/compaction with metrics; HNSW tuning options.
- Agent sandbox with approvals and logs; privacy controls enforced.
- Performance and QA artifacts; Windows installer for beta.