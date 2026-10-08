// Applies scripts/schema.sql. Runs automatically before `next build`.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { cleanDatabaseUrl } from '../lib/db-url.mjs'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) {
  console.warn('[migrate] DATABASE_URL is not set, skipping schema migration.')
  process.exit(0)
}

const schema = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8')
const sql = postgres(cleanDatabaseUrl(url), { max: 1, prepare: false, onnotice: () => {} })
try {
  await sql.unsafe(schema)
  console.log('[migrate] schema is up to date')
} catch (err) {
  console.error('[migrate] failed:', err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
