## Objectives
- Add domain-filtered search to NTP panels, powered by Qdrant and embeddings.
- Persist agent logs to SQLite and display detailed action parameters/outcomes inline.
- Optimize ONNX embeddings: configurable model and optional WebGPU device selection.

## Implementation Plan
- Search Service:
  - Create `src/services/SearchService.ts` with `search(query)` and `extractDomainFromQuery(query)`.
  - Flow: embed query → build Qdrant filter `{ must: [{ key: 'domain', match: { value } }] }` (if domain detected) → `QdrantClient.search` → map payloads to UI items.
  - Update NTP panels (`LinksPanel`, `ImagesPanel`, `VideosPanel`, `NewsPanel`) to use async search with fallback stubs when `QDRANT_HOST` is unset.
- Logs Persistence:
  - Extend `Db` with `createSession()` returning session id and `recentAgentActions(limit)`.
  - In `ApprovalsPanel`, create a session on mount; on `approvalRequest` and `agentResult`, insert records into `agent_actions` with action/params/result.
  - Expand logs UI to show params and outcomes from SQLite; display newest first.
- ONNX Optimizations:
  - In `OnnxEmbeddingsProvider`, use configurable model via `VITE_ONNX_MODEL` with default `Xenova/all-MiniLM-L6-v2`.
  - Attempt `device: 'webgpu'` when available; fallback to WASM.
  - Keep dynamic dimension reporting and batching.

## Verification
- Run a query with a domain token (e.g., "site:example.com atlases") and confirm filtered Qdrant results populate panels.
- Trigger agent approval flows; verify actions and results are saved to SQLite and visible in Approvals panel.
- Measure ONNX warm-up; if high, switch to smaller model via env.

## Risks & Mitigations
- Qdrant unavailable → panels fallback to stubs.
- WebGPU unsupported → automatic fallback to WASM.
- Schema changes → dimension validated before upsert; log persistence uses robust insertion and session creation.
