import type {
  Appointment,
  DailySummary,
  FeedEntry,
  IStorage,
  NappyEntry,
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

function hydrateAppointment(appointment: Appointment): Appointment {
  return {
    ...appointment,
    dateTime: toDate(appointment.dateTime),
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

  async deleteNappy(id: string): Promise<void> {
    await fetchJson(`/api/nappies/${encodeURIComponent(id)}`, { method: 'DELETE' })
    this.notify()
  }

  async addAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const saved = await fetchJson<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    })
    this.notify()
    return hydrateAppointment(saved)
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const saved = await fetchJson<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    this.notify()
    return hydrateAppointment(saved)
  }

  async deleteAppointment(id: string): Promise<void> {
    await fetchJson(`/api/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' })
    this.notify()
  }

  async getAppointments(): Promise<Appointment[]> {
    const appointments = await fetchJson<Appointment[]>('/api/appointments')
    return appointments.map(hydrateAppointment)
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
