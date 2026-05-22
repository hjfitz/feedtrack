'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction, signupAction } from '@/app/actions/auth'

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="h-14 rounded-xl bg-sky-500 text-white text-lg font-semibold transition-all duration-150 hover:bg-sky-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
      {children}
    </button>
  )
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, { error: '' })

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{state.error}</div>}
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm text-muted-foreground">Username</label>
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="off" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="Enter username" required />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-muted-foreground">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="Enter password" required />
      </div>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  )
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, { error: '' })

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{state.error}</div>}
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm text-muted-foreground">Username</label>
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="off" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="Choose a username" required minLength={3} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-muted-foreground">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="Create a password" required minLength={6} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm password</label>
        <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="Confirm password" required minLength={6} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="invite-code" className="text-sm text-muted-foreground">Invite code <span className="text-muted-foreground/60">(optional)</span></label>
        <input id="invite-code" name="inviteCode" type="text" autoComplete="off" autoCapitalize="characters" className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground font-mono tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all" placeholder="ABCD1234" maxLength={8} />
      </div>
      <SubmitButton>Create account</SubmitButton>
    </form>
  )
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sky-400 font-medium hover:text-sky-300 transition-colors">
      {children}
    </Link>
  )
}
