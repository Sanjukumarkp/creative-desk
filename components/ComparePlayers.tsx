'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import StatusSelect from './StatusSelect'
import { aspect, fmtTime } from '@/lib/format'

type Item = {
  id: string
  version: number
  label: string
  kind: 'video' | 'image'
  url: string
  thumb_url: string | null
  duration_sec: number | null
  width: number | null
  height: number | null
  status: string
  tool: string
  prompt: string
  settings: string
  notes: string
  script_version: number | null
  concept_id: string
  concept_title: string
  comment_count?: number
}

export default function ComparePlayers({ items }: { items: Item[] }) {
  const refs = useRef<(HTMLVideoElement | null)[]>([])
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [audio, setAudio] = useState(0)
  const [loop, setLoop] = useState(true)
  const videos = () => refs.current.filter((v): v is HTMLVideoElement => !!v)
  const longest = Math.max(0, ...items.map((i) => i.duration_sec ?? 0))
  const hasVideo = items.some((i) => i.kind === 'video')
  const sameConcept = items.every((i) => i.concept_id === items[0].concept_id)

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (v) v.muted = i !== audio
    })
  }, [audio])

  // Keep everyone locked to the first video's clock.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const vs = videos()
      const lead = vs[0]
      if (lead) {
        setT(lead.currentTime)
        for (const v of vs.slice(1)) {
          if (v.duration && lead.currentTime < v.duration && Math.abs(v.currentTime - lead.currentTime) > 0.12) {
            v.currentTime = lead.currentTime
          }
        }
        if (lead.ended || (longest && lead.currentTime >= longest - 0.05)) {
          if (loop) seek(0, true)
          else setPlaying(false)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, loop, longest])

  function play() {
    videos().forEach((v) => v.play().catch(() => {}))
    setPlaying(true)
  }
  function pause() {
    videos().forEach((v) => v.pause())
    setPlaying(false)
  }
  function seek(time: number, keepPlaying = false) {
    videos().forEach((v) => {
      v.currentTime = Math.min(time, v.duration || time)
      if (keepPlaying) v.play().catch(() => {})
    })
    setT(time)
  }
  function step(d: number) {
    pause()
    seek(Math.max(0, t + d))
  }

  return (
    <div className="monitor">
      <div className={`compare-grid n${items.length}`}>
        {items.map((it, i) => (
          <div key={it.id} className="compare-cell">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Link href={`/assets/${it.id}`} style={{ textDecoration: 'none' }}>
                <span className="timecode" style={{ fontSize: '1.2rem', fontStretch: '70%' }}>
                  v{it.version}
                </span>{' '}
                <span style={{ color: '#e8ebee' }}>{sameConcept ? it.label : it.concept_title}</span>
              </Link>
              {it.kind === 'video' && (
                <button
                  className="btn sm"
                  style={audio === i ? { background: 'var(--tape)', borderColor: 'var(--tape)', color: 'var(--tape-ink)' } : { background: '#2a3038', borderColor: '#2a3038', color: '#e8ebee' }}
                  onClick={() => setAudio(i)}
                  aria-pressed={audio === i}
                >
                  {audio === i ? 'Sound on' : 'Listen'}
                </button>
              )}
            </div>
            <div className="screen">
              {it.kind === 'video' ? (
                <video
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  src={it.url}
                  poster={it.thumb_url ?? undefined}
                  playsInline
                  preload="auto"
                  muted={i !== audio}
                  onClick={() => (playing ? pause() : play())}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={`Version ${it.version}`} />
              )}
            </div>
            <div className="lineage">
              <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                <span>
                  {[it.tool || 'Tool not set', it.script_version ? `script v${it.script_version}` : 'no script', aspect(it.width, it.height), it.duration_sec ? fmtTime(it.duration_sec, true) : '']
                    .filter(Boolean)
                    .join(', ')}
                </span>
                <StatusSelect kind="asset" id={it.id} value={it.status} />
              </div>
              {it.notes && (
                <div>
                  <b>What changed:</b> {it.notes}
                </div>
              )}
              {it.prompt && <div className="p">{it.prompt}</div>}
            </div>
          </div>
        ))}
      </div>
      {hasVideo && (
        <div className="transport">
          <button onClick={() => (playing ? pause() : play())}>{playing ? 'Pause all' : 'Play all'}</button>
          <button className="alt" onClick={() => step(-1 / 30)} aria-label="Back one frame">
            −1 frame
          </button>
          <button className="alt" onClick={() => step(1 / 30)} aria-label="Forward one frame">
            +1 frame
          </button>
          <input
            type="range"
            min={0}
            max={longest || 1}
            step={0.05}
            value={t}
            onChange={(e) => {
              pause()
              seek(Number(e.target.value))
            }}
            aria-label="Scrub all videos"
          />
          <span className="timecode">{fmtTime(t, true)}</span>
          <label className="row small" style={{ gap: 6, color: '#a3adb6' }}>
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
          </label>
        </div>
      )}
    </div>
  )
}
