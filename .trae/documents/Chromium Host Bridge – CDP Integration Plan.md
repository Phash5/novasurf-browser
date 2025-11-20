## Goals
- Connect client Coordinator to a real Chromium host via the Chrome DevTools Protocol (CDP).
- Stream DOM snapshots and screenshots reliably from renderer processes.
- Stabilize multi‑tab lifecycle with isolation per tab/browser context.

## Architecture
- Backend service (Node) manages a local Chromium instance launched with `--remote-debugging-port`.
- CDP client: use `chrome-remote-interface` (CRI) for direct CDP access (lower-level than Puppeteer) to map WS commands to CDP methods.
- Coordinator WS → Backend Bridge:
  - `createTab`, `closeTab`, `activateTab`, `navigate`, `getDomSnapshot`, `getScreenshot` messages handled by backend.
  - Events forwarded: `tabCreated`, `navigated`, `domSnapshot`, `screenshot`, `loadEventFired`.

## CDP Mapping
- Launch Chromium:
  - `chrome-launcher` or manual executable path; flags: `--remote-debugging-port=9222`, `--disable-background-networking`, `--no-default-browser-check`, `--no-first-run`.
- Targets & Sessions:
  - `Target.setAutoAttach({ autoAttach: true, flatten: true })` to receive new target sessions.
  - `Target.createBrowserContext()` when isolation required (logged‑out mode per tab).
  - `Target.createTarget({ url, browserContextId })` to open a new tab.
  - Keep a map: `tabId → { targetId, sessionId, browserContextId }`.
- Navigation:
  - `Page.navigate({ url })` via the tab’s session; listen for `Page.loadEventFired`, `Page.frameNavigated` to emit `navigated`.
- DOM Snapshot:
  - Use `Runtime.evaluate({ expression: 'document.documentElement.outerHTML', returnByValue: true })` for HTML.
  - Optional richer snapshot:
    - `DOMSnapshot.captureSnapshot({ computedStyleWhitelist: [...] })` for structure/layout when needed.
    - `Accessibility.getFullAXTree()` for interactive element hints.
- Screenshots:
  - `Page.captureScreenshot({ format: 'jpeg', quality: 70 })` for viewport shots.
  - Full‑page flow: `Page.getLayoutMetrics` → `Emulation.setDeviceMetricsOverride` → `Page.captureScreenshot` → restore metrics.
- Close/Activate:
  - `Target.closeTarget({ targetId })`, `Target.activateTarget({ targetId })`.

## Streaming & Throttling
- Snapshot streaming:
  - Debounce `getDomSnapshot` requests per tab (e.g., min interval 300–500ms).
  - Chunk large HTML (>2MB) into multiple WS frames; include sequence numbers.
- Screenshot streaming:
  - Send base64 `data:` URLs or binary frames; cap frequency (e.g., 1–2 fps for monitoring).
- Backpressure:
  - Queue per tab; drop or skip when queue grows beyond threshold.

## Isolation & Safety
- Per‑tab isolation:
  - Create a unique `browserContextId` for tabs in logged‑out mode.
  - Domain allowlist enforced at the backend; deny navigation off allowed domains when policy requires.
- Permissions:
  - Use `Browser.grantPermissions`/`Browser.resetPermissions` for contexts if needed.
- Cleanup:
  - On tab close, `Target.disposeBrowserContext` to free storage/mem.

## Error Handling
- CDP disconnections:
  - Detect `Target.detachedFromTarget`; auto‑reconnect if Chromium restarts.
- Timeouts & retries:
  - `Page.navigate` with timeout; retry with exponential backoff.
- Robust `Runtime.evaluate`:
  - Fallbacks for frames or `about:blank` cases; wait for `DOMContentLoaded`.

## Coordinator Protocol Additions
- Requests:
  - `getScreenshot({ tabId, fullPage? })`
  - `setLoggedOutMode({ tabId, enabled })`
- Events:
  - `screenshot({ id, mime, data })`
  - `loadEventFired({ id, ts })`

## Testing & Verification
- Unit: mapping functions for `createTab`, `navigate`, `getDomSnapshot`, `getScreenshot`.
- Integration:
  - Launch Chromium, create multiple tabs, navigate, snapshot, screenshot; assert event sequencing.
- Performance:
  - DOM snapshot <200ms typical; screenshot <300ms viewport.
- Stability:
  - 10+ tabs lifecycle test; rapid navigation; ensure no memory leaks (contexts disposed).

## Milestones
1. Launch Chromium & CRI connection; auto‑attach and tab mapping.
2. Implement `createTab`, `navigate`, `getDomSnapshot`, `getScreenshot`; emit events.
3. Add per‑tab `browserContextId` and logged‑out isolation; close/activate flows.
4. Throttling/backpressure; error handling & reconnect.
5. Multi‑tab stability tests and performance validation; documentation of protocol.