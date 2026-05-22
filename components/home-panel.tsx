'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { addFeedAction, addNappyAction } from '@/app/actions/tracker'
import type { DailySummary, FeedEntry, NappyEntry } from '@/lib/types'

function formatTimeSince(date: Date | null, now: Date): string {
  if (!date) return '--'
  const diffMins = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return hours === 0 ? `${mins}m ago` : `${hours}h ${mins}m ago`
}

function formatDurationMins(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`
}

function formatSummaryMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

const BREAST_PRESETS = [5, 10, 15, 20, 25, 30]
const FORMULA_PRESETS = [30, 60, 90, 120, 150, 180]

type QuickLogMode = 'home' | 'breast' | 'formula'
type ConfirmationType = 'breast' | 'formula' | 'wet' | 'dirty' | 'both' | null

export function HomePanel({
  lastFeed,
  lastNappy,
  summary,
}: {
  lastFeed: FeedEntry | null
  lastNappy: NappyEntry | null
  summary: DailySummary
}) {
  const [mode, setMode] = useState<QuickLogMode>('home')
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null)
  const [confirmationDetail, setConfirmationDetail] = useState('')
  const [customBreastMinutes, setCustomBreastMinutes] = useState('')
  const [customFormulaMl, setCustomFormulaMl] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!confirmation) return
    const timeout = setTimeout(() => {
      setConfirmation(null)
      setConfirmationDetail('')
    }, 1500)
    return () => clearTimeout(timeout)
  }, [confirmation])

  const isLogging = isPending || pendingKey !== null
  const customBreastValue = Number(customBreastMinutes)
  const customFormulaValue = Number(customFormulaMl)
  const canLogCustomBreast = Number.isFinite(customBreastValue) && customBreastValue > 0
  const canLogCustomFormula = Number.isFinite(customFormulaValue) && customFormulaValue > 0

  const ConfirmationToast = () => {
    if (!confirmation) return null

    const configs = {
      breast: { label: 'Breast feed logged', color: 'bg-sky-500' },
      formula: { label: 'Formula logged', color: 'bg-amber-500' },
      wet: { label: 'Wet nappy logged', color: 'bg-blue-500' },
      dirty: { label: 'Dirty nappy logged', color: 'bg-orange-500' },
      both: { label: 'Nappy logged', color: 'bg-violet-500' },
    }
    const config = configs[confirmation]

    return (
      <div className="fixed inset-x-4 top-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className={`${config.color} rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg`}>
          <span className="text-white text-xl">✓</span>
          <span className="text-white font-semibold text-lg flex-1">{config.label}</span>
          {confirmationDetail && <span className="text-white/80 font-medium">{confirmationDetail}</span>}
        </div>
      </div>
    )
  }

  function runLog(key: string, formData: FormData, action: (formData: FormData) => Promise<void>, done: () => void) {
    if (isLogging) return
    setPendingKey(key)
    startTransition(async () => {
      try {
        await action(formData)
        done()
      } finally {
        setPendingKey(null)
      }
    })
  }

  function logFeed(type: 'breast' | 'formula', amount: number) {
    const rounded = Math.round(amount)
    const formData = new FormData()
    formData.set('type', type)
    formData.set('amount', String(rounded))
    runLog(`${type}-${rounded}`, formData, addFeedAction, () => {
      setConfirmation(type)
      setConfirmationDetail(type === 'breast' ? `${rounded}m` : `${rounded}ml`)
      setCustomBreastMinutes('')
      setCustomFormulaMl('')
      setMode('home')
    })
  }

  function logNappy(type: 'wet' | 'dirty' | 'both') {
    const formData = new FormData()
    formData.set('type', type)
    runLog(`nappy-${type}`, formData, addNappyAction, () => setConfirmation(type))
  }

  const mainContent = useMemo(() => {
    if (mode === 'breast') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Breast feed</p>
            <p className="text-muted-foreground text-sm mt-1">Select duration</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BREAST_PRESETS.map(mins => (
              <button key={mins} onClick={() => logFeed('breast', mins)} disabled={isLogging} className="py-7 rounded-2xl bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 text-2xl font-bold transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.02] active:bg-sky-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                {mins}m
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (canLogCustomBreast) logFeed('breast', customBreastValue) }} className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <label htmlFor="custom-breast-minutes" className="text-sm text-muted-foreground">Custom time</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input id="custom-breast-minutes" type="number" inputMode="numeric" min="1" step="1" value={customBreastMinutes} onChange={(event) => setCustomBreastMinutes(event.target.value)} disabled={isLogging} className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-14 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 disabled:opacity-45 disabled:cursor-not-allowed" placeholder="12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">min</span>
              </div>
              <button type="submit" disabled={!canLogCustomBreast || isLogging} className="h-14 px-5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </div>
          </form>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    if (mode === 'formula') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Formula</p>
            <p className="text-muted-foreground text-sm mt-1">Select amount</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FORMULA_PRESETS.map(ml => (
              <button key={ml} onClick={() => logFeed('formula', ml)} disabled={isLogging} className="py-7 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 text-2xl font-bold transition-all duration-150 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.02] active:bg-amber-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                {ml}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (canLogCustomFormula) logFeed('formula', customFormulaValue) }} className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <label htmlFor="custom-formula-ml" className="text-sm text-muted-foreground">Custom amount</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input id="custom-formula-ml" type="number" inputMode="numeric" min="1" step="1" value={customFormulaMl} onChange={(event) => setCustomFormulaMl(event.target.value)} disabled={isLogging} className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-12 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-45 disabled:cursor-not-allowed" placeholder="75" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ml</span>
              </div>
              <button type="submit" disabled={!canLogCustomFormula || isLogging} className="h-14 px-5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </div>
          </form>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since feed</p>
            <p className="text-3xl font-bold text-foreground tabular-nums">{formatTimeSince(lastFeed?.timestamp ?? null, now)}</p>
            {lastFeed && <p className="text-sm text-muted-foreground mt-1 capitalize">{lastFeed.type === 'breast' ? `Breast ${lastFeed.durationSeconds ? formatDurationMins(lastFeed.durationSeconds) : ''}` : `Formula ${lastFeed.volumeMl}ml`}</p>}
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since nappy</p>
            <p className="text-3xl font-bold text-foreground tabular-nums">{formatTimeSince(lastNappy?.timestamp ?? null, now)}</p>
            {lastNappy && <p className="text-sm text-muted-foreground mt-1 capitalize">{lastNappy.type === 'both' ? 'Wet + Dirty' : lastNappy.type}</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-muted/30 p-4 border border-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Today</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-2 py-3 min-w-0">
              <p className="text-2xl font-bold text-foreground">{summary.breastFeedCount}</p>
              <p className="text-xs text-muted-foreground">Breast</p>
              <p className="text-sm font-semibold text-sky-400 mt-2 tabular-nums">{formatSummaryMinutes(summary.totalBreastMinutes)}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-3 min-w-0">
              <p className="text-2xl font-bold text-foreground">{summary.formulaFeedCount}</p>
              <p className="text-xs text-muted-foreground">Formula</p>
              <p className="text-sm font-semibold text-amber-400 mt-2 tabular-nums">{summary.totalFormulaMl}ml</p>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-2 py-3 min-w-0">
              <p className="text-2xl font-bold text-foreground">{summary.nappyCount}</p>
              <p className="text-xs text-muted-foreground">Nappies</p>
              <p className="text-sm font-semibold text-violet-400 mt-2 tabular-nums">{summary.wetCount}W {summary.dirtyCount}D</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Log feed</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('breast')} disabled={isLogging} className="flex items-center justify-center gap-2 py-6 rounded-2xl bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.01] active:bg-sky-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-xl font-bold">Breast</span>
              </button>
              <button onClick={() => setMode('formula')} disabled={isLogging} className="flex items-center justify-center gap-2 py-6 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 transition-all duration-150 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.01] active:bg-amber-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-xl font-bold">Formula</span>
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Log nappy</p>
            <div className="grid grid-cols-3 gap-3">
              {(['wet', 'dirty', 'both'] as const).map(type => (
                <button key={type} onClick={() => logNappy(type)} disabled={isLogging} className="flex flex-col items-center justify-center gap-1 py-5 rounded-2xl bg-blue-500/15 border-2 border-blue-500/30 text-blue-400 transition-all duration-150 hover:bg-blue-500/25 hover:border-blue-500/50 hover:scale-[1.02] active:bg-blue-500/35 active:scale-[0.96] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="text-lg font-bold capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }, [canLogCustomBreast, canLogCustomFormula, customBreastMinutes, customBreastValue, customFormulaMl, customFormulaValue, isLogging, lastFeed, lastNappy, mode, now, summary])

  return (
    <>
      <ConfirmationToast />
      {mainContent}
    </>
  )
}
