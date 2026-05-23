'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Baby, Clock3, Droplets, Flame, GlassWater, Layers3 } from 'lucide-react'
import { appDateKey } from '@/lib/timezone'

interface DailyData {
  date: string
  rawDate: string
  feedCount: number
  formulaCount: number
  breastCount: number
  formulaMl: number
  breastMins: number
  breastMilkMl: number
  breastMilkCount: number
  wetOnly: number
  dirtyOnly: number
  both: number
  wetTotal: number
  dirtyTotal: number
  totalNappies: number
}

export type RangeOption = '1d' | '7d' | '30d'
export type CategoryOption = 'feeds' | 'nappies'
export type FeedViewOption = 'combined' | 'formula' | 'breast'

interface TooltipPayload {
  name?: string
  value?: number | string
  color?: string
  fill?: string
}

interface TooltipContentProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  unit?: string
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-GB').format(value)
}

function formatHours(minutes: number) {
  if (!minutes) return '--'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!hours) return `${mins}m`
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function percentChange(current: number, previous: number) {
  if (!previous && !current) return 'No change'
  if (!previous) return 'New activity'
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'No change'
  return `${change > 0 ? '+' : ''}${change}% vs previous`
}

function avg(total: number, count: number, precision = 0) {
  if (!count) return 0
  const factor = 10 ** precision
  return Math.round((total / count) * factor) / factor
}

function sumData(days: DailyData[]) {
  return days.reduce(
    (totals, day) => ({
      feedCount: totals.feedCount + day.feedCount,
      formulaCount: totals.formulaCount + day.formulaCount,
      breastCount: totals.breastCount + day.breastCount,
      formulaMl: totals.formulaMl + day.formulaMl,
      breastMins: totals.breastMins + day.breastMins,
      breastMilkMl: totals.breastMilkMl + day.breastMilkMl,
      breastMilkCount: totals.breastMilkCount + day.breastMilkCount,
      wetOnly: totals.wetOnly + day.wetOnly,
      dirtyOnly: totals.dirtyOnly + day.dirtyOnly,
      both: totals.both + day.both,
      wetTotal: totals.wetTotal + day.wetTotal,
      dirtyTotal: totals.dirtyTotal + day.dirtyTotal,
      totalNappies: totals.totalNappies + day.totalNappies,
    }),
    {
      feedCount: 0,
      formulaCount: 0,
      breastCount: 0,
      formulaMl: 0,
      breastMins: 0,
      breastMilkMl: 0,
      breastMilkCount: 0,
      wetOnly: 0,
      dirtyOnly: 0,
      both: 0,
      wetTotal: 0,
      dirtyTotal: 0,
      totalNappies: 0,
    },
  )
}

