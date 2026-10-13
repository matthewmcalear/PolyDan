import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  if (await currentUser()) redirect('/')
  const users = await prisma.user.findMany({ select: { name: true }, orderBy: { name: 'asc' } })
  return (
    <div className="mx-auto mt-[12vh] max-w-sm">
      <div className="mb-8 text-center">
        <p className="eyebrow">⚜ Iron Man ⚜</p>
        <h1 className="mt-1 font-display text-5xl font-bold uppercase tracking-wide text-gold">PolyDan</h1>
        <p className="mt-2 text-sm text-muted">The family market for the last one standing.</p>
      </div>
      <LoginForm names={users.map((u) => u.name)} />
    </div>
  )
}
