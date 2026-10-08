import Link from 'next/link'
import { logout } from '@/app/actions'

export type Crumb = { href: string; label: string }

export default function Shell({ crumbs = [], children }: { crumbs?: Crumb[]; children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link href="/" className="wordmark">
          <i aria-hidden />
          Creative Desk
        </Link>
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.href} style={{ display: 'contents' }}>
              <span aria-hidden>/</span>
              <Link href={c.href}>{c.label}</Link>
            </span>
          ))}
        </nav>
        <div className="spacer" />
        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main className="page">{children}</main>
    </>
  )
}
