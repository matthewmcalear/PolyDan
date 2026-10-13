'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { currentUser, endSession, startSession, verifyPin } from '@/lib/auth'
import { executeTrade, TradeError } from '@/lib/markets'
import { formatMoney } from '@/lib/money'

export interface ActionState {
  error?: string
  ok?: string
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get('name') ?? '')
  const pin = String(form.get('pin') ?? '')
  const user = await prisma.user.findUnique({ where: { name } })
  if (!user || !verifyPin(pin, user.pinHash)) return { error: "That PIN doesn't match" }
  await startSession(user.id)
  redirect('/')
}

export async function logout() {
  await endSession()
  redirect('/login')
}

export async function trade(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser()
  if (!user) return { error: 'Log in again' }
  const outcomeId = Number(form.get('outcomeId'))
  const side = form.get('side') === 'SELL' ? 'SELL' : 'BUY'
  const amount = Number(form.get('amount'))
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount' }
  try {
    const r =
      side === 'BUY'
        ? await executeTrade({ side, userId: user.id, outcomeId, spendCents: Math.round(amount * 100) })
        : await executeTrade({ side, userId: user.id, outcomeId, shares: amount })
    revalidatePath('/', 'layout')
    return {
      ok:
        side === 'BUY'
          ? `Bought ${r.shares.toFixed(2)} shares for ${formatMoney(r.costCents)}`
          : `Sold ${(-r.shares).toFixed(2)} shares for ${formatMoney(-r.costCents)}`,
    }
  } catch (e) {
    if (e instanceof TradeError) return { error: e.message }
    throw e
  }
}
