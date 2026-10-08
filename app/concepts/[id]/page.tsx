import Shell from '@/components/Shell'
import ConceptEditor from '@/components/ConceptEditor'
import ScriptPanel from '@/components/ScriptPanel'
import StatusSelect from '@/components/StatusSelect'
import Uploader from '@/components/Uploader'
import VersionStack from '@/components/VersionStack'
import { ConfirmButton } from '@/components/Submit'
import { deleteConcept } from '@/app/actions'
import { getBrand, getConcept, listAssets, listScripts } from '@/lib/data'
import { requireAuth } from '@/lib/session'

export const maxDuration = 120

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = await getConcept((await params).id)
  return { title: c.title }
}

export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const concept = await getConcept(id)
  const [scripts, assets, brand] = await Promise.all([listScripts(id), listAssets(id), getBrand(concept.brand_id)])
  const finished = assets.filter((a) => a.shot_index === null)
  const frames = assets.filter((a) => a.shot_index !== null)

  return (
    <Shell
      crumbs={[
        { href: `/brands/${concept.brand_id}`, label: concept.brand_name },
        { href: `/campaigns/${concept.campaign_id}`, label: concept.campaign_name },
        { href: `/concepts/${concept.id}`, label: concept.title },
      ]}
    >
      <div className="concept-layout">
        <aside className="stack" style={{ gap: 18 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">{concept.format || 'Concept'}</span>
              <StatusSelect kind="concept" id={concept.id} value={concept.status} />
            </div>
            <h1 style={{ marginTop: 6 }}>{concept.title}</h1>
            {concept.hook && <p className="hook-line">“{concept.hook}”</p>}
          </div>
          <dl className="kv">
            {concept.angle && (
              <>
                <dt>Angle</dt>
                <dd>{concept.angle}</dd>
              </>
            )}
            {concept.awareness && (
              <>
                <dt>Awareness</dt>
                <dd>{concept.awareness}</dd>
              </>
            )}
            {concept.persona && (
              <>
                <dt>Persona</dt>
                <dd>{concept.persona}</dd>
              </>
            )}
            {concept.notes && (
              <>
                <dt>Notes</dt>
                <dd>{concept.notes}</dd>
              </>
            )}
          </dl>
          <ConceptEditor key={concept.updated_at.toString()} concept={concept} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <ConfirmButton
              action={deleteConcept.bind(null, concept.id)}
              message={`Delete “${concept.title}”? Its scripts and every uploaded version will be removed.`}
            >
              Delete concept
            </ConfirmButton>
          </div>
        </aside>

        <div>
          <section>
            <div className="section-head">
              <h2>Script and shot list</h2>
            </div>
            <ScriptPanel
              key={scripts.map((s) => s.id).join(',')}
              conceptId={concept.id}
              scripts={scripts}
              frames={frames}
              banned={brand.banned_claims}
            />
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Versions</h2>
              <span className="muted small">
                {finished.length} finished {finished.length === 1 ? 'cut' : 'cuts'}
                {frames.length > 0 && `, ${frames.length} shot frames and clips`}
              </span>
            </div>
            {finished.length === 0 ? (
              <div className="empty">
                <strong>No versions yet</strong>
                Make the ad in any tool you like, then upload the cut below. Every upload becomes the next version and stays linked to
                its script and prompt.
              </div>
            ) : (
              <VersionStack versions={finished} />
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Upload a version</h2>
            </div>
            <div className="panel">
              <Uploader key={scripts[0]?.id ?? 'none'} conceptId={concept.id} scripts={scripts} />
            </div>
          </section>
        </div>
      </div>
    </Shell>
  )
}
