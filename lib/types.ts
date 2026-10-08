export type Brand = {
  id: string
  name: string
  website: string
  product: string
  audience: string
  voice: string
  proof_points: string
  allowed_claims: string
  banned_claims: string
  notes: string
  created_at: Date
}

export type Campaign = {
  id: string
  brand_id: string
  name: string
  objective: string
  notes: string
  archived: boolean
  created_at: Date
}

export const CONCEPT_STATUSES = [
  { key: 'idea', label: 'Ideas' },
  { key: 'scripted', label: 'Scripted' },
  { key: 'production', label: 'In production' },
  { key: 'review', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'killed', label: 'Killed' },
] as const
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number]['key']

export type Concept = {
  id: string
  campaign_id: string
  title: string
  hook: string
  angle: string
  format: string
  awareness: string
  persona: string
  notes: string
  status: ConceptStatus
  source: string
  created_at: Date
  updated_at: Date
}

export type Beat = {
  start: number
  end: number
  visual: string
  vo: string
  on_screen: string
  shot_type: string
  prompt: string
}

export type Script = {
  id: string
  concept_id: string
  version: number
  title: string
  duration: number
  beats: Beat[]
  cta: string
  notes: string
  source: string
  created_at: Date
}

export const ASSET_STATUSES = [
  { key: 'draft', label: 'Draft' },
  { key: 'in_review', label: 'In review' },
  { key: 'changes_requested', label: 'Changes requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const
export type AssetStatus = (typeof ASSET_STATUSES)[number]['key']

export type Asset = {
  id: string
  concept_id: string
  script_id: string | null
  shot_index: number | null
  version: number
  label: string
  kind: 'video' | 'image'
  url: string
  pathname: string
  content_type: string
  size_bytes: string
  width: number | null
  height: number | null
  duration_sec: number | null
  thumb_url: string | null
  thumb_pathname: string | null
  tool: string
  prompt: string
  settings: string
  notes: string
  status: AssetStatus
  created_at: Date
}

export type Comment = {
  id: string
  asset_id: string
  author: string
  from_client: boolean
  body: string
  timecode: number | null
  verdict: string | null
  resolved: boolean
  created_at: Date
}

export type ShareLink = {
  token: string
  campaign_id: string
  label: string
  revoked: boolean
  created_at: Date
}

export const FORMATS = [
  'Talking-head testimonial',
  'Problem / solution',
  'Day-in-the-life routine',
  'Us vs them comparison',
  'Unboxing / first try',
  'Street interview',
  'Founder story',
  'Listicle (3 reasons)',
  'Myth vs fact',
  'Before / during / after routine',
]

export const AWARENESS = ['Unaware', 'Problem aware', 'Solution aware', 'Product aware', 'Most aware']

/** Suggestions for the “Made with” field. Any value is allowed. */
export const TOOLS = [
  'Filmed (real creator)',
  'Runway',
  'Google Veo',
  'Kling',
  'Sora',
  'Luma',
  'Pika',
  'Hailuo',
  'HeyGen',
  'Midjourney',
  'Ideogram',
  'Flux',
  'ChatGPT image',
  'CapCut edit',
  'Premiere / Resolve edit',
]