function ChartTooltip({ active, payload, label, unit = '' }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-card/95 border border-border p-3 rounded-xl shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      {payload.map(item => (
        <p key={item.name} className="text-sm font-bold" style={{ color: item.color || item.fill }}>
          {item.name}: {item.value}{unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'text-foreground',
  helper,
}: {
  label: string
  value: string
  tone?: string
  helper?: string
}) {
  return (
    <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4 min-w-0">
      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${tone}`}>{value}</p>
      {helper && <p className="text-xs text-muted-foreground mt-2">{helper}</p>}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full min-h-52 rounded-xl border border-dashed border-muted/60 grid place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function AnalyticsPanel({
  data,
  hourlyData,
  feedTimestamps,
  initialRange,
  initialCategory,
  initialFeedView,
}: {
  data: DailyData[]
  hourlyData: DailyData[]
  feedTimestamps: string[]
  initialRange: RangeOption
  initialCategory: CategoryOption
  initialFeedView: FeedViewOption
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [range, setRange] = useState<RangeOption>(initialRange)
  const [category, setCategory] = useState<CategoryOption>(initialCategory)
  const [feedView, setFeedView] = useState<FeedViewOption>(initialFeedView)

  useEffect(() => {
    setMounted(true)
  }, [])

  function updateFilters(next: Partial<{ range: RangeOption; category: CategoryOption; feedView: FeedViewOption }>) {
    const nextRange = next.range ?? range
    const nextCategory = next.category ?? category
    const nextFeedView = next.feedView ?? feedView
    setRange(nextRange)
    setCategory(nextCategory)
    setFeedView(nextFeedView)

    const params = new URLSearchParams(searchParams.toString())
    params.set('range', nextRange)
    params.set('category', nextCategory)
    params.set('feed', nextFeedView)
    router.replace(`/analytics?${params.toString()}`, { scroll: false })
  }

  const rangeDays = range === '7d' ? 7 : 30
  const chartData = useMemo(() => range === '1d' ? hourlyData : data.slice(-rangeDays), [data, hourlyData, range, rangeDays])
  const previousData = useMemo(() => range === '1d' ? data.slice(-2, -1) : data.slice(-(rangeDays * 2), -rangeDays), [data, range, rangeDays])

  const summary = useMemo(() => {
    const totals = sumData(chartData)
    const previous = sumData(previousData)
    const timestamps = feedTimestamps
      .map(value => new Date(value).getTime())
      .filter(value => Number.isFinite(value))
      .sort((a, b) => a - b)
    const start = chartData[0]?.rawDate
    const end = chartData[chartData.length - 1]?.rawDate
    const rangeFeedTimes = timestamps.filter(value => {
      const key = appDateKey(new Date(value))
      return (!start || key >= start) && (!end || key <= end)
    })
    const gaps = rangeFeedTimes.slice(1).map((value, index) => Math.round((value - rangeFeedTimes[index]) / 60000))
    const avgGap = gaps.length ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : 0
    const longestGap = gaps.length ? Math.max(...gaps) : 0

    return {
      totals,
      previous,
      formulaPerFeed: avg(totals.formulaMl, totals.formulaCount),
      breastPerFeed: avg(totals.breastMins, Math.max(totals.breastCount - totals.breastMilkCount, 0)),
      breastMilkPerFeed: avg(totals.breastMilkMl, totals.breastMilkCount),
      feedsPerDay: avg(totals.feedCount, range === '1d' ? 1 : chartData.length, 1),
      nappiesPerDay: avg(totals.totalNappies, range === '1d' ? 1 : chartData.length, 1),
      avgGap,
      longestGap,
    }
  }, [chartData, feedTimestamps, previousData, range])

  const hasFeedData = summary.totals.feedCount > 0
  const hasFormulaData = summary.totals.formulaMl > 0
  const hasBreastData = summary.totals.breastMins > 0 || summary.totals.breastMilkMl > 0
  const hasNappyData = summary.totals.totalNappies > 0
  const xInterval = range === '30d' ? 4 : 0

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-muted rounded-lg" />
          <div className="flex-1 h-10 bg-muted rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-muted/50 rounded-2xl" />
          <div className="h-24 bg-muted/50 rounded-2xl" />
        </div>
        <div className="h-80 bg-muted/30 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-muted/30 p-1 rounded-xl border border-muted/50">
        {(['1d', '7d', '30d'] as RangeOption[]).map(option => (
          <button
            key={option}
            onClick={() => updateFilters({ range: option })}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              range === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option === '1d' ? 'Today' : option === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => updateFilters({ category: 'feeds' })}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold transition-all ${
            category === 'feeds'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-muted/30 border-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <GlassWater className="w-5 h-5" />
          Feeds
        </button>
        <button
          onClick={() => updateFilters({ category: 'nappies' })}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold transition-all ${
            category === 'nappies'
              ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
              : 'bg-muted/30 border-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Baby className="w-5 h-5" />
          Nappies
        </button>
      </div>

      {category === 'feeds' && (
        <div className="grid grid-cols-3 gap-2 bg-muted/15 p-1 rounded-xl border border-muted/30">
          {[
            { value: 'combined', label: 'Count', icon: Layers3, active: 'bg-emerald-500' },
            { value: 'formula', label: 'Formula', icon: GlassWater, active: 'bg-amber-500' },
            { value: 'breast', label: 'Breast', icon: Flame, active: 'bg-sky-500' },
          ].map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => updateFilters({ feedView: option.value as FeedViewOption })}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  feedView === option.value ? `${option.active} text-white shadow-sm` : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {option.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {category === 'feeds' ? (
          <>
            <SummaryCard
              label="Total Feeds"
              value={compactNumber(summary.totals.feedCount)}
              tone="text-emerald-400"
              helper={percentChange(summary.totals.feedCount, summary.previous.feedCount)}
            />
            <SummaryCard
              label="Feeds / Day"
              value={String(summary.feedsPerDay)}
              helper={`${summary.totals.formulaCount} formula, ${summary.totals.breastCount} breast`}
            />
            <SummaryCard
              label="Avg Gap"
              value={formatHours(summary.avgGap)}
              tone="text-sky-400"
              helper="Between feeds"
            />
            <SummaryCard
              label="Longest Gap"
              value={formatHours(summary.longestGap)}
              helper="Within selected range"
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="Total Nappies"
              value={compactNumber(summary.totals.totalNappies)}
              tone="text-violet-400"
              helper={percentChange(summary.totals.totalNappies, summary.previous.totalNappies)}
            />
            <SummaryCard
              label="Nappies / Day"
              value={String(summary.nappiesPerDay)}
              helper={`${summary.totals.wetTotal} wet, ${summary.totals.dirtyTotal} dirty`}
            />
            <SummaryCard label="Wet Total" value={String(summary.totals.wetTotal)} tone="text-blue-400" helper="Includes both" />
            <SummaryCard label="Dirty Total" value={String(summary.totals.dirtyTotal)} tone="text-orange-400" helper="Includes both" />
          </>
        )}
      </div>

      {category === 'feeds' && feedView !== 'combined' && (
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label={feedView === 'formula' ? 'Total Formula' : 'Total Duration'}
            value={feedView === 'formula' ? `${compactNumber(summary.totals.formulaMl)} ml` : `${compactNumber(summary.totals.breastMins)} min`}
            tone={feedView === 'formula' ? 'text-amber-400' : 'text-sky-400'}
          />
          <SummaryCard
            label={feedView === 'formula' ? 'Avg / Bottle' : 'Avg / Feed'}
            value={feedView === 'formula' ? `${summary.formulaPerFeed} ml` : `${summary.breastPerFeed} min`}
          />
          {feedView === 'breast' && summary.totals.breastMilkMl > 0 && (
            <>
              <SummaryCard
                label="Expressed Milk"
                value={`${compactNumber(summary.totals.breastMilkMl)} ml`}
                tone="text-cyan-400"
              />
              <SummaryCard
                label="Avg / Bottle"
                value={`${summary.breastMilkPerFeed} ml`}
              />
            </>
          )}
        </div>
      )}

      <div className="bg-muted/20 border border-muted/30 rounded-2xl p-4 h-80 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">
          {category === 'feeds'
            ? feedView === 'combined'
              ? 'Feed count over time'
              : feedView === 'formula'
                ? 'Formula volume over time'
                : summary.totals.breastMins > 0
                  ? 'Breast feed minutes over time'
                  : 'Expressed breast milk over time'
            : 'Nappy changes breakdown'}
        </h3>

        <div className="flex-1 w-full h-full text-xs">
          {category === 'feeds' && feedView === 'combined' && (
            hasFeedData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis allowDecimals={false} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="formulaCount" name="Formula" stackId="feed" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="breastCount" name="Breast" stackId="feed" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="No feeds logged in this range yet." />
          )}

          {category === 'feeds' && feedView === 'formula' && (
            hasFormulaData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFormula" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip unit="ml" />} cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="formulaMl" name="Formula" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorFormula)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="No formula feeds logged in this range yet." />
          )}

          {category === 'feeds' && feedView === 'breast' && (
            hasBreastData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBreast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip unit={summary.totals.breastMins > 0 ? 'mins' : 'ml'} />} cursor={{ stroke: 'rgba(14,165,233,0.2)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey={summary.totals.breastMins > 0 ? 'breastMins' : 'breastMilkMl'}
                    name={summary.totals.breastMins > 0 ? 'Breast Duration' : 'Breast Milk'}
                    stroke={summary.totals.breastMins > 0 ? '#0ea5e9' : '#06b6d4'}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBreast)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="No breast feeds logged in this range yet." />
          )}

          {category === 'nappies' && (
            hasNappyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis allowDecimals={false} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="wetOnly" name="Wet only" stackId="nappy" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="dirtyOnly" name="Dirty only" stackId="nappy" fill="#f97316" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="both" name="Both" stackId="nappy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="No nappies logged in this range yet." />
          )}
        </div>
      </div>

      {category === 'nappies' && (
        <div className="flex flex-wrap justify-center gap-3 bg-muted/10 p-3 rounded-xl border border-muted/30 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-muted-foreground">Wet only ({summary.totals.wetOnly})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-orange-500 rounded-sm" />
            <span className="text-muted-foreground">Dirty only ({summary.totals.dirtyOnly})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-purple-500 rounded-sm" />
            <span className="text-muted-foreground">Both ({summary.totals.both})</span>
          </div>
        </div>
      )}

      {category === 'feeds' && (
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-xl border border-muted/30 bg-muted/10 p-3">
            <Clock3 className="h-4 w-4 text-sky-400" />
            <span>Previous period: {summary.previous.feedCount} feeds</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-muted/30 bg-muted/10 p-3">
            <Droplets className="h-4 w-4 text-violet-400" />
            <span>{range === '1d' ? '1' : range === '7d' ? '7' : '30'} day view</span>
          </div>
        </div>
      )}
    </div>
  )
}
