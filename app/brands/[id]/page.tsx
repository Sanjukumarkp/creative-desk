import Link from 'next/link'
import Shell from '@/components/Shell'
import BrandFields from '@/components/BrandFields'
import SavingForm from '@/components/SavingForm'
import { ConfirmButton, Submit } from '@/components/Submit'
import { createCampaign, deleteBrand, updateBrand } from '@/app/actions'
import { getBrand, listCampaigns } from '@/lib/data'
import { requireAuth } from '@/lib/session'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBrand((await params).id)
  return { title: b.name }
}

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params
  const [brand, campaigns] = await Promise.all([getBrand(id), listCampaigns(id)])
  const briefEmpty = !brand.product && !brand.audience && !brand.allowed_claims

  return (
    <Shell crumbs={[{ href: `/brands/${brand.id}`, label: brand.name }]}>
      <div className="page-head">
        <div>
          <h1>{brand.name}</h1>
          {brand.website && <p className="muted">{brand.website}</p>}
        </div>
      </div>

      <div className="concept-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)' }}>
        <div>
          <div className="section-head"><h2>Campaigns</h2></div>
          {campaigns.length === 0 ? (
            <div className="empty">
              <strong>No campaigns yet</strong>
              Start one below. A campaign groups the concepts you're testing toward one goal, like a product launch or a new angle.
            </div>
          ) : (
            <div className="campaign-list">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className={`campaign-row${c.archived ? ' archived' : ''}`}>
                  <div>
                    <b>{c.name}</b>
                    {c.archived && <span className="faint small"> (archived)</span>}
                    {c.objective && <p className="muted small">{c.objective}</p>}
                  </div>
                  <div className="row small">
                    {c.review_count > 0 && <span className="chip in_review">{c.review_count} in review</span>}
                    <span className="muted">{c.concept_count} concepts</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <form action={createCampaign.bind(null, brand.id)} className="panel tight stack" style={{ marginTop: 14 }}>
            <h3>New campaign</h3>
            <div className="form-grid">
              <label className="field">
                Name
                <input type="text" name="name" required placeholder="October sleep push" />
              </label>
              <label className="field">
                Objective
                <input type="text" name="objective" placeholder="Find 2 winning hooks for cold traffic" />
              </label>
            </div>
            <div><Submit pendingText="Creating…">Create campaign</Submit></div>
          </form>
        </div>

        <div>
          <div className="section-head">
            <h2>Brand brief</h2>
          </div>
          {briefEmpty && (
            <p className="notice info" style={{ marginBottom: 12 }}>
              Fill in the product, audience and approved claims. Claude reads this brief for every concept and script.
            </p>
          )}
          <div className="panel">
            <SavingForm action={updateBrand.bind(null, brand.id)} submitLabel="Save brief">
              <BrandFields brand={brand} compact />
            </SavingForm>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <ConfirmButton
              action={deleteBrand.bind(null, brand.id)}
              message={`Delete ${brand.name}? This removes every campaign, concept, script and uploaded file for this brand.`}
            >
              Delete brand
            </ConfirmButton>
          </div>
        </div>
      </div>
    </Shell>
  )
}
