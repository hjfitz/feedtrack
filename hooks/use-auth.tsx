'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

/**
 * Simple localStorage-based auth for development
 * Can be replaced with server-side auth (Supabase, NextAuth, etc.) later
 */

interface AuthState {
  authenticated: boolean
  loading: boolean
  householdId: string | null
  username: string | null
  inviteCode: string | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  join: (inviteCode: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'babytracker_auth'
const USERS_KEY = 'babytracker_users'
const INVITES_KEY = 'babytracker_invites'

interface StoredUser {
  username: string
  passwordHash: string
  householdId: string
  inviteCode: string
}

interface StoredAuth {
  householdId: string
  username: string
  inviteCode: string
}

// Simple hash for demo (in production, use bcrypt on server)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getUsers(): Record<string, StoredUser> {
  if (typeof window === 'undefined') return {}
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : {}
}

function setUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function getInvites(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const data = localStorage.getItem(INVITES_KEY)
  return data ? JSON.parse(data) : {}
}

function setInvites(invites: Record<string, string>) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites))
}

function getStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : null
}

function setStoredAuth(auth: StoredAuth | null) {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    loading: true,
    householdId: null,
    username: null,
    inviteCode: null,
  })

  const refresh = useCallback(async () => {
    const stored = getStoredAuth()
    if (stored) {
      setState({
        authenticated: true,
        loading: false,
        householdId: stored.householdId,
        username: stored.username,
        inviteCode: stored.inviteCode,
      })
    } else {
      setState({
        authenticated: false,
        loading: false,
        householdId: null,
        username: null,
        inviteCode: null,
      })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (username: string, password: string) => {
    const users = getUsers()
    const user = users[username.toLowerCase()]
    
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    
    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, error: 'Incorrect password' }
    }
    
    const auth: StoredAuth = {
      householdId: user.householdId,
      username: user.username,
      inviteCode: user.inviteCode,
    }
    
    setStoredAuth(auth)
    await refresh()
    return { success: true }
  }

  const signup = async (username: string, password: string) => {
    const users = getUsers()
    
    if (users[username.toLowerCase()]) {
      return { success: false, error: 'Username already taken' }
    }
    
    const householdId = generateId()
    const inviteCode = generateInviteCode()
    
    const user: StoredUser = {
      username,
      passwordHash: simpleHash(password),
      householdId,
      inviteCode,
    }
    
    users[username.toLowerCase()] = user
    setUsers(users)
    
    // Store invite code mapping
    const invites = getInvites()
    invites[inviteCode] = householdId
    setInvites(invites)
    
    const auth: StoredAuth = {
      householdId,
      username,
      inviteCode,
    }
    
    setStoredAuth(auth)
    await refresh()
    return { success: true }
  }

  const join = async (inviteCode: string) => {
    const invites = getInvites()
    const householdId = invites[inviteCode.toUpperCase()]
    
    if (!householdId) {
      return { success: false, error: 'Invalid invite code' }
    }
    
    const auth: StoredAuth = {
      householdId,
      username: 'Partner',
      inviteCode: inviteCode.toUpperCase(),
    }
    
    setStoredAuth(auth)
    await refresh()
    return { success: true }
  }

  const logout = async () => {
    setStoredAuth(null)
    setState({
      authenticated: false,
      loading: false,
      householdId: null,
      username: null,
      inviteCode: null,
    })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, signup, join, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
