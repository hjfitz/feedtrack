'use server'

import { revalidatePath } from 'next/cache'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import {
  addAppointment,
  addFeed,
  addNappy,
  deleteAppointment,
  deleteFeed,
  deleteNappy,
  updateAppointment,
  updateFeed,
  updateNappy,
} from '@/lib/server/tracker'
import type { FeedType, NappyType } from '@/lib/types'

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key))
  return Number.isFinite(value) ? value : undefined
}

function revalidateTrackerPages() {
  revalidatePath('/')
  revalidatePath('/history')
}

export async function addFeedAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  const type = getString(formData, 'type') as FeedType
  const amount = getNumber(formData, 'amount')

  await addFeed(householdId, {
    type,
    timestamp: new Date(),
    durationSeconds: type === 'breast' && amount ? Math.round(amount) * 60 : undefined,
    volumeMl: type === 'formula' && amount ? Math.round(amount) : undefined,
  })
  revalidateTrackerPages()
}

export async function addNappyAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await addNappy(householdId, {
    type: getString(formData, 'type') as NappyType,
    timestamp: new Date(),
  })
  revalidateTrackerPages()
}

export async function updateFeedAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  const type = getString(formData, 'type') as FeedType
  const amount = getNumber(formData, 'amount')

  await updateFeed(householdId, getString(formData, 'id'), {
    type,
    timestamp: new Date(getString(formData, 'timestamp')),
    durationSeconds: type === 'breast' && amount ? Math.round(amount) * 60 : undefined,
    volumeMl: type === 'formula' && amount ? Math.round(amount) : undefined,
  })
  revalidateTrackerPages()
}

export async function deleteFeedAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await deleteFeed(householdId, getString(formData, 'id'))
  revalidateTrackerPages()
}

export async function updateNappyAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await updateNappy(householdId, getString(formData, 'id'), {
    type: getString(formData, 'type') as NappyType,
    timestamp: new Date(getString(formData, 'timestamp')),
  })
  revalidateTrackerPages()
}

export async function deleteNappyAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await deleteNappy(householdId, getString(formData, 'id'))
  revalidateTrackerPages()
}

export async function addAppointmentAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await addAppointment(householdId, {
    title: getString(formData, 'title'),
    dateTime: getString(formData, 'dateTime'),
    notes: getString(formData, 'notes'),
    isPast: formData.get('isPast') === 'on',
  })
  revalidatePath('/appointments')
}

export async function updateAppointmentAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await updateAppointment(householdId, getString(formData, 'id'), {
    title: getString(formData, 'title'),
    dateTime: new Date(getString(formData, 'dateTime')),
    notes: getString(formData, 'notes'),
    isPast: formData.get('isPast') === 'on',
  })
  revalidatePath('/appointments')
}

export async function deleteAppointmentAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await deleteAppointment(householdId, getString(formData, 'id'))
  revalidatePath('/appointments')
}
