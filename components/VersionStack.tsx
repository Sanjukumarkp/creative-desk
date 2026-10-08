'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { aspect, fmtTime, statusLabel } from '@/lib/format'
import { ASSET_STATUSES } from '@/lib/types'
import Poster from './Poster'

type V = {
  id: string
  version: number
  label: string
  kind: string
  url: string
  thumb_url: string | null
  duration_sec: number | null
  width: number | null
  height: number | null
  status: string
  tool: string
  script_version: number | null
  comment_count: number
}

export default function VersionStack({ versions }: { versions: V[] }) {
  const router = useRouter()
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]))

  return (
    <>
      <div className="versions">
        {versions.map((v) => (
          <div key={v.id} className={`version${picked.includes(v.id) ? ' selected' : ''}`}>
            <Link href={`/assets/${v.id}`}>
              <div className="media">
                <Poster kind={v.kind} url={v.url} thumb={v.thumb_url} />
                <span className="badge">v{v.version}</span>
                {v.duration_sec ? <span className="dur">{fmtTime(v.duration_sec)}</span> : null}
              </div>
            </Link>
            <input
              type="checkbox"
              className="pick"
              aria-label={`Select v${v.version} to compare`}
              checked={picked.includes(v.id)}
              onChange={() => toggle(v.id)}
            />
            <div className="info">
              {v.label && <b>{v.label}</b>}
              <span className="row" style={{ gap: 6 }}>
                <span className={`chip ${v.status}`}>{statusLabel(v.status, ASSET_STATUSES)}</span>
                {v.comment_count > 0 && <span className="faint">{v.comment_count} notes</span>}
              </span>
              <span className="faint">
                {[v.tool, v.script_version ? `script v${v.script_version}` : '', aspect(v.width, v.height)].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        ))}
      </div>
      {versions.length > 1 && (
        <div className="compare-bar">
          <span className="small">
            {picked.length < 2 ? 'Tick 2 to 4 versions to compare them side by side.' : `${picked.length} versions selected`}
          </span>
          <div className="row">
            {picked.length > 0 && (
              <button className="btn ghost sm" style={{ color: 'inherit' }} onClick={() => setPicked([])}>
                Clear
              </button>
            )}
            <button className="btn primary sm" disabled={picked.length < 2} onClick={() => router.push(`/compare?ids=${picked.join(',')}`)}>
              Compare
            </button>
          </div>
        </div>
      )}
    </>
  )
}
