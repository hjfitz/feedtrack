// Core data types for newborn tracking

export type FeedType = 'breast' | 'formula'
export type BreastSide = 'left' | 'right'
export type NappyType = 'wet' | 'dirty' | 'both'

export interface FeedEntry {
  id: string
  type: FeedType
  timestamp: Date
  // Nursing-specific
  side?: BreastSide
  durationSeconds?: number
  // Bottle volume. For breast feeds this means expressed milk.
  volumeMl?: number
}

export interface NappyEntry {
  id: string
  type: NappyType
  timestamp: Date
  notes?: string
}

export interface DailySummary {
  date: Date
  feedCount: number
  breastFeedCount: number
  formulaFeedCount: number
  totalFormulaMl: number
  totalBreastMinutes: number
  totalBreastMilkMl: number
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
  updateFeed(id: string, updates: Partial<FeedEntry>): Promise<FeedEntry>
  deleteFeed(id: string): Promise<void>
  
  // Nappies
  addNappy(nappy: Omit<NappyEntry, 'id'>): Promise<NappyEntry>
  getNappies(since?: Date): Promise<NappyEntry[]>
  updateNappy(id: string, updates: Partial<NappyEntry>): Promise<NappyEntry>
  deleteNappy(id: string): Promise<void>
  
  // Summary
  getDailySummary(date: Date): Promise<DailySummary>
  getHoursSummary(hours: number): Promise<DailySummary>
  
  // Export
  exportData(format: 'csv' | 'pdf', startDate?: Date, endDate?: Date): Promise<string>
  
  // Sync
  subscribe(callback: () => void): () => void
}
