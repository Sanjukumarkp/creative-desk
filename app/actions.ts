'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { SESSION_COOKIE, passwordMatches, sessionToken } from '@/lib/auth'
import { deleteFiles } from '@/lib/storage'
import { AiNotConfigured, generateConcepts, refineConcept, writeScript } from '@/lib/ai'
import { ASSET_STATUSES, CONCEPT_STATUSES, type Beat, type Brand, type Campaign, type Concept, type Script } from '@/lib/types'

const s = (fd: FormData, k: string, max = 4000) => String(fd.get(k) ?? '').trim().slice(0, max)
const num = (v: unknown) => (/^\d{1,18}$/.test(String(v)) ? String(v) : null)
function mustId(v: unknown) {
  const id = num(v)
  if (!id) throw new Error('Invalid id')
  return id
}
const refresh = () => revalidatePath('/', 'layout')
type Result = { error?: string; ok?: boolean }

function aiError(err: unknown): Result {
  if (err instanceof AiNotConfigured) return { error: err.message }
  console.error('[ai]', err)
  return { error: `Claude request failed: ${(err as Error).message}` }
}

// ---------- Session ----------

export async function login(_prev: Result, fd: FormData): Promise<Result> {
  if (!process.env.APP_PASSWORD) return { error: 'APP_PASSWORD is not set on the server.' }
  if (!passwordMatches(s(fd, 'password', 500))) return { error: 'That password is not correct.' }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  const next = s(fd, 'next', 500)
  redirect(/^\/(?![/\\])/.test(next) && !next.includes('\\') ? next : '/')
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}

// ---------- Brands ----------

function brandFields(fd: FormData) {
  return {
    name: s(fd, 'name', 200) || 'Untitled brand',
    website: s(fd, 'website', 300),
    product: s(fd, 'product'),
    audience: s(fd, 'audience'),
    voice: s(fd, 'voice'),
    proof_points: s(fd, 'proof_points'),
    allowed_claims: s(fd, 'allowed_claims'),
    banned_claims: s(fd, 'banned_claims'),
    notes: s(fd, 'notes'),
  }
}

export async function createBrand(fd: FormData) {
  await requireAuth()
  const [b] = await sql<{ id: string }[]>`INSERT INTO brands ${sql(brandFields(fd))} RETURNING id`
  refresh()
  redirect(`/brands/${b.id}`)
}

export async function updateBrand(id: string, _prev: Result, fd: FormData): Promise<Result> {
  await requireAuth()
  await sql`UPDATE brands SET ${sql(brandFields(fd))} WHERE id = ${mustId(id)}`
  refresh()
  return { ok: true }
}

export async function deleteBrand(id: string) {
  await requireAuth()
  const files = await sql<{ url: string; thumb_url: string | null }[]>`
    SELECT a.url, a.thumb_url FROM assets a JOIN concepts k ON k.id = a.concept_id JOIN campaigns c ON c.id = k.campaign_id
    WHERE c.brand_id = ${mustId(id)}`
  await deleteFiles(files.flatMap((f) => [f.url, f.thumb_url]))
  await sql`DELETE FROM brands WHERE id = ${mustId(id)}`
  refresh()
  redirect('/')
}

// ---------- Campaigns ----------

export async function createCampaign(brandId: string, fd: FormData) {
  await requireAuth()
  const [c] = await sql<{ id: string }[]>`
    INSERT INTO campaigns (brand_id, name, objective)
    VALUES (${mustId(brandId)}, ${s(fd, 'name', 200) || 'Untitled campaign'}, ${s(fd, 'objective')}) RETURNING id`
  refresh()
  redirect(`/campaigns/${c.id}`)
}

export async function updateCampaign(id: string, fd: FormData) {
  await requireAuth()
  await sql`UPDATE campaigns SET name = ${s(fd, 'name', 200) || 'Untitled campaign'}, objective = ${s(fd, 'objective')}, notes = ${s(fd, 'notes')}
    WHERE id = ${mustId(id)}`
  refresh()
}

