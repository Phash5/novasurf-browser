## Overview
Build a Node backend that launches Chromium, manages CDP sessions and browser contexts per tab, and exposes a WebSocket interface the Coordinator can talk to. Supports tab lifecycle, navigation, DOM snapshots, and screenshots with isolation and backpressure.

## Modules
- Launcher: start Chromium with `--remote-debugging-port`, resolve host/port, health checks.
- CDP Client: connect via CRI (chrome-remote-interface), manage session attach/detach, enable `Page`/`Runtime`.
- Contexts & Tabs: registry `tabId → { targetId, sessionId, browserContextId }`; create/activate/close; logged-out contexts.
- Snapshots: `Runtime.evaluate` for HTML, optional `DOMSnapshot.captureSnapshot`, throttling/debounce; chunk large frames.
- Screenshots: `Page.captureScreenshot` (viewport/full-page via metrics override), FPS cap and queue.
- WS Server: route Coordinator messages to module APIs, emit structured events, enforce domain allowlists; auth token optional.
- Policy & Config: env-driven `CHROME_PATH`, `CDP_PORT`, `WS_PORT`, `ALLOWLIST_DOMAINS`, `LOGGED_OUT_DEFAULT`.

## Protocol
- Requests: `createTab({ url?, loggedOut? })`, `closeTab({ tabId })`, `activateTab({ tabId })`, `navigate({ tabId, url })`, `getDomSnapshot({ tabId })`, `getScreenshot({ tabId, fullPage? })`, `setLoggedOutMode({ tabId, enabled })`, `ping`.
- Events: `welcome`, `tabCreated({ id })`, `navigated({ id, url })`, `loadEventFired({ id, ts })`, `domSnapshot({ id, snapshot })`, `screenshot({ id, mime, data })`, `tabClosed({ id })`, `error({ id?, code, message })`, `pong`.

## Lifecycle & Isolation
- Auto attach targets (`Target.setAutoAttach({ autoAttach: true, flatten: true })`).
- Logged-out mode: `Target.createBrowserContext()` per tab; open via `Target.createTarget({ url, browserContextId })`.
- Activate/close: `Target.activateTarget`, `Target.closeTarget`; dispose contexts on close.
- Domain allowlists: block navigation off allowed domains when enabled; emit `error`.

## Streaming & Backpressure
- Snapshot debounce per-tab (≥300ms); throttle repeated requests.
- Screenshot rate-limited (1–2 fps); queue length per tab with drop policy.
- Chunk payloads: HTML and image base64 split with `seq` numbers.

## Error Handling
- Reconnect: handle `Target.detachedFromTarget`; rebuild session registry.
- Timeouts & retries: `Page.navigate` with backoff; HTML eval fallback for `about:blank`.
- Structured errors: `CDP_TIMEOUT`, `CDP_DETACHED`, `NAV_DENIED`, `SNAPSHOT_FAIL`.

## Observability
- Log request/response with tab/session ids; counters for `createTab`, `navigate`, `getDomSnapshot`, `getScreenshot`.
- Latency timers for snapshot/screenshot; expose `/health` HTTP endpoint.

## Testing
- Unit: tab registry, routing, debounce/throttle logic.
- Integration: launch Chromium, create multiple tabs, navigate, receive snapshots/screenshots; assert event order.
- Stress: rapid navigations and concurrent requests; verify backpressure and stability.

## Milestones
1. Launcher + CRI connect; WS server scaffolding and handshake.
2. Tab create/navigate with events (`navigated`, `loadEventFired`).
3. DOM snapshot streaming with debounce; screenshot streaming with FPS cap.
4. Logged-out contexts, allowlists, close/activate flows, cleanup.
5. Error handling, reconnect, metrics, health; multi-tab stability validation.