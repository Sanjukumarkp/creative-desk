import type { Metadata } from 'next'
import { connection } from 'next/server'
import '@fontsource-variable/archivo/wdth.css'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Creative Desk', template: '%s · Creative Desk' },
  description: 'Plan, produce and review ad creative.',
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page reads live data, so never prerender at build time.
  await connection()
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
