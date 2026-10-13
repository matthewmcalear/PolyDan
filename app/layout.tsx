import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { balanceCents } from '@/lib/markets'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/money'
import { NavLinks } from '@/components/NavLinks'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'PolyDan',
  description: 'The family prediction market for Iron Man',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#110f0a' },
    { media: '(prefers-color-scheme: light)', color: '#f4efe3' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  const balance = user ? await balanceCents(prisma, user.id) : 0

  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-dvh font-sans">
        {user && (
          <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
              <Link href="/" className="flex items-baseline gap-1.5">
                <span className="font-display text-xl font-bold uppercase tracking-wide text-gold">PolyDan</span>
                <span className="hidden text-xs text-muted sm:inline">Iron Man markets</span>
              </Link>
              <NavLinks isAdmin={user.isAdmin} />
              <Link
                href="/portfolio"
                className="ml-auto rounded-full border border-line-strong px-3 py-1 text-sm font-semibold num"
                title="Your balance"
              >
                {formatMoney(balance)}
              </Link>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5">{children}</main>
        {user && <NavLinks isAdmin={user.isAdmin} mobile />}
      </body>
    </html>
  )
}
