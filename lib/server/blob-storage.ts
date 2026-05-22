import { getStore } from '@netlify/blobs'
import type { FeedEntry, NappyEntry } from '@/lib/types'

export interface StoredUser {
  id: string
  hash: string
  inviteCode: string
}

export interface InviteRecord {
  householdId: string
}

export interface HouseholdMeta {
  inviteCode: string
}

interface StoredHouseholdData {
  feeds: FeedEntry[]
  nappies: NappyEntry[]
}

type StoreValue = StoredUser | InviteRecord | HouseholdMeta | FeedEntry[] | NappyEntry[]

interface JsonStore {
  get<T>(key: string): Promise<T | null>
  set<T extends StoreValue>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

const STORE_NAME = 'babytracker'

const mockData = globalThis as typeof globalThis & {
  __babytrackerMockStore?: Map<string, StoreValue>
}

function shouldUseMockStorage() {
  return process.env.NEXT_PUBLIC_USE_MOCK_STORAGE === 'true'
}

function createMockStore(): JsonStore {
  if (!mockData.__babytrackerMockStore) {
    mockData.__babytrackerMockStore = new Map()
  }

  return {
    async get<T>(key: string) {
      return (mockData.__babytrackerMockStore?.get(key) as T | undefined) ?? null
    },
    async set<T extends StoreValue>(key: string, value: T) {
      mockData.__babytrackerMockStore?.set(key, value)
    },
    async delete(key: string) {
      mockData.__babytrackerMockStore?.delete(key)
    },
  }
}

function createBlobStore(): JsonStore {
  const store = getStore(STORE_NAME)

  return {
    async get<T>(key: string) {
      return store.get(key, { consistency: 'strong', type: 'json' }) as Promise<T | null>
    },
    async set<T extends StoreValue>(key: string, value: T) {
      await store.setJSON(key, value)
    },
    async delete(key: string) {
      await store.delete(key)
    },
  }
}

function getJsonStore(): JsonStore {
  return shouldUseMockStorage() ? createMockStore() : createBlobStore()
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function normalizeInviteCode(inviteCode: string) {
  return inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function userKey(username: string) {
  return `users/${encodeURIComponent(normalizeUsername(username))}.json`
}

export function inviteKey(inviteCode: string) {
  return `invites/${normalizeInviteCode(inviteCode)}.json`
}

export function householdMetaKey(householdId: string) {
  return `households/${householdId}/meta.json`
}

export function householdDataKey(householdId: string, type: keyof StoredHouseholdData) {
  return `households/${householdId}/${type}.json`
}

export async function getUser(username: string) {
  return getJsonStore().get<StoredUser>(userKey(username))
}

export async function setUser(username: string, user: StoredUser) {
  await getJsonStore().set(userKey(username), user)
}

export async function getInvite(inviteCode: string) {
  return getJsonStore().get<InviteRecord>(inviteKey(inviteCode))
}

export async function setInvite(inviteCode: string, invite: InviteRecord) {
  await getJsonStore().set(inviteKey(inviteCode), invite)
}

export async function deleteInvite(inviteCode: string) {
  await getJsonStore().delete(inviteKey(inviteCode))
}

export async function getHouseholdMeta(householdId: string) {
  return getJsonStore().get<HouseholdMeta>(householdMetaKey(householdId))
}

export async function setHouseholdMeta(householdId: string, meta: HouseholdMeta) {
  await getJsonStore().set(householdMetaKey(householdId), meta)
}

export async function getHouseholdData<K extends keyof StoredHouseholdData>(
  householdId: string,
  type: K
): Promise<StoredHouseholdData[K]> {
  const value = await getJsonStore().get<StoredHouseholdData[K]>(householdDataKey(householdId, type))
  if (!value) {
    return [] as unknown as StoredHouseholdData[K]
  }

  if (type === 'feeds') {
    return (value as FeedEntry[]).map(feed => ({
      ...feed,
      timestamp: new Date(feed.timestamp),
    })) as unknown as StoredHouseholdData[K]
  }

  if (type === 'nappies') {
    return (value as NappyEntry[]).map(nappy => ({
      ...nappy,
      timestamp: new Date(nappy.timestamp),
    })) as unknown as StoredHouseholdData[K]
  }


  return value
}

export async function setHouseholdData<K extends keyof StoredHouseholdData>(
  householdId: string,
  type: K,
  value: StoredHouseholdData[K]
) {
  await getJsonStore().set(householdDataKey(householdId, type), value)
}

export async function initializeHousehold(householdId: string, inviteCode: string) {
  await Promise.all([
    setHouseholdMeta(householdId, { inviteCode }),
    setHouseholdData(householdId, 'feeds', []),
    setHouseholdData(householdId, 'nappies', []),
  ])
}
