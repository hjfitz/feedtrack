'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)
    
    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to continue tracking</p>
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
              placeholder="Enter username"
              required
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
              autoComplete="current-password"
              className="h-14 rounded-xl bg-muted/50 border border-muted px-4 text-lg text-foreground 
                         placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50
                         transition-all"
              placeholder="Enter password"
              required
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 flex flex-col gap-4 text-center">
          <Link 
            href="/signup" 
            className="text-sky-400 font-medium hover:text-sky-300 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
