import 'server-only'
import { notFound } from 'next/navigation'
import { sql } from './db'
import type { Asset, Brand, Campaign, Comment, Concept, Script, ShareLink } from './types'

export function toId(v: string | undefined | null): string {
  if (!v || !/^\d{1,18}$/.test(v)) notFound()
  return v
}

export async function listBrands() {
  return sql<(Brand & { campaign_count: number; concept_count: number })[]>`
    SELECT b.*,
      (SELECT count(*)::int FROM campaigns c WHERE c.brand_id = b.id AND NOT c.archived) AS campaign_count,
      (SELECT count(*)::int FROM concepts k JOIN campaigns c ON c.id = k.campaign_id WHERE c.brand_id = b.id AND k.status <> 'killed') AS concept_count
    FROM brands b ORDER BY b.name`
}

export async function getBrand(id: string) {
  const [b] = await sql<Brand[]>`SELECT * FROM brands WHERE id = ${toId(id)}`
  if (!b) notFound()
  return b
}

export async function listCampaigns(brandId: string) {
  return sql<(Campaign & { concept_count: number; review_count: number })[]>`
    SELECT c.*,
      (SELECT count(*)::int FROM concepts k WHERE k.campaign_id = c.id AND k.status <> 'killed') AS concept_count,
      (SELECT count(*)::int FROM assets a JOIN concepts k ON k.id = a.concept_id WHERE k.campaign_id = c.id AND a.status = 'in_review') AS review_count
    FROM campaigns c WHERE c.brand_id = ${toId(brandId)} ORDER BY c.archived, c.created_at DESC`
}

export async function getCampaign(id: string) {
  const [c] = await sql<(Campaign & { brand_name: string })[]>`
    SELECT c.*, b.name AS brand_name FROM campaigns c JOIN brands b ON b.id = c.brand_id WHERE c.id = ${toId(id)}`
  if (!c) notFound()
  return c
}

export type ConceptCard = Concept & {
  script_count: number
  asset_count: number
  thumb_url: string | null
  latest_asset_status: string | null
}

export async function listConcepts(campaignId: string) {
  return sql<ConceptCard[]>`
    SELECT k.*,
      (SELECT count(*)::int FROM scripts s WHERE s.concept_id = k.id) AS script_count,
      (SELECT count(*)::int FROM assets a WHERE a.concept_id = k.id AND a.shot_index IS NULL) AS asset_count,
      (SELECT coalesce(a.thumb_url, CASE WHEN a.kind = 'image' THEN a.url END) FROM assets a
         WHERE a.concept_id = k.id ORDER BY (a.shot_index IS NULL) DESC, a.version DESC LIMIT 1) AS thumb_url,
      (SELECT a.status FROM assets a WHERE a.concept_id = k.id AND a.shot_index IS NULL ORDER BY a.version DESC LIMIT 1) AS latest_asset_status
    FROM concepts k WHERE k.campaign_id = ${toId(campaignId)}
    ORDER BY k.updated_at DESC`
}

export async function getConcept(id: string) {
  const [k] = await sql<(Concept & { campaign_name: string; brand_id: string; brand_name: string })[]>`
    SELECT k.*, c.name AS campaign_name, c.brand_id, b.name AS brand_name
    FROM concepts k JOIN campaigns c ON c.id = k.campaign_id JOIN brands b ON b.id = c.brand_id
    WHERE k.id = ${toId(id)}`
  if (!k) notFound()
  return k
}

export async function listScripts(conceptId: string) {
  return sql<Script[]>`SELECT * FROM scripts WHERE concept_id = ${toId(conceptId)} ORDER BY version DESC`
}

export async function listAssets(conceptId: string) {
  return sql<(Asset & { script_version: number | null; comment_count: number })[]>`
    SELECT a.*, s.version AS script_version,
      (SELECT count(*)::int FROM comments m WHERE m.asset_id = a.id AND NOT m.resolved) AS comment_count
    FROM assets a LEFT JOIN scripts s ON s.id = a.script_id
    WHERE a.concept_id = ${toId(conceptId)} ORDER BY a.version DESC`
}

export type AssetDetail = Asset & {
  script_version: number | null
  concept_title: string
  concept_hook: string
  campaign_id: string
  campaign_name: string
  brand_id: string
  brand_name: string
}

