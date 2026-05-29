import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import {
  deleteInvite,
  getHouseholdData,
  getHouseholdMeta,
  getInvite,
  getUser,
  initializeHousehold,
  normalizeInviteCode,
  normalizeUsername,
  setHouseholdData,
  setHouseholdMeta,
  setInvite,
  setUser,
} from '@/lib/server/blob-storage'
import { calculateSummary } from '@/lib/server/summaries'
import { addAppDays, parseAppDateTimeLocal, startOfAppDay } from '@/lib/timezone'
import type { DailySummary, FeedEntry, FeedType, MessSize, NappyEntry, NappyType, PumpEntry } from '@/lib/types'

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function parseDate(value: unknown) {
  const date = typeof value === 'string'
    ? parseAppDateTimeLocal(value) || new Date(value)
    : value instanceof Date
      ? value
      : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function createInviteCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  }
  return code
}

export async function createUniqueInviteCode() {
  let code = createInviteCode()
  while (await getInvite(code)) {
    code = createInviteCode()
  }
  return code
}

function sortFeeds(feeds: FeedEntry[]) {
  return feeds.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function sortNappies(nappies: NappyEntry[]) {
  return nappies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function sortPumps(pumps: PumpEntry[]) {
  return pumps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function cleanNotes(value: unknown) {
  if (typeof value !== 'string') return undefined
  const notes = value.trim()
  return notes ? notes.slice(0, 280) : undefined
}

function cleanMessSize(value: unknown): MessSize | undefined {
  return value === 'small' || value === 'medium' || value === 'large'
    ? value
    : undefined
}

export async function getFeeds(householdId: string, since?: Date | null) {
  const feeds = sortFeeds(await getHouseholdData(householdId, 'feeds'))
  return since ? feeds.filter(feed => new Date(feed.timestamp).getTime() >= since.getTime()) : feeds
}

export async function getNappies(householdId: string, since?: Date | null) {
  const nappies = sortNappies(await getHouseholdData(householdId, 'nappies'))
  return since ? nappies.filter(nappy => new Date(nappy.timestamp).getTime() >= since.getTime()) : nappies
}

export async function getPumps(householdId: string, since?: Date | null) {
  const pumps = sortPumps(await getHouseholdData(householdId, 'pumps'))
  return since ? pumps.filter(pump => new Date(pump.timestamp).getTime() >= since.getTime()) : pumps
}

export async function getTodaySummary(householdId: string): Promise<DailySummary> {
  const now = new Date()
  const start = startOfAppDay(now)
  const [feeds, nappies, pumps] = await Promise.all([
    getHouseholdData(householdId, 'feeds'),
    getHouseholdData(householdId, 'nappies'),
    getHouseholdData(householdId, 'pumps'),
  ])
  return calculateSummary(feeds, nappies, pumps, start, now, now)
}

export async function getDaySummary(householdId: string, date: Date): Promise<DailySummary> {
  const start = startOfAppDay(date)
  const end = new Date(addAppDays(start, 1).getTime() - 1)
  const [feeds, nappies, pumps] = await Promise.all([
    getHouseholdData(householdId, 'feeds'),
    getHouseholdData(householdId, 'nappies'),
    getHouseholdData(householdId, 'pumps'),
  ])
  return calculateSummary(feeds, nappies, pumps, start, end, start)
}

export async function getHoursSummary(householdId: string, hours: number): Promise<DailySummary> {
  const now = new Date()
  const start = new Date(now.getTime() - Math.max(hours, 1) * 60 * 60 * 1000)
  const [feeds, nappies, pumps] = await Promise.all([
    getHouseholdData(householdId, 'feeds'),
    getHouseholdData(householdId, 'nappies'),
    getHouseholdData(householdId, 'pumps'),
  ])
  return calculateSummary(feeds, nappies, pumps, start, now, now)
}

export async function getOverviewData(householdId: string, date?: Date) {
  const selectedStart = date ? startOfAppDay(date) : null
  const selectedEnd = selectedStart ? addAppDays(selectedStart, 1) : null
  const [feeds, nappies, pumps, summary] = await Promise.all([
    getFeeds(householdId),
    getNappies(householdId),
    getPumps(householdId),
    date ? getDaySummary(householdId, date) : getTodaySummary(householdId),
  ])
  const dayFeeds = selectedStart && selectedEnd
    ? feeds.filter(feed => {
      const timestamp = new Date(feed.timestamp)
      return timestamp >= selectedStart && timestamp < selectedEnd
    })
    : feeds
  const dayNappies = selectedStart && selectedEnd
    ? nappies.filter(nappy => {
      const timestamp = new Date(nappy.timestamp)
      return timestamp >= selectedStart && timestamp < selectedEnd
    })
    : nappies
  const dayPumps = selectedStart && selectedEnd
    ? pumps.filter(pump => {
      const timestamp = new Date(pump.timestamp)
      return timestamp >= selectedStart && timestamp < selectedEnd
    })
    : pumps

  return {
    lastFeed: feeds[0] || null,
    lastNappy: nappies[0] || null,
    lastPump: pumps[0] || null,
    dayLastFeed: dayFeeds[0] || null,
    dayLastNappy: dayNappies[0] || null,
    dayLastPump: dayPumps[0] || null,
    summary,
  }
}

export async function addFeed(
  householdId: string,
  input: { type?: FeedType; timestamp?: unknown; side?: FeedEntry['side']; durationSeconds?: unknown; volumeMl?: unknown; notes?: unknown }
) {
  const timestamp = parseDate(input.timestamp)

  if (input.type !== 'breast' && input.type !== 'formula') {
    throw new AppError('Feed type is required')
  }

  if (!timestamp) {
    throw new AppError('Valid timestamp is required')
  }

  const feed: FeedEntry = {
    id: generateId(),
    type: input.type,
    timestamp,
    side: input.side,
    durationSeconds: input.type === 'breast' && typeof input.volumeMl !== 'number' && typeof input.durationSeconds === 'number' ? input.durationSeconds : undefined,
    volumeMl: typeof input.volumeMl === 'number' ? input.volumeMl : undefined,
    notes: cleanNotes(input.notes),
  }

  const feeds = await getHouseholdData(householdId, 'feeds')
  await setHouseholdData(householdId, 'feeds', sortFeeds([feed, ...feeds]))
  return feed
}

export async function updateFeed(householdId: string, id: string, input: Partial<FeedEntry>) {
  const feeds = await getHouseholdData(householdId, 'feeds')
  const index = feeds.findIndex(feed => feed.id === id)

  if (index === -1) {
    throw new AppError('Feed not found', 404)
  }

  const updates: Partial<FeedEntry> = {}
  if (input.type === 'breast' || input.type === 'formula') updates.type = input.type
  if (typeof input.durationSeconds === 'number') updates.durationSeconds = input.durationSeconds
  if (typeof input.volumeMl === 'number') updates.volumeMl = input.volumeMl
  if ('notes' in input) updates.notes = cleanNotes(input.notes)
  if (input.timestamp) {
    const timestamp = parseDate(input.timestamp)
    if (!timestamp) throw new AppError('Valid timestamp is required')
    updates.timestamp = timestamp
  }

  const nextFeed: FeedEntry = { ...feeds[index], ...updates }
  if (nextFeed.type === 'breast') {
    if (typeof updates.volumeMl === 'number') {
      delete nextFeed.durationSeconds
      delete nextFeed.side
    } else if (typeof updates.durationSeconds === 'number') {
      delete nextFeed.volumeMl
    }
  } else {
    delete nextFeed.durationSeconds
    delete nextFeed.side
  }
  if ('notes' in updates && !updates.notes) {
    delete nextFeed.notes
  }

  feeds[index] = nextFeed
  await setHouseholdData(householdId, 'feeds', sortFeeds(feeds))
  return nextFeed
}

export async function deleteFeed(householdId: string, id: string) {
  const feeds = await getHouseholdData(householdId, 'feeds')
  await setHouseholdData(householdId, 'feeds', feeds.filter(feed => feed.id !== id))
}

export async function addNappy(
  householdId: string,
  input: { type?: NappyType; timestamp?: unknown; messSize?: unknown; notes?: unknown }
) {
  const timestamp = parseDate(input.timestamp)

  if (input.type !== 'wet' && input.type !== 'dirty' && input.type !== 'both') {
    throw new AppError('Nappy type is required')
  }

  if (!timestamp) {
    throw new AppError('Valid timestamp is required')
  }

  const nappy: NappyEntry = {
    id: generateId(),
    type: input.type,
    timestamp,
    messSize: cleanMessSize(input.messSize),
    notes: cleanNotes(input.notes),
  }

  const nappies = await getHouseholdData(householdId, 'nappies')
  await setHouseholdData(householdId, 'nappies', sortNappies([nappy, ...nappies]))
  return nappy
}

export async function updateNappy(householdId: string, id: string, input: Partial<NappyEntry>) {
  const nappies = await getHouseholdData(householdId, 'nappies')
  const index = nappies.findIndex(nappy => nappy.id === id)

  if (index === -1) {
    throw new AppError('Nappy not found', 404)
  }

  const updates: Partial<NappyEntry> = {}
  if (input.type === 'wet' || input.type === 'dirty' || input.type === 'both') updates.type = input.type
  if ('messSize' in input) updates.messSize = cleanMessSize(input.messSize)
  if ('notes' in input) updates.notes = cleanNotes(input.notes)
  if (input.timestamp) {
    const timestamp = parseDate(input.timestamp)
    if (!timestamp) throw new AppError('Valid timestamp is required')
    updates.timestamp = timestamp
  }

  const nextNappy = { ...nappies[index], ...updates }
  if ('messSize' in updates && !updates.messSize) {
    delete nextNappy.messSize
  }
  if ('notes' in updates && !updates.notes) {
    delete nextNappy.notes
  }
  nappies[index] = nextNappy
  await setHouseholdData(householdId, 'nappies', sortNappies(nappies))
  return nextNappy
}

export async function deleteNappy(householdId: string, id: string) {
  const nappies = await getHouseholdData(householdId, 'nappies')
  await setHouseholdData(householdId, 'nappies', nappies.filter(nappy => nappy.id !== id))
}

export async function addPump(
  householdId: string,
  input: { timestamp?: unknown; durationSeconds?: unknown; volumeMl?: unknown; notes?: unknown }
) {
  const timestamp = parseDate(input.timestamp)

  if (!timestamp) {
    throw new AppError('Valid timestamp is required')
  }
  if (typeof input.durationSeconds !== 'number' || input.durationSeconds <= 0) {
    throw new AppError('Pump duration is required')
  }

  const pump: PumpEntry = {
    id: generateId(),
    timestamp,
    durationSeconds: Math.round(input.durationSeconds),
    notes: cleanNotes(input.notes),
  }
  if (typeof input.volumeMl === 'number' && input.volumeMl > 0) {
    pump.volumeMl = Math.round(input.volumeMl)
  }

  const pumps = await getHouseholdData(householdId, 'pumps')
  await setHouseholdData(householdId, 'pumps', sortPumps([pump, ...pumps]))
  return pump
}

export async function updatePump(householdId: string, id: string, input: Partial<PumpEntry>) {
  const pumps = await getHouseholdData(householdId, 'pumps')
  const index = pumps.findIndex(pump => pump.id === id)

  if (index === -1) {
    throw new AppError('Pump session not found', 404)
  }

  const updates: Partial<PumpEntry> = {}
  if (typeof input.durationSeconds === 'number' && input.durationSeconds > 0) {
    updates.durationSeconds = Math.round(input.durationSeconds)
  }
  if ('volumeMl' in input) {
    if (typeof input.volumeMl === 'number' && input.volumeMl > 0) {
      updates.volumeMl = Math.round(input.volumeMl)
    } else {
      updates.volumeMl = undefined
    }
  }
  if ('notes' in input) updates.notes = cleanNotes(input.notes)
  if (input.timestamp) {
    const timestamp = parseDate(input.timestamp)
    if (!timestamp) throw new AppError('Valid timestamp is required')
    updates.timestamp = timestamp
  }

  const nextPump: PumpEntry = { ...pumps[index], ...updates }
  if ('volumeMl' in updates && updates.volumeMl === undefined) {
    delete nextPump.volumeMl
  }
  if ('notes' in updates && !updates.notes) {
    delete nextPump.notes
  }
  pumps[index] = nextPump
  await setHouseholdData(householdId, 'pumps', sortPumps(pumps))
  return nextPump
}

export async function deletePump(householdId: string, id: string) {
  const pumps = await getHouseholdData(householdId, 'pumps')
  await setHouseholdData(householdId, 'pumps', pumps.filter(pump => pump.id !== id))
}


export async function signupUser(usernameInput: string, password: string, inviteCodeInput?: string) {
  const username = normalizeUsername(usernameInput)

  if (username.length < 3) throw new AppError('Username must be at least 3 characters')
  if (password.length < 6) throw new AppError('Password must be at least 6 characters')
  if (await getUser(username)) throw new AppError('Username already taken', 409)

  const requestedInviteCode = normalizeInviteCode(inviteCodeInput || '')
  if (requestedInviteCode && requestedInviteCode.length !== 8) {
    throw new AppError('Invite code must be 8 characters')
  }

  const invite = requestedInviteCode ? await getInvite(requestedInviteCode) : null
  if (requestedInviteCode && !invite) throw new AppError('Invalid invite code', 404)

  const householdId = invite?.householdId || randomUUID()
  const inviteCode = requestedInviteCode || await createUniqueInviteCode()
  const hash = await bcrypt.hash(password, 12)

  if (invite) {
    const meta = await getHouseholdMeta(householdId)
    await setUser(username, {
      id: householdId,
      hash,
      inviteCode: meta?.inviteCode || inviteCode,
    })
  } else {
    await Promise.all([
      setUser(username, { id: householdId, hash, inviteCode }),
      setInvite(inviteCode, { householdId }),
      initializeHousehold(householdId, inviteCode),
    ])
  }

  return { householdId, inviteCode, username }
}

export async function createUserForHousehold(householdId: string, usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput)

  if (username.length < 3) throw new AppError('Username must be at least 3 characters')
  if (password.length < 6) throw new AppError('Password must be at least 6 characters')
  if (await getUser(username)) throw new AppError('Username already taken', 409)

  const meta = await getHouseholdMeta(householdId)
  const inviteCode = meta?.inviteCode || await createUniqueInviteCode()

  if (!meta?.inviteCode) {
    await Promise.all([
      setInvite(inviteCode, { householdId }),
      setHouseholdMeta(householdId, { ...meta, inviteCode }),
    ])
  }

  const hash = await bcrypt.hash(password, 12)
  await setUser(username, { id: householdId, hash, inviteCode })
  return { householdId, inviteCode, username }
}

export async function joinHouseholdWithInvite(inviteCodeInput: string) {
  const inviteCode = normalizeInviteCode(inviteCodeInput)

  if (inviteCode.length !== 8) {
    throw new AppError('Invite code must be 8 characters')
  }

  const invite = await getInvite(inviteCode)
  if (!invite) throw new AppError('Invalid invite code', 404)

  const meta = await getHouseholdMeta(invite.householdId)
  return {
    householdId: invite.householdId,
    inviteCode: meta?.inviteCode || inviteCode,
  }
}

export async function loginUser(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput)
  if (!username || !password) throw new AppError('Username and password are required')

  const user = await getUser(username)
  if (!user) throw new AppError('User not found', 404)

  const matches = await bcrypt.compare(password, user.hash)
  if (!matches) throw new AppError('Incorrect password', 401)

  return { householdId: user.id, inviteCode: user.inviteCode, username }
}

export async function changePassword(
  householdId: string,
  usernameInput: string,
  currentPassword: string,
  newPassword: string
) {
  const username = normalizeUsername(usernameInput)
  if (!username || !currentPassword || !newPassword) {
    throw new AppError('All password fields are required')
  }
  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters')
  }

  const user = await getUser(username)
  if (!user || user.id !== householdId) {
    throw new AppError('Account not found in this household', 404)
  }

  const matches = await bcrypt.compare(currentPassword, user.hash)
  if (!matches) {
    throw new AppError('Current password is incorrect', 401)
  }

  const hash = await bcrypt.hash(newPassword, 12)
  await setUser(username, { ...user, hash })
}

export async function generateInviteCode(householdId: string) {
  const meta = await getHouseholdMeta(householdId)
  const inviteCode = await createUniqueInviteCode()

  await Promise.all([
    meta?.inviteCode ? deleteInvite(meta.inviteCode) : Promise.resolve(),
    setInvite(inviteCode, { householdId }),
    setHouseholdMeta(householdId, { ...meta, inviteCode }),
  ])

  return inviteCode
}
