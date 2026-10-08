'use client'

import { useFormStatus } from 'react-dom'

export function Submit({ children, pendingText, className = 'btn primary' }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText ?? 'Saving…' : children}
    </button>
  )
}

/** A button that runs a server action after a confirm() prompt. */
export function ConfirmButton({
  action,
  message,
  children,
  className = 'btn ghost danger sm',
}: {
  action: () => Promise<void>
  message: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault()
      }}
    >
      <Submit className={className} pendingText="Working…">
        {children}
      </Submit>
    </form>
  )
}
