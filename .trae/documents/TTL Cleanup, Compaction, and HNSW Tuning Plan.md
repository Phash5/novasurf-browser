## Objectives

* Implement TTL cleanup (scheduled deletions based on `ts` cutoff) and domain-aware compaction (dedup by `content_hash`, per-domain quotas).

* Tune HNSW search parameters (e.g., `ef_search`) and support exact search for small collections.

* Add monitoring for upsert/search/delete counts, latency, and error rates to guide tuning.

## Cleanup & Compaction

* TTL Cleanup (daily):

  * Use `points/delete` with filter: `{ must: [{ key: 'ts', range: { lt: cutoff } }] }`.

  * Integrate with existing cleanup job; log deleted count and failures.

* Compaction (daily or hourly):

  * Dedup per domain by `content_hash`:

    * Scroll points: `points/scroll` with filter `{ must: [{ key: 'domain', match: { value: d }}] }` and select oldest duplicates to delete.

    * Delete via `points/delete` with list of ids.

  * Enforce per-domain quotas (e.g., `maxPointsPerDomain`):

    * For each domain, if total > quota, delete oldest until under quota.

  * Configurables:

    * `TTL_MS`, `MAX_POINTS_PER_DOMAIN`, `COMPACTION_INTERVAL_MS`.

## HNSW Tuning & Exact Mode

* Per-request tuning:

  * Add optional `params` in search body: `{ hnsw_ef: 64 | 128 }`.

  * Provide `exact: true` for small sets when recall is critical and latency acceptable.

* Collection-level tuning:

  * Consider updating optimizer settings (HNSW M, `ef_construct`) only after profiling; default often sufficient.

* UI affordance:

  * Expose a developer setting to override `ef_search` globally for test sessions.

## Monitoring & Observability

* Metrics:

  * Counters: `qdrant_upserts_total`, `qdrant_searches_total`, `qdrant_deletes_total`.

  * Histograms: `qdrant_search_latency_ms`, `qdrant_upsert_latency_ms`, `qdrant_delete_latency_ms`.

  * Error rates: per operation and HTTP status distribution.

* Implementation:

  * Wrap QdrantClient methods to record metrics and timing; tag by domain where available.

  * Optional: push to a lightweight in-app dashboard or log to console; later integrate OpenTelemetry.

## Testing & Safety

* Dry-run compaction mode (log candidates without deleting) for initial validation.

* Unit tests for TTL filter generation and dedup selection logic.

* Integration tests with seeded data: duplicates per domain, quota enforcement, latency measurement at different `ef_search` values.

## Milestones

1. Extend cleanup job with deleted count logging; parameterize TTL.
2. Implement compaction job: scroll, dedup by `content_hash`, per-domain quota enforcement.
3. Add `ef_search`/`exact` flags in search helper; expose developer setting.
4. Add metrics collection wrappers and a simple dashboard/logging.
5. Validate with test data; tune parameters based on observed latency/recall.

