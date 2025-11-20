type Entry = { domain: string, visible: boolean }

const KEY = 'atlas_site_ai_visibility_v1'

export const SiteAiVisibility = {
  list(): Entry[] {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  },
  get(domain: string): boolean {
    const arr = SiteAiVisibility.list()
    const found = arr.find(e => e.domain.toLowerCase() === domain.toLowerCase())
    return !!found?.visible
  },
  set(domain: string, visible: boolean) {
    const arr = SiteAiVisibility.list()
    const idx = arr.findIndex(e => e.domain.toLowerCase() === domain.toLowerCase())
    if (idx >= 0) arr[idx].visible = visible
    else arr.unshift({ domain, visible })
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 500)))
  },
  remove(domain: string) {
    const arr = SiteAiVisibility.list().filter(e => e.domain.toLowerCase() !== domain.toLowerCase())
    localStorage.setItem(KEY, JSON.stringify(arr))
  }
}