export async function setCampaignArchived(id: string, archived: boolean) {
  await requireAuth()
  await sql`UPDATE campaigns SET archived = ${archived} WHERE id = ${mustId(id)}`
  refresh()
}

export async function deleteCampaign(id: string) {
  await requireAuth()
  const [c] = await sql<{ brand_id: string }[]>`SELECT brand_id FROM campaigns WHERE id = ${mustId(id)}`
  const files = await sql<{ url: string; thumb_url: string | null }[]>`
    SELECT a.url, a.thumb_url FROM assets a JOIN concepts k ON k.id = a.concept_id WHERE k.campaign_id = ${mustId(id)}`
  await deleteFiles(files.flatMap((f) => [f.url, f.thumb_url]))
  await sql`DELETE FROM campaigns WHERE id = ${mustId(id)}`
  refresh()
  redirect(c ? `/brands/${c.brand_id}` : '/')
}

// ---------- Concepts ----------

function conceptFields(fd: FormData) {
  return {
    title: s(fd, 'title', 200) || 'Untitled concept',
    hook: s(fd, 'hook', 1000),
    angle: s(fd, 'angle'),
    format: s(fd, 'format', 200),
    awareness: s(fd, 'awareness', 100),
    persona: s(fd, 'persona', 1000),
    notes: s(fd, 'notes'),
  }
}

export async function createConcept(campaignId: string, fd: FormData) {
  await requireAuth()
  const [k] = await sql<{ id: string }[]>`
    INSERT INTO concepts ${sql({ ...conceptFields(fd), campaign_id: mustId(campaignId) })} RETURNING id`
  refresh()
  redirect(`/concepts/${k.id}`)
}

export async function updateConcept(id: string, _prev: Result, fd: FormData): Promise<Result> {
  await requireAuth()
  await sql`UPDATE concepts SET ${sql(conceptFields(fd))}, updated_at = now() WHERE id = ${mustId(id)}`
  refresh()
  return { ok: true }
}

export async function setConceptStatus(id: string, status: string) {
  await requireAuth()
  if (!CONCEPT_STATUSES.some((x) => x.key === status)) throw new Error('Unknown status')
  await sql`UPDATE concepts SET status = ${status}, updated_at = now() WHERE id = ${mustId(id)}`
  refresh()
}

export async function deleteConcept(id: string) {
  await requireAuth()
  const [k] = await sql<{ campaign_id: string }[]>`SELECT campaign_id FROM concepts WHERE id = ${mustId(id)}`
  const files = await sql<{ url: string; thumb_url: string | null }[]>`SELECT url, thumb_url FROM assets WHERE concept_id = ${mustId(id)}`
  await deleteFiles(files.flatMap((f) => [f.url, f.thumb_url]))
  await sql`DELETE FROM concepts WHERE id = ${mustId(id)}`
  refresh()
  redirect(k ? `/campaigns/${k.campaign_id}` : '/')
}

async function loadContext(campaignId: string) {
  const [campaign] = await sql<Campaign[]>`SELECT * FROM campaigns WHERE id = ${mustId(campaignId)}`
  if (!campaign) throw new Error('Campaign not found')
  const [brand] = await sql<Brand[]>`SELECT * FROM brands WHERE id = ${campaign.brand_id}`
  return { campaign, brand }
}

export async function generateConceptsAction(campaignId: string, _prev: Result, fd: FormData): Promise<Result & { added?: number }> {
  await requireAuth()
  try {
    const { campaign, brand } = await loadContext(campaignId)
    const existing = await sql<{ title: string; hook: string }[]>`
      SELECT title, hook FROM concepts WHERE campaign_id = ${campaign.id} ORDER BY created_at DESC LIMIT 40`
    const count = Math.min(10, Math.max(1, Number(fd.get('count')) || 5))
    const drafts = await generateConcepts(brand, campaign, {
      count,
      direction: s(fd, 'direction', 1500),
      existing: existing.map((e) => `${e.title}: ${e.hook}`),
    })
    for (const d of drafts) {
      await sql`INSERT INTO concepts ${sql({
        campaign_id: campaign.id,
        title: String(d.title ?? '').slice(0, 200) || 'Untitled concept',
        hook: String(d.hook ?? ''),
        angle: String(d.angle ?? ''),
        format: String(d.format ?? ''),
        awareness: String(d.awareness ?? ''),
        persona: String(d.persona ?? ''),
        notes: String(d.notes ?? ''),
        source: 'ai',
      })}`
    }
    refresh()
    return { ok: true, added: drafts.length }
  } catch (err) {
    return aiError(err)
  }
}

