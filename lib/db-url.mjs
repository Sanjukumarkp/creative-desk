// Neon and some other hosts add libpq-only options (like channel_binding) to the
// connection string. The `postgres` driver forwards unknown options to the server,
// which rejects them, so strip them before connecting.
const CLIENT_ONLY = ['channel_binding', 'sslcert', 'sslkey', 'sslpassword', 'gssencmode', 'krbsrvname', 'service']

export function cleanDatabaseUrl(raw) {
  if (!raw) return raw
  try {
    const url = new URL(raw)
    for (const key of CLIENT_ONLY) url.searchParams.delete(key)
    return url.toString()
  } catch {
    return raw
  }
}
