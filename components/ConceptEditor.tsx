'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { refineConceptAction, updateConcept, type ConceptDraftResult } from '@/app/actions'
import type { Concept } from '@/lib/types'
import ConceptFields from './ConceptFields'

type Draft = NonNullable<ConceptDraftResult['draft']>
const KEYS: (keyof Draft)[] = ['title', 'hook', 'angle', 'format', 'awareness', 'persona', 'notes']
const LABELS: Record<keyof Draft, string> = {
  title: 'Title',
  hook: 'Hook',
  angle: 'Angle',
  format: 'Format',
  awareness: 'Awareness',
  persona: 'Persona',
  notes: 'Notes',
}

export default function ConceptEditor({ concept }: { concept: Concept }) {
  const [editing, setEditing] = useState(false)
  const [state, action, saving] = useActionState(updateConcept.bind(null, concept.id), {})
  const [instruction, setInstruction] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refining, start] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [formKey, setFormKey] = useState(0)

  function refine() {
    setError(null)
    start(async () => {
      const res = await refineConceptAction(concept.id, instruction)
      if (res.error) setError(res.error)
      else if (res.draft) setDraft(res.draft)
    })
  }

  function applyDraft() {
    if (!draft) return
    const fd = new FormData()
    KEYS.forEach((k) => fd.set(k, String(draft[k] ?? '')))
    start(async () => {
      await updateConcept(concept.id, {}, fd)
      setDraft(null)
      setInstruction('')
      setFormKey((k) => k + 1)
    })
  }

  return (
    <div className="stack">
      <div className="panel tight stack">
        <h3>Refine with Claude</h3>
        <textarea
          rows={2}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make the hook a question, aim it at shift workers"
        />
        <div className="row">
          <button className="btn dark sm" disabled={refining} onClick={refine}>
            {refining && !draft ? 'Thinking…' : 'Suggest a revision'}
          </button>
        </div>
        {error && <p className="notice error">{error}</p>}
        {draft && (
          <div className="stack">
            <dl className="kv">
              {KEYS.filter((k) => String(draft[k] ?? '') !== String(concept[k] ?? '')).map((k) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{LABELS[k]}</dt>
                  <dd>
                    <span className="faint" style={{ textDecoration: 'line-through' }}>
                      {concept[k] || '(empty)'}
                    </span>
                    <br />
                    {draft[k]}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="row">
              <button className="btn primary sm" disabled={refining} onClick={applyDraft}>
                Use this revision
              </button>
              <button className="btn ghost sm" onClick={() => setDraft(null)}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {editing ? (
        <form key={formKey} ref={formRef} action={action} className="panel stack">
          <ConceptFields concept={concept} compact />
          <div className="row">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save concept'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
              Done
            </button>
            {state.ok && !saving && <span className="muted small">Saved</span>}
          </div>
        </form>
      ) : (
        <button className="btn" onClick={() => setEditing(true)}>
          Edit concept by hand
        </button>
      )}
    </div>
  )
}
