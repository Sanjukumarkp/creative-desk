import Link from 'next/link'
import { headers } from 'next/headers'
import Shell from '@/components/Shell'
import ConceptFields from '@/components/ConceptFields'
import GenerateConcepts from '@/components/GenerateConcepts'
import StatusSelect from '@/components/StatusSelect'
import CopyButton from '@/components/CopyButton'
import { ConfirmButton, Submit } from '@/components/Submit'
import {
  createConcept,
  createShareLink,
  deleteCampaign,
  revokeShareLink,
  setCampaignArchived,
  updateCampaign,
} from '@/app/actions'
import { getCampaign, listConcepts, listShareLinks } from '@/lib/data'
import { requireAuth } from '@/lib/session'
import { ASSET_STATUSES, CONCEPT_STATUSES } from '@/lib/types'
import { ago, statusLabel } from '@/lib/format'

export const maxDuration = 120

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = await getCampaign((await params).id)
  return { title: c.name }
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const [campaign, concepts, shares] = await Promise.all([getCampaign(id), listConcepts(id), listShareLinks(id)])
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`

  return (
    <Shell
      crumbs={[
        { href: `/brands/${campaign.brand_id}`, label: campaign.brand_name },
        { href: `/campaigns/${campaign.id}`, label: campaign.name },
      ]}
    >
      <div className="page-head">
        <div>
          <h1>{campaign.name}</h1>
          {campaign.objective && <p className="muted">{campaign.objective}</p>}
        </div>
        <div className="row">
          {campaign.archived && <span className="chip">Archived</span>}
        </div>
      </div>

      <GenerateConcepts campaignId={campaign.id} />

      <div className="section">
        <div className="section-head">
          <h2>Board</h2>
          <span className="muted small">{concepts.filter((c) => c.status !== 'killed').length} live concepts</span>
        </div>
        {concepts.length === 0 ? (
          <div className="empty">
            <strong>No concepts yet</strong>
            Generate a batch above, or add one by hand below.
          </div>
        ) : (
          <div className="board">
            {CONCEPT_STATUSES.map((col) => {
              const items = concepts.filter((c) => c.status === col.key)
              return (
                <section key={col.key} className="column" data-status={col.key} aria-label={col.label}>
                  <div className="column-head">
                    <h3>{col.label}</h3>
                    <span className="faint small tc">{items.length}</span>
                  </div>
                  {items.map((c) => (
                    <article key={c.id} className="card">
                      {c.thumb_url && <div className="thumb" style={{ backgroundImage: `url(${c.thumb_url})` }} />}
                      <Link href={`/concepts/${c.id}`} className="card-link">
                        <div className="title">{c.title}</div>
                        {c.hook && <div className="hook">“{c.hook}”</div>}
                      </Link>
                      <div className="meta small">
                        {c.source === 'ai' && <span className="chip ai">AI</span>}
                        {c.script_count > 0 && <span className="faint">{c.script_count} script{c.script_count > 1 ? 's' : ''}</span>}
                        {c.asset_count > 0 && (
                          <span className="faint">
                            {c.asset_count} version{c.asset_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {c.latest_asset_status && c.latest_asset_status !== 'draft' && (
                          <span className={`chip ${c.latest_asset_status}`}>{statusLabel(c.latest_asset_status, ASSET_STATUSES)}</span>
                        )}
                        <StatusSelect kind="concept" id={c.id} value={c.status} />
                      </div>
                    </article>
                  ))}
                </section>
              )
            })}
          </div>
        )}
        <details className="drawer" style={{ marginTop: 14 }}>
          <summary>Add a concept by hand</summary>
          <div className="drawer-body">
            <form action={createConcept.bind(null, campaign.id)} className="stack">
              <ConceptFields />
              <div><Submit pendingText="Adding…">Add concept</Submit></div>
            </form>
          </div>
        </details>
      </div>

      <div className="section concept-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div>
          <div className="section-head">
            <h2>Client review links</h2>
          </div>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Anyone with a link can watch every version you've moved out of Draft in this campaign, leave timestamped notes, and
            approve or request changes. No login needed. Revoke a link to shut it off.
          </p>
          <div className="stack">
            {shares.map((s) => {
              const url = `${origin}/share/${s.token}`
              return (
                <div key={s.token} className="panel tight row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <b>{s.label || 'Review link'}</b>
                    <div className="faint small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Created {ago(s.created_at)}
                    </div>
                  </div>
                  <div className="row">
                    <CopyButton text={url} label="Copy link" />
                    <a className="btn sm" href={url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <ConfirmButton action={revokeShareLink.bind(null, s.token)} message="Revoke this link? Anyone using it will lose access.">
                      Revoke
                    </ConfirmButton>
                  </div>
                </div>
              )
            })}
            <form action={createShareLink.bind(null, campaign.id)} className="row">
              <input type="text" name="label" placeholder="Who it's for, e.g. Jess at the brand" style={{ flex: 1, minWidth: 200 }} />
              <Submit className="btn dark" pendingText="Creating…">
                Create review link
              </Submit>
            </form>
          </div>
        </div>

        <div>
          <div className="section-head">
            <h2>Campaign settings</h2>
          </div>
          <form action={updateCampaign.bind(null, campaign.id)} className="panel stack">
            <label className="field">
              Name
              <input type="text" name="name" defaultValue={campaign.name} required />
            </label>
            <label className="field">
              Objective
              <input type="text" name="objective" defaultValue={campaign.objective} />
            </label>
            <label className="field">
              Notes
              <textarea name="notes" defaultValue={campaign.notes} rows={3} />
            </label>
            <div><Submit>Save campaign</Submit></div>
          </form>
          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <form action={setCampaignArchived.bind(null, campaign.id, !campaign.archived)}>
              <Submit className="btn ghost sm">{campaign.archived ? 'Unarchive' : 'Archive'}</Submit>
            </form>
            <ConfirmButton
              action={deleteCampaign.bind(null, campaign.id)}
              message={`Delete ${campaign.name}? Every concept, script and uploaded file in it will be removed.`}
            >
              Delete campaign
            </ConfirmButton>
          </div>
        </div>
      </div>
    </Shell>
  )
}
