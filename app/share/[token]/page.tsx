import Link from 'next/link'
import { getShare, listSharedAssets } from '@/lib/data'
import { ASSET_STATUSES } from '@/lib/types'
import { fmtTime, statusLabel } from '@/lib/format'
import Poster from '@/components/Poster'

export const metadata = { title: 'Review', robots: { index: false, follow: false } }

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = await getShare(token)
  const assets = await listSharedAssets(share.campaign_id)
  type Row = (typeof assets)[number]
  const byConcept = new Map<string, Row[]>()
  for (const a of assets) {
    const list: Row[] = byConcept.get(a.concept_id) ?? []
    list.push(a)
    byConcept.set(a.concept_id, list)
  }

  return (
    <>
      <header className="share-head">
        <div className="inner">
          <span style={{ opacity: 0.7 }}>{share.brand_name}</span>
          <h1>{share.campaign_name}</h1>
          <p style={{ opacity: 0.75, marginTop: 8, maxWidth: '64ch' }}>
            Open any version to watch it, leave notes at the exact moment, and approve it or ask for changes.
          </p>
        </div>
      </header>
      <main className="page">
        {byConcept.size === 0 ? (
          <div className="empty">
            <strong>Nothing to review yet</strong>
            New versions will show up here as soon as they're ready.
          </div>
        ) : (
          [...byConcept.values()].map((list) => (
            <section key={list[0].concept_id} className="section" style={{ marginTop: 0, marginBottom: 40 }}>
              <div className="section-head">
                <div>
                  <h2>{list[0].concept_title}</h2>
                  {list[0].concept_hook && <p className="muted">“{list[0].concept_hook}”</p>}
                </div>
              </div>
              <div className="versions">
                {list.map((a, i) => (
                  <div key={a.id} className="version">
                    <Link href={`/share/${token}/${a.id}`}>
                      <div className="media">
                        <Poster kind={a.kind} url={a.url} thumb={a.thumb_url} />
                        <span className="badge">v{a.version}</span>
                        {a.duration_sec ? <span className="dur">{fmtTime(a.duration_sec)}</span> : null}
                      </div>
                      <div className="info">
                        {i === 0 && <b>Latest</b>}
                        {a.label && <span>{a.label}</span>}
                        <span>
                          <span className={`chip ${a.status}`}>{statusLabel(a.status, ASSET_STATUSES)}</span>
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  )
}