export type ConceptDraftResult = Result & {
  draft?: Pick<Concept, 'title' | 'hook' | 'angle' | 'format' | 'awareness' | 'persona' | 'notes'>
}

export async function refineConceptAction(conceptId: string, instruction: string): Promise<ConceptDraftResult> {
  await requireAuth()
  try {
    const [concept] = await sql<Concept[]>`SELECT * FROM concepts WHERE id = ${mustId(conceptId)}`
    if (!concept) return { error: 'Concept not found' }
    const { campaign, brand } = await loadContext(concept.campaign_id)
    const draft = await refineConcept(brand, campaign, concept, instruction.slice(0, 1500))
    return { ok: true, draft }
  } catch (err) {
    return aiError(err)
  }
}

// ---------- Scripts ----------

function cleanBeats(raw: unknown): Beat[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 60).map((b: Partial<Beat>) => ({
    start: Number.isFinite(Number(b?.start)) ? Number(b.start) : 0,
    end: Number.isFinite(Number(b?.end)) ? Number(b.end) : 0,
    visual: String(b?.visual ?? '').slice(0, 2000),
    vo: String(b?.vo ?? '').slice(0, 2000),
    on_screen: String(b?.on_screen ?? '').slice(0, 500),
    shot_type: String(b?.shot_type ?? '').slice(0, 200),
    prompt: String(b?.prompt ?? '').slice(0, 4000),
  }))
}

async function insertScript(conceptId: string, data: { title: string; duration: number; cta: string; notes: string; beats: Beat[]; source: string }) {
  const [row] = await sql<{ id: string; version: number }[]>`
    INSERT INTO scripts (concept_id, version, title, duration, cta, notes, beats, source)
    VALUES (
      ${conceptId},
      (SELECT coalesce(max(version), 0) + 1 FROM scripts WHERE concept_id = ${conceptId}),
      ${data.title.slice(0, 300)}, ${Math.round(data.duration) || 30}, ${data.cta.slice(0, 1000)}, ${data.notes.slice(0, 4000)},
      ${sql.json(data.beats as unknown as Parameters<typeof sql.json>[0])}, ${data.source}
    ) RETURNING id, version`
  await sql`UPDATE concepts SET status = CASE WHEN status = 'idea' THEN 'scripted' ELSE status END, updated_at = now() WHERE id = ${conceptId}`
  return row
}

export async function writeScriptAction(conceptId: string, _prev: Result, fd: FormData): Promise<Result & { version?: number }> {
  await requireAuth()
  try {
    const id = mustId(conceptId)
    const [concept] = await sql<Concept[]>`SELECT * FROM concepts WHERE id = ${id}`
    if (!concept) return { error: 'Concept not found' }
    const { campaign, brand } = await loadContext(concept.campaign_id)
    const baseId = num(fd.get('base'))
    const [previous] = baseId ? await sql<Script[]>`SELECT * FROM scripts WHERE id = ${baseId} AND concept_id = ${id}` : []
    const duration = Math.min(90, Math.max(6, Number(fd.get('duration')) || 30))
    const out = await writeScript(brand, campaign, concept, { duration, instruction: s(fd, 'instruction', 1500), previous: previous ?? null })
    const row = await insertScript(id, {
      title: String(out.title ?? concept.title),
      duration: Number(out.duration) || duration,
      cta: String(out.cta ?? ''),
      notes: String(out.notes ?? ''),
      beats: cleanBeats(out.beats),
      source: 'ai',
    })
    refresh()
    return { ok: true, version: row.version }
  } catch (err) {
    return aiError(err)
  }
}

