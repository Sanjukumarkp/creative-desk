import Link from 'next/link'
import Shell from '@/components/Shell'
import BrandFields from '@/components/BrandFields'
import { Submit } from '@/components/Submit'
import { createBrand } from './actions'
import { dashboard, listBrands } from '@/lib/data'
import { requireAuth } from '@/lib/session'
import { ago, fmtTime, statusLabel } from '@/lib/format'
import { ASSET_STATUSES } from '@/lib/types'
import Poster from '@/components/Poster'

export default async function Home() {
  await requireAuth()
  const [brands, { review, clientNotes }] = await Promise.all([listBrands(), dashboard()])

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Brands</h1>
          <p className="muted">Each brand holds its brief, campaigns, concepts, scripts and every version you make.</p>
        </div>
      </div>

      {brands.length === 0 ? (
        <div className="panel">
          <h2>Add your first brand</h2>
          <p className="muted" style={{ margin: '6px 0 18px' }}>
            The brief you write here is what Claude reads every time it writes concepts or scripts, so the more specific it is, the
            better the output.
          </p>
          <form action={createBrand} className="stack">
            <BrandFields />
            <div><Submit pendingText="Creating…">Create brand</Submit></div>
          </form>
        </div>
      ) : (
        <>
          <div className="brand-grid">
            {brands.map((b) => (
              <Link key={b.id} href={`/brands/${b.id}`} className="brand-tile">
                <h3>{b.name}</h3>
                <p className="muted small">
                  {b.campaign_count} {b.campaign_count === 1 ? 'campaign' : 'campaigns'}, {b.concept_count}{' '}
                  {b.concept_count === 1 ? 'concept' : 'concepts'}
                </p>
              </Link>
            ))}
          </div>
          <details className="drawer" style={{ marginTop: 14 }}>
            <summary>Add a brand</summary>
            <div className="drawer-body">
              <form action={createBrand} className="stack">
                <BrandFields />
                <div><Submit pendingText="Creating…">Create brand</Submit></div>
              </form>
            </div>
          </details>
        </>
      )}

      {(review.length > 0 || clientNotes.length > 0) && (
        <div className="section concept-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)' }}>
          <div>
            <div className="section-head"><h2>Waiting on review</h2></div>
            {review.length === 0 ? (
              <p className="muted">Nothing in review.</p>
            ) : (
              <div className="versions">
                {review.map((a) => (
                  <div key={a.id} className="version">
                    <Link href={`/assets/${a.id}`}>
                      <div className="media">
                        <Poster kind={a.kind} url={a.url} thumb={a.thumb_url} />
                        <span className="badge">v{a.version}</span>
                        {a.duration_sec ? <span className="dur">{fmtTime(a.duration_sec)}</span> : null}
                      </div>
                      <div className="info">
                        <b>{a.concept_title}</b>
                        <span className="muted">{a.brand_name}, {a.campaign_name}</span>
                        <span className="row" style={{ gap: 6 }}>
                          <span className={`chip ${a.status}`}>{statusLabel(a.status, ASSET_STATUSES)}</span>
                          {a.comment_count > 0 && <span className="faint">{a.comment_count} open notes</span>}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="section-head"><h2>Client notes</h2></div>
            {clientNotes.length === 0 ? (
              <p className="muted">No open notes from clients.</p>
            ) : (
              <div className="comments">
                {clientNotes.map((c) => (
                  <Link key={c.id} href={`/assets/${c.asset_id}`} className="comment client" style={{ textDecoration: 'none' }}>
                    <header>
                      <b>{c.author}</b>
                      <span className="faint">
                        {c.concept_title} v{c.asset_version}
                        {c.timecode != null ? ` at ${fmtTime(c.timecode)}` : ''}, {ago(c.created_at)}
                      </span>
                    </header>
                    <div className="body">{c.body}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}
