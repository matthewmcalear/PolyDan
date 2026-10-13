'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { ActionState } from '@/app/actions'

export function SubmitButton({
  children,
  className = 'btn btn-gold',
  pendingText,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? (pendingText ?? 'Working…') : children}
    </button>
  )
}

export function Notice({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm font-medium text-no" role="alert">{state.error}</p>
  if (state.ok) return <p className="text-sm font-medium text-yes" role="status">{state.ok}</p>
  return null
}

/** A form bound to a server action that shows the result inline. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  confirm,
  onSuccess,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>
  children: React.ReactNode
  className?: string
  resetOnSuccess?: boolean
  confirm?: string
  onSuccess?: () => void
}) {
  const [state, formAction] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!state.ok) return
    if (resetOnSuccess) ref.current?.reset()
    onSuccess?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {children}
      <Notice state={state} />
    </form>
  )
}

/** Keeps live pages fresh while the tab is visible. */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
