'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addComment, clientFeedback, deleteComment, setCommentResolved } from '@/app/actions'
import { fmtTime, ago } from '@/lib/format'

type C = {
  id: string
  author: string
  from_client: boolean
  body: string
  timecode: number | null
  verdict: string | null
  resolved: boolean
  created_at: Date | string
}

type Props = {
  assetId: string
  kind: 'video' | 'image'
  url: string
  poster?: string | null
  duration: number | null
  comments: C[]
} & ({ mode: 'owner' } | { mode: 'client'; token: string })

export default function ReviewPlayer(props: Props) {
  const { assetId, kind, url, poster, comments } = props
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(props.duration ?? 0)
  const [body, setBody] = useState('')
  const [stamp, setStamp] = useState(kind === 'video')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [showResolved, setShowResolved] = useState(false)

  useEffect(() => {
    if (props.mode !== 'client') return
    try {
      setAuthor(localStorage.getItem('cd_reviewer') ?? '')
    } catch {}
  }, [props.mode])

  function seek(t: number) {
    const v = videoRef.current
    if (!v) return
    v.currentTime = t
    v.pause()
    setTime(t)
  }

  function submit(verdict: 'approve' | 'changes' | null = null) {
    setError(null)
    setSent(null)
    const tc = !verdict && kind === 'video' && stamp ? Math.round(time * 10) / 10 : null
    start(async () => {
      let res
      if (props.mode === 'client') {
        try {
          localStorage.setItem('cd_reviewer', author)
        } catch {}
        res = await clientFeedback(props.token, assetId, { author, body, timecode: tc, verdict })
      } else {
        res = await addComment(assetId, body, tc)
      }
      if (res.error) setError(res.error)
      else {
        setBody('')
        setSent(verdict === 'approve' ? 'Approved. Thanks!' : verdict === 'changes' ? 'Sent. We’ll get on it.' : null)
        router.refresh()
      }
    })
  }

  const visible = comments.filter((c) => showResolved || !c.resolved)
  const resolvedCount = comments.filter((c) => c.resolved).length

  return (
    <div className="review-layout">
      <div className="monitor">
        {kind === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={url}
              poster={poster ?? undefined}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || duration)}
            />
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <span className="timecode">
                {fmtTime(time, true)} <span style={{ color: '#76818b', fontWeight: 500 }}>/ {fmtTime(duration, true)}</span>
              </span>
              <span className="small" style={{ color: '#a3adb6' }}>
                Notes are pinned to the time you pause on.
              </span>
            </div>
            {duration > 0 && (
              <div
                className="scrub"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  seek(((e.clientX - r.left) / r.width) * duration)
                }}
              >
                <div className="track" />
                <div className="fill" style={{ width: `${(time / duration) * 100}%` }} />
                {comments
                  .filter((c) => c.timecode != null && !c.resolved)
                  .map((c) => (
                    <span
                      key={c.id}
                      className={`pin${c.from_client ? ' client' : ''}`}
                      style={{ left: `${((c.timecode ?? 0) / duration) * 100}%` }}
                      title={`${fmtTime(c.timecode)} ${c.author}: ${c.body}`}
                    />
                  ))}
              </div>
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Creative under review" />
        )}
      </div>

      <div className="stack">
        <div className="panel tight stack">
          {props.mode === 'client' && (
            <label className="field">
              Your name
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="So we know who said what" />
            </label>
          )}
          <label className="field">
            {props.mode === 'client' ? 'Your notes' : 'Add a note'}
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => videoRef.current?.pause()}
              placeholder={kind === 'video' ? 'Pause where you want to comment, then type' : 'What would you change?'}
            />
          </label>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {kind === 'video' ? (
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={stamp} onChange={(e) => setStamp(e.target.checked)} />
                At <span className="tc">{fmtTime(time, true)}</span>
              </label>
            ) : (
              <span />
            )}
            <button className="btn dark sm" disabled={pending || !body.trim()} onClick={() => submit(null)}>
              {pending ? 'Sending…' : 'Post note'}
            </button>
          </div>
          {props.mode === 'client' && (
            <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <button className="btn primary" disabled={pending} onClick={() => submit('approve')}>
                Approve this version
              </button>
              <button className="btn" disabled={pending} onClick={() => submit('changes')}>
                Request changes
              </button>
            </div>
          )}
          {error && <p className="notice error">{error}</p>}
          {sent && <p className="notice ok">{sent}</p>}
        </div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Notes</h3>
          {props.mode === 'owner' && resolvedCount > 0 && (
            <button className="btn ghost sm" onClick={() => setShowResolved((s) => !s)}>
              {showResolved ? 'Hide' : 'Show'} {resolvedCount} resolved
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="muted small">No notes yet.</p>
        ) : (
          <div className="comments">
            {visible.map((c) => (
              <div key={c.id} className={`comment${c.from_client ? ' client' : ''}${c.resolved ? ' resolved' : ''}`}>
                <header>
                  {c.timecode != null && kind === 'video' && (
                    <button className="tcbtn" onClick={() => seek(c.timecode ?? 0)}>
                      {fmtTime(c.timecode, true)}
                    </button>
                  )}
                  <b>{c.author}</b>
                  {c.verdict && (
                    <span className={`chip ${c.verdict === 'approve' ? 'approved' : 'changes_requested'}`}>
                      {c.verdict === 'approve' ? 'Approved' : 'Changes requested'}
                    </span>
                  )}
                  <span className="faint">{ago(c.created_at)}</span>
                </header>
                <div className="body">{c.body}</div>
                {props.mode === 'owner' && (
                  <footer>
                    <button className="btn ghost sm" disabled={pending} onClick={() => start(() => setCommentResolved(c.id, !c.resolved))}>
                      {c.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      className="btn ghost danger sm"
                      disabled={pending}
                      onClick={() => confirm('Delete this note?') && start(() => deleteComment(c.id))}
                    >
                      Delete
                    </button>
                  </footer>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
