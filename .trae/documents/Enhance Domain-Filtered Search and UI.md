## Objectives
- Apply domain filters using `payload.domain`, then re-rank results by `anchor_text`/`anchor_href` and recent `ts`.
- Add a domain filter toggle in panels when `site:domain` or domain tokens are detected.
- Display snippets and anchor previews consistently across panels.

## Service Changes
- SearchService
  - `extractDomainFromQuery(query)` (already present) → extend to return `detectedDomain` and `hasExplicitSitePrefix`.
  - `search(query, limit, options?)`:
    - Options: `{ domain?: string, useDomainFilter?: boolean }`.
    - If `useDomainFilter` is true and `domain` exists, build Qdrant filter: `{ must: [{ key: 'domain', match: { value: domain } }] }`.
    - After receiving results, run `rankResults(results)`.
  - `rankResults(results)`:
    - Score: `base = result.score || 0`; `anchorBoost = (anchor_text? 2 : 0) + (anchor_href? 1 : 0)`; `recencyBoost = normalize(ts)` (e.g., `(tsNow - ts)`, inverse scaled to [0,1]).
    - Final score: `base + anchorBoost + recencyBoost`.
    - Sort descending.

## UI Changes
- Domain Toggle Component
  - Props: `{ detectedDomain: string, enabled: boolean, onToggle(enabled: boolean) }`.
  - Shows a pill when a domain is detected or `site:` is present; toggles domain filtering.
- Panels Integration
  - LinksPanel (primary):
    - Detect domain from query via service.
    - Show the domain toggle pill under the search box or panel header.
    - Pass `useDomainFilter` state and `domain` into `SearchService.search`.
    - Render: `title`, `url`, `snippet` → prefer `anchor_text` else `snippet`; show `anchor_href` truncated (e.g., `hostname/path…`).
  - NewsPanel/ImagesPanel/VideosPanel (secondary):
    - Reuse toggle and ranking; show snippet/anchor preview where meaningful.

## Display Rules
- Title: `payload.title || payload.url || 'Result'`.
- Snippet: `payload.anchor_text || payload.snippet || payload.url` (trim to ~160 chars).
- Anchor Preview: show `payload.anchor_href`, truncated; clickable if absolute URL.
- Domain badge: show the filtered domain when toggle is enabled.

## Performance & UX
- Debounce queries in panels (e.g., 150–300ms).
- Cache `search(query, domain, useDomainFilter)` results for 30–60s to reduce API calls.
- Graceful fallback: if Qdrant host is unset/unreachable, show the existing stub items.

## Testing
- Unit: `extractDomainFromQuery`, `rankResults` scoring; edge cases for missing fields and ts normalization.
- Integration: toggle on/off → filter applied; ensure results reorder with anchor boosts; fallback correctness when offline.

## Milestones
1. Implement `rankResults` and extended `search` options with domain filter.
2. Add DomainToggle component and integrate in LinksPanel; display snippet/anchor previews.
3. Apply ranking and toggle to other panels; add caching/debounce.
4. Test and verify behavior with `site:example.com` and plain domain tokens.