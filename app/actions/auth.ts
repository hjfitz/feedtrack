'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { clearSessionCookie, requireSessionHouseholdId, setSessionCookie } from '@/lib/server/auth'
import { getHouseholdMeta, setHouseholdMeta } from '@/lib/server/blob-storage'
import { AppError, changePassword, createUserForHousehold, generateInviteCode, joinHouseholdWithInvite, loginUser, signupUser } from '@/lib/server/tracker'

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

export async function joinWithCodeAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const result = await joinHouseholdWithInvite(getString(formData, 'inviteCode'))
    await setSessionCookie(result.householdId)
  } catch (error) {
    return formError(error)
  }

  redirect('/')
}

export async function createHouseholdAccountAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = getString(formData, 'password')
  const confirmPassword = getString(formData, 'confirmPassword')

  try {
    if (password !== confirmPassword) {
      throw new AppError('Passwords do not match')
    }

    const householdId = await requireSessionHouseholdId()
    await createUserForHousehold(householdId, getString(formData, 'username'), password)
  } catch (error) {
    return formError(error)
  }

  return { error: '', success: 'Account created for this household' }
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

export async function updateBabyDetailsAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const babyName = getString(formData, 'babyName').trim()
  const babyDob = getString(formData, 'babyDob')
  const feedingIntervalValue = getString(formData, 'feedingIntervalMinutes')

  try {
    if (babyDob) {
      const parsedDob = new Date(`${babyDob}T00:00:00`)
      if (Number.isNaN(parsedDob.getTime())) {
        throw new AppError('Date of birth is invalid')
      }
    }
    const feedingIntervalMinutes = feedingIntervalValue ? Number(feedingIntervalValue) : undefined
    if (feedingIntervalMinutes !== undefined && (!Number.isFinite(feedingIntervalMinutes) || feedingIntervalMinutes < 30 || feedingIntervalMinutes > 720)) {
      throw new AppError('Feeding interval must be between 30 minutes and 12 hours')
    }

    const householdId = await requireSessionHouseholdId()
    const meta = await getHouseholdMeta(householdId)
    await setHouseholdMeta(householdId, {
      inviteCode: meta?.inviteCode || '',
      babyName: babyName || undefined,
      babyDob: babyDob || undefined,
      feedingIntervalMinutes: feedingIntervalMinutes ? Math.round(feedingIntervalMinutes) : undefined,
    })
    revalidatePath('/')
    revalidatePath('/settings')
  } catch (error) {
    return formError(error)
  }

  return { error: '', success: 'Baby details saved' }
}
