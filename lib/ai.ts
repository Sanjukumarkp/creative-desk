import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { Beat, Brand, Campaign, Concept, Script } from './types'
import { AWARENESS, FORMATS } from './types'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

export class AiNotConfigured extends Error {}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiNotConfigured('Add ANTHROPIC_API_KEY to your environment variables to use AI generation.')
  }
  return new Anthropic()
}

function brief(brand: Brand, campaign?: Pick<Campaign, 'name' | 'objective'>) {
  const lines = [
    `Brand: ${brand.name}${brand.website ? ` (${brand.website})` : ''}`,
    brand.product && `Product: ${brand.product}`,
    brand.audience && `Audience: ${brand.audience}`,
    brand.voice && `Voice and tone: ${brand.voice}`,
    brand.proof_points && `Proof points we can use:\n${brand.proof_points}`,
    brand.allowed_claims && `Approved claims (use these exact ideas, don't go further):\n${brand.allowed_claims}`,
    brand.banned_claims && `Never say or imply:\n${brand.banned_claims}`,
    brand.notes && `Other notes: ${brand.notes}`,
    campaign && `Campaign: ${campaign.name}${campaign.objective ? `. Objective: ${campaign.objective}` : ''}`,
  ]
  return lines.filter(Boolean).join('\n\n')
}

const SYSTEM = `You are a senior direct-response creative strategist who plans UGC-style video ads for DTC brands running on Meta (Reels, Stories, Feed). You think in hooks, angles and awareness stages, and you write the way real customers talk on camera, not like a brand.

Compliance rules you always follow, because these ads are often for dietary supplements:
- Only structure/function language ("supports restful sleep", "helps you feel calmer"). Never claim to cure, treat, prevent, heal or diagnose anything, and never name a disease or diagnosable condition.
- No "FDA approved", no "clinically proven" unless that exact claim is in the brief's approved claims, no guaranteed or absolute results, no specific weight-loss numbers, no before/after framing.
- Never contradict the brief's "never say" list. Stay inside its approved claims.`

async function callTool<T>(opts: { prompt: string; tool: Anthropic.Tool; maxTokens?: number }): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    system: SYSTEM,
    tools: [opts.tool],
    tool_choice: { type: 'tool', name: opts.tool.name },
    messages: [{ role: 'user', content: opts.prompt }],
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('Claude did not return structured output. Try again.')
  return block.input as T
}

const conceptProps = {
  title: { type: 'string', description: 'Short internal name for the concept, 2-6 words.' },
  hook: { type: 'string', description: 'The literal first line spoken or shown in the first 2 seconds.' },
  angle: { type: 'string', description: 'The persuasive angle in one or two sentences: what belief it shifts and why it should work.' },
  format: { type: 'string', description: `Video format. Prefer one of: ${FORMATS.join('; ')}.` },
  awareness: { type: 'string', enum: AWARENESS },
  persona: { type: 'string', description: 'Who is on camera and who it speaks to, in one line.' },
  notes: { type: 'string', description: 'Why this could win, and what to test against it.' },
} as const

type ConceptDraft = Pick<Concept, 'title' | 'hook' | 'angle' | 'format' | 'awareness' | 'persona' | 'notes'>

