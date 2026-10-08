import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, isValidSession } from './auth'

/** Defense in depth: every owner-only page and action calls this, in addition to proxy.ts. */
export async function requireAuth() {
  const jar = await cookies()
  if (!(await isValidSession(jar.get(SESSION_COOKIE)?.value))) redirect('/login')
}

export async function isAuthed() {
  const jar = await cookies()
  return isValidSession(jar.get(SESSION_COOKIE)?.value)
}
