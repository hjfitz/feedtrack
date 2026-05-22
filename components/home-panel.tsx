'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStorage, useFeeds, useNappies, useSummary } from '@/hooks/use-storage'

function formatTimeSince(date: Date | null): string {
  if (!date) return '--'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  
  if (hours === 0) return `${mins}m ago`
  return `${hours}h ${mins}m ago`
}

function formatDurationMins(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  return `${mins}m`
}

// Preset durations for breast feeding (minutes)
const BREAST_PRESETS = [5, 10, 15, 20, 25, 30]
// Preset volumes for formula (ml)
const FORMULA_PRESETS = [30, 60, 90, 120, 150, 180]

type QuickLogMode = 'home' | 'breast' | 'formula'
type ConfirmationType = 'breast' | 'formula' | 'wet' | 'dirty' | 'both' | null

export function HomePanel() {
  const storage = useStorage()
  const { feeds } = useFeeds()
  const { nappies } = useNappies()
  const { summary } = useSummary('today')
  
  const [mode, setMode] = useState<QuickLogMode>('home')
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null)
  const [confirmationDetail, setConfirmationDetail] = useState<string>('')
  const [customBreastMinutes, setCustomBreastMinutes] = useState('')
  const [customFormulaMl, setCustomFormulaMl] = useState('')
  const [, setTick] = useState(0)

  // Update "time since" every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-dismiss confirmation after 1.5s
  useEffect(() => {
    if (confirmation) {
      const timeout = setTimeout(() => {
        setConfirmation(null)
        setConfirmationDetail('')
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [confirmation])

  const lastFeed = feeds[0] || null
  const lastNappy = nappies[0] || null

  const handleBreastLog = useCallback(async (minutes: number) => {
    await storage.addFeed({
      type: 'breast',
      timestamp: new Date(),
      durationSeconds: minutes * 60,
    })
    setConfirmation('breast')
    setConfirmationDetail(`${minutes}m`)
    setCustomBreastMinutes('')
    setMode('home')
  }, [storage])

  const handleFormulaLog = useCallback(async (volumeMl: number) => {
    await storage.addFeed({
      type: 'formula',
      timestamp: new Date(),
      volumeMl,
    })
    setConfirmation('formula')
    setConfirmationDetail(`${volumeMl}ml`)
    setCustomFormulaMl('')
    setMode('home')
  }, [storage])

  const handleNappyLog = useCallback(async (type: 'wet' | 'dirty' | 'both') => {
    await storage.addNappy({
      type,
      timestamp: new Date(),
    })
    setConfirmation(type)
  }, [storage])

  const handleCustomBreastLog = useCallback(async () => {
    const minutes = Number(customBreastMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) return

    await handleBreastLog(Math.round(minutes))
  }, [customBreastMinutes, handleBreastLog])

  const handleCustomFormulaLog = useCallback(async () => {
    const volumeMl = Number(customFormulaMl)
    if (!Number.isFinite(volumeMl) || volumeMl <= 0) return

    await handleFormulaLog(Math.round(volumeMl))
  }, [customFormulaMl, handleFormulaLog])

  const customBreastValue = Number(customBreastMinutes)
  const customFormulaValue = Number(customFormulaMl)
  const canLogCustomBreast = Number.isFinite(customBreastValue) && customBreastValue > 0
  const canLogCustomFormula = Number.isFinite(customFormulaValue) && customFormulaValue > 0

  // Confirmation toast overlay
  const ConfirmationToast = () => {
    if (!confirmation) return null
    
    const configs = {
      breast: { label: 'Breast feed logged', color: 'bg-sky-500', icon: '✓' },
      formula: { label: 'Formula logged', color: 'bg-amber-500', icon: '✓' },
      wet: { label: 'Wet nappy logged', color: 'bg-blue-500', icon: '✓' },
      dirty: { label: 'Dirty nappy logged', color: 'bg-orange-500', icon: '✓' },
      both: { label: 'Nappy logged', color: 'bg-violet-500', icon: '✓' },
    }
    const config = configs[confirmation]
    
    return (
      <div className="fixed inset-x-4 top-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className={`${config.color} rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg`}>
          <span className="text-white text-xl">{config.icon}</span>
          <span className="text-white font-semibold text-lg flex-1">{config.label}</span>
          {confirmationDetail && (
            <span className="text-white/80 font-medium">{confirmationDetail}</span>
          )}
        </div>
      </div>
    )
  }

  // Breast preset selection screen
  if (mode === 'breast') {
    return (
      <div className="flex flex-col gap-6 px-1">
        <ConfirmationToast />
        
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">Breast feed</p>
          <p className="text-muted-foreground text-sm mt-1">Select duration</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {BREAST_PRESETS.map(mins => (
            <button
              key={mins}
              onClick={() => handleBreastLog(mins)}
              className="py-7 rounded-2xl bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 text-2xl font-bold 
                         transition-all duration-150
                         hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.02]
                         active:bg-sky-500/35 active:scale-[0.98]"
            >
              {mins}m
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleCustomBreastLog()
          }}
          className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4"
        >
          <label htmlFor="custom-breast-minutes" className="text-sm text-muted-foreground">
            Custom time
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                id="custom-breast-minutes"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={customBreastMinutes}
                onChange={(event) => setCustomBreastMinutes(event.target.value)}
                className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-14 text-xl text-foreground
                           placeholder:text-muted-foreground/50
                           focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50"
                placeholder="12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                min
              </span>
            </div>
            <button
              type="submit"
              disabled={!canLogCustomBreast}
              className="h-14 px-5 rounded-xl bg-sky-500 text-white font-semibold
                         hover:bg-sky-400 active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Log
            </button>
          </div>
        </form>

        <button
          onClick={() => setMode('home')}
          className="text-muted-foreground py-4 text-base font-medium
                     hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Formula preset selection screen
  if (mode === 'formula') {
    return (
      <div className="flex flex-col gap-6 px-1">
        <ConfirmationToast />
        
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">Formula</p>
          <p className="text-muted-foreground text-sm mt-1">Select amount</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {FORMULA_PRESETS.map(ml => (
            <button
              key={ml}
              onClick={() => handleFormulaLog(ml)}
              className="py-7 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 text-2xl font-bold 
                         transition-all duration-150
                         hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.02]
                         active:bg-amber-500/35 active:scale-[0.98]"
            >
              {ml}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleCustomFormulaLog()
          }}
          className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4"
        >
          <label htmlFor="custom-formula-ml" className="text-sm text-muted-foreground">
            Custom amount
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                id="custom-formula-ml"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={customFormulaMl}
                onChange={(event) => setCustomFormulaMl(event.target.value)}
                className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-12 text-xl text-foreground
                           placeholder:text-muted-foreground/50
                           focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                placeholder="75"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ml
              </span>
            </div>
            <button
              type="submit"
              disabled={!canLogCustomFormula}
              className="h-14 px-5 rounded-xl bg-amber-500 text-white font-semibold
                         hover:bg-amber-400 active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Log
            </button>
          </div>
        </form>

        <button
          onClick={() => setMode('home')}
          className="text-muted-foreground py-4 text-base font-medium
                     hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Main home screen
  return (
    <div className="flex flex-col gap-6">
      <ConfirmationToast />
      
      {/* Time since cards - large and prominent */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since feed</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {formatTimeSince(lastFeed?.timestamp ?? null)}
          </p>
          {lastFeed && (
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {lastFeed.type === 'breast' 
                ? `Breast ${lastFeed.durationSeconds ? formatDurationMins(lastFeed.durationSeconds) : ''}`
                : `Formula ${lastFeed.volumeMl}ml`
              }
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since nappy</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {formatTimeSince(lastNappy?.timestamp ?? null)}
          </p>
          {lastNappy && (
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {lastNappy.type === 'both' ? 'Wet + Dirty' : lastNappy.type}
            </p>
          )}
        </div>
      </div>

      {/* Today's summary - compact */}
      <div className="rounded-2xl bg-muted/30 p-4 border border-muted/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Today</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{summary?.breastFeedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Breast</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary?.formulaFeedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Formula</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{summary?.nappyCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Nappies</p>
          </div>
        </div>
      </div>

      {/* Quick log section - at the bottom for thumb reach */}
      <div className="flex flex-col gap-4">
        {/* Feed sub-header */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Log feed</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('breast')}
              className="flex items-center justify-center gap-2 py-6 rounded-2xl 
                         bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 
                         transition-all duration-150
                         hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.01]
                         active:bg-sky-500/35 active:scale-[0.98]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold">Breast</span>
            </button>
            <button
              onClick={() => setMode('formula')}
              className="flex items-center justify-center gap-2 py-6 rounded-2xl 
                         bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 
                         transition-all duration-150
                         hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.01]
                         active:bg-amber-500/35 active:scale-[0.98]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <span className="text-xl font-bold">Formula</span>
            </button>
          </div>
        </div>

        {/* Nappy sub-header */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Log nappy</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleNappyLog('wet')}
              className="flex flex-col items-center justify-center gap-1 py-5 rounded-2xl 
                         bg-blue-500/15 border-2 border-blue-500/30 text-blue-400 
                         transition-all duration-150
                         hover:bg-blue-500/25 hover:border-blue-500/50 hover:scale-[1.02]
                         active:bg-blue-500/35 active:scale-[0.96]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
              </svg>
              <span className="text-lg font-bold">Wet</span>
            </button>
            <button
              onClick={() => handleNappyLog('dirty')}
              className="flex flex-col items-center justify-center gap-1 py-5 rounded-2xl 
                         bg-orange-500/15 border-2 border-orange-500/30 text-orange-400 
                         transition-all duration-150
                         hover:bg-orange-500/25 hover:border-orange-500/50 hover:scale-[1.02]
                         active:bg-orange-500/35 active:scale-[0.96]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span className="text-lg font-bold">Dirty</span>
            </button>
            <button
              onClick={() => handleNappyLog('both')}
              className="flex flex-col items-center justify-center gap-1 py-5 rounded-2xl 
                         bg-violet-500/15 border-2 border-violet-500/30 text-violet-400 
                         transition-all duration-150
                         hover:bg-violet-500/25 hover:border-violet-500/50 hover:scale-[1.02]
                         active:bg-violet-500/35 active:scale-[0.96]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-bold">Both</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