export async function generateConcepts(brand: Brand, campaign: Campaign, opts: { count: number; direction: string; existing: string[] }) {
  const prompt = `${brief(brand, campaign)}

${opts.existing.length ? `Concepts we already have (don't repeat these angles):\n${opts.existing.map((t) => `- ${t}`).join('\n')}\n\n` : ''}${opts.direction ? `Direction for this batch: ${opts.direction}\n\n` : ''}Give me ${opts.count} distinct ad concepts. Make them genuinely different from each other: vary the angle, the awareness stage and the format. Hooks must be specific and scroll-stopping, not generic.`
  const out = await callTool<{ concepts: ConceptDraft[] }>({
    prompt,
    tool: {
      name: 'save_concepts',
      description: 'Save the ad concepts.',
      input_schema: {
        type: 'object',
        properties: { concepts: { type: 'array', items: { type: 'object', properties: conceptProps, required: Object.keys(conceptProps) } } },
        required: ['concepts'],
      },
    },
  })
  return (out.concepts ?? []).slice(0, opts.count)
}

export async function refineConcept(brand: Brand, campaign: Campaign, concept: Concept, instruction: string) {
  const prompt = `${brief(brand, campaign)}

Current concept:
Title: ${concept.title}
Hook: ${concept.hook}
Angle: ${concept.angle}
Format: ${concept.format}
Awareness: ${concept.awareness}
Persona: ${concept.persona}
Notes: ${concept.notes}

Revise this concept. Instruction: ${instruction || 'Make the hook sharper and the angle more specific.'}
Keep anything the instruction doesn't ask you to change.`
  return callTool<ConceptDraft>({
    prompt,
    tool: {
      name: 'save_concept',
      description: 'Save the revised concept.',
      input_schema: { type: 'object', properties: conceptProps, required: Object.keys(conceptProps) },
    },
  })
}

type ScriptDraft = { title: string; duration: number; cta: string; notes: string; beats: Beat[] }

export async function writeScript(
  brand: Brand,
  campaign: Campaign,
  concept: Concept,
  opts: { duration: number; instruction: string; previous: Script | null },
) {
  const prev = opts.previous
    ? `\n\nPrevious script (v${opts.previous.version}) to revise:\n${opts.previous.beats
        .map((b, i) => `${i + 1}. [${b.start}-${b.end}s] VISUAL: ${b.visual} | VO: ${b.vo} | TEXT: ${b.on_screen}`)
        .join('\n')}\nCTA: ${opts.previous.cta}`
    : ''
  const prompt = `${brief(brand, campaign)}

Concept:
Title: ${concept.title}
Hook: ${concept.hook}
Angle: ${concept.angle}
Format: ${concept.format}
Awareness: ${concept.awareness}
Persona: ${concept.persona}${prev}

Write a ${opts.duration}-second vertical (9:16) video ad script as a shot list. ${opts.instruction ? `Instruction: ${opts.instruction}` : ''}
Rules:
- The first beat delivers the hook within 2 seconds.
- Beats are contiguous, start at 0 and end at ${opts.duration}. Each beat is one shot, usually 2-5 seconds.
- Voiceover sounds like a real person talking to their phone camera.
- On-screen text is short caption text, or empty.
- For every beat, write a standalone generation prompt someone can paste into an AI image or video tool (Midjourney, Runway, Veo, Kling, etc.). Describe subject, setting, action, camera angle and movement, lighting, and "vertical 9:16". Don't put captions or brand logos in the prompt. Keep the same person and setting consistent across prompts.`
  const out = await callTool<ScriptDraft>({
    maxTokens: 6000,
    prompt,
    tool: {
      name: 'save_script',
      description: 'Save the script and shot list.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          duration: { type: 'integer' },
          cta: { type: 'string', description: 'The closing call to action line.' },
          notes: { type: 'string', description: 'Direction notes for the creator: delivery, props, wardrobe, pacing.' },
          beats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: { type: 'number' },
                end: { type: 'number' },
                visual: { type: 'string', description: 'What we see.' },
                vo: { type: 'string', description: 'What is said.' },
                on_screen: { type: 'string', description: 'Caption or text overlay.' },
                shot_type: { type: 'string', description: 'e.g. Selfie talking head, B-roll close-up, Product hero, Screen recording' },
                prompt: { type: 'string', description: 'Paste-ready prompt for an AI image/video tool.' },
              },
              required: ['start', 'end', 'visual', 'vo', 'on_screen', 'shot_type', 'prompt'],
            },
          },
        },
        required: ['title', 'duration', 'cta', 'notes', 'beats'],
      },
    },
  })
  return out
}
