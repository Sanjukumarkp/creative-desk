/** Shown instead of the app when required settings are missing, so a fresh deploy explains itself. */
export default function SetupNeeded({ missing }: { missing: { key: string; what: string; how: string }[] }) {
  return (
    <main className="login">
      <div className="panel stack" style={{ width: 'min(560px, 100%)' }}>
        <div className="wordmark" style={{ color: 'var(--ink)' }}>
          <i aria-hidden />
          Creative Desk
        </div>
        <h2>Almost ready</h2>
        <p className="muted">
          The app is deployed but still needs {missing.length === 1 ? 'one setting' : `${missing.length} settings`} in your Vercel
          project. Add {missing.length === 1 ? 'it' : 'them'}, then redeploy from the Deployments tab.
        </p>
        <div className="stack">
          {missing.map((m) => (
            <div key={m.key} className="notice info">
              <b>{m.what}</b> <span className="muted small">({m.key})</span>
              <div className="small" style={{ marginTop: 4 }}>{m.how}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export function missingSettings() {
  const out: { key: string; what: string; how: string }[] = []
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    out.push({
      key: 'DATABASE_URL',
      what: 'Database',
      how: 'Vercel → this project → Storage → Create Database → Neon, and connect it to this project.',
    })
  }
  if (!process.env.APP_PASSWORD) {
    out.push({ key: 'APP_PASSWORD', what: 'Sign-in password', how: 'Settings → Environment Variables → add APP_PASSWORD.' })
  }
  return out
}
