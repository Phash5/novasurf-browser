## Objectives & MVP
1. Deliver a Windows-first Atlas-like browser with AI search, per-tab isolation, and agent automation.
2. Sub‑second UI startup, <2s AI responses, safe automation with approvals, opt‑in memories.
3. MVP scope: Basic tabbed browsing, New Tab Page (NTP) with AI search, semantic page summaries, tiered memories (hot/warm), per‑site AI toggle, initial agent sandbox for navigation/click/scroll/type.

## Architecture Overview
- Client–Host Separation (OWL):
  - Client UI: `WPF` shell using modern MVVM; React (TypeScript) for NTP and AI panels via embedded web view.
  - Chromium Host: Modified Chromium 120+ running as a distinct process; Mojo IPC bridges to Client.
  - Swift is out-of-scope for Windows MVP; keep interfaces portable to add SwiftUI later.
- Processes:
  - `Browser Coordinator` (privileged, orchestrates tabs/processes, IPC endpoints)
  - `Chromium Host` (engine; spawns `Renderer` per tab)
  - `Renderer` (isolated per tab; DevTools protocol enabled)
  - `AI Runtime` (LLM orchestration, embeddings)
  - `Agent Sandbox` (Playwright control surface; offscreen context)
  - `GPU`, `Network`, `Storage` processes (Chromium subsystems)
- IPC (Mojo): Define IDL modules for typed, versioned interfaces:
  - `atlas/mojo/browser_service.mojom`: `CreateTab`, `CloseTab`, `Navigate`, `ActivateTab`, `GetDOMSnapshot(stream)`, `ObservePageEvents(stream)`
  - `atlas/mojo/ai_service.mojom`: `Summarize(stream)`, `PlanActions(stream)`, `RunAgent(stream)`, `EmbedChunks`, `IndexPage`
  - `atlas/mojo/memory_service.mojom`: `Put`, `Query`, `Archive`, `Delete`, `SyncStatus`, `WarmCacheStats`
  - `atlas/mojo/settings_service.mojom`: `GetSiteAIVisibility`, `SetSiteAIVisibility`, `ParentalControls`

## Data Flow & Responsibilities
- Navigation: Client requests → Browser Coordinator → Chromium Host → Renderer.
- DOM/Visual Snapshot: Renderer streams DOM + screenshot → AI Runtime builds semantic representation.
- AI Summaries: AI Runtime streams tokens back → Client displays in NTP/side panel.
- Memories: AI Runtime emits embeddings → Memory Service writes to SQLite/Qdrant; hot cache for recent pages.
- Automation: CUA plans → Agent Sandbox executes via Playwright/DevTools; approvals gate actions.

## AI Integration Layer
- Models:
  - Primary intelligence: `GPT‑4o` via API with token streaming.
  - Local lightweight models: ONNX.js/TensorFlow.js for element classification, layout semantics, and compression.
- Semantic Pipeline:
  1. DOM extraction: structural DOM + accessibility tree + bounding boxes; screenshot tiles.
  2. Interactive element identification: heuristic + lightweight classifier (button/link/input/select, visibility).
  3. Chunking & semantic compression: deduplicate boilerplate, collapse menus, compress by ~40% tokens.
  4. Parallel semantic representation: store per-node summary and page-level synopsis for fast recall.
- Performance tactics:
  - Streaming, request batching, caching, speculative follow-ups; GPU offload when available.

## Computer Use Agent (CUA)
- Execution Loop: Intent → Plan → DOM/Vision Analysis → Act → Observe → Loop until success/timeout.
- Supported Actions (MVP): `navigate`, `click`, `type`, `scroll`, `extract`, `fill`.
- Safety:
  - Approval flows for destructive or sensitive actions; fingerprints for login flows.
  - Logged‑out mode: agent operates without credentials; prevents stateful sessions.
  - Sandboxed Playwright instance against a dedicated browser context; rate limits & domain constraints.
- Implementation:
  - Use DevTools Protocol + Playwright to control a hidden/offscreen tab.
  - Observability hooks: record actions, state diffs, screenshots; export to SQLite.

## Browser Memories System
- Tiers:
  - Hot cache (RAM ~200MB): last 50 pages; <10ms retrieval.
  - Warm cache (SSD ~2GB): 7‑day indices; 50–100ms retrieval.
  - Cold storage (cloud, opt‑in): encrypted full history + embeddings; user-controlled sync.
- Storage:
  - SQLite: `pages`, `memories`, `sessions`, `agent_actions` tables.
  - Qdrant: embeddings; HNSW index; per‑site namespace; TTL for warm cache.
- Controls: UI to view/archive/delete; per-site visibility toggles; export/import.

## New Tab Page (NTP)
- Center AI search box; tabbed results: `chat`, `links`, `images`, `videos`, `news`.
- Contextual suggestions: recent pages, tasks, entities from memories.
- Resume cards: last sessions, unfinished agent tasks; one-click resume.
- Implementation: React (TypeScript), token streaming renderer, WebSocket bridge to AI Runtime.

