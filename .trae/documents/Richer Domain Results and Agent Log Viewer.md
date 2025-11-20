## Objectives
- Surface domain-filtered search results with titles and snippets from indexed payloads.
- Add a compact agent log viewer backed by SQLite with filters by domain/tab.
- Keep ONNX warm-up configurable via env; recommend switching model if needed.

## Implementation
- Indexer: include a short `snippet` in Qdrant payload for each chunk.
- Panels: map Qdrant search results to show `title`, `url`, and `snippet` where available.
- Logs: build `AgentLogViewer` component that reads `Db.recentAgentActions()`, parses domains from params, and filters by domain/tab.
- Integration: render `AgentLogViewer` inside `ApprovalsPanel` for quick access.
- ONNX: already env-configurable; note to set `VITE_ONNX_MODEL` to a smaller model if warm-up is high.

## Verification
- Search with `site:example.com` and ensure panels display Qdrant payload titles/snippets.
- Trigger approvals to persist actions; open the viewer and filter by domain `example.com` and any `tabId` present.

## Risks
- Payload size increase with snippet: keep snippet to first ~160 chars.
- Params parsing failures in logs: guard JSON parse.
