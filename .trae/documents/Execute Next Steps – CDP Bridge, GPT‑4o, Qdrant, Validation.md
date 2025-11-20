## Phase A – CDP Bridge Backend

* Create Node service (server/bridge): launcher, CDP client, contexts/tabs registry, snapshots/screenshots, WS server.

* Launcher: use chrome‑launcher to start Chromium with `--remote-debugging-port=9222`; health check debugger endpoint.

* CDP client: connect via chrome‑remote‑interface; enable Page/Runtime; auto‑attach targets; map tab → {targetId, sessionId, browserContextId}.

* WS server: expose requests `createTab`, `closeTab`, `activateTab`, `navigate`, `getDomSnapshot`, `getScreenshot`, `setLoggedOutMode`, `ping`; emit events `tabCreated`, `navigated`, `loadEventFired`, `domSnapshot`, `screenshot`, `tabClosed`, `error`, `pong`.

* Isolation: create/destroy `browserContextId` per tab in logged‑out mode; enforce domain allowlists.

* Streaming/limits: debounce snapshots ≥300ms; screenshots 1–2 fps; queue per tab; chunk payloads.

* Error handling: timeouts/backoff; handle detach/reconnect; structured `error` codes; metrics + `/health`.

## Phase B – Coordinator Wiring

* Point Coordinator to backend WS; add `getScreenshot` and `setLoggedOutMode` calls.

* Route `domSnapshot` and `screenshot` to indexing and preview; maintain tab map in client.

## Phase C – GPT‑4o Chat Integration

* Implement `AiClientOpenAI` with streaming tokens using Chat Completions; retry/backoff and caching; use `VITE_OPENAI_API_KEY`.

* Replace mock in ChatPanel with provider facade; maintain perceived speed with incremental rendering.

## Phase D – Qdrant Deployment & Schema

* Deploy Qdrant (Docker/Cloud); set envs: `VITE_QDRANT_HOST`, `VITE_QDRANT_COLLECTION`, `VITE_QDRANT_API_KEY`, `VITE_EMBEDDING_SIZE`.

* Verify collection vector size matches embeddings (1536 OpenAI or 384 ONNX) and distance `Cosine`.

* Run smoke upsert/search; domain filter verified; enable TLS/auth for Cloud.

## Phase E – Telemetry & Health

* Wrap Qdrant client calls to record upsert/search/delete counters and latency; record error rates.

* Backend `/health` reports Chromium connection and WS status; client badge for Qdrant reachability.

## Phase F – Validation

* Multi‑tab lifecycle: create 10+ tabs, navigate, snapshot, screenshot; verify isolation and allowlists.

* Stress: rapid navigations/concurrent snapshot requests; ensure backpressure stable.

* Performance budgets: snapshot <200ms, screenshot <300ms, AI responses <2s perceived.

## Deliverables

* Running CDP bridge WS, Coordinator wired, GPT‑4o chat, Qdrant deployed/validated, telemetry and health checks, and multi‑tab performance validation.

