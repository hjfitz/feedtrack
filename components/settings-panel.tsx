'use client'

import { useState } from 'react'
import { Copy, LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export function SettingsPanel() {
  const router = useRouter()
  const { inviteCode, username, generateInviteCode, logout } = useAuth()
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleCopyInvite = async () => {
    if (!inviteCode) return

    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateInvite = async () => {
    setError('')
    setGenerating(true)

    const result = await generateInviteCode()

    if (!result.success) {
      setError(result.error || 'Could not generate a new code')
    }

    setGenerating(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-muted/40 border border-muted p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Household invite</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share this code with another caregiver so they can create an account in this household.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <code className="flex-1 min-w-0 py-3 px-4 rounded-lg bg-background border border-border text-lg font-mono tracking-widest text-center text-foreground">
            {inviteCode || '--------'}
          </code>
          <button
            type="button"
            onClick={handleCopyInvite}
            disabled={!inviteCode}
            className="h-12 w-12 rounded-lg bg-sky-500 text-white grid place-items-center
                       hover:bg-sky-400 active:scale-95 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Copy invite code"
            title="Copy invite code"
          >
            <Copy className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGenerateInvite}
          disabled={generating}
          className="mt-4 h-12 w-full rounded-xl bg-muted border border-border text-foreground font-medium
                     flex items-center justify-center gap-2
                     hover:bg-muted/80 active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} aria-hidden="true" />
          {generating ? 'Generating...' : 'Generate new code'}
        </button>

        {copied && (
          <p className="mt-3 text-center text-sm text-sky-400">Copied to clipboard</p>
        )}
      </section>

      <section className="rounded-xl bg-muted/40 border border-muted p-4">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground mt-1">{username || 'Signed in'}</p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 h-12 w-full rounded-xl border border-border text-muted-foreground font-medium
                     flex items-center justify-center gap-2
                     hover:text-red-400 hover:border-red-500/40 active:scale-[0.98] transition-all"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </section>
    </div>
  )
}
