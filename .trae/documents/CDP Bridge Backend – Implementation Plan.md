## Overview

Build a Node backend that launches Chromium, manages CDP sessions and browser contexts per tab, and exposes a WebSocket interface for Coordinator. Supports tab lifecycle, navigation, DOM snapshots, screenshots, throttling, isolation, error handling, metrics, health checks, and validation.

## Architecture

* **Launcher**: Start Chromium with `--remote-debugging-port` and required flags; resolve debugger endpoint.

* **CDP Client**: Use `chrome-remote-interface` to attach sessions; enable `Page`/`Runtime` domains; listen for events.

* **Contexts & Tabs**: Registry mapping `tabId → { targetId, sessionId, browserContextId }`; logged‑out mode via `Target.createBrowserContext()`.

* **WS Server**: Accept Coordinator messages, route to CDP APIs, enforce policies, emit events.

* **Config**: Env‑driven `CHROME_PATH`, `CDP_PORT`, `WS_PORT`, `ALLOWLIST_DOMAINS`, `LOGGED_OUT_DEFAULT`.

## Protocol (Requests/Events)

* **Requests**: `createTab({ url?, loggedOut? })`, `closeTab({ tabId })`, `activateTab({ tabId })`, `navigate({ tabId, url })`, `getDomSnapshot({ tabId })`, `getScreenshot({ tabId, fullPage? })`, `setLoggedOutMode({ tabId, enabled })`, `ping`.

* **Events**: `welcome`, `tabCreated({ id })`, `navigated({ id, url })`, `loadEventFired({ id, ts })`, `domSnapshot({ id, snapshot })`, `screenshot({ id, mime, data })`, `tabClosed({ id })`, `error({ id?, code, message })`, `pong`.

## Implementation Details

* **Tab Lifecycle**:

  * Auto‑attach targets: `Target.setAutoAttach({ autoAttach: true, flatten: true })`.

  * Create tab: `Target.createTarget({ url, browserContextId? })`; activate/close; dispose context.

* **Navigation**:

  * `Page.navigate({ url })`; listen for `Page.loadEventFired` and `Page.frameNavigated` to emit `navigated`.

* **DOM Snapshots**:

  * `Runtime.evaluate({ expression: 'document.documentElement.outerHTML', returnByValue: true })`.

  * Optional `DOMSnapshot.captureSnapshot` when richer structure is needed.

* **Screenshots**:

  * Viewport: `Page.captureScreenshot({ format: 'jpeg', quality: 70 })`.

  * Full‑page: `Page.getLayoutMetrics` + `Emulation.setDeviceMetricsOverride` → capture → restore.

## Throttling & Backpressure

* **Snapshots**: Debounce per tab (≥300 ms), drop if repeated in high frequency.

* **Screenshots**: Limit to 1–2 fps; queue per tab with max length; drop oldest when overloaded.

* **Chunking**: Split large HTML or image frames with `seq` numbers.

## Isolation & Policies

* **Logged‑Out Mode**: Dedicated `browserContextId` per tab; clear storage and dispose on close.

* **Domain Allowlist**: Reject navigation to non‑allowed domains; emit `error` events.

* **Permissions**: Use `Browser.resetPermissions` on context disposal if needed.

## Error Handling & Reliability

* **Reconnect**: Handle `Target.detachedFromTarget`; reattach or rebuild sessions.

* **Timeouts/Retry**: Apply timeouts on `navigate`/`evaluate`; exponential backoff.

* **Structured Errors**: `CDP_TIMEOUT`, `CDP_DETACHED`, `NAV_DENIED`, `SNAPSHOT_FAIL` with tab/session identifiers.

## Metrics & Health

* **Counters**: `createTab`, `navigate`, `getDomSnapshot`, `getScreenshot` totals.

* **Latency**: Measure snapshot/screenshot durations; track failures.

* **Health Endpoint**: `/health` HTTP returns Chromium connection and WS server status.

## Validation & Tests

* **Unit**: Registry, routing, debounce/throttle logic.

* **Integration**: Launch Chromium, multi‑tab create/navigate, verify event sequence; snapshot <200 ms, screenshot <300 ms.

* **Stress**: Rapid navigations and concurrent snapshot requests; ensure stability under load.

## Milestones

1. Chromium launcher and CRI connection; WS handshake and basic routing.
2. Implement tab create/navigate with events; add snapshot streaming.
3. Add screenshot streaming with rate limits; chunking and backpressure.
4. Logged‑out contexts and allowlists; close/activate flows and cleanup.
5. Error handling, reconnect, metrics, health; multi‑tab validation and performance targets.

## Deliverables

* Running CDP bridge service with WS routing, isolation, throttled streaming, and observability.

* Verified multi‑tab lifecycle with performance budgets met and robust error handling.

