type TabId = string

type CreateTabReq = { url?: string }
type NavigateReq = { tabId: TabId, url: string }

type DomSnapshot = { html: string, title: string }

type Events = {
  tabCreated: (id: TabId) => void
  navigated: (id: TabId, url: string) => void
  domSnapshot: (id: TabId, snapshot: DomSnapshot) => void
  approvalRequest?: (payload: { requestId: string, action: string, params: any, risk: string }) => void
  agentPlan?: (payload: { id: string, steps: any[] }) => void
  agentResult?: (payload: { id: string, status: string, observation?: string }) => void
  agentLog?: (payload: { id: string, event: string, ts: number }) => void
}

export class Coordinator {
  private ws: WebSocket | null = null
  private listeners: Partial<Events> = {}
  private sessionId: string | null = null
  constructor(url = 'ws://localhost:8787/atlas', token?: string) {
    const u = token ? `${url}?auth=${encodeURIComponent(token)}` : url
    try { this.ws = new WebSocket(u) } catch { this.ws = null }
    if (this.ws) {
      this.ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'welcome') this.sessionId = msg.sessionId
          if (msg.type === 'pong') {}
          if (msg.type === 'tabCreated' && this.listeners.tabCreated) this.listeners.tabCreated(msg.id)
          if (msg.type === 'navigated' && this.listeners.navigated) this.listeners.navigated(msg.id, msg.url)
          if (msg.type === 'domSnapshot' && this.listeners.domSnapshot) this.listeners.domSnapshot(msg.id, msg.snapshot)
          if (msg.type === 'approvalRequest' && this.listeners.approvalRequest) this.listeners.approvalRequest(msg)
          if (msg.type === 'agentPlan' && this.listeners.agentPlan) this.listeners.agentPlan(msg)
          if (msg.type === 'agentResult' && this.listeners.agentResult) this.listeners.agentResult(msg)
          if (msg.type === 'agentLog' && this.listeners.agentLog) this.listeners.agentLog(msg)
        } catch {}
      }
      this.ws.onopen = () => { this.ws!.send(JSON.stringify({ type: 'hello', agent: 'ntp', version: 1 })) }
    }
  }
  on<K extends keyof Events>(k: K, fn: Events[K]) { this.listeners[k] = fn }
  async createTab(req: CreateTabReq) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'createTab', req }))
    else this.mockCreateTab(req)
  }
  async navigate(req: NavigateReq) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'navigate', req }))
    else this.mockNavigate(req)
  }
  async ping() { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'ping' })) }
  async getDomSnapshot(tabId: TabId) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'getDomSnapshot', tabId })) }
  async agentIntent(intent: string) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'agentIntent', intent })) }
  async agentPlanRequest(tabId: TabId, context: any) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'agentPlanRequest', tabId, context })) }
  async agentExecute(id: string, action: string, params: any) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'agentExecute', id, action, params })) }
  async approvalResponse(requestId: string, approved: boolean, reason?: string) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'approvalResponse', requestId, approved, reason })) }
  private mockCreateTab(_req: CreateTabReq) {
    const id = Math.random().toString(36).slice(2)
    if (this.listeners.tabCreated) this.listeners.tabCreated(id)
  }
  private mockNavigate(req: NavigateReq) {
    if (this.listeners.navigated) this.listeners.navigated(req.tabId, req.url)
    if (this.listeners.domSnapshot) this.listeners.domSnapshot(req.tabId, { html: '<html></html>', title: req.url })
  }
}