export async function getAsset(id: string) {
  const [a] = await sql<AssetDetail[]>`
    SELECT a.*, s.version AS script_version, k.title AS concept_title, k.hook AS concept_hook,
      c.id AS campaign_id, c.name AS campaign_name, b.id AS brand_id, b.name AS brand_name
    FROM assets a
    JOIN concepts k ON k.id = a.concept_id
    JOIN campaigns c ON c.id = k.campaign_id
    JOIN brands b ON b.id = c.brand_id
    LEFT JOIN scripts s ON s.id = a.script_id
    WHERE a.id = ${toId(id)}`
  if (!a) notFound()
  return a
}

export async function getAssets(ids: string[]) {
  const clean = ids.filter((v) => /^\d{1,18}$/.test(v)).slice(0, 4)
  if (!clean.length) return []
  const rows = await sql<AssetDetail[]>`
    SELECT a.*, s.version AS script_version, k.title AS concept_title, k.hook AS concept_hook,
      c.id AS campaign_id, c.name AS campaign_name, b.id AS brand_id, b.name AS brand_name
    FROM assets a
    JOIN concepts k ON k.id = a.concept_id
    JOIN campaigns c ON c.id = k.campaign_id
    JOIN brands b ON b.id = c.brand_id
    LEFT JOIN scripts s ON s.id = a.script_id
    WHERE a.id IN ${sql(clean)}`
  return clean.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as AssetDetail[]
}

export async function getScript(id: string | null) {
  if (!id) return null
  const [s] = await sql<Script[]>`SELECT * FROM scripts WHERE id = ${id}`
  return s ?? null
}

export async function listComments(assetId: string) {
  return sql<Comment[]>`
    SELECT * FROM comments WHERE asset_id = ${toId(assetId)}
    ORDER BY timecode NULLS LAST, created_at`
}

export async function listShareLinks(campaignId: string) {
  return sql<ShareLink[]>`SELECT * FROM share_links WHERE campaign_id = ${toId(campaignId)} AND NOT revoked ORDER BY created_at DESC`
}

export async function getShare(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound()
  const [s] = await sql<(ShareLink & { campaign_name: string; brand_name: string; objective: string })[]>`
    SELECT s.*, c.name AS campaign_name, c.objective, b.name AS brand_name
    FROM share_links s JOIN campaigns c ON c.id = s.campaign_id JOIN brands b ON b.id = c.brand_id
    WHERE s.token = ${token} AND NOT s.revoked`
  if (!s) notFound()
  return s
}

/** Assets a client can see on a share link: finished versions (not storyboard frames, not drafts). */
export async function listSharedAssets(campaignId: string) {
  return sql<(Asset & { concept_title: string; concept_hook: string })[]>`
    SELECT a.*, k.title AS concept_title, k.hook AS concept_hook
    FROM assets a JOIN concepts k ON k.id = a.concept_id
    WHERE k.campaign_id = ${campaignId} AND a.shot_index IS NULL AND a.status NOT IN ('draft', 'rejected') AND k.status <> 'killed'
    ORDER BY k.title, a.version DESC`
}

export async function getSharedAsset(campaignId: string, assetId: string) {
  const [a] = await sql<(Asset & { concept_title: string; concept_hook: string })[]>`
    SELECT a.*, k.title AS concept_title, k.hook AS concept_hook
    FROM assets a JOIN concepts k ON k.id = a.concept_id
    WHERE a.id = ${toId(assetId)} AND k.campaign_id = ${campaignId} AND a.shot_index IS NULL AND a.status NOT IN ('draft', 'rejected')`
  if (!a) notFound()
  return a
}

export async function dashboard() {
  const review = await sql<(Asset & { concept_title: string; campaign_name: string; brand_name: string; comment_count: number })[]>`
    SELECT a.*, k.title AS concept_title, c.name AS campaign_name, b.name AS brand_name,
      (SELECT count(*)::int FROM comments m WHERE m.asset_id = a.id AND NOT m.resolved) AS comment_count
    FROM assets a JOIN concepts k ON k.id = a.concept_id JOIN campaigns c ON c.id = k.campaign_id JOIN brands b ON b.id = c.brand_id
    WHERE a.status IN ('in_review', 'changes_requested') AND a.shot_index IS NULL
    ORDER BY a.created_at DESC LIMIT 12`
  const clientNotes = await sql<(Comment & { asset_version: number; concept_title: string; concept_id: string })[]>`
    SELECT m.*, a.version AS asset_version, k.title AS concept_title, k.id AS concept_id
    FROM comments m JOIN assets a ON a.id = m.asset_id JOIN concepts k ON k.id = a.concept_id
    WHERE m.from_client AND NOT m.resolved ORDER BY m.created_at DESC LIMIT 8`
  return { review, clientNotes }
}
