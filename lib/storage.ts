import type {
  DailySummary,
  FeedEntry,
  IStorage,
  NappyEntry,
  PumpEntry,
} from './types'

type Listener = () => void

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function hydrateFeed(feed: FeedEntry): FeedEntry {
  return {
    ...feed,
    timestamp: toDate(feed.timestamp),
  }
}

function hydrateNappy(nappy: NappyEntry): NappyEntry {
  return {
    ...nappy,
    timestamp: toDate(nappy.timestamp),
  }
}

function hydratePump(pump: PumpEntry): PumpEntry {
  return {
    ...pump,
    timestamp: toDate(pump.timestamp),
  }
}


function hydrateSummary(summary: DailySummary): DailySummary {
  return {
    ...summary,
    date: toDate(summary.date),
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

class ApiStorage implements IStorage {
  private listeners: Set<Listener> = new Set()

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  async addFeed(feed: Omit<FeedEntry, 'id'>): Promise<FeedEntry> {
    const saved = await fetchJson<FeedEntry>('/api/feeds', {
      method: 'POST',
      body: JSON.stringify(feed),
    })
    this.notify()
    return hydrateFeed(saved)
  }

  async getFeeds(since?: Date): Promise<FeedEntry[]> {
    const params = since ? `?since=${encodeURIComponent(since.toISOString())}` : ''
    const feeds = await fetchJson<FeedEntry[]>(`/api/feeds${params}`)
    return feeds.map(hydrateFeed)
  }

  async getLastFeed(): Promise<FeedEntry | null> {
    const feeds = await this.getFeeds()
    return feeds[0] || null
  }

  async updateFeed(id: string, updates: Partial<FeedEntry>): Promise<FeedEntry> {
    const saved = await fetchJson<FeedEntry>(`/api/feeds/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    this.notify()
    return hydrateFeed(saved)
  }

  async deleteFeed(id: string): Promise<void> {
    await fetchJson(`/api/feeds/${encodeURIComponent(id)}`, { method: 'DELETE' })
    this.notify()
  }

  async addNappy(nappy: Omit<NappyEntry, 'id'>): Promise<NappyEntry> {
    const saved = await fetchJson<NappyEntry>('/api/nappies', {
      method: 'POST',
      body: JSON.stringify(nappy),
    })
    this.notify()
    return hydrateNappy(saved)
  }

  async getNappies(since?: Date): Promise<NappyEntry[]> {
    const params = since ? `?since=${encodeURIComponent(since.toISOString())}` : ''
    const nappies = await fetchJson<NappyEntry[]>(`/api/nappies${params}`)
    return nappies.map(hydrateNappy)
  }

  async updateNappy(id: string, updates: Partial<NappyEntry>): Promise<NappyEntry> {
    const saved = await fetchJson<NappyEntry>(`/api/nappies/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    this.notify()
    return hydrateNappy(saved)
  }

  async deleteNappy(id: string): Promise<void> {
    await fetchJson(`/api/nappies/${encodeURIComponent(id)}`, { method: 'DELETE' })
    this.notify()
  }

  async addPump(pump: Omit<PumpEntry, 'id'>): Promise<PumpEntry> {
    const saved = await fetchJson<PumpEntry>('/api/pumps', {
      method: 'POST',
      body: JSON.stringify(pump),
    })
    this.notify()
    return hydratePump(saved)
  }

  async getPumps(since?: Date): Promise<PumpEntry[]> {
    const params = since ? `?since=${encodeURIComponent(since.toISOString())}` : ''
    const pumps = await fetchJson<PumpEntry[]>(`/api/pumps${params}`)
    return pumps.map(hydratePump)
  }

  async updatePump(id: string, updates: Partial<PumpEntry>): Promise<PumpEntry> {
    const saved = await fetchJson<PumpEntry>(`/api/pumps/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    this.notify()
    return hydratePump(saved)
  }

  async deletePump(id: string): Promise<void> {
    await fetchJson(`/api/pumps/${encodeURIComponent(id)}`, { method: 'DELETE' })
    this.notify()
  }

  async getDailySummary(): Promise<DailySummary> {
    const summary = await fetchJson<DailySummary>('/api/summary?mode=today')
    return hydrateSummary(summary)
  }

  async getHoursSummary(hours: number): Promise<DailySummary> {
    const summary = await fetchJson<DailySummary>(`/api/summary?mode=hours&hours=${hours}`)
    return hydrateSummary(summary)
  }

  async exportData(format: 'csv' | 'pdf', startDate?: Date, endDate?: Date): Promise<string> {
    if (format !== 'csv') {
      return 'PDF export is not available yet.'
    }

    const params = new URLSearchParams()
    if (startDate) params.set('start', startDate.toISOString())
    if (endDate) params.set('end', endDate.toISOString())

    const response = await fetch(`/api/export?${params.toString()}`)
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error || `Request failed with status ${response.status}`)
    }

    return response.text()
  }

  subscribe(callback: Listener): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
}

let storageInstance: IStorage | null = null

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = new ApiStorage()
  }
  return storageInstance
}

export function setStorage(storage: IStorage) {
  storageInstance = storage
}
