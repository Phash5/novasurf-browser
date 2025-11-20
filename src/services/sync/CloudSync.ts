import { Encryptor } from '../crypto/Encryptor'

type Payload = Record<string, unknown>

export const CloudSync = {
  async saveLocalEncrypted(key: string, payload: Payload, passphrase: string) {
    const json = new TextEncoder().encode(JSON.stringify(payload))
    const { cipher, iv, salt } = await Encryptor.encrypt(json, passphrase)
    const packed = {
      cipher: Array.from(cipher),
      iv: Array.from(iv),
      salt: Array.from(salt)
    }
    localStorage.setItem(`atlas_sync_${key}`, JSON.stringify(packed))
  },
  async loadLocalEncrypted(key: string, passphrase: string) {
    const raw = localStorage.getItem(`atlas_sync_${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const cipher = new Uint8Array(parsed.cipher)
    const iv = new Uint8Array(parsed.iv)
    const salt = new Uint8Array(parsed.salt)
    const plain = await Encryptor.decrypt(cipher, passphrase, iv, salt)
    return JSON.parse(new TextDecoder().decode(plain))
  },
  async push(url: string, payload: Payload, passphrase: string, token?: string) {
    const json = new TextEncoder().encode(JSON.stringify(payload))
    const { cipher, iv, salt } = await Encryptor.encrypt(json, passphrase)
    const body = { cipher: Array.from(cipher), iv: Array.from(iv), salt: Array.from(salt) }
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (token) headers['authorization'] = `Bearer ${token}`
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    return res.ok
  }
}