'use client'

import { useActionState } from 'react'
import { login } from '../actions'
import { Notice, SubmitButton } from '@/components/ui'

export function LoginForm({ names }: { names: string[] }) {
  const [state, action] = useActionState(login, {})
  return (
    <form action={action} className="card space-y-4 p-5">
      <label className="block">
        <span className="eyebrow">Who are you?</span>
        <select name="name" required className="field mt-1" defaultValue="">
          <option value="" disabled>
            Pick your name
          </option>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="eyebrow">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          className="field mt-1 tracking-[0.3em]"
        />
      </label>
      <SubmitButton className="btn btn-gold w-full" pendingText="Checking…">
        Log in
      </SubmitButton>
      <Notice state={state} />
      <p className="text-center text-xs text-muted">No account? Ask Matt for a PIN.</p>
    </form>
  )
}
