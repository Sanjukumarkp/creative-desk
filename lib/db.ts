import postgres from 'postgres'
import { cleanDatabaseUrl } from './db-url.mjs'

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

function create() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL is not set. Add a Postgres database and redeploy.')
  return postgres(cleanDatabaseUrl(url), { max: 5, prepare: false, idle_timeout: 20, onnotice: () => {} })
}

/** Lazily created so builds without a database still compile. */
export const sql: ReturnType<typeof postgres> = new Proxy((() => {}) as unknown as ReturnType<typeof postgres>, {
  get(_t, prop) {
    globalThis.__sql ??= create()
    return Reflect.get(globalThis.__sql, prop)
  },
  apply(_t, _this, args) {
    globalThis.__sql ??= create()
    return Reflect.apply(globalThis.__sql as unknown as (...a: unknown[]) => unknown, undefined, args)
  },
})
