'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordAsset } from '@/app/actions'
import { inspect, putFile } from '@/lib/media-client'
import { fmtBytes } from '@/lib/format'
import { TOOLS, type Beat } from '@/lib/types'


type ScriptOpt = { id: string; version: number; beats: Beat[] }
type Job = { name: string; size: number; pct: number; state: 'waiting' | 'reading' | 'uploading' | 'saving' | 'done' | 'error'; error?: string }

export default function Uploader({
  conceptId,
  scripts,
  defaultScriptId,
  defaultShot,
  onDone,
}: {
  conceptId: string
  scripts: ScriptOpt[]
  defaultScriptId?: string | null
  defaultShot?: number | null
  onDone?: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [over, setOver] = useState(false)
  const [scriptId, setScriptId] = useState<string>(defaultScriptId ?? scripts[0]?.id ?? '')
  const [shot, setShot] = useState<string>(defaultShot != null ? String(defaultShot) : '')
  const [tool, setTool] = useState('')
  const [label, setLabel] = useState('')
  const [settings, setSettings] = useState('')
  const [notes, setNotes] = useState('')
  const script = useMemo(() => scripts.find((s) => s.id === scriptId), [scripts, scriptId])
  const shotPrompt = shot !== '' ? script?.beats[Number(shot)]?.prompt ?? '' : ''
  const [prompt, setPrompt] = useState(shotPrompt)
  const [promptTouched, setPromptTouched] = useState(false)
  const effectivePrompt = promptTouched ? prompt : shotPrompt
  const [jobs, setJobs] = useState<Job[]>([])
  const [busy, setBusy] = useState(false)

  function pick(list: FileList | null) {
    if (!list) return
    const ok = Array.from(list).filter((f) => f.type.startsWith('video/') || f.type.startsWith('image/'))
    setFiles(ok)
    setJobs([])
  }

  function patch(i: number, p: Partial<Job>) {
    setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...p } : j)))
  }

  async function start() {
    if (!files.length) return
    setBusy(true)
    const status = await fetch('/api/upload').then((r) => r.json()).catch(() => ({ ready: false }))
    if (!status.ready) {
      setJobs(files.map((f) => ({ name: f.name, size: f.size, pct: 0, state: 'error', error: 'File storage isn’t connected yet. Add a Vercel Blob store to the project.' })))
      setBusy(false)
      return
    }
    setJobs(files.map((f) => ({ name: f.name, size: f.size, pct: 0, state: 'waiting' })))
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try {
        patch(i, { state: 'reading' })
        const info = await inspect(f)
        const folder = `concepts/${conceptId}`
        let thumbUrl: string | null = null
        let thumbPath: string | null = null
        if (info.thumb) {
          const t = await putFile(`${folder}/thumbs`, info.thumb, `${f.name}.jpg`)
          thumbUrl = t.url
          thumbPath = t.pathname
        }
        patch(i, { state: 'uploading' })
        const blob = await putFile(folder, f, f.name, (pct) => patch(i, { pct }))
        patch(i, { state: 'saving', pct: 100 })
        const res = await recordAsset({
          conceptId,
          scriptId: scriptId || null,
          shotIndex: shot === '' ? null : Number(shot),
          kind: info.kind,
          url: blob.url,
          pathname: blob.pathname,
          contentType: f.type,
          size: f.size,
          width: info.width,
          height: info.height,
          duration: info.duration,
          thumbUrl,
          thumbPathname: thumbPath,
          label: files.length > 1 && label ? `${label} (${i + 1})` : label,
          tool,
          prompt: effectivePrompt,
          settings,
          notes,
        })
        if (res.error) throw new Error(res.error)
        patch(i, { state: 'done' })
      } catch (err) {
        failed++
        patch(i, { state: 'error', error: (err as Error).message })
      }
    }
    setBusy(false)
    router.refresh()
    if (!failed) {
      setFiles([])
      setLabel('')
      setNotes('')
      onDone?.()
    }
  }

  return (
    <div className="stack">
      <div
        className={`dropzone${over ? ' over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          pick(e.dataTransfer.files)
        }}
      >
        <input ref={inputRef} type="file" accept="video/*,image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
        {files.length ? (
          <div>
            <b>{files.length === 1 ? files[0].name : `${files.length} files`}</b>
            <div className="small">{fmtBytes(files.reduce((n, f) => n + f.size, 0))}. Each file becomes its own version.</div>
          </div>
        ) : (
          <div>
            <b>Drop videos or images here</b>
            <div className="small">Or click to choose. Files up to 5 GB upload straight to storage.</div>
          </div>
        )}
      </div>

      <div className="form-grid">
        <label className="field">
          Made from script
          <select value={scriptId} onChange={(e) => setScriptId(e.target.value)}>
            <option value="">No script</option>
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                Script v{s.version}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          What is it
          <select value={shot} onChange={(e) => setShot(e.target.value)} disabled={!script}>
            <option value="">Finished ad (full cut)</option>
            {script?.beats.map((b, i) => (
              <option key={i} value={i}>
                Shot {i + 1} frame or clip ({b.start}–{b.end}s)
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Made with
          <input type="text" list="tools" value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Runway, Veo, filmed…" />
          <datalist id="tools">
            {TOOLS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Label
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Faster cut, new VO" />
        </label>
        <label className="field full">
          Prompt used
          <small>{shot !== '' && !promptTouched ? 'Filled in from the shot list. Edit it to match what you actually ran.' : 'Paste the exact prompt so you can reproduce this later.'}</small>
          <textarea
            rows={3}
            value={effectivePrompt}
            onChange={(e) => {
              setPromptTouched(true)
              setPrompt(e.target.value)
            }}
          />
        </label>
        <label className="field">
          Settings
          <small>Model, seed, motion, duration, aspect.</small>
          <textarea rows={2} value={settings} onChange={(e) => setSettings(e.target.value)} />
        </label>
        <label className="field">
          What changed
          <small>Versus the last version.</small>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      {jobs.length > 0 && (
        <div className="stack">
          {jobs.map((j, i) => (
            <div key={i} className="stack" style={{ gap: 4 }}>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span>{j.name}</span>
                <span className={j.state === 'error' ? '' : 'muted'} style={j.state === 'error' ? { color: 'var(--warn)' } : undefined}>
                  {j.state === 'error'
                    ? j.error
                    : j.state === 'uploading'
                      ? `${Math.round(j.pct)}%`
                      : { waiting: 'Waiting', reading: 'Reading file', saving: 'Saving', done: 'Done' }[j.state]}
                </span>
              </div>
              <div className="progress">
                <div style={{ width: `${j.state === 'done' ? 100 : j.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <button className="btn primary" disabled={!files.length || busy} onClick={start}>
          {busy ? 'Uploading…' : files.length > 1 ? `Upload ${files.length} versions` : 'Upload version'}
        </button>
      </div>
    </div>
  )
}
