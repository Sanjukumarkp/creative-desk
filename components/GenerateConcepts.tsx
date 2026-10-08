'use client'

import { useActionState } from 'react'
import { generateConceptsAction } from '@/app/actions'

export default function GenerateConcepts({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(generateConceptsAction.bind(null, campaignId), {})
  return (
    <form action={action} className="panel tight stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Generate concepts with Claude</h3>
        <span className="faint small">Reads the brand brief and skips angles you already have.</span>
      </div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <input
          type="text"
          name="direction"
          placeholder="Optional direction, e.g. “hooks for women 35+ who've tried melatonin and hated the grogginess”"
          style={{ flex: 1, minWidth: 220 }}
        />
        <select name="count" defaultValue="5" style={{ width: 'auto' }} aria-label="How many">
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n} concepts
            </option>
          ))}
        </select>
        <button className="btn primary" disabled={pending}>
          {pending ? 'Writing concepts…' : 'Generate'}
        </button>
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.ok && !pending && <p className="notice ok">Added {state.added} new concepts to Ideas. Kill the weak ones, script the strong ones.</p>}
    </form>
  )
}
