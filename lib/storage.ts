import type {
  IStorage,
  FeedEntry,
  NappyEntry,
  Appointment,
  DailySummary,
} from './types'

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * Storage adapter interface keys - used for localStorage, can map to database tables
 * 
 * To replace with server-side storage:
 * 1. Implement IStorage interface
 * 2. Replace the adapter methods below with API calls
 * 3. Call setStorage(yourServerStorage) before app renders
 * 
 * Data shape is flat and serializable - ready for any backend:
 * - feeds: Array of FeedEntry (id, type, timestamp, durationSeconds?, volumeMl?, side?)
 * - nappies: Array of NappyEntry (id, type, timestamp, notes?)
 * - appointments: Array of Appointment (id, title, dateTime, notes?, isPast?)
 */
const STORAGE_KEYS = {
  feeds: 'babytracker_feeds',
  nappies: 'babytracker_nappies',
  appointments: 'babytracker_appointments',
} as const

// ============================================================================
// LOCAL STORAGE ADAPTER
// Replace these functions to swap storage backend
// ============================================================================

const localStorageAdapter = {
  read<T>(key: string): T[] {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  write<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Storage write failed:', e)
    }
  },
}

// ============================================================================
// STORAGE IMPLEMENTATION
// ============================================================================

class LocalStorage implements IStorage {
  private feeds: FeedEntry[] = []
  private nappies: NappyEntry[] = []
  private appointments: Appointment[] = []
  private listeners: Set<() => void> = new Set()
  private initialized = false

  private init() {
    if (this.initialized || typeof window === 'undefined') return
    
    // Hydrate from localStorage
    this.feeds = localStorageAdapter.read<FeedEntry>(STORAGE_KEYS.feeds)
      .map(f => ({ ...f, timestamp: new Date(f.timestamp) }))
    
    this.nappies = localStorageAdapter.read<NappyEntry>(STORAGE_KEYS.nappies)
      .map(n => ({ ...n, timestamp: new Date(n.timestamp) }))
    
    this.appointments = localStorageAdapter.read<Appointment>(STORAGE_KEYS.appointments)
      .map(a => ({ ...a, dateTime: new Date(a.dateTime) }))
    
    this.initialized = true
  }

  private persist() {
    localStorageAdapter.write(STORAGE_KEYS.feeds, this.feeds)
    localStorageAdapter.write(STORAGE_KEYS.nappies, this.nappies)
    localStorageAdapter.write(STORAGE_KEYS.appointments, this.appointments)
    this.listeners.forEach(cb => cb())
  }

  // ---- FEEDS ----

  async addFeed(feed: Omit<FeedEntry, 'id'>): Promise<FeedEntry> {
    this.init()
    const newFeed: FeedEntry = { ...feed, id: generateId() }
    this.feeds.unshift(newFeed)
    this.persist()
    return newFeed
  }

  async getFeeds(since?: Date): Promise<FeedEntry[]> {
    this.init()
    if (!since) return [...this.feeds]
    return this.feeds.filter(f => f.timestamp >= since)
  }

  async getLastFeed(): Promise<FeedEntry | null> {
    this.init()
    return this.feeds[0] || null
  }

  async deleteFeed(id: string): Promise<void> {
    this.init()
    this.feeds = this.feeds.filter(f => f.id !== id)
    this.persist()
  }

  // ---- NAPPIES ----

  async addNappy(nappy: Omit<NappyEntry, 'id'>): Promise<NappyEntry> {
    this.init()
    const newNappy: NappyEntry = { ...nappy, id: generateId() }
    this.nappies.unshift(newNappy)
    this.persist()
    return newNappy
  }

  async getNappies(since?: Date): Promise<NappyEntry[]> {
    this.init()
    if (!since) return [...this.nappies]
    return this.nappies.filter(n => n.timestamp >= since)
  }

  async deleteNappy(id: string): Promise<void> {
    this.init()
    this.nappies = this.nappies.filter(n => n.id !== id)
    this.persist()
  }

  // ---- APPOINTMENTS ----

