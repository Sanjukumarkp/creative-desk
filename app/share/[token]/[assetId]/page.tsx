import Link from 'next/link'
import ReviewPlayer from '@/components/ReviewPlayer'
import { getShare, getSharedAsset, listComments } from '@/lib/data'
import { ASSET_STATUSES } from '@/lib/types'
import { statusLabel } from '@/lib/format'

export const metadata = { title: 'Review', robots: { index: false, follow: false } }

export default async function ShareAssetPage({ params }: { params: Promise<{ token: string; assetId: string }> }) {
  const { token, assetId } = await params
  const share = await getShare(token)
  const asset = await getSharedAsset(share.campaign_id, assetId)
  const comments = await listComments(asset.id)

  return (
    <>
      <header className="share-head">
        <div className="inner row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Link href={`/share/${token}`} style={{ opacity: 0.7 }}>
              {share.brand_name}, {share.campaign_name}
            </Link>
            <h1>
              {asset.concept_title} v{asset.version}
            </h1>
            {asset.label && <p style={{ opacity: 0.75, marginTop: 6 }}>{asset.label}</p>}
          </div>
          <span className={`chip ${asset.status}`}>{statusLabel(asset.status, ASSET_STATUSES)}</span>
        </div>
      </header>
      <main className="page">
        <ReviewPlayer
          mode="client"
          token={token}
          assetId={asset.id}
          kind={asset.kind}
          url={asset.url}
          poster={asset.thumb_url}
          duration={asset.duration_sec}
          comments={comments}
        />
      </main>
    </>
  )
}
