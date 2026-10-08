import Link from 'next/link'
import Shell from '@/components/Shell'
import ReviewPlayer from '@/components/ReviewPlayer'
import StatusSelect from '@/components/StatusSelect'
import SavingForm from '@/components/SavingForm'
import CopyButton from '@/components/CopyButton'
import { ConfirmButton } from '@/components/Submit'
import { deleteAsset, updateAsset } from '@/app/actions'
import { getAsset, getScript, listAssets, listComments, listScripts } from '@/lib/data'
import { requireAuth } from '@/lib/session'
import { aspect, fmtBytes, fmtTime } from '@/lib/format'
import { TOOLS } from '@/lib/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const a = await getAsset((await params).id)
  return { title: `${a.concept_title} v${a.version}` }
}

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const asset = await getAsset(id)
  const [comments, siblings, scripts, script] = await Promise.all([
    listComments(id),
    listAssets(asset.concept_id),
    listScripts(asset.concept_id),
    getScript(asset.script_id),
  ])
  const beat = script && asset.shot_index != null ? script.beats[asset.shot_index] : null
  const others = siblings.filter((s) => (s.shot_index === null) === (asset.shot_index === null))

  return (
    <Shell
      crumbs={[
        { href: `/brands/${asset.brand_id}`, label: asset.brand_name },
        { href: `/campaigns/${asset.campaign_id}`, label: asset.campaign_name },
        { href: `/concepts/${asset.concept_id}`, label: asset.concept_title },
        { href: `/assets/${asset.id}`, label: `v${asset.version}` },
      ]}
    >
      <div className="page-head">
        <div>
          <h1>
            {asset.concept_title} v{asset.version}
          </h1>
          <p className="muted">
            {asset.label || (asset.shot_index != null ? `Shot ${asset.shot_index + 1} frame` : 'Finished cut')}
            {asset.script_version ? `, from script v${asset.script_version}` : ''}
          </p>
        </div>
        <div className="row">
          <label className="row small muted" style={{ gap: 6 }}>
            Status <StatusSelect kind="asset" id={asset.id} value={asset.status} />
          </label>
        </div>
      </div>

      {others.length > 1 && (
        <div className="row" style={{ marginBottom: 16, gap: 6 }}>
          <span className="muted small">Versions</span>
          {others
            .slice()
            .sort((a, b) => a.version - b.version)
            .map((o) => (
              <Link key={o.id} href={`/assets/${o.id}`} className={`btn sm${o.id === asset.id ? ' primary' : ''}`}>
                v{o.version}
              </Link>
            ))}
          {asset.shot_index === null && (
            <Link
              href={`/compare?ids=${[nearest(others, asset.version)?.id, asset.id].filter(Boolean).join(',')}`}
              className="btn ghost sm"
            >
              Compare with v{nearest(others, asset.version)?.version}
            </Link>
          )}
        </div>
      )}

      <ReviewPlayer
        mode="owner"
        assetId={asset.id}
        kind={asset.kind}
        url={asset.url}
        poster={asset.thumb_url}
        duration={asset.duration_sec}
        comments={comments}
      />

      <div className="section concept-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)' }}>
        <div>
          <div className="section-head">
            <h2>How it was made</h2>
          </div>
          <div className="panel">
            <SavingForm action={updateAsset.bind(null, asset.id)} submitLabel="Save details">
              <div className="form-grid">
                <label className="field">
                  Label
                  <input type="text" name="label" defaultValue={asset.label} />
                </label>
                <label className="field">
                  Made with
                  <input type="text" name="tool" list="tools" defaultValue={asset.tool} />
                  <datalist id="tools">
                    {TOOLS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>
                <label className="field">
                  Script
                  <select name="script_id" defaultValue={asset.script_id ?? ''}>
                    <option value="">No script</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        Script v{s.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Shot
                  <select name="shot_index" defaultValue={asset.shot_index ?? ''}>
                    <option value="">Finished ad (full cut)</option>
                    {(script?.beats ?? []).map((b, i) => (
                      <option key={i} value={i}>
                        Shot {i + 1} ({b.start}–{b.end}s)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field full">
                  Prompt used
                  <textarea name="prompt" rows={4} defaultValue={asset.prompt} />
                </label>
                <label className="field">
                  Settings
                  <textarea name="settings" rows={3} defaultValue={asset.settings} />
                </label>
                <label className="field">
                  What changed
                  <textarea name="notes" rows={3} defaultValue={asset.notes} />
                </label>
              </div>
            </SavingForm>
          </div>
        </div>

        <div className="stack">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2>Lineage</h2>
          </div>
          <div className="panel tight stack small">
            <div>
              <div className="muted">Concept</div>
              <Link href={`/concepts/${asset.concept_id}`}>
                <b>{asset.concept_title}</b>
              </Link>
              {asset.concept_hook && <p>“{asset.concept_hook}”</p>}
            </div>
            {script && (
              <div>
                <div className="muted">Script v{script.version}</div>
                <p>{script.title}</p>
              </div>
            )}
            {beat && (
              <div>
                <div className="muted">
                  Shot {asset.shot_index! + 1} ({beat.start}–{beat.end}s)
                </div>
                <p>{beat.visual}</p>
              </div>
            )}
            {asset.prompt && (
              <div className="row">
                <CopyButton text={asset.prompt} label="Copy prompt" />
              </div>
            )}
          </div>
          <div className="panel tight small">
            <dl className="kv">
              <dt>Type</dt>
              <dd>{asset.content_type || asset.kind}</dd>
              <dt>Size</dt>
              <dd>{fmtBytes(asset.size_bytes)}</dd>
              {asset.width && (
                <>
                  <dt>Frame</dt>
                  <dd>
                    {asset.width}×{asset.height} ({aspect(asset.width, asset.height)})
                  </dd>
                </>
              )}
              {asset.duration_sec && (
                <>
                  <dt>Length</dt>
                  <dd className="tc">{fmtTime(asset.duration_sec, true)}</dd>
                </>
              )}
              <dt>Uploaded</dt>
              <dd>{new Date(asset.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </dl>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <a className="btn sm" href={`${asset.url}?download=1`}>
              Download original
            </a>
            <ConfirmButton
              action={deleteAsset.bind(null, asset.id)}
              message={`Delete v${asset.version}? The file and its notes will be permanently removed.`}
            >
              Delete version
            </ConfirmButton>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function nearest<T extends { version: number }>(list: T[], v: number) {
  const below = list.filter((o) => o.version < v).sort((a, b) => b.version - a.version)[0]
  return below ?? list.filter((o) => o.version > v).sort((a, b) => a.version - b.version)[0]
}
