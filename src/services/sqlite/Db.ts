import initSqlJs, { Database } from 'sql.js'

type Page = { id?: number, url: string, title: string, ts: number, domain: string, hash?: string, snapshot_ref?: string }
type Memory = { id?: number, page_id: number, kind: string, summary: string, entities: string, ts: number, archived: number }
type Session = { id?: number, started_at: number, ended_at?: number, notes?: string }
type AgentAction = { id?: number, session_id: number, action: string, params: string, ts: number, approved: number, result?: string, domain?: string, tab_id?: string, outcome_type?: string, outcome_detail?: string }

let dbPromise: Promise<Database> | null = null

async function getDb() {
  if (!dbPromise) {
    dbPromise = initSqlJs({ locateFile: f => `/node_modules/sql.js/dist/${f}` }).then(SQL => new SQL.Database())
    const db = await dbPromise
    db.run(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT, title TEXT, ts INTEGER, domain TEXT, hash TEXT, snapshot_ref TEXT
      );
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER, kind TEXT, summary TEXT, entities TEXT, ts INTEGER, archived INTEGER
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER, ended_at INTEGER, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS agent_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER, action TEXT, params TEXT, ts INTEGER, approved INTEGER, result TEXT, domain TEXT, tab_id TEXT, outcome_type TEXT, outcome_detail TEXT
      );
    `)
    try {
      const cols = db.exec(`PRAGMA table_info('agent_actions')`)
      const names = (cols[0]?.values || []).map(v => String(v[1]))
      if (!names.includes('domain')) db.run(`ALTER TABLE agent_actions ADD COLUMN domain TEXT`)
      if (!names.includes('tab_id')) db.run(`ALTER TABLE agent_actions ADD COLUMN tab_id TEXT`)
      if (!names.includes('outcome_type')) db.run(`ALTER TABLE agent_actions ADD COLUMN outcome_type TEXT`)
      if (!names.includes('outcome_detail')) db.run(`ALTER TABLE agent_actions ADD COLUMN outcome_detail TEXT`)
    } catch {}
  }
  return dbPromise!
}

export const Db = {
  async createSession() {
    const db = await getDb()
    db.exec('INSERT INTO sessions(started_at) VALUES(' + Date.now() + ');')
    const res = db.exec('SELECT last_insert_rowid() as id;')
    const id = res[0]?.values?.[0]?.[0] as number
    return id
  },
  async insertPage(p: Page) {
    const db = await getDb()
    const stmt = db.prepare('INSERT INTO pages(url, title, ts, domain, hash, snapshot_ref) VALUES(?,?,?,?,?,?)')
    stmt.run([p.url, p.title, p.ts, p.domain, p.hash ?? '', p.snapshot_ref ?? ''])
    stmt.free()
  },
  async insertMemory(m: Memory) {
    const db = await getDb()
    const stmt = db.prepare('INSERT INTO memories(page_id, kind, summary, entities, ts, archived) VALUES(?,?,?,?,?,?)')
    stmt.run([m.page_id, m.kind, m.summary, m.entities, m.ts, m.archived])
    stmt.free()
  },
  async insertSession(s: Session) {
    const db = await getDb()
    const stmt = db.prepare('INSERT INTO sessions(started_at, ended_at, notes) VALUES(?,?,?)')
    stmt.run([s.started_at, s.ended_at ?? null, s.notes ?? ''])
    stmt.free()
  },
  async insertAgentAction(a: AgentAction) {
    const db = await getDb()
    const stmt = db.prepare('INSERT INTO agent_actions(session_id, action, params, ts, approved, result, domain, tab_id, outcome_type, outcome_detail) VALUES(?,?,?,?,?,?,?,?,?,?)')
    stmt.run([a.session_id, a.action, a.params, a.ts, a.approved, a.result ?? '', a.domain ?? '', a.tab_id ?? '', a.outcome_type ?? '', a.outcome_detail ?? ''])
    stmt.free()
  },
  async recentPages(limit = 10) {
    const db = await getDb()
    const res = db.exec(`SELECT id, url, title, ts, domain FROM pages ORDER BY ts DESC LIMIT ${limit}`)
    return res[0]?.values ?? []
  },
  async recentAgentActions(limit = 20) {
    const db = await getDb()
    const res = db.exec(`SELECT id, session_id, action, params, ts, approved, result, domain, tab_id, outcome_type, outcome_detail FROM agent_actions ORDER BY ts DESC LIMIT ${limit}`)
    return res[0]?.values ?? []
  }
}