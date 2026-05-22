// Core data types for newborn tracking

export type FeedType = 'breast' | 'formula'
export type BreastSide = 'left' | 'right'
export type NappyType = 'wet' | 'dirty' | 'both'

export interface FeedEntry {
  id: string
  type: FeedType
  timestamp: Date
  // Breast feed specific
  side?: BreastSide
  durationSeconds?: number
  // Formula specific
  volumeMl?: number
}

export interface NappyEntry {
  id: string
  type: NappyType
  timestamp: Date
  notes?: string
}

export interface Appointment {
  id: string
  title: string
  dateTime: Date
  notes?: string
  isPast: boolean
}

export interface DailySummary {
  date: Date
  feedCount: number
  breastFeedCount: number
  formulaFeedCount: number
  totalFormulaMl: number
  totalBreastMinutes: number
  nappyCount: number
  wetCount: number
  dirtyCount: number
}

// Storage interface - can be implemented with any backend
export interface IStorage {
  // Feeds
  addFeed(feed: Omit<FeedEntry, 'id'>): Promise<FeedEntry>
  getFeeds(since?: Date): Promise<FeedEntry[]>
  getLastFeed(): Promise<FeedEntry | null>
  deleteFeed(id: string): Promise<void>
  
  // Nappies
  addNappy(nappy: Omit<NappyEntry, 'id'>): Promise<NappyEntry>
  getNappies(since?: Date): Promise<NappyEntry[]>
  deleteNappy(id: string): Promise<void>
  
  // Appointments
  addAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment>
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment>
  deleteAppointment(id: string): Promise<void>
  getAppointments(): Promise<Appointment[]>
  
  // Summary
  getDailySummary(date: Date): Promise<DailySummary>
  getHoursSummary(hours: number): Promise<DailySummary>
  
  // Export
  exportData(format: 'csv' | 'pdf', startDate?: Date, endDate?: Date): Promise<string>
  
  // Sync
  subscribe(callback: () => void): () => void
}
