'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'

interface AuthState {
  authenticated: boolean
  loading: boolean
  householdId: string | null
  username: string | null
  inviteCode: string | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (username: string, password: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>
  generateInviteCode: () => Promise<{ success: boolean; inviteCode?: string; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

interface AuthResponse {
  authenticated?: boolean
  householdId: string | null
  inviteCode: string | null
  error?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

async function postAuth(path: string, body?: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      householdId: null,
      inviteCode: null,
      error: data?.error || `Request failed with status ${response.status}`,
    }
  }

  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    loading: true,
    householdId: null,
    username: null,
    inviteCode: null,
  })

  const setAuthenticatedState = useCallback((
    data: AuthResponse,
    username: string | null = null
  ) => {
    setState({
      authenticated: true,
      loading: false,
      householdId: data.householdId,
      username,
      inviteCode: data.inviteCode,
    })
  }, [])

  const refresh = useCallback(async () => {
    const response = await fetch('/api/auth/me')
    const data = await response.json()

    if (data.authenticated) {
      setAuthenticatedState(data, state.username)
    } else {
      setState({
        authenticated: false,
        loading: false,
        householdId: null,
        username: null,
        inviteCode: null,
      })
    }
  }, [setAuthenticatedState, state.username])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (username: string, password: string) => {
    const result = await postAuth('/api/auth/login', { username, password })

    if (result.error) {
      return { success: false, error: result.error }
    }

    setAuthenticatedState(result, username)
    return { success: true }
  }

  const signup = async (username: string, password: string, inviteCode?: string) => {
    const result = await postAuth('/api/auth/signup', { username, password, inviteCode })

    if (result.error) {
      return { success: false, error: result.error }
    }

    setAuthenticatedState(result, username)
    return { success: true }
  }

  const generateInviteCode = async () => {
    const result = await postAuth('/api/auth/invite')

    if (result.error) {
      return { success: false, error: result.error }
    }

    setState(current => ({
      ...current,
      inviteCode: result.inviteCode,
    }))

    return { success: true, inviteCode: result.inviteCode || undefined }
  }

  const logout = async () => {
    await postAuth('/api/auth/logout')
    setState({
      authenticated: false,
      loading: false,
      householdId: null,
      username: null,
      inviteCode: null,
    })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, signup, generateInviteCode, logout, refresh }}>
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
