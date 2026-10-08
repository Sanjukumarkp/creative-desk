import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="login">
      <div className="panel stack" style={{ width: 'min(420px, 100%)' }}>
        <h2>Nothing here</h2>
        <p className="muted">This page doesn't exist, or the review link was turned off.</p>
        <div>
          <Link href="/" className="btn">
            Go to Creative Desk
          </Link>
        </div>
      </div>
    </main>
  )
}
