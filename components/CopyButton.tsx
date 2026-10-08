'use client'

import { useState } from 'react'

export default function CopyButton({ text, label = 'Copy', className = 'btn sm' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          prompt('Copy this:', text)
        }
      }}
    >
      {done ? 'Copied' : label}
    </button>
  )
}