export async function saveScriptVersion(
  conceptId: string,
  data: { title: string; duration: number; cta: string; notes: string; beats: Beat[] },
): Promise<Result & { version?: number }> {
  await requireAuth()
  const row = await insertScript(mustId(conceptId), {
    title: String(data.title ?? ''),
    duration: Number(data.duration) || 30,
    cta: String(data.cta ?? ''),
    notes: String(data.notes ?? ''),
    beats: cleanBeats(data.beats),
    source: 'manual',
  })
  refresh()
  return { ok: true, version: row.version }
}

export async function deleteScript(id: string) {
  await requireAuth()
  await sql`DELETE FROM scripts WHERE id = ${mustId(id)}`
  refresh()
}

// ---------- Assets ----------

export type NewAsset = {
  conceptId: string
  scriptId: string | null
  shotIndex: number | null
  kind: 'video' | 'image'
  url: string
  pathname: string
  contentType: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
  thumbUrl: string | null
  thumbPathname: string | null
  label: string
  tool: string
  prompt: string
  settings: string
  notes: string
}

const BLOB_HOST = /^https:\/\/[^/?#]+\.blob\.vercel-storage\.com\//i

export async function recordAsset(a: NewAsset): Promise<Result & { id?: string }> {
  await requireAuth()
  const conceptId = mustId(a.conceptId)
  if (!BLOB_HOST.test(a.url) || (a.thumbUrl && !BLOB_HOST.test(a.thumbUrl))) return { error: 'Unexpected file location.' }
  const scriptId = num(a.scriptId)
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO assets (concept_id, script_id, shot_index, version, label, kind, url, pathname, content_type, size_bytes,
      width, height, duration_sec, thumb_url, thumb_pathname, tool, prompt, settings, notes)
    VALUES (${conceptId}, ${scriptId}, ${Number.isInteger(a.shotIndex) ? a.shotIndex : null},
      (SELECT coalesce(max(version), 0) + 1 FROM assets WHERE concept_id = ${conceptId}),
      ${String(a.label).slice(0, 200)}, ${a.kind === 'image' ? 'image' : 'video'}, ${a.url}, ${String(a.pathname).slice(0, 1000)},
      ${String(a.contentType).slice(0, 200)}, ${Math.max(0, Math.round(Number(a.size) || 0))},
      ${a.width ? Math.round(a.width) : null}, ${a.height ? Math.round(a.height) : null}, ${a.duration ?? null},
      ${a.thumbUrl}, ${a.thumbPathname}, ${String(a.tool).slice(0, 200)}, ${String(a.prompt).slice(0, 8000)},
      ${String(a.settings).slice(0, 4000)}, ${String(a.notes).slice(0, 4000)})
    RETURNING id`
  if (a.shotIndex === null) {
    await sql`UPDATE concepts SET status = CASE WHEN status IN ('idea', 'scripted') THEN 'production' ELSE status END, updated_at = now()
      WHERE id = ${conceptId}`
  }
  refresh()
  return { ok: true, id: row.id }
}

export async function updateAsset(id: string, _prev: Result, fd: FormData): Promise<Result> {
  await requireAuth()
  const shot = s(fd, 'shot_index', 10)
  await sql`UPDATE assets SET
      label = ${s(fd, 'label', 200)}, tool = ${s(fd, 'tool', 200)}, prompt = ${s(fd, 'prompt', 8000)},
      settings = ${s(fd, 'settings')}, notes = ${s(fd, 'notes')},
      script_id = ${num(fd.get('script_id'))}, shot_index = ${/^\d+$/.test(shot) ? Number(shot) : null}
    WHERE id = ${mustId(id)}`
  refresh()
  return { ok: true }
}

export async function setAssetStatus(id: string, status: string) {
  await requireAuth()
  if (!ASSET_STATUSES.some((x) => x.key === status)) throw new Error('Unknown status')
  await applyAssetStatus(mustId(id), status)
  refresh()
}

/** Sets a version's status and moves its concept along the board to match. */
async function applyAssetStatus(id: string, status: string) {
  const [a] = await sql<{ concept_id: string; shot_index: number | null }[]>`
    UPDATE assets SET status = ${status} WHERE id = ${id} RETURNING concept_id, shot_index`
  if (!a || a.shot_index !== null) return
  if (status === 'in_review' || status === 'changes_requested') {
    await sql`UPDATE concepts SET status = 'review', updated_at = now() WHERE id = ${a.concept_id} AND status IN ('idea','scripted','production')`
  } else if (status === 'approved') {
    await sql`UPDATE concepts SET status = 'approved', updated_at = now() WHERE id = ${a.concept_id} AND status <> 'killed'`
  }
}

export async function deleteAsset(id: string) {
  await requireAuth()
  const [a] = await sql<{ url: string; thumb_url: string | null; concept_id: string }[]>`
    SELECT url, thumb_url, concept_id FROM assets WHERE id = ${mustId(id)}`
  if (!a) redirect('/')
  await deleteFiles([a.url, a.thumb_url])
  await sql`DELETE FROM assets WHERE id = ${mustId(id)}`
  refresh()
  redirect(`/concepts/${a.concept_id}`)
}

// ---------- Comments ----------

export async function addComment(assetId: string, body: string, timecode: number | null): Promise<Result> {
  await requireAuth()
  const text = String(body ?? '').trim().slice(0, 4000)
  if (!text) return { error: 'Write a note first.' }
  await sql`INSERT INTO comments (asset_id, author, body, timecode)
    VALUES (${mustId(assetId)}, 'You', ${text}, ${Number.isFinite(timecode) ? timecode : null})`
  refresh()
  return { ok: true }
}

export async function setCommentResolved(id: string, resolved: boolean) {
  await requireAuth()
  await sql`UPDATE comments SET resolved = ${resolved} WHERE id = ${mustId(id)}`
  refresh()
}

export async function deleteComment(id: string) {
  await requireAuth()
  await sql`DELETE FROM comments WHERE id = ${mustId(id)}`
  refresh()
}

// ---------- Share links ----------

export async function createShareLink(campaignId: string, fd: FormData) {
  await requireAuth()
  const token = randomBytes(18).toString('base64url')
  await sql`INSERT INTO share_links (token, campaign_id, label) VALUES (${token}, ${mustId(campaignId)}, ${s(fd, 'label', 200)})`
  refresh()
}

export async function revokeShareLink(token: string) {
  await requireAuth()
  await sql`UPDATE share_links SET revoked = true WHERE token = ${String(token)}`
  refresh()
}

/** Public: a brand reviewer leaves a note or a verdict through a share link. */
export async function clientFeedback(
  token: string,
  assetId: string,
  input: { author: string; body: string; timecode: number | null; verdict: 'approve' | 'changes' | null },
): Promise<Result> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token))) return { error: 'This review link is not valid.' }
  const [ok] = await sql<{ id: string }[]>`
    SELECT a.id FROM assets a JOIN concepts k ON k.id = a.concept_id JOIN share_links l ON l.campaign_id = k.campaign_id
    WHERE l.token = ${token} AND NOT l.revoked AND a.id = ${mustId(assetId)} AND a.shot_index IS NULL AND a.status NOT IN ('draft', 'rejected')`
  if (!ok) return { error: 'This review link has expired.' }
  const author = String(input.author ?? '').trim().slice(0, 80) || 'Reviewer'
  let body = String(input.body ?? '').trim().slice(0, 4000)
  const verdict = input.verdict === 'approve' || input.verdict === 'changes' ? input.verdict : null
  if (!body && !verdict) return { error: 'Write a note first.' }
  if (!body) body = verdict === 'approve' ? 'Approved.' : 'Changes requested.'
  await sql`INSERT INTO comments (asset_id, author, from_client, body, timecode, verdict)
    VALUES (${ok.id}, ${author}, true, ${body}, ${Number.isFinite(input.timecode) ? input.timecode : null}, ${verdict})`
  if (verdict) await applyAssetStatus(ok.id, verdict === 'approve' ? 'approved' : 'changes_requested')
  refresh()
  return { ok: true }
}