  async addAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    this.init()
    const newAppointment: Appointment = { ...appointment, id: generateId() }
    this.appointments.push(newAppointment)
    this.appointments.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    this.persist()
    return newAppointment
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    this.init()
    const index = this.appointments.findIndex(a => a.id === id)
    if (index === -1) throw new Error('Appointment not found')
    this.appointments[index] = { ...this.appointments[index], ...updates }
    this.persist()
    return this.appointments[index]
  }

  async deleteAppointment(id: string): Promise<void> {
    this.init()
    this.appointments = this.appointments.filter(a => a.id !== id)
    this.persist()
  }

  async getAppointments(): Promise<Appointment[]> {
    this.init()
    return [...this.appointments]
  }

  // ---- SUMMARIES ----

  async getDailySummary(date: Date): Promise<DailySummary> {
    this.init()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return this.calculateSummary(startOfDay, endOfDay, date)
  }

  async getHoursSummary(hours: number): Promise<DailySummary> {
    this.init()
    const now = new Date()
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000)
    return this.calculateSummary(since, now, now)
  }

  private calculateSummary(start: Date, end: Date, date: Date): DailySummary {
    const feedsInRange = this.feeds.filter(
      f => f.timestamp >= start && f.timestamp <= end
    )
    const nappiesInRange = this.nappies.filter(
      n => n.timestamp >= start && n.timestamp <= end
    )

    const breastFeeds = feedsInRange.filter(f => f.type === 'breast')
    const formulaFeeds = feedsInRange.filter(f => f.type === 'formula')

    return {
      date,
      feedCount: feedsInRange.length,
      breastFeedCount: breastFeeds.length,
      formulaFeedCount: formulaFeeds.length,
      totalFormulaMl: formulaFeeds.reduce((sum, f) => sum + (f.volumeMl || 0), 0),
      totalBreastMinutes: Math.round(
        breastFeeds.reduce((sum, f) => sum + (f.durationSeconds || 0), 0) / 60
      ),
      nappyCount: nappiesInRange.length,
      wetCount: nappiesInRange.filter(n => n.type === 'wet' || n.type === 'both').length,
      dirtyCount: nappiesInRange.filter(n => n.type === 'dirty' || n.type === 'both').length,
    }
  }

  // ---- EXPORT ----

  async exportData(format: 'csv' | 'pdf', startDate?: Date, endDate?: Date): Promise<string> {
    this.init()
    const start = startDate || new Date(0)
    const end = endDate || new Date()

    const feeds = this.feeds.filter(f => f.timestamp >= start && f.timestamp <= end)
    const nappies = this.nappies.filter(n => n.timestamp >= start && n.timestamp <= end)

    if (format === 'csv') {
      let csv = 'Type,Date,Time,Details\n'
      
      const allEntries = [
        ...feeds.map(f => ({
          type: 'Feed' as const,
          timestamp: f.timestamp,
          details: f.type === 'breast' 
            ? `Breast, ${Math.round((f.durationSeconds || 0) / 60)} min`
            : `Formula, ${f.volumeMl} ml`
        })),
        ...nappies.map(n => ({
          type: 'Nappy' as const,
          timestamp: n.timestamp,
          details: `${n.type}${n.notes ? ' - ' + n.notes : ''}`
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      allEntries.forEach(e => {
        const date = e.timestamp.toLocaleDateString()
        const time = e.timestamp.toLocaleTimeString()
        csv += `${e.type},${date},${time},"${e.details}"\n`
      })

      return csv
    }

    return `Baby Tracker Export\n${start.toLocaleDateString()} - ${end.toLocaleDateString()}\n\nFeeds: ${feeds.length}\nNappy changes: ${nappies.length}`
  }

  // ---- SUBSCRIPTIONS ----

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
}

// ============================================================================
// SINGLETON & REPLACEMENT
// ============================================================================

let storageInstance: IStorage | null = null

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = new LocalStorage()
  }
  return storageInstance
}

/**
 * Replace storage implementation at runtime
 * Call before app renders to use server-side storage
 * 
 * Example:
 *   import { setStorage } from '@/lib/storage'
 *   import { SupabaseStorage } from '@/lib/supabase-storage'
 *   setStorage(new SupabaseStorage(supabaseClient))
 */
export function setStorage(storage: IStorage) {
  storageInstance = storage
}
