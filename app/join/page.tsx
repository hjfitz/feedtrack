'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

export default function JoinPage() {
  const router = useRouter()
  const { join } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await join(inviteCode)
    
    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Invalid invite code')
    }
    
    setLoading(false)
  }

  // Format invite code as user types (uppercase, max 8 chars)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setInviteCode(value)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Join household</h1>
          <p className="text-muted-foreground">Enter the code from your partner</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-code" className="text-sm text-muted-foreground">
              Invite code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={handleCodeChange}
              autoComplete="off"
              autoCapitalize="characters"
              className="h-16 rounded-xl bg-muted/50 border border-muted px-4 text-2xl text-foreground text-center font-mono tracking-widest
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="ABCD1234"
              required
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground text-center mt-1">
              8 character code
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || inviteCode.length < 8}
            className="h-14 rounded-xl bg-sky-500 text-white text-lg font-semibold
                       transition-all duration-150
                       hover:bg-sky-400 
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 flex flex-col gap-4 text-center">
          <Link 
            href="/login" 
            className="text-sky-400 font-medium hover:text-sky-300 transition-colors"
          >
            Sign in to existing account
          </Link>
          <Link 
            href="/signup" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  )
}
