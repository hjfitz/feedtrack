'use server'

import { revalidatePath } from 'next/cache'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { parseAppDateTimeLocal } from '@/lib/timezone'
import {
  addFeed,
  addNappy,
  deleteFeed,
  deleteNappy,
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

function getTimestamp(formData: FormData) {
  const value = getString(formData, 'timestamp')
  const timestamp = value ? parseAppDateTimeLocal(value) || new Date(value) : null
  return timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp : new Date()
}

function revalidateTrackerPages() {
  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/analytics')
}

function getFeedPayload(type: FeedType, formData: FormData) {
  const amount = getNumber(formData, 'amount')
  const measure = getString(formData, 'measure')
  const rounded = amount ? Math.round(amount) : undefined

  return {
    durationSeconds: type === 'breast' && measure !== 'volume' && rounded ? rounded * 60 : undefined,
    volumeMl: (type === 'formula' || measure === 'volume') && rounded ? rounded : undefined,
  }
}

export async function addFeedAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  const type = getString(formData, 'type') as FeedType
  const feedPayload = getFeedPayload(type, formData)

  await addFeed(householdId, {
    type,
    timestamp: getTimestamp(formData),
    ...feedPayload,
  })
  revalidateTrackerPages()
}

export async function addNappyAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await addNappy(householdId, {
    type: getString(formData, 'type') as NappyType,
    timestamp: getTimestamp(formData),
  })
  revalidateTrackerPages()
}

export async function updateFeedAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  const type = getString(formData, 'type') as FeedType
  const feedPayload = getFeedPayload(type, formData)

  await updateFeed(householdId, getString(formData, 'id'), {
    type,
    timestamp: getTimestamp(formData),
    ...feedPayload,
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
    timestamp: getTimestamp(formData),
  })
  revalidateTrackerPages()
}

export async function deleteNappyAction(formData: FormData) {
  const householdId = await requireSessionHouseholdId()
  await deleteNappy(householdId, getString(formData, 'id'))
  revalidateTrackerPages()
}
