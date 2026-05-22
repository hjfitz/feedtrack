import { useEffect, useState, useCallback } from 'react'
import { getStorage } from '@/lib/storage'
import type { FeedEntry, NappyEntry, Appointment, DailySummary } from '@/lib/types'

export function useStorage() {
  const [, setTick] = useState(0)
  const storage = getStorage()

  useEffect(() => {
    return storage.subscribe(() => setTick(t => t + 1))
  }, [storage])

  return storage
}

export function useFeeds(since?: Date) {
  const storage = useStorage()
  const [feeds, setFeeds] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await storage.getFeeds(since)
    setFeeds(data)
    setLoading(false)
  }, [storage, since])

  useEffect(() => {
    refresh()
    return storage.subscribe(refresh)
  }, [storage, refresh])

  return { feeds, loading, refresh }
}

export function useLastBreastFeed() {
  const storage = useStorage()
  const [lastFeed, setLastFeed] = useState<FeedEntry | null>(null)

  const refresh = useCallback(async () => {
    const data = await storage.getLastFeed()
    setLastFeed(data)
  }, [storage])

  useEffect(() => {
    refresh()
    return storage.subscribe(refresh)
  }, [storage, refresh])

  return lastFeed
}

export function useNappies(since?: Date) {
  const storage = useStorage()
  const [nappies, setNappies] = useState<NappyEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await storage.getNappies(since)
    setNappies(data)
    setLoading(false)
  }, [storage, since])

  useEffect(() => {
    refresh()
    return storage.subscribe(refresh)
  }, [storage, refresh])

  return { nappies, loading, refresh }
}

export function useAppointments() {
  const storage = useStorage()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await storage.getAppointments()
    setAppointments(data)
    setLoading(false)
  }, [storage])

  useEffect(() => {
    refresh()
    return storage.subscribe(refresh)
  }, [storage, refresh])

  return { appointments, loading, refresh }
}

export function useSummary(mode: 'today' | 'hours', hours = 24) {
  const storage = useStorage()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = mode === 'today' 
      ? await storage.getDailySummary(new Date())
      : await storage.getHoursSummary(hours)
    setSummary(data)
    setLoading(false)
  }, [storage, mode, hours])

  useEffect(() => {
    refresh()
    return storage.subscribe(refresh)
  }, [storage, refresh])

  return { summary, loading, refresh }
}
