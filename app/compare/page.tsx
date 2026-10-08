import Link from 'next/link'
import Shell from '@/components/Shell'
import ComparePlayers from '@/components/ComparePlayers'
import { getAssets } from '@/lib/data'
import { requireAuth } from '@/lib/session'

export const metadata = { title: 'Compare versions' }

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireAuth()
  const { ids } = await searchParams
  const items = await getAssets(String(ids ?? '').split(','))
  const first = items[0]

  return (
    <Shell
      crumbs={
        first
          ? [
              { href: `/brands/${first.brand_id}`, label: first.brand_name },
              { href: `/campaigns/${first.campaign_id}`, label: first.campaign_name },
              { href: `/concepts/${first.concept_id}`, label: first.concept_title },
              { href: `/compare?ids=${ids}`, label: 'Compare' },
            ]
          : []
      }
    >
      <div className="page-head">
        <div>
          <h1>Compare {items.length} versions</h1>
          <p className="muted">
            Videos play in sync. Pick which one you hear. Set a status on the winner right here.
          </p>
        </div>
        {first && (
          <Link href={`/concepts/${first.concept_id}`} className="btn">
            Back to concept
          </Link>
        )}
      </div>
      {items.length < 2 ? (
        <div className="empty">
          <strong>Pick at least two versions</strong>
          Go to a concept, tick two to four versions, and press Compare.
        </div>
      ) : (
        <ComparePlayers items={items} />
      )}
    </Shell>
  )
}
