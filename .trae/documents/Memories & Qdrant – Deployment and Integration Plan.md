## Objectives
- Deploy and configure a Qdrant instance with proper auth, schema, and performance settings.
- Provide domain‑filtered query helpers and UI affordances across panels.
- Add periodic compaction and smarter TTL cleanup jobs aligned with the Memories tiers.

## Deployment & Configuration
- Deployment options:
  - Docker: `qdrant/qdrant:latest` with mounted volumes for persistence.
  - Cloud: Qdrant Cloud or managed instance; enable TLS and API key.
- Env + App config:
  - `VITE_QDRANT_HOST`, `VITE_QDRANT_COLLECTION`, `VITE_QDRANT_API_KEY`, `VITE_EMBEDDING_SIZE` (1536 OpenAI or 384 ONNX).
  - Health checks: `GET /collections` reachable; app shows status badge if unreachable.
- Collection schema:
  - Create collection with vectors `{ size: EMBEDDING_SIZE, distance: 'Cosine' }`.
  - Payload fields: `page_id`, `url`, `title`, `ts`, `domain`, `section`, `content_hash`, `snippet`, `anchor_text`, `anchor_href`.
  - Optimizer config: HNSW defaults; tune `m`, `ef_construct`, `ef_search` if needed; enable memmap for large datasets.

## Domain‑Filtered Query Helpers
- Service API:
  - `search(query, limit, domain?)` → embed query → filter `{ must: [{ key: 'domain', match: { value: domain } }] }` → `points/search`.
  - Relevance post‑processing: boost points with `anchor_text`/`anchor_href` and recent `ts`.
- UI affordances:
  - Panels: show a domain filter pill when query contains `site:domain` or a detected domain token.
  - Toggle to widen/narrow domain scope; show `snippet` + anchor preview; fallback when empty.
- Verification:
  - Known domain queries populate panels within <200ms after Qdrant response; log errors gracefully when offline.

## Memories Tier Alignment
- Hot (RAM): last 50 queries; used for UI suggestions; no Qdrant calls.
- Warm (SSD/Qdrant): last 7 days embeddings with fast HNSW search; store `ts` and `domain`.
- Cold (Cloud): optional sync of full history; controlled via Settings; encrypt before upload.

## TTL Cleanup & Compaction
- TTL cleanup job:
  - Delete points with `ts < now - TTL` using `points/delete` with `filter: { must: [{ key: 'ts', range: { lt: cutoff } }] }`.
  - Run daily; skip when host unreachable; log metrics (deleted count).
- Smarter compaction:
  - Deduplicate content by `content_hash` per `domain`; keep the most recent section.
  - Enforce per‑domain quotas (e.g., max N points); delete oldest beyond quota.
  - Optional: size‑based compaction (delete oldest until under target collection size).
- Optimizer tuning:
  - Adjust HNSW `ef_search` for latency/recall; consider `exact` search for small collections.

## Security & Auth
- API key required; never store plaintext in local storage; read from env at build time.
- Prefer TLS on managed instances; restrict egress to Qdrant host.
- Log only point IDs and minimal metadata; avoid dumping payloads in logs.

## Testing & Monitoring
- Unit tests: filter construction, search mapping, ranking boosts, TTL filter generation.
- Integration tests: embed → upsert → search with domain filter; compaction deletes old/duplicate points.
- Observability: counters for upserts, searches, deletes; latency histograms; error rates.

## Milestones
1. Deploy Qdrant instance and verify collection creation with correct vector size.
2. Wire domain‑filtered search helpers and enrich UI panels with previews.
3. Implement TTL cleanup and content‑hash dedup per domain; add quotas.
4. Tune optimizer/search params and add monitoring dashboards for latency and error rates.