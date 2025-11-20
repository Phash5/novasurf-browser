import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { spawn } from 'child_process'

const WS_PORT = Number(process.env.WS_PORT || 8787)
const WS_PATH = process.env.WS_PATH || '/atlas'
const CDP_PORT = Number(process.env.CDP_PORT || 9222)
const CHROME_PATH = process.env.CHROME_PATH || ''
const ALLOWLIST = (process.env.ALLOWLIST_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean)
const LOGGED_OUT_DEFAULT = String(process.env.LOGGED_OUT_DEFAULT || 'false') === 'true'

let counters = { createTab: 0, navigate: 0, getDomSnapshot: 0, getScreenshot: 0, closeTab: 0 }

function now() { return Date.now() }

function startChrome() {
  if (!CHROME_PATH) return
  const USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || '.chrome-profile-cdp'
  const HEADLESS = String(process.env.CHROME_HEADLESS || 'false') === 'true'
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--remote-allow-origins=*',
    '--disable-background-networking',
    '--no-default-browser-check',
    '--no-first-run',
    '--disable-component-update',
    '--disable-prompt-on-repost',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-device-discovery-notifications'
  ]
  if (HEADLESS) args.push('--headless=new')
  spawn(CHROME_PATH, args, { stdio: 'ignore', detached: true })
}

function getJSON(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: CDP_PORT, path, method: 'GET' }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    })
    req.on('error', reject)
    req.end()
  })
}

let browserWs = null
let browserConnected = false
let cdpMsgId = 1
const pending = new Map()
const sessions = new Map()

function connectBrowser() {
  return getJSON('/json/version').then(v => {
    const url = v.webSocketDebuggerUrl
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.on('open', () => {
        browserWs = ws
        browserConnected = true
        sendCdp('Target.setAutoAttach', { autoAttach: true, flatten: true, waitForDebuggerOnStart: false })
        sendCdp('Target.setDiscoverTargets', { discover: true })
        resolve()
      })
      ws.on('message', data => handleCdpMessage(JSON.parse(data.toString())))
      ws.on('error', err => reject(err))
      ws.on('close', () => { browserConnected = false })
    })
  })
}

function sendCdp(method, params = {}, sessionId) {
  if (!browserWs || browserWs.readyState !== WebSocket.OPEN) return Promise.reject(new Error('CDP_NOT_CONNECTED'))
  const id = cdpMsgId++
  const msg = { id, method, params }
  if (sessionId) msg.sessionId = sessionId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    browserWs.send(JSON.stringify(msg))
  })
}

function handleCdpMessage(msg) {
  if (msg.id && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id)
    pending.delete(msg.id)
    resolve(msg.result)
    return
  }
  if (msg.method === 'Target.attachedToTarget') {
    const { sessionId, targetInfo } = msg.params
    sessions.set(sessionId, { targetId: targetInfo.targetId })
  }
  if (msg.method === 'Target.detachedFromTarget') {
    const { sessionId } = msg.params
    sessions.delete(sessionId)
  }
}

const tabs = new Map()
const targetToTab = new Map()
const nextAllowed = new Map()

function createContextIfNeeded(loggedOut) {
  if (!loggedOut) return Promise.resolve(undefined)
  return sendCdp('Target.createBrowserContext').then(r => r.browserContextId)
}

function createTab(req) {
  const loggedOut = req.loggedOut ?? LOGGED_OUT_DEFAULT
  return createContextIfNeeded(loggedOut).then(browserContextId => {
    const url = req.url || 'about:blank'
    return sendCdp('Target.createTarget', { url, browserContextId }).then(r => {
      const tabId = Math.random().toString(36).slice(2)
      const record = { tabId, targetId: r.targetId, sessionId: null, browserContextId, createdAt: now() }
      tabs.set(tabId, record)
      targetToTab.set(r.targetId, tabId)
      return sendCdp('Target.attachToTarget', { targetId: r.targetId, flatten: true }).then(att => {
        record.sessionId = att.sessionId
        return sendCdp('Page.enable', {}, record.sessionId).then(() => sendCdp('Runtime.enable', {}, record.sessionId)).then(() => tabId)
      })
    })
  })
}

function activateTab(tabId) {
  const t = tabs.get(tabId)
  if (!t) return Promise.reject(new Error('TAB_NOT_FOUND'))
  return sendCdp('Target.activateTarget', { targetId: t.targetId })
}

function closeTab(tabId) {
  const t = tabs.get(tabId)
  if (!t) return Promise.reject(new Error('TAB_NOT_FOUND'))
  counters.closeTab++
  return sendCdp('Target.closeTarget', { targetId: t.targetId }).then(() => {
    tabs.delete(tabId)
    targetToTab.delete(t.targetId)
    if (t.browserContextId) return sendCdp('Target.disposeBrowserContext', { browserContextId: t.browserContextId })
  })
}

function allowedToNavigate(urlStr) {
  if (!ALLOWLIST.length) return true
  try { const u = new URL(urlStr); return ALLOWLIST.includes(u.hostname) } catch { return false }
}

