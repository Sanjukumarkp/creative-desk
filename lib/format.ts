export function fmtTime(sec: number | null | undefined, precise = false) {
  if (sec == null || !Number.isFinite(sec)) return '–'
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const ss = precise ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0')
  return `${m}:${ss}`
}

export function fmtBytes(n: number | string) {
  const v = Number(n)
  if (!v) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(v) / Math.log(1024)))
  return `${(v / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${u[i]}`
}

export function aspect(w: number | null, h: number | null) {
  if (!w || !h) return ''
  const r = w / h
  const known: [string, number][] = [['9:16', 9 / 16], ['4:5', 4 / 5], ['1:1', 1], ['16:9', 16 / 9], ['2:3', 2 / 3], ['3:2', 3 / 2]]
  const best = known.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))
  return Math.abs(best[1] - r) < 0.03 ? best[0] : `${w}×${h}`
}

export function ago(d: Date | string) {
  const t = new Date(d).getTime()
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function statusLabel(key: string, list: readonly { key: string; label: string }[]) {
  return list.find((x) => x.key === key)?.label ?? key
}
