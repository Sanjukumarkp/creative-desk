export const SESSION_COOKIE = 'cd_session'

function secret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || ''
}

async function hmac(message: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The cookie value for a signed-in session. Changes whenever the password or secret changes. */
export async function sessionToken() {
  return hmac('creative-desk-session-v1:' + (process.env.APP_PASSWORD || ''))
}

export async function isValidSession(value: string | undefined) {
  if (!value || !secret() || !process.env.APP_PASSWORD) return false
  const expected = await sessionToken()
  if (value.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export function passwordMatches(input: string) {
  const pw = process.env.APP_PASSWORD || ''
  if (!pw || input.length !== pw.length) return false
  let diff = 0
  for (let i = 0; i < pw.length; i++) diff |= input.charCodeAt(i) ^ pw.charCodeAt(i)
  return diff === 0
}
