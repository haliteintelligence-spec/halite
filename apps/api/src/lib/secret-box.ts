import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// AES-256-GCM at-rest encryption for sensitive fields this service itself
// writes (Shopify access tokens, demo login passwords shown back to an
// admin) — distinct from fernet.ts, which only *decrypts* values a separate
// Python service already encrypted. A dedicated SECRET_BOX_KEY is
// recommended in production; falling back to a key derived from JWT_SECRET
// keeps this deployable without requiring a new env var immediately, at the
// cost of the two secrets no longer being independently rotatable.
function getKey(): Buffer {
  const configured = process.env.SECRET_BOX_KEY
  if (configured) return createHash('sha256').update(configured).digest()
  return createHash('sha256').update(`secret-box:${process.env.JWT_SECRET!}`).digest()
}

/** Returns `iv:authTag:ciphertext`, each base64url — safe to store as a single text column. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join(':')
}

export function decryptSecret(encrypted: string): string {
  const [ivB64, tagB64, ciphertextB64] = encrypted.split(':')
  if (!ivB64 || !tagB64 || !ciphertextB64) throw new Error('Invalid encrypted secret format')
  const iv = Buffer.from(ivB64, 'base64url')
  const authTag = Buffer.from(tagB64, 'base64url')
  const ciphertext = Buffer.from(ciphertextB64, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8')
}

/** Returns null instead of throwing — for display paths where a decrypt failure shouldn't 500 the page. */
export function tryDecryptSecret(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decryptSecret(encrypted)
  } catch {
    return null
  }
}
