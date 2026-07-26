import { createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto'

// Decrypts a token produced by Python's `cryptography.fernet.Fernet` —
// hallie-api encrypts payout bank/contact details at the application layer
// with this (see hallie-api/app/security/field_encryption.py) before they
// ever reach Postgres, so a raw SQL SELECT from this service sees only
// ciphertext. Decrypt-only: this admin backend never writes to these
// fields, only reads them for display.
//
// Fernet token layout (https://github.com/fernet/spec):
//   Version (1 byte, 0x80) || Timestamp (8 bytes) || IV (16 bytes) ||
//   Ciphertext (AES-128-CBC, PKCS7 padded) || HMAC-SHA256 (32 bytes)
// Key layout: 32 raw bytes — first 16 are the HMAC signing key, last 16
// are the AES-128 encryption key. No TTL/expiry check is performed here,
// matching hallie-api's own `_fernet().decrypt(value)` call (no ttl arg).
export function fernetDecrypt(token: string, keyBase64Url: string): string {
  const key = Buffer.from(keyBase64Url, 'base64url')
  if (key.length !== 32) throw new Error('Invalid Fernet key length')
  const signingKey = key.subarray(0, 16)
  const encryptionKey = key.subarray(16, 32)

  const data = Buffer.from(token, 'base64url')
  if (data.length < 1 + 8 + 16 + 32) throw new Error('Invalid Fernet token')
  if (data[0] !== 0x80) throw new Error('Unsupported Fernet version')

  const hmacGiven = data.subarray(data.length - 32)
  const signedPortion = data.subarray(0, data.length - 32)
  const iv = data.subarray(9, 25)
  const ciphertext = data.subarray(25, data.length - 32)

  const hmacComputed = createHmac('sha256', signingKey).update(signedPortion).digest()
  if (hmacGiven.length !== hmacComputed.length || !timingSafeEqual(hmacGiven, hmacComputed)) {
    throw new Error('Fernet HMAC verification failed')
  }

  const decipher = createDecipheriv('aes-128-cbc', encryptionKey, iv)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf-8')
}

/** Returns null instead of throwing — used for admin display, where a
 * missing/misconfigured key or a null field should degrade gracefully
 * rather than 500 the whole payout detail page. */
export function tryFernetDecrypt(token: string | null, keyBase64Url: string | undefined): string | null {
  if (!token || !keyBase64Url) return null
  try {
    return fernetDecrypt(token, keyBase64Url)
  } catch {
    return null
  }
}
