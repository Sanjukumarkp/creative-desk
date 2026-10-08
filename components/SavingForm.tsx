'use client'

import { useActionState, useEffect, useState } from 'react'

type R = { error?: string; ok?: boolean }

/** A form bound to a server action that shows "Saved" or the error inline. */
export default function SavingForm({
  action,
  children,
  submitLabel = 'Save changes',
  className = 'stack',
}: {
  action: (prev: R, fd: FormData) => Promise<R>
  children: React.ReactNode
  submitLabel?: string
  className?: string
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (state.ok) {
      setShown(true)
      const t = setTimeout(() => setShown(false), 2000)
      return () => clearTimeout(t)
    }
  }, [state])
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="row">
        <button className="btn primary" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        {shown && <span className="muted small">Saved</span>}
        {state.error && <span className="notice error">{state.error}</span>}
      </div>
    </form>
  )
}
