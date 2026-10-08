'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions'

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {})
  return (
    <form action={action}>
      <div className="wordmark">
        <i aria-hidden />
        Creative Desk
      </div>
      <label className="field">
        Password
        <input type="password" name="password" autoFocus required autoComplete="current-password" />
      </label>
      <input type="hidden" name="next" value={next} />
      {state.error && <p className="notice error">{state.error}</p>}
      <button className="btn primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
