## Objectives
- Use `anchor_text`/`anchor_href` to re-rank results and display link previews in NTP panels.
- Add an ONNX warm-up status label in the main app UI.
- Expand agent action persistence with structured outcome fields for better filtering and analytics.

## Changes
- Ranking & Previews:
  - Re-rank Qdrant results in `LinksPanel` using presence/length of `anchor_text` and `anchor_href`.
  - Display `anchor_text` as preview and show `anchor_href`; fallback to `snippet` and `url` when anchors are missing.
  - Keep other panels, but they can also leverage `snippet` without ranking changes.
- ONNX Warm-up Label:
  - Track warm-up readiness in `App.tsx` state; call `EmbeddingsProvider.prewarm()` and then display a small badge near the title.
- Structured Outcomes:
  - Extend `agent_actions` schema to add `outcome_type` and `outcome_detail` columns with a migration.
  - Update insert logic in Approvals flow to include these fields.
  - Update `AgentLogViewer` to read and filter by `outcome_type` in addition to domain/tab.

## Verification
- Run a query with anchors (mock snapshots produce anchors); confirm `LinksPanel` ranks anchor-bearing results first and shows preview text/href.
- Observe warm-up badge switching from “Warming up…” to “Embeddings ready”.
- Trigger approvals; validate new `outcome_type`/`outcome_detail` values are persisted and filterable in the log viewer.

## Notes
- No API shape changes needed; all ranking occurs client-side.
- Schema migration is additive and guarded; existing rows remain valid.