## Privacy & Security
- Per‑site AI visibility toggle; defaults off for sensitive categories.
- Opt‑in memories; no training on browsing data by default.
- Sandboxed agent permissions; domain allowlists; logged‑out mode.
- Parental controls: category blocks, time limits, reporting.
- Cloud sync: end‑to‑end encryption; local‑first design.

## Technical Stack & Dependencies
- Foundation: Chromium 120+ (custom), Mojo IPC, DevTools Protocol.
- Windows UI: WPF (.NET 8), MVVM; Host bridges via C++/CLI or gRPC‑Mojo shim.
- Web UI: React + TypeScript for NTP/AI panels.
- AI & ML: GPT‑4o API; ONNX.js/TensorFlow.js for local inference; vision models for screenshot analysis.
- Storage: SQLite (structured), Qdrant (vectors), IndexedDB (browser data), encrypted cloud sync.
- Automation: Playwright; WebSocket for low‑latency AI and agent streams.

## Performance Targets & Strategies
- Startup (<1s): async host boot, instant UI, lazy model load, process pre‑warm.
- Memory mgmt: tiered caches; tab suspension after inactivity; model quantization; GPU offload.
- AI speed (<2s): token streaming; caching; speculative precompute; local handling for simple tasks.

## Data Model (initial)
- SQLite tables:
  - `pages(id, url, title, ts, domain, hash, snapshot_ref)`
  - `memories(id, page_id, kind, summary, entities, ts, archived)`
  - `sessions(id, started_at, ended_at, notes)`
  - `agent_actions(id, session_id, action, params, ts, approved, result)`
- Qdrant collections:
  - `embeddings_{domain}`: `{id, page_id, vector, ts, ttl}`; HNSW with M=16, ef=64.

## Observability
- Metrics: startup latency, tab creation time, AI response latency, agent action success.
- Tracing: OpenTelemetry spans across Client, Host, AI Runtime, Agent.
- Crash reporting: minidumps from Chromium; categorized by process.

## Testing Strategy
- Unit tests: MVVM viewmodels, Mojo bindings, AI adapters.
- Integration tests: Playwright for tab ops, agent actions, approvals.
- Performance tests: startup/response budgets with regression thresholds.
- Security tests: sandbox escapes, permission enforcement, logged‑out mode fidelity.
- Fuzzing: DOM snapshot and parser resilience.

## Milestones & Deliverables
- Phase 0: Foundations (2–3 weeks)
  - Repo, CI, packaging; base WPF shell; Chromium host bootstrap; Mojo scaffolding; DevTools protocol access.
  - Deliverable: Hello World tab; IPC ping; tracing working.
- Phase 1: Browser Core (3–4 weeks)
  - Tab lifecycle, navigation, renderer isolation; DOM snapshot streaming; page event bus.
  - Deliverable: Multi‑tab browsing; snapshots in <200ms; coordinator dashboard.
- Phase 2: AI Layer & NTP (3 weeks)
  - GPT‑4o client; semantic pipeline v1 (compression, element detection); NTP with AI search and streaming.
  - Deliverable: <2s AI responses on typical pages; chat/links/images tabs; suggestions.
- Phase 3: Memories (3–4 weeks)
  - SQLite/Qdrant integration; hot/warm caching; UI for view/archive/delete.
  - Deliverable: semantic search across last 7 days; <100ms warm queries.
- Phase 4: Agent Sandbox (4 weeks)
  - Planning loop; Playwright control; approvals; logged‑out mode; execution logs.
  - Deliverable: end‑to‑end tasks (navigate/click/type/scroll/extract) with safety gates.
- Phase 5: Privacy, Security, Optimization (3 weeks)
  - Per‑site toggles, parental controls, cloud sync (opt‑in), startup/memory tuning.
  - Deliverable: target budgets met; compliance features.
- Phase 6: QA & Release (2 weeks)
  - Hardening, perf/regression gates, crash‑free rates; installer.
  - Deliverable: Beta release.

## Risks & Mitigations
- Chromium modification complexity → minimize patches; prefer DevTools protocol; isolate custom code via Mojo modules.
- Cross‑language Mojo bindings on Windows → generate C++/C# interop; rigorous ABI tests.
- Vector DB size/perf → enforce TTLs and quotas; background compaction; fallback to local-only mode.
- Security of automation → strict domain allowlists, rate limits, approvals, logged‑out context.
- Startup performance → prewarm processes; lazy load AI; defer noncritical IO.

## Open Questions & Assumptions
- MVP targets Windows; macOS/Linux follow once IPC and UI abstractions proven.
- Cloud provider for sync (e.g., user-selectable); end‑to‑end encryption mandatory.
- Search aggregation sources for NTP (configurable).