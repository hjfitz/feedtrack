'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { clearSessionCookie, requireSessionHouseholdId, setSessionCookie } from '@/lib/server/auth'
import { AppError, changePassword, generateInviteCode, loginUser, signupUser } from '@/lib/server/tracker'

export interface AuthFormState {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function formError(error: unknown): AuthFormState {
  return { error: error instanceof Error ? error.message : 'Something went wrong' }
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const result = await loginUser(getString(formData, 'username'), getString(formData, 'password'))
    await setSessionCookie(result.householdId)
  } catch (error) {
    return formError(error)
  }

  redirect('/')
}

export async function signupAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = getString(formData, 'password')
  const confirmPassword = getString(formData, 'confirmPassword')

  try {
    if (password !== confirmPassword) {
      throw new AppError('Passwords do not match')
    }

    const result = await signupUser(getString(formData, 'username'), password, getString(formData, 'inviteCode'))
    await setSessionCookie(result.householdId)
  } catch (error) {
    return formError(error)
  }

  redirect('/')
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect('/login')
}

export async function generateInviteAction() {
  const householdId = await requireSessionHouseholdId()
  await generateInviteCode(householdId)
  revalidatePath('/settings')
}

export async function changePasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const currentPassword = getString(formData, 'currentPassword')
  const newPassword = getString(formData, 'newPassword')
  const confirmPassword = getString(formData, 'confirmPassword')

  try {
    if (newPassword !== confirmPassword) {
      throw new AppError('New passwords do not match')
    }

    const householdId = await requireSessionHouseholdId()
    await changePassword(householdId, getString(formData, 'username'), currentPassword, newPassword)
  } catch (error) {
    return formError(error)
  }

  return { error: '', success: 'Password changed' }
}
