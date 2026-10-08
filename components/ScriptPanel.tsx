'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteScript, saveScriptVersion, writeScriptAction } from '@/app/actions'
import { checkScript } from '@/lib/claims'
import type { Beat, Script } from '@/lib/types'
import CopyButton from './CopyButton'
import Uploader from './Uploader'

type Frame = { id: string; script_id: string | null; shot_index: number | null; url: string; thumb_url: string | null; kind: string; version: number }

const emptyBeat = (start: number): Beat => ({ start, end: start + 3, visual: '', vo: '', on_screen: '', shot_type: '', prompt: '' })

export default function ScriptPanel({
  conceptId,
  scripts,
  frames,
  banned,
}: {
  conceptId: string
  scripts: Script[]
  frames: Frame[]
  banned: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(scripts[0]?.id ?? null)
  const selected = scripts.find((s) => s.id === selectedId) ?? scripts[0] ?? null
  const [mode, setMode] = useState<'view' | 'edit' | 'rewrite'>(scripts.length ? 'view' : 'rewrite')
  const [uploadShot, setUploadShot] = useState<number | null>(null)
  const [genState, genAction, generating] = useActionState(writeScriptAction.bind(null, conceptId), {})
  const [lastGen, setLastGen] = useState<number | undefined>()
  const [pending, start] = useTransition()

  // Jump to the newest version after Claude writes one.
  if (genState.version && genState.version !== lastGen && scripts[0]?.version === genState.version) {
    setLastGen(genState.version)
    setSelectedId(scripts[0].id)
    setMode('view')
  }

  const flags = useMemo(() => (selected ? checkScript(selected, banned) : []), [selected, banned])
  const frameFor = (i: number) => frames.find((f) => f.script_id === selected?.id && f.shot_index === i)

  const scriptText = selected
    ? selected.beats.map((b) => `[${b.start}-${b.end}s] ${b.vo}${b.on_screen ? `  (TEXT: ${b.on_screen})` : ''}`).join('\n') +
      (selected.cta ? `\n\nCTA: ${selected.cta}` : '')
    : ''
  const allPrompts = selected ? selected.beats.map((b, i) => `Shot ${i + 1} (${b.start}-${b.end}s)\n${b.prompt}`).join('\n\n') : ''

  return (
    <div>
      {scripts.length > 0 && (
        <div className="tabs" role="tablist">
          {scripts.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === selected?.id && mode !== 'rewrite'}
              onClick={() => {
                setSelectedId(s.id)
                setMode('view')
              }}
            >
              v{s.version}
            </button>
          ))}
          <button role="tab" aria-selected={mode === 'rewrite'} onClick={() => setMode('rewrite')}>
            {scripts.length ? 'New version with Claude' : 'Write with Claude'}
          </button>
        </div>
      )}

      {mode === 'rewrite' && (
        <form action={genAction} className="panel stack">
          <h3>{scripts.length ? `Rewrite from v${selected?.version}` : 'Write the first script'}</h3>
          <p className="muted small">
            Claude writes a timed shot list: what we see, what's said, caption text, and a paste-ready prompt for each shot.
          </p>
          <div className="form-grid">
            <label className="field">
              Length
              <select name="duration" defaultValue={String(selected?.duration ?? 30)}>
                {[15, 20, 30, 45, 60].map((d) => (
                  <option key={d} value={d}>
                    {d} seconds
                  </option>
                ))}
              </select>
            </label>
            {scripts.length > 0 && (
              <label className="field">
                Start from
                <select name="base" defaultValue={selected?.id}>
                  <option value="">Fresh script</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      Script v{s.version}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field full">
              Direction
              <small>Optional. e.g. “Open on the 3am ceiling stare, more deadpan, end on the morning routine”.</small>
              <textarea name="instruction" rows={2} />
            </label>
          </div>
          <div className="row">
            <button className="btn primary" disabled={generating}>
              {generating ? 'Writing script…' : 'Write script'}
            </button>
            {scripts.length > 0 && (
              <button type="button" className="btn ghost" onClick={() => setMode('view')}>
                Cancel
              </button>
            )}
          </div>
          {genState.error && <p className="notice error">{genState.error}</p>}
          {!scripts.length && (
            <p className="faint small">
              Prefer to write it yourself?{' '}
              <button type="button" className="btn ghost sm" onClick={() => setMode('edit')}>
                Start a blank script
              </button>
            </p>
          )}
        </form>
      )}

      {mode === 'edit' && (
        <ScriptEditor
          initial={selected ?? { title: '', duration: 30, cta: '', notes: '', beats: [emptyBeat(0)] }}
          baseVersion={selected?.version}
          onCancel={() => setMode(scripts.length ? 'view' : 'rewrite')}
          onSave={async (data) => {
            const res = await saveScriptVersion(conceptId, data)
            if (res.error) return res.error
            router.refresh()
            setMode('view')
            setSelectedId(null)
            return null
          }}
        />
      )}

      {mode === 'view' && selected && (
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{selected.title || 'Untitled script'}</h3>
              <span className="muted small">
                {selected.duration}s, {selected.beats.length} shots
              </span>
            </div>
            <div className="row">
              <CopyButton text={scriptText} label="Copy script" />
              <CopyButton text={allPrompts} label="Copy all prompts" />
              <button className="btn sm" onClick={() => setMode('edit')}>
                Edit as new version
              </button>
              <button
                className="btn ghost danger sm"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete script v${selected.version}? Uploaded versions stay, but lose their link to it.`)) return
                  start(async () => {
                    await deleteScript(selected.id)
                    setSelectedId(null)
                  })
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {flags.length > 0 && (
            <div className="flags">
              {flags.map((f, i) => (
                <div key={i} className="flag">
                  <b>“{f.term}”</b> in {f.where}. {f.reason}
                </div>
              ))}
            </div>
          )}

          {selected.notes && <p className="notice info small" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</p>}

          <div className="shots">
            {selected.beats.map((b, i) => {
              const frame = frameFor(i)
              return (
                <div key={i}>
                  <div className="shot">
                    <div className="time">
                      {b.start}–{b.end}s<small>Shot {i + 1}</small>
                    </div>
                    <div>
                      <div className="label">{b.shot_type || 'Visual'}</div>
                      <div>{b.visual}</div>
                      {b.prompt && (
                        <div className="prompt">
                          {b.prompt}
                          <div style={{ marginTop: 6 }}>
                            <CopyButton text={b.prompt} label="Copy prompt" className="btn sm" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="label">Voiceover</div>
                      <div className="vo">{b.vo || <span className="faint">No voiceover</span>}</div>
                      {b.on_screen && <span className="onscreen">{b.on_screen}</span>}
                    </div>
                    {frame ? (
                      <Link href={`/assets/${frame.id}`} className="frame" title={`Frame v${frame.version}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={frame.thumb_url ?? (frame.kind === 'image' ? frame.url : '')} alt={`Shot ${i + 1} frame`} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="frame"
                        style={{ border: '1.5px dashed var(--line)', cursor: 'pointer', font: 'inherit', fontSize: '0.78rem' }}
                        onClick={() => setUploadShot(uploadShot === i ? null : i)}
                      >
                        Add frame
                        <br />
                        or clip
                      </button>
                    )}
                  </div>
                  {uploadShot === i && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <div className="panel tight">
                        <Uploader
                          conceptId={conceptId}
                          scripts={scripts}
                          defaultScriptId={selected.id}
                          defaultShot={i}
                          onDone={() => setUploadShot(null)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {selected.cta && (
            <p>
              <span className="muted small">CTA </span>
              <b>{selected.cta}</b>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ScriptEditor({
  initial,
  baseVersion,
  onSave,
  onCancel,
}: {
  initial: Pick<Script, 'title' | 'duration' | 'cta' | 'notes' | 'beats'>
  baseVersion?: number
  onSave: (d: Pick<Script, 'title' | 'duration' | 'cta' | 'notes' | 'beats'>) => Promise<string | null>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [cta, setCta] = useState(initial.cta)
  const [notes, setNotes] = useState(initial.notes)
  const [beats, setBeats] = useState<Beat[]>(initial.beats.length ? initial.beats.map((b) => ({ ...b })) : [emptyBeat(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const duration = beats.reduce((m, b) => Math.max(m, Number(b.end) || 0), 0)

  const set = (i: number, k: keyof Beat, v: string) =>
    setBeats((bs) => bs.map((b, j) => (j === i ? { ...b, [k]: k === 'start' || k === 'end' ? Number(v) : v } : b)))

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{baseVersion ? `Editing a copy of v${baseVersion}` : 'New script'}</h3>
        <span className="muted small">Saving creates a new version. Older versions stay untouched.</span>
      </div>
      <div className="form-grid">
        <label className="field">
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          CTA
          <input type="text" value={cta} onChange={(e) => setCta(e.target.value)} />
        </label>
        <label className="field full">
          Direction notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div className="shots">
        {beats.map((b, i) => (
          <div key={i} className="beat-edit">
            <label className="field">
              Start (s)
              <input type="number" step="0.5" min="0" value={b.start} onChange={(e) => set(i, 'start', e.target.value)} />
            </label>
            <label className="field">
              End (s)
              <input type="number" step="0.5" min="0" value={b.end} onChange={(e) => set(i, 'end', e.target.value)} />
            </label>
            <label className="field">
              Shot type
              <input type="text" value={b.shot_type} onChange={(e) => set(i, 'shot_type', e.target.value)} />
            </label>
            <label className="field">
              On-screen text
              <input type="text" value={b.on_screen} onChange={(e) => set(i, 'on_screen', e.target.value)} />
            </label>
            <label className="field wide">
              Visual
              <textarea rows={2} value={b.visual} onChange={(e) => set(i, 'visual', e.target.value)} />
            </label>
            <label className="field wide">
              Voiceover
              <textarea rows={2} value={b.vo} onChange={(e) => set(i, 'vo', e.target.value)} />
            </label>
            <label className="field wide">
              Generation prompt
              <textarea rows={3} value={b.prompt} onChange={(e) => set(i, 'prompt', e.target.value)} />
            </label>
            <div className="row wide" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => setBeats((bs) => swap(bs, i, i - 1))}>
                Move up
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={i === beats.length - 1}
                onClick={() => setBeats((bs) => swap(bs, i, i + 1))}
              >
                Move down
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setBeats((bs) => [...bs.slice(0, i + 1), emptyBeat(b.end), ...bs.slice(i + 1)])}
              >
                Add shot below
              </button>
              <button
                type="button"
                className="btn ghost danger sm"
                disabled={beats.length === 1}
                onClick={() => setBeats((bs) => bs.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="notice error">{error}</p>}
      <div className="row">
        <button
          className="btn primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            setError(await onSave({ title, cta, notes, beats, duration: Math.round(duration) || 30 }))
            setSaving(false)
          }}
        >
          {saving ? 'Saving…' : 'Save as new version'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <span className="muted small">Runs {duration}s</span>
      </div>
    </div>
  )
}

function swap<T>(arr: T[], a: number, b: number) {
  const next = arr.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
