export const Encryptor = {
  async deriveKey(passphrase: string, salt: Uint8Array) {
    const enc = new TextEncoder()
    const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  },
  async encrypt(data: Uint8Array, passphrase: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await Encryptor.deriveKey(passphrase, salt)
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
    return { cipher: new Uint8Array(cipher), iv, salt }
  },
  async decrypt(cipher: Uint8Array, passphrase: string, iv: Uint8Array, salt: Uint8Array) {
    const key = await Encryptor.deriveKey(passphrase, salt)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    return new Uint8Array(plain)
  }
}