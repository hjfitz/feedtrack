'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (inviteCode && inviteCode.length < 8) {
      setError('Invite code must be 8 characters')
      return
    }

    setLoading(true)

    const result = await signup(username, password, inviteCode || undefined)
    
    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Signup failed')
    }
    
    setLoading(false)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setInviteCode(value)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create account</h1>
          <p className="text-muted-foreground">Start tracking your little one</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm text-muted-foreground">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground 
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="Choose a username"
              required
              minLength={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground 
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm-password" className="text-sm text-muted-foreground">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground 
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="Confirm password"
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-code" className="text-sm text-muted-foreground">
              Invite code <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={handleCodeChange}
              autoComplete="off"
              autoCapitalize="characters"
              className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground font-mono tracking-widest
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="ABCD1234"
              maxLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-14 rounded-xl bg-sky-500 text-white text-lg font-semibold
                       transition-all duration-150
                       hover:bg-sky-400 
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 flex flex-col gap-4 text-center">
          <Link 
            href="/login" 
            className="text-sky-400 font-medium hover:text-sky-300 transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