function navigate(tabId, url) {
  const t = tabs.get(tabId)
  if (!t) return Promise.reject(new Error('TAB_NOT_FOUND'))
  if (!allowedToNavigate(url)) return Promise.reject(Object.assign(new Error('NAV_DENIED'), { code: 'NAV_DENIED' }))
  counters.navigate++
  return sendCdp('Page.navigate', { url }, t.sessionId)
}

function getDomSnapshot(tabId) {
  const t = tabs.get(tabId)
  if (!t) return Promise.reject(new Error('TAB_NOT_FOUND'))
  const key = `snap:${tabId}`
  const last = nextAllowed.get(key) || 0
  const dt = now() - last
  if (dt < 300) return Promise.resolve(null)
  nextAllowed.set(key, now())
  counters.getDomSnapshot++
  return sendCdp('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true }, t.sessionId).then(r => ({ title: '', html: String(r.result.value || '') }))
}

function getScreenshot(tabId, fullPage) {
  const t = tabs.get(tabId)
  if (!t) return Promise.reject(new Error('TAB_NOT_FOUND'))
  const key = `shot:${tabId}`
  const last = nextAllowed.get(key) || 0
  const dt = now() - last
  if (dt < 600) return Promise.resolve(null)
  nextAllowed.set(key, now())
  counters.getScreenshot++
  if (!fullPage) return sendCdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, t.sessionId).then(r => ({ mime: 'image/jpeg', data: r.data }))
  return sendCdp('Page.getLayoutMetrics', {}, t.sessionId).then(m => {
    const width = Math.ceil(m.contentSize.width)
    const height = Math.ceil(m.contentSize.height)
    return sendCdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, t.sessionId).then(() => sendCdp('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true }, t.sessionId)).then(r => sendCdp('Emulation.clearDeviceMetricsOverride', {}, t.sessionId).then(() => ({ mime: 'image/jpeg', data: r.data })))
  })
}

function send(ws, msg) { ws.send(JSON.stringify(msg)) }

const wss = new WebSocketServer({ port: WS_PORT, path: WS_PATH })
wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://localhost')
  const auth = u.searchParams.get('auth')
  send(ws, { type: 'welcome', sessionId: Math.random().toString(36).slice(2), ok: !!auth || true })
  ws.on('message', data => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch { return }
    if (msg.type === 'ping') return send(ws, { type: 'pong' })
    if (!browserConnected) {
      return send(ws, { type: 'error', code: 'CDP_NOT_CONNECTED', message: 'CDP bridge not connected' })
    }
    if (msg.type === 'createTab') {
      createTab(msg.req || {}).then(tabId => send(ws, { type: 'tabCreated', id: tabId })).catch(e => send(ws, { type: 'error', code: e.code || 'CREATE_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'activateTab') {
      activateTab(msg.tabId).catch(e => send(ws, { type: 'error', code: e.code || 'ACTIVATE_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'closeTab') {
      closeTab(msg.tabId).then(() => send(ws, { type: 'tabClosed', id: msg.tabId })).catch(e => send(ws, { type: 'error', code: e.code || 'CLOSE_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'navigate') {
      const { tabId, url } = msg.req
      navigate(tabId, url).then(() => send(ws, { type: 'navigated', id: tabId, url })).catch(e => send(ws, { type: 'error', code: e.code || 'NAV_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'getDomSnapshot') {
      getDomSnapshot(msg.tabId).then(s => { if (s) send(ws, { type: 'domSnapshot', id: msg.tabId, snapshot: s }) }).catch(e => send(ws, { type: 'error', code: e.code || 'SNAPSHOT_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'getScreenshot') {
      getScreenshot(msg.tabId, !!msg.fullPage).then(s => { if (s) send(ws, { type: 'screenshot', id: msg.tabId, mime: s.mime, data: s.data }) }).catch(e => send(ws, { type: 'error', code: e.code || 'SCREENSHOT_FAIL', message: String(e.message || e) }))
      return
    }
    if (msg.type === 'setLoggedOutMode') {
      const t = tabs.get(msg.tabId)
      if (!t) return send(ws, { type: 'error', code: 'TAB_NOT_FOUND', message: 'tab not found' })
      if (msg.enabled && !t.browserContextId) {
        sendCdp('Target.createBrowserContext').then(r => { t.browserContextId = r.browserContextId }).catch(e => send(ws, { type: 'error', code: e.code || 'CTX_FAIL', message: String(e.message || e) }))
      }
      return
    }
  })
})

const health = http.createServer((req, res) => {
  if (req.url === '/health') {
    const ok = browserConnected
    const body = JSON.stringify({ ok, cdpPort: CDP_PORT, wsPort: WS_PORT, counters })
    res.writeHead(ok ? 200 : 500, { 'content-type': 'application/json' })
    res.end(body)
    return
  }
  res.statusCode = 404
  res.end('not found')
})
health.listen(Number(process.env.HEALTH_PORT || 8789), '127.0.0.1')

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
async function init() {
  try {
    startChrome()
    for (let i = 0; i < 20; i++) {
      try { await connectBrowser(); break } catch { await delay(500) }
    }
    if (!browserConnected) throw new Error('CDP_NOT_CONNECTED')
    console.log(`Coordinator CDP bridge listening on ws://localhost:${WS_PORT}${WS_PATH}`)
  } catch (err) {
    console.error('Failed to initialize CDP bridge', err && err.message ? err.message : String(err))
  }
}
init()