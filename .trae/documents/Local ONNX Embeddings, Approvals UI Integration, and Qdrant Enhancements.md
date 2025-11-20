## Objectives
- Replace the local deterministic fallback with true in‑browser ONNX embeddings.
- Integrate Approvals and Agent Logs into the main app shell for real‑time visibility and control.
- Extend Qdrant usage with domain filters and warm‑cache TTL cleanup.

## Local ONNX Embeddings
- Library Choice:
  - Use `@xenova/transformers` (browser‑friendly, ONNX under the hood) for a plug‑and‑play embeddings pipeline.
  - Model: `sentence-transformers/all-MiniLM-L6-v2` (384 dims) for fast, compact embeddings.
- Implementation:
  - File: `src/services/embeddings/OnnxEmbeddingsProvider.ts`.
  - Initialize once: load pipeline `feature-extraction` with the chosen model; cache across calls.
  - Methods: `embedText(text)`, `embedChunks(chunks)` returning normalized vectors.
  - Update provider resolver to prefer ONNX when API key is absent; set `EMBEDDING_SIZE=384` when ONNX is active.
  - Batching: process 8–16 chunks per call; throttle and cache by content hash.
- Performance:
  - Lazy load on first use; show “warming up” state.
  - Use WebAssembly backend for broad compatibility; enable WebGPU if available.
- Verification:
  - Compare vector dimension to Qdrant collection schema; log and block indexing on mismatch.

## Approvals UI & Agent Logs
- Approvals Integration:
  - Add a persistent shell panel accessible from all pages (top‑right toggle).
  - Show pending approvals with action, params, and risk; Approve/Deny sends `approvalResponse` via `Coordinator`.
  - Route: keep `/approvals` but also expose inline panel for quick actions.
- Agent Logs:
  - Extend `Coordinator` to handle `agentLog` events (already scaffolded in protocol expansion).
  - Storage: write logs and executed actions to SQLite (`agent_actions` table) with timestamps and results.
  - UI: Add a logs view under Approvals panel: stream new logs, filter by tab/domain, and show recent history.
- References for wiring:
  - Client handlers in `src/services/ipc/Coordinator.ts` to subscribe to `approvalRequest`, `agentResult`, `agentLog`.
  - UI component: `src/components/ApprovalsPanel.tsx` embedded into `src/App.tsx` shell.

## Qdrant Domain Filters & TTL Cleanup
- Domain Filters:
  - Index payloads with `domain` extracted from page URL.
  - For suggestions and search, pass `filter: { must: [{ key: 'domain', match: { value: targetDomain } }] }`.
- Warm‑Cache TTL (Qdrant):
  - Strategy: mark payload with `ts` and periodically remove points older than TTL (e.g., 7 days).
  - Add new client method: `deleteByFilter(filter)` in `QdrantClient` calling REST delete endpoint.
  - Background job: run daily cleanup; skip if offline/unreachable.
- Dimension Alignment:
  - If ONNX (384 dims) and previous collection was 1536, re‑create or use a new collection name (e.g., `atlas_384`) to prevent mismatch.

## Testing & Verification
- Embeddings:
  - Sanity test: run `embedText` on known sentences and assert dimension and non‑zero norm.
  - Performance test: measure warm‑up and per‑chunk latency.
- Approvals & Logs:
  - Simulate `agentPlanRequest` → `approvalRequest` → `approvalResponse` round‑trip against mock WS; verify entries in SQLite and UI display.
- Qdrant:
  - Ensure collection dimension check; upsert/search with domain filter; TTL cleanup deletes old points.

## Milestones
1. Implement ONNX provider and switch resolver; set dynamic `EMBEDDING_SIZE` with dimension validation.
2. Add Approvals inline panel and Agent Logs UI + storage.
3. Extend Qdrant client for filters and deletion; implement background TTL cleanup job.
4. End‑to‑end verification: snapshot → index with ONNX → domain‑filtered search; approvals loop and logs streamed and persisted.

## Risks & Mitigations
- Model load size/time → lazy load, cache pipeline, consider smaller models if needed.
- Browser compatibility → use WASM backend; conditionally enable WebGPU.
- Qdrant dimension mismatch → separate collection per dimension or migration routine.
- Security → approvals enforce logged‑out mode unless explicitly elevated; redact sensitive params in logs; no plaintext credentials.