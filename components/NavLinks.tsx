'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({ isAdmin, mobile }: { isAdmin: boolean; mobile?: boolean }) {
  const path = usePathname()
  const links = [
    { href: '/', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/leaderboard', label: 'Leaders' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]
  return (
    <nav
      className={
        mobile
          ? 'fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-bg/95 px-2 pb-[env(safe-area-inset-bottom)] text-sm backdrop-blur sm:hidden'
          : 'hidden gap-0.5 text-sm sm:flex'
      }
    >
      {links.map((l) => {
        const active = l.href === '/' ? path === '/' || path.startsWith('/m/') : path.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md font-medium whitespace-nowrap ${mobile ? 'my-1.5 px-3 py-2' : 'px-2.5 py-1.5'} ${
              active ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
