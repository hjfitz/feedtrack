'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Baby, Copy, LockKeyhole, LogOut, RefreshCw } from 'lucide-react'
import { changePasswordAction, generateInviteAction, logoutAction, updateBabyDetailsAction } from '@/app/actions/auth'

function BabyDetailsForm({
  babyName,
  babyDob,
}: {
  babyName: string
  babyDob: string
}) {
  const [state, action] = useActionState(updateBabyDetailsAction, { error: '' })

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{state.error}</div>}
      {state.success && <div className="rounded-xl bg-sky-500/15 border border-sky-500/30 px-4 py-3 text-sky-400 text-sm">{state.success}</div>}

      <div className="flex flex-col gap-2">
        <label htmlFor="baby-name" className="text-sm text-muted-foreground">Baby's name</label>
        <input id="baby-name" name="babyName" type="text" defaultValue={babyName} autoComplete="off" className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="baby-dob" className="text-sm text-muted-foreground">Date of birth</label>
        <input id="baby-dob" name="babyDob" type="date" defaultValue={babyDob} className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" />
      </div>

      <button type="submit" className="h-12 w-full rounded-xl bg-sky-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-sky-400 active:scale-[0.98] transition-all">
        <Baby className="h-4 w-4" aria-hidden="true" />
        Save baby details
      </button>
    </form>
  )
}

function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useActionState(changePasswordAction, { error: '' })

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <form ref={formRef} action={action} className="mt-4 flex flex-col gap-3">
      {state.error && <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{state.error}</div>}
      {state.success && <div className="rounded-xl bg-sky-500/15 border border-sky-500/30 px-4 py-3 text-sky-400 text-sm">{state.success}</div>}

      <div className="flex flex-col gap-2">
        <label htmlFor="change-password-username" className="text-sm text-muted-foreground">Username</label>
        <input id="change-password-username" name="username" type="text" autoComplete="username" autoCapitalize="off" className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" required />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="current-password" className="text-sm text-muted-foreground">Current password</label>
        <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" required />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="new-password" className="text-sm text-muted-foreground">New password</label>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" required minLength={6} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm new password</label>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" className="h-12 rounded-xl bg-background border border-border px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50" required minLength={6} />
        </div>
      </div>

      <button type="submit" className="h-12 w-full rounded-xl bg-sky-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-sky-400 active:scale-[0.98] transition-all">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        Change password
      </button>
    </form>
  )
}

export function SettingsPanel({
  inviteCode,
  babyName,
  babyDob,
}: {
  inviteCode: string | null
  babyName: string
  babyDob: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyInvite = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-muted/40 border border-muted p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Baby details</h2>
          <p className="text-sm text-muted-foreground mt-1">Shown on the home screen header.</p>
        </div>

        <BabyDetailsForm babyName={babyName} babyDob={babyDob} />
      </section>

      <section className="rounded-xl bg-muted/40 border border-muted p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Household invite</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share this code with another caregiver so they can create an account in this household.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <code className="flex-1 min-w-0 py-3 px-4 rounded-lg bg-background border border-border text-lg font-mono tracking-widest text-center text-foreground">
            {inviteCode || '--------'}
          </code>
          <button type="button" onClick={handleCopyInvite} disabled={!inviteCode} className="h-12 w-12 rounded-lg bg-sky-500 text-white grid place-items-center hover:bg-sky-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Copy invite code" title="Copy invite code">
            <Copy className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form action={generateInviteAction}>
          <button type="submit" className="mt-4 h-12 w-full rounded-xl bg-muted border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/80 active:scale-[0.98] transition-all">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Generate new code
          </button>
        </form>

        {copied && <p className="mt-3 text-center text-sm text-sky-400">Copied to clipboard</p>}
      </section>

      <section className="rounded-xl bg-muted/40 border border-muted p-4">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground mt-1">Signed in</p>

        <ChangePasswordForm />

        <form action={logoutAction}>
          <button type="submit" className="mt-4 h-12 w-full rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-center gap-2 hover:text-red-400 hover:border-red-500/40 active:scale-[0.98] transition-all">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </section>
    </div>
  )
}
