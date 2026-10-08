// Flags wording that commonly gets supplement ads rejected by Meta or puts a brand at FTC/FDA risk.
// This is a tripwire for human review, not legal advice.

export type ClaimFlag = { term: string; reason: string; where: string }

const RULES: { re: RegExp; reason: string }[] = [
  { re: /\b(cure[sd]?|curing)\b/i, reason: 'Disease claim. Supplements cannot claim to cure anything.' },
  { re: /\b(treat(s|ed|ing|ment)?)\b(?! yourself)/i, reason: 'Disease claim. Supplements cannot claim to treat a condition.' },
  { re: /\b(prevent(s|ed|ing)?)\b/i, reason: 'Prevention of a disease is a drug claim.' },
  { re: /\b(heal(s|ed|ing)?)\b/i, reason: 'Healing implies treating a condition.' },
  { re: /\b(diagnos\w*)\b/i, reason: 'Diagnosis language is a drug claim.' },
  { re: /\b(reverse[sd]?|reversing)\b/i, reason: 'Reversing a condition is a disease claim.' },
  {
    re: /\b(anxiety|depression|insomnia|diabetes|cancer|arthritis|adhd|alzheimer'?s|dementia|hypertension|high blood pressure|ibs|covid|infection|inflammation disease)\b/i,
    reason: 'Names a disease or diagnosable condition. Use structure/function wording instead (e.g. "supports a calm mood").',
  },
  { re: /\bfda[- ]?(approved|cleared|certified)\b/i, reason: 'Supplements are not FDA approved. This is a false claim.' },
  { re: /\bclinically (proven|tested|shown)\b/i, reason: 'Needs a specific study you can cite for this exact product and dose.' },
  { re: /\bdoctors? (recommend|approved|say)\b/i, reason: 'Endorsement claim needs real, documented support.' },
  { re: /\b(guaranteed?|100% (effective|results)|works for everyone)\b/i, reason: 'Absolute result claims are not substantiable.' },
  { re: /\b(lose|lost|drop(ped)?) \d+\s?(lbs?|pounds|kg|kilos)\b/i, reason: 'Specific weight-loss results need substantiation and typical-results disclosure.' },
  { re: /\b(no side effects|completely safe|zero risk)\b/i, reason: 'Absolute safety claims are not substantiable.' },
  { re: /\b(replace[sd]?|instead of) (your )?(medication|meds|prescription|doctor)\b/i, reason: 'Never suggest replacing medical treatment.' },
  { re: /\b(instantly|overnight results|in \d+ (hours|days))\b/i, reason: 'Speed-of-result claims need substantiation.' },
  { re: /\bbefore (and|&) after\b/i, reason: 'Meta restricts before/after imagery for health products.' },
]

export function checkClaims(text: string, where: string, bannedList = ''): ClaimFlag[] {
  const flags: ClaimFlag[] = []
  if (!text) return flags
  for (const { re, reason } of RULES) {
    const m = text.match(re)
    if (m) flags.push({ term: m[0], reason, where })
  }
  for (const line of bannedList.split('\n')) {
    const phrase = line.replace(/^[-*•\s]+/, '').trim()
    if (phrase.length < 3) continue
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      flags.push({ term: phrase, reason: 'On this brand’s banned list.', where })
    }
  }
  return flags
}

export function checkScript(
  script: { title: string; cta: string; beats: { vo: string; on_screen: string; start: number; end: number }[] },
  bannedList = '',
) {
  const flags: ClaimFlag[] = []
  flags.push(...checkClaims(script.title, 'Title', bannedList))
  script.beats.forEach((b, i) => {
    flags.push(...checkClaims(b.vo, `Beat ${i + 1} voiceover`, bannedList))
    flags.push(...checkClaims(b.on_screen, `Beat ${i + 1} on-screen text`, bannedList))
  })
  flags.push(...checkClaims(script.cta, 'CTA', bannedList))
  return flags
}
