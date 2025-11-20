## Overview
Connect the Coordinator to a real Chromium via CDP, stream DOM/screenshot data, and stabilize multi‑tab isolation. Implement a Node backend that maps Coordinator WS messages to CDP methods and returns structured events.

## Backend Structure
- Files (server/):
  - `bridge/config.ts`: Chromium path, flags, ports, policies (allowlists, logged‑out mode).
  - `bridge/launcher.ts`: Launches Chromium with `--remote-debugging-port=9222` and returns CRI endpoint.
  - `bridge/cdp.ts`: CDP session management with `chrome-remote-interface` (CRI).
  - `bridge/tabs.ts`: Tab registry (`tabId → { targetId, sessionId, browserContextId }`) and lifecycle APIs.
  - `bridge/snapshots.ts`: DOM snapshot and screenshot utilities with throttling.
  - `bridge/ws-server.ts`: WebSocket server; routes Coordinator messages to bridge APIs; emits events.

## Coordinator Protocol (finalize)
- Requests:
  - `createTab({ url?, loggedOut? })`
  - `closeTab({ tabId })`, `activateTab({ tabId })`
  - `navigate({ tabId, url })`
  - `getDomSnapshot({ tabId })`
  - `getScreenshot({ tabId, fullPage? })`
  - `setLoggedOutMode({ tabId, enabled })`
- Events:
  - `tabCreated({ id })`, `navigated({ id, url })`, `loadEventFired({ id, ts })`
  - `domSnapshot({ id, snapshot: { title, html } })`
  - `screenshot({ id, mime, data })`
  - `tabClosed({ id })`, `error({ id?, code, message })`

## CDP Mapping
- Launch & Attach:
  - Use `chrome-launcher` to start Chromium; connect via CRI.
  - `Target.setAutoAttach({ autoAttach: true, flatten: true })` to receive sessions.
- Contexts:
  - `Target.createBrowserContext()` per tab when `loggedOut`.
  - `Target.createTarget({ url, browserContextId })` to open tab.
- Navigation & Events:
  - `Page.enable()`, `Runtime.enable()`; listen `Page.loadEventFired`, `Page.frameNavigated`.
  - Emit `navigated` and `loadEventFired` with timestamps.
- Snapshots:
  - `Runtime.evaluate({ expression: 'document.documentElement.outerHTML', returnByValue: true })` → send `domSnapshot`.
  - Optional: `DOMSnapshot.captureSnapshot` when richer structure needed.
- Screenshots:
  - `Page.captureScreenshot({ format: 'jpeg', quality: 70 })` for viewport.
  - Full-page: `Page.getLayoutMetrics` + `Emulation.setDeviceMetricsOverride` flow, then restore.
- Close/Activate:
  - `Target.closeTarget({ targetId })`, `Target.activateTarget({ targetId })`; dispose context.

## Throttling & Backpressure
- Snapshot debounce per tab (≥300ms) using a token bucket.
- Screenshot cap (1–2 fps) with queue size limit; drop if congested.
- Chunk large HTML/screenshot frames; include `seq`.

## Isolation & Safety
- Enforce domain allowlists in backend; reject off‑policy navigation.
- Logged‑out mode via distinct `browserContextId`; clear storage on dispose.
- Optional permissions: `Browser.resetPermissions` per context.

## Error Handling
- Timeouts for `Page.navigate`/`Runtime.evaluate`; retries with backoff.
- Detect `Target.detachedFromTarget`; reattach or surface `error` event.
- Structured error codes: `CDP_TIMEOUT`, `CDP_DETACHED`, `NAV_DENIED`.

## Performance Targets
- Snapshot <200ms typical pages; Screenshot <300ms viewport.
- 10+ tabs with isolate contexts; ensure no leaks on close.

## Testing Plan
- Unit: tab registry, message routing, snapshot/screenshot utilities.
- Integration: launch Chromium, create/navigate tabs, verify event sequencing.
- Stress: rapid navigation and concurrent snapshot requests; verify throttling.

## Milestones
1. Launcher + CRI connect; WS server scaffolding.
2. Tab create/navigate + `domSnapshot` + `loadEventFired` events.
3. Screenshots (viewport/full‑page) + backpressure.
4. Per‑tab contexts and logged‑out isolation; close/activate.
5. Safety (allowlists), error handling, and stability tests.

## Configuration & Ops
- Env: `CHROME_PATH`, `CDP_PORT`, `WS_PORT`, `ALLOWLIST_DOMAINS`, `LOGGED_OUT_DEFAULT`.
- Logs: structured with request ids; expose health endpoint.
- Graceful shutdown: close tabs, dispose contexts, stop Chromium.

## Deliverables
- Backend bridge service with WS endpoints for Coordinator commands.
- Verified multi‑tab snapshot/screenshot streaming with isolation.
- Documented protocol and operational runbook (flags, envs, health).