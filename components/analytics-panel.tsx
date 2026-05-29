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
import { Baby, Clock3, Droplets, Flame, GlassWater, Layers3, Moon, TrendingUp } from 'lucide-react'
import { appDateKey } from '@/lib/timezone'
import type { AnalyticsDataPoint } from '@/lib/server/analytics-data'

export type RangeOption = '1d' | '7d' | '30d'
export type CategoryOption = 'feeds' | 'nappies' | 'pumps'
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

type Totals = ReturnType<typeof sumData>

interface SummaryModel {
  totals: Totals
  previous: Totals
  measuredFedMl: number
  previousMeasuredFedMl: number
  formulaPerFeed: number
  breastPerFeed: number
  breastMilkPerFeed: number
  pumpMlPerSession: number
  pumpMinutesPerSession: number
  feedSessionsPerDay: number
  measuredFedMlPerDay: number
  nappiesPerDay: number
  pumpMlPerDay: number
  avgGap: number
  longestGap: number
  activeDays: number
  quietDays: number
  highestDay: AnalyticsDataPoint | null
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

function percentChange(current: number, previous: number, label = 'previous') {
  if (!previous && !current) return 'No change'
  if (!previous) return 'New activity'
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'No change'
  return `${change > 0 ? '+' : ''}${change}% vs ${label}`
}

function comparePhrase(current: number, previous: number, unit: string) {
  if (!current && !previous) return `No ${unit} logged yet today or at this time yesterday.`
  if (current && !previous) return `${compactNumber(current)} ${unit} logged today, with none logged by this time yesterday.`
  if (!current) return `No ${unit} logged yet today; ${compactNumber(previous)} had been logged by this time yesterday.`

  const change = Math.round(((current - previous) / previous) * 100)
  if (Math.abs(change) < 15) return `${compactNumber(current)} ${unit} today, broadly similar to this time yesterday.`
  return `${compactNumber(current)} ${unit} today, ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% vs this time yesterday.`
}

function avg(total: number, count: number, precision = 0) {
  if (!count) return 0
  const factor = 10 ** precision
  return Math.round((total / count) * factor) / factor
}

function measuredFedMl(day: AnalyticsDataPoint | Totals) {
  return day.formulaMl + day.breastMilkMl
}

function sumData(days: AnalyticsDataPoint[]) {
  return days.reduce(
    (totals, day) => ({
      feedCount: totals.feedCount + day.feedCount,
      feedSessionCount: totals.feedSessionCount + day.feedSessionCount,
      formulaCount: totals.formulaCount + day.formulaCount,
      breastCount: totals.breastCount + day.breastCount,
      formulaMl: totals.formulaMl + day.formulaMl,
      breastMins: totals.breastMins + day.breastMins,
      breastMilkMl: totals.breastMilkMl + day.breastMilkMl,
      breastMilkCount: totals.breastMilkCount + day.breastMilkCount,
      pumpCount: totals.pumpCount + day.pumpCount,
      pumpMins: totals.pumpMins + day.pumpMins,
      pumpMl: totals.pumpMl + day.pumpMl,
      wetOnly: totals.wetOnly + day.wetOnly,
      dirtyOnly: totals.dirtyOnly + day.dirtyOnly,
      both: totals.both + day.both,
      wetTotal: totals.wetTotal + day.wetTotal,
      dirtyTotal: totals.dirtyTotal + day.dirtyTotal,
      totalNappies: totals.totalNappies + day.totalNappies,
    }),
    {
      feedCount: 0,
      feedSessionCount: 0,
      formulaCount: 0,
      breastCount: 0,
      formulaMl: 0,
      breastMins: 0,
      breastMilkMl: 0,
      breastMilkCount: 0,
      pumpCount: 0,
      pumpMins: 0,
      pumpMl: 0,
      wetOnly: 0,
      dirtyOnly: 0,
      both: 0,
      wetTotal: 0,
      dirtyTotal: 0,
      totalNappies: 0,
    },
  )
}

function hasDataForView(day: AnalyticsDataPoint, category: CategoryOption, feedView: FeedViewOption) {
  if (category === 'nappies') return day.totalNappies > 0
  if (category === 'pumps') return day.pumpCount > 0 || day.pumpMl > 0 || day.pumpMins > 0
  if (feedView === 'formula') return day.formulaMl > 0 || day.formulaCount > 0
  if (feedView === 'breast') return day.breastMins > 0 || day.breastMilkMl > 0 || day.breastCount > 0
  return day.feedSessionCount > 0
}

function activityValue(day: AnalyticsDataPoint, category: CategoryOption) {
  if (category === 'nappies') return day.totalNappies
  if (category === 'pumps') return day.pumpCount
  return day.feedSessionCount
}

function rangeLabel(range: RangeOption) {
  if (range === '1d') return 'Today'
  if (range === '7d') return 'Last 7 days'
  return 'Last 30 days'
}

function chartTitle(category: CategoryOption, feedView: FeedViewOption, summary: SummaryModel) {
  if (category === 'nappies') return 'Nappy changes breakdown'
  if (category === 'pumps') return 'Pump volume over time'
  if (feedView === 'formula') return 'Formula volume over time'
  if (feedView === 'breast') return summary.totals.breastMins > 0 ? 'Breast feed minutes over time' : 'Expressed breast milk over time'
  return 'Feed sessions over time'
}

function ChartTooltip({ active, payload, label, unit = '' }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card/95 p-3 text-sm shadow-xl backdrop-blur-sm">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map(item => (
        <p key={item.name} className="font-semibold" style={{ color: item.color || item.fill }}>
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
    <div className="min-w-0 rounded-xl border border-muted/50 bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {helper && <p className="mt-2 truncate text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function InsightTile({
  label,
  value,
  helper,
  tone = 'text-foreground',
}: {
  label: string
  value: string
  helper?: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-muted/50 bg-background/45 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
      {helper && <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-52 place-items-center rounded-lg border border-dashed border-muted/60 px-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function FilterButton({
  active,
  children,
  onClick,
  className = '',
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/55 hover:text-foreground'} ${className}`}
    >
      {children}
    </button>
  )
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const width = total ? Math.max(3, Math.round((value / total) * 100)) : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{compactNumber(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function TodayComparison({ summary }: { summary: SummaryModel }) {
  return (
    <section className="rounded-xl border border-muted bg-muted/10 p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Today vs yesterday</h3>
        <p className="text-sm text-muted-foreground">A quick comparison for the day so far.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InsightTile label="Feed sessions" value={percentChange(summary.totals.feedSessionCount, summary.previous.feedSessionCount, 'yesterday')} helper={`${summary.previous.feedSessionCount} yesterday`} tone="text-emerald-400" />
        <InsightTile label="Measured ml" value={percentChange(summary.measuredFedMl, summary.previousMeasuredFedMl, 'yesterday')} helper={`${compactNumber(summary.previousMeasuredFedMl)} ml yesterday`} tone="text-amber-400" />
        <InsightTile label="Nappies" value={percentChange(summary.totals.totalNappies, summary.previous.totalNappies, 'yesterday')} helper={`${summary.previous.totalNappies} yesterday`} tone="text-violet-400" />
        <InsightTile label="Pump output" value={percentChange(summary.totals.pumpMl, summary.previous.pumpMl, 'yesterday')} helper={`${compactNumber(summary.previous.pumpMl)} ml yesterday`} tone="text-emerald-400" />
      </div>
    </section>
  )
}

function ParentCheckIn({ summary }: { summary: SummaryModel }) {
  const hasFeeds = summary.totals.feedSessionCount > 0
  const hasWet = summary.totals.wetTotal > 0
  const hasDirty = summary.totals.dirtyTotal > 0
  const hasMeasuredMilk = summary.measuredFedMl > 0
  const reassuranceItems = [
    comparePhrase(summary.totals.feedSessionCount, summary.previous.feedSessionCount, 'feed sessions'),
    comparePhrase(summary.measuredFedMl, summary.previousMeasuredFedMl, 'ml measured'),
    comparePhrase(summary.totals.wetTotal, summary.previous.wetTotal, 'wet nappies'),
  ]
  const nextCue = hasFeeds && hasWet
    ? 'Feeds and wet nappies are both being captured today, so the day has useful context.'
    : hasFeeds
      ? 'Feeds are being captured; keep an eye on nappies as the day fills in.'
      : hasWet
        ? 'Wet nappies are being captured; log feeds when they happen to complete the picture.'
        : 'The day is still quiet in the tracker; the next log will make this view more useful.'

  return (
    <section className="rounded-xl border border-muted bg-muted/10 p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Parent check-in</h3>
        <p className="text-sm text-muted-foreground">Calm tracking context, not medical thresholds.</p>
      </div>
      <div className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2">
        <p className="text-sm font-medium text-foreground">{nextCue}</p>
      </div>
      <div className="mb-3 flex flex-col gap-2">
        {reassuranceItems.map(item => (
          <p key={item} className="rounded-lg border border-muted/50 bg-background/35 px-3 py-2 text-sm text-muted-foreground">{item}</p>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InsightTile label="Feeds logged" value={hasFeeds ? 'Yes' : 'Not yet'} helper={`${summary.totals.feedSessionCount} sessions`} tone={hasFeeds ? 'text-emerald-400' : 'text-muted-foreground'} />
        <InsightTile label="Wet nappies" value={hasWet ? 'Logged' : 'None yet'} helper={`${summary.totals.wetTotal} wet total`} tone={hasWet ? 'text-blue-400' : 'text-muted-foreground'} />
        <InsightTile label="Dirty nappies" value={hasDirty ? 'Logged' : 'None yet'} helper={`${summary.totals.dirtyTotal} dirty total`} tone={hasDirty ? 'text-orange-400' : 'text-muted-foreground'} />
        <InsightTile label="Bottle volume" value={hasMeasuredMilk ? `${compactNumber(summary.measuredFedMl)} ml` : 'n/a'} helper="Formula + expressed" tone={hasMeasuredMilk ? 'text-amber-400' : 'text-muted-foreground'} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">If something feels off, use the chart as context and contact your care team.</p>
    </section>
  )
}

function AnalyticsChart({
  category,
  feedView,
  chartData,
  summary,
  xInterval,
  desktop = false,
}: {
  category: CategoryOption
  feedView: FeedViewOption
  chartData: AnalyticsDataPoint[]
  summary: SummaryModel
  xInterval: number
  desktop?: boolean
}) {
  const hasFeedData = summary.totals.feedSessionCount > 0
  const hasFormulaData = summary.totals.formulaMl > 0
  const hasBreastData = summary.totals.breastMins > 0 || summary.totals.breastMilkMl > 0
  const hasNappyData = summary.totals.totalNappies > 0
  const hasPumpData = summary.totals.pumpCount > 0
  const margin = desktop ? { top: 14, right: 14, left: -14, bottom: 0 } : { top: 10, right: 5, left: -25, bottom: 0 }

  if (category === 'feeds' && feedView === 'combined') {
    return hasFeedData ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
          <YAxis allowDecimals={false} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="feedSessionCount" name="Sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : <EmptyChart label="No feeds logged in this range yet." />
  }

  if (category === 'feeds' && feedView === 'formula') {
    return hasFormulaData ? (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={margin}>
          <defs>
            <linearGradient id="colorFormula" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
          <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip unit="ml" />} cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="formulaMl" name="Formula" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorFormula)" />
        </AreaChart>
      </ResponsiveContainer>
    ) : <EmptyChart label="No formula feeds logged in this range yet." />
  }

  if (category === 'feeds' && feedView === 'breast') {
    return hasBreastData ? (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={margin}>
          <defs>
            <linearGradient id="colorBreast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
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
  }

  if (category === 'nappies') {
    return hasNappyData ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
          <YAxis allowDecimals={false} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="wetOnly" name="Wet only" stackId="nappy" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="dirtyOnly" name="Dirty only" stackId="nappy" fill="#f97316" radius={[0, 0, 0, 0]} />
          <Bar dataKey="both" name="Both" stackId="nappy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : <EmptyChart label="No nappies logged in this range yet." />
  }

  return hasPumpData ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" interval={xInterval} stroke="currentColor" className="text-muted-foreground" tickLine={false} />
        <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip unit="ml" />} />
        <Bar dataKey="pumpMl" name="Pumped" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  ) : <EmptyChart label="No pump sessions logged in this range yet." />
}

function RangeFilters({ range, updateFilters }: { range: RangeOption; updateFilters: (next: Partial<{ range: RangeOption; category: CategoryOption; feedView: FeedViewOption }>) => void }) {
  return (
    <div className="flex rounded-xl border border-muted/50 bg-muted/30 p-1">
      {(['1d', '7d', '30d'] as RangeOption[]).map(option => (
        <FilterButton key={option} active={range === option} onClick={() => updateFilters({ range: option })} className="flex-1">
          {rangeLabel(option)}
        </FilterButton>
      ))}
    </div>
  )
}

function CategoryFilters({ category, updateFilters }: { category: CategoryOption; updateFilters: (next: Partial<{ range: RangeOption; category: CategoryOption; feedView: FeedViewOption }>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { value: 'feeds', label: 'Feeds', icon: GlassWater, active: 'bg-amber-500/10 border-amber-500/40 text-amber-400' },
        { value: 'nappies', label: 'Nappies', icon: Baby, active: 'bg-violet-500/10 border-violet-500/40 text-violet-400' },
        { value: 'pumps', label: 'Pumps', icon: Droplets, active: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' },
      ].map(option => {
        const Icon = option.icon
        const isActive = category === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updateFilters({ category: option.value as CategoryOption })}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
              isActive ? option.active : 'border-muted/50 bg-muted/20 text-muted-foreground hover:bg-muted/35 hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function FeedViewFilters({ feedView, updateFilters }: { feedView: FeedViewOption; updateFilters: (next: Partial<{ range: RangeOption; category: CategoryOption; feedView: FeedViewOption }>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-muted/30 bg-muted/15 p-1">
      {[
        { value: 'combined', label: 'Count', icon: Layers3, active: 'bg-emerald-500' },
        { value: 'formula', label: 'Formula', icon: GlassWater, active: 'bg-amber-500' },
        { value: 'breast', label: 'Breast', icon: Flame, active: 'bg-sky-500' },
      ].map(option => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updateFilters({ feedView: option.value as FeedViewOption })}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              feedView === option.value ? `${option.active} text-white shadow-sm` : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function MobileSummaryCards({ category, feedView, range, summary }: { category: CategoryOption; feedView: FeedViewOption; range: RangeOption; summary: SummaryModel }) {
  const comparisonLabel = range === '1d' ? 'yesterday' : 'previous'

  if (category === 'feeds') {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Feed Sessions" value={compactNumber(summary.totals.feedSessionCount)} tone="text-emerald-400" helper={percentChange(summary.totals.feedSessionCount, summary.previous.feedSessionCount, comparisonLabel)} />
          <SummaryCard label="Total ml Fed" value={`${compactNumber(summary.measuredFedMl)} ml`} tone="text-amber-400" helper={percentChange(summary.measuredFedMl, summary.previousMeasuredFedMl, comparisonLabel)} />
          <SummaryCard label="Sessions / Day" value={String(summary.feedSessionsPerDay)} helper={`${summary.totals.feedCount} feed entries`} />
          <SummaryCard label="Avg Gap" value={formatHours(summary.avgGap)} tone="text-sky-400" helper="Between sessions" />
        </div>
        {feedView !== 'combined' && (
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
                <SummaryCard label="Expressed Milk" value={`${compactNumber(summary.totals.breastMilkMl)} ml`} tone="text-cyan-400" />
                <SummaryCard label="Avg / Bottle" value={`${summary.breastMilkPerFeed} ml`} />
              </>
            )}
          </div>
        )}
      </>
    )
  }

  if (category === 'nappies') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Total Nappies" value={compactNumber(summary.totals.totalNappies)} tone="text-violet-400" helper={percentChange(summary.totals.totalNappies, summary.previous.totalNappies, comparisonLabel)} />
        <SummaryCard label="Nappies / Day" value={String(summary.nappiesPerDay)} helper={`${summary.totals.wetTotal} wet, ${summary.totals.dirtyTotal} dirty`} />
        <SummaryCard label="Wet Total" value={String(summary.totals.wetTotal)} tone="text-blue-400" helper="Includes both" />
        <SummaryCard label="Dirty Total" value={String(summary.totals.dirtyTotal)} tone="text-orange-400" helper="Includes both" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <SummaryCard label="Pump Sessions" value={compactNumber(summary.totals.pumpCount)} tone="text-emerald-400" helper={percentChange(summary.totals.pumpCount, summary.previous.pumpCount, comparisonLabel)} />
      <SummaryCard label="Total Pumped" value={`${compactNumber(summary.totals.pumpMl)} ml`} tone="text-emerald-400" helper={percentChange(summary.totals.pumpMl, summary.previous.pumpMl, comparisonLabel)} />
      <SummaryCard label="Avg / Session" value={`${summary.pumpMlPerSession} ml`} helper={`${summary.pumpMinutesPerSession} min avg`} />
      <SummaryCard label="Total Time" value={formatHours(summary.totals.pumpMins)} helper="Pump duration" />
    </div>
  )
}

function DesktopMetricStrip({ category, range, summary }: { category: CategoryOption; range: RangeOption; summary: SummaryModel }) {
  const comparisonLabel = range === '1d' ? 'yesterday' : 'previous'

  if (category === 'nappies') {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Total Nappies" value={compactNumber(summary.totals.totalNappies)} tone="text-violet-400" helper={percentChange(summary.totals.totalNappies, summary.previous.totalNappies, comparisonLabel)} />
        <SummaryCard label="Nappies / Day" value={String(summary.nappiesPerDay)} helper={`${summary.activeDays} active days`} />
        <SummaryCard label="Wet Total" value={String(summary.totals.wetTotal)} tone="text-blue-400" helper="Includes both" />
        <SummaryCard label="Dirty Total" value={String(summary.totals.dirtyTotal)} tone="text-orange-400" helper="Includes both" />
      </div>
    )
  }

  if (category === 'pumps') {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Pump Sessions" value={compactNumber(summary.totals.pumpCount)} tone="text-emerald-400" helper={percentChange(summary.totals.pumpCount, summary.previous.pumpCount, comparisonLabel)} />
        <SummaryCard label="Total Pumped" value={`${compactNumber(summary.totals.pumpMl)} ml`} tone="text-emerald-400" helper={percentChange(summary.totals.pumpMl, summary.previous.pumpMl, comparisonLabel)} />
        <SummaryCard label="Avg / Session" value={`${summary.pumpMlPerSession} ml`} helper={`${summary.pumpMinutesPerSession} min avg`} />
        <SummaryCard label="Pumped / Day" value={`${summary.pumpMlPerDay} ml`} helper={formatHours(summary.totals.pumpMins)} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <SummaryCard label="Feed Sessions" value={compactNumber(summary.totals.feedSessionCount)} tone="text-emerald-400" helper={percentChange(summary.totals.feedSessionCount, summary.previous.feedSessionCount, comparisonLabel)} />
      <SummaryCard label="Total ml Fed" value={`${compactNumber(summary.measuredFedMl)} ml`} tone="text-amber-400" helper={percentChange(summary.measuredFedMl, summary.previousMeasuredFedMl, comparisonLabel)} />
      <SummaryCard label="Sessions / Day" value={String(summary.feedSessionsPerDay)} helper={`${summary.totals.feedCount} feed entries`} />
      <SummaryCard label="Measured ml / Day" value={`${summary.measuredFedMlPerDay} ml`} helper="Formula + expressed" />
      <SummaryCard label="Avg Gap" value={formatHours(summary.avgGap)} tone="text-sky-400" helper={`Longest ${formatHours(summary.longestGap)}`} />
    </div>
  )
}

function DesktopInsightRail({ category, range, summary }: { category: CategoryOption; range: RangeOption; summary: SummaryModel }) {
  const selectedDays = range === '1d' ? 1 : range === '7d' ? 7 : 30
  const highestLabel = summary.highestDay ? `${summary.highestDay.date} · ${activityValue(summary.highestDay, category)}` : '--'

  return (
    <aside className="flex flex-col gap-3">
      <section className="rounded-xl border border-muted bg-muted/10 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Range context</h3>
            <p className="text-sm text-muted-foreground">{rangeLabel(range)}</p>
          </div>
          <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InsightTile label="Active days" value={`${summary.activeDays}/${selectedDays}`} />
          <InsightTile label="Quiet days" value={String(summary.quietDays)} />
          <InsightTile label="Highest day" value={highestLabel} helper={category === 'pumps' ? 'Sessions' : 'Events'} />
          <InsightTile label={range === '1d' ? 'Yesterday' : 'Previous'} value={category === 'feeds' ? `${summary.previous.feedSessionCount} sessions` : category === 'nappies' ? `${summary.previous.totalNappies} changes` : `${summary.previous.pumpCount} sessions`} />
        </div>
      </section>

      {range === '1d' && <TodayComparison summary={summary} />}
      {range === '1d' && <ParentCheckIn summary={summary} />}

      {category === 'feeds' && (
        <section className="rounded-xl border border-muted bg-muted/10 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Feed mix</h3>
              <p className="text-sm text-muted-foreground">Measured ml is formula plus expressed milk.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-3">
            <ProgressRow label="Formula ml" value={summary.totals.formulaMl} total={Math.max(summary.measuredFedMl, 1)} color="bg-amber-500" />
            <ProgressRow label="Expressed milk ml" value={summary.totals.breastMilkMl} total={Math.max(summary.measuredFedMl, 1)} color="bg-cyan-500" />
            <ProgressRow label="Breast minutes" value={summary.totals.breastMins} total={Math.max(summary.totals.breastMins, summary.totals.formulaCount + summary.totals.breastMilkCount, 1)} color="bg-sky-500" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <InsightTile label="Formula avg" value={`${summary.formulaPerFeed} ml`} />
            <InsightTile label="Expressed avg" value={`${summary.breastMilkPerFeed} ml`} />
          </div>
        </section>
      )}

      {category === 'nappies' && (
        <section className="rounded-xl border border-muted bg-muted/10 p-4">
          <h3 className="mb-4 text-base font-semibold text-foreground">Nappy breakdown</h3>
          <div className="flex flex-col gap-3">
            <ProgressRow label="Wet only" value={summary.totals.wetOnly} total={Math.max(summary.totals.totalNappies, 1)} color="bg-blue-500" />
            <ProgressRow label="Dirty only" value={summary.totals.dirtyOnly} total={Math.max(summary.totals.totalNappies, 1)} color="bg-orange-500" />
            <ProgressRow label="Both" value={summary.totals.both} total={Math.max(summary.totals.totalNappies, 1)} color="bg-violet-500" />
          </div>
        </section>
      )}

      {category === 'pumps' && (
        <section className="rounded-xl border border-muted bg-muted/10 p-4">
          <h3 className="mb-4 text-base font-semibold text-foreground">Pump output</h3>
          <div className="grid grid-cols-2 gap-2">
            <InsightTile label="Total time" value={formatHours(summary.totals.pumpMins)} />
            <InsightTile label="Avg time" value={`${summary.pumpMinutesPerSession} min`} />
            <InsightTile label="Total ml" value={`${compactNumber(summary.totals.pumpMl)} ml`} tone="text-emerald-400" />
            <InsightTile label="Ml / day" value={`${summary.pumpMlPerDay} ml`} />
          </div>
        </section>
      )}
    </aside>
  )
}

export function AnalyticsPanel({
  data,
  hourlyData,
  previousHourlyData,
  currentHour,
  feedSessionTimestamps,
  initialRange,
  initialCategory,
  initialFeedView,
  variant = 'full',
}: {
  data: AnalyticsDataPoint[]
  hourlyData: AnalyticsDataPoint[]
  previousHourlyData: AnalyticsDataPoint[]
  currentHour: number
  feedSessionTimestamps: string[]
  initialRange: RangeOption
  initialCategory: CategoryOption
  initialFeedView: FeedViewOption
  variant?: 'full' | 'compact'
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

  const selectedDays = range === '1d' ? 1 : range === '7d' ? 7 : 30
  const chartData = useMemo(
    () => range === '1d' ? hourlyData : data.slice(-selectedDays),
    [data, hourlyData, range, selectedDays],
  )
  const previousData = useMemo(
    () => range === '1d' ? previousHourlyData.slice(0, currentHour + 1) : data.slice(-(selectedDays * 2), -selectedDays),
    [currentHour, data, previousHourlyData, range, selectedDays],
  )

  const summary = useMemo<SummaryModel>(() => {
    const totals = sumData(chartData)
    const previous = sumData(previousData)
    const timestamps = feedSessionTimestamps
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
    const activeDays = range === '1d'
      ? chartData.filter(day => hasDataForView(day, category, feedView)).length
      : chartData.filter(day => activityValue(day, category) > 0).length
    const highestDay = chartData.reduce<AnalyticsDataPoint | null>((highest, day) => {
      if (!highest) return day
      return activityValue(day, category) > activityValue(highest, category) ? day : highest
    }, null)
    const measuredMl = measuredFedMl(totals)

    return {
      totals,
      previous,
      measuredFedMl: measuredMl,
      previousMeasuredFedMl: measuredFedMl(previous),
      formulaPerFeed: avg(totals.formulaMl, totals.formulaCount),
      breastPerFeed: avg(totals.breastMins, Math.max(totals.breastCount - totals.breastMilkCount, 0)),
      breastMilkPerFeed: avg(totals.breastMilkMl, totals.breastMilkCount),
      pumpMlPerSession: avg(totals.pumpMl, totals.pumpCount),
      pumpMinutesPerSession: avg(totals.pumpMins, totals.pumpCount),
      feedSessionsPerDay: avg(totals.feedSessionCount, selectedDays, 1),
      measuredFedMlPerDay: avg(measuredMl, selectedDays),
      nappiesPerDay: avg(totals.totalNappies, selectedDays, 1),
      pumpMlPerDay: avg(totals.pumpMl, selectedDays),
      avgGap,
      longestGap,
      activeDays,
      quietDays: Math.max(0, selectedDays - activeDays),
      highestDay: highestDay && activityValue(highestDay, category) > 0 ? highestDay : null,
    }
  }, [category, chartData, feedSessionTimestamps, feedView, previousData, range, selectedDays])

  const xInterval = range === '30d' && chartData.length > 12 ? 4 : 0
  const activeDayLabel = `${summary.activeDays} active ${summary.activeDays === 1 ? 'day' : 'days'}`
  const isCompact = variant === 'compact'

  if (!mounted) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        {!isCompact && (
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-lg bg-muted" />
            <div className="h-10 flex-1 rounded-lg bg-muted" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-muted/50" />
          <div className="h-24 rounded-xl bg-muted/50" />
        </div>
        <div className={isCompact ? 'h-64 rounded-xl bg-muted/30' : 'h-80 rounded-xl bg-muted/30'} />
      </div>
    )
  }

  if (isCompact) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Patterns</h2>
            <p className="text-sm text-muted-foreground">Feed sessions over 7 days</p>
          </div>
          <a href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Details
          </a>
        </div>

        <MobileSummaryCards category={category} feedView={feedView} range={range} summary={summary} />
        {range === '1d' && <TodayComparison summary={summary} />}
        {range === '1d' && <ParentCheckIn summary={summary} />}

        <div className="flex h-72 flex-col justify-center rounded-xl border border-muted/30 bg-muted/20 p-4">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{chartTitle(category, feedView, summary)}</h3>
          <div className="h-full flex-1 text-xs">
            <AnalyticsChart category={category} feedView={feedView} chartData={chartData} summary={summary} xInterval={xInterval} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:hidden">
        <RangeFilters range={range} updateFilters={updateFilters} />
        <CategoryFilters category={category} updateFilters={updateFilters} />
        {category === 'feeds' && <FeedViewFilters feedView={feedView} updateFilters={updateFilters} />}
        <MobileSummaryCards category={category} feedView={feedView} range={range} summary={summary} />
        {range === '1d' && <TodayComparison summary={summary} />}
        {range === '1d' && <ParentCheckIn summary={summary} />}
        <div className="flex h-80 flex-col justify-center rounded-xl border border-muted/30 bg-muted/20 p-4">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{chartTitle(category, feedView, summary)}</h3>
          <div className="h-full flex-1 text-xs">
            <AnalyticsChart category={category} feedView={feedView} chartData={chartData} summary={summary} xInterval={xInterval} />
          </div>
        </div>
        {category === 'feeds' && (
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border border-muted/30 bg-muted/10 p-3">
              <Clock3 className="h-4 w-4 text-sky-400" />
              <span>Previous period: {summary.previous.feedSessionCount} sessions</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-muted/30 bg-muted/10 p-3">
              <Droplets className="h-4 w-4 text-violet-400" />
              <span>{range === '1d' ? 'Today' : activeDayLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="hidden flex-col gap-4 lg:flex">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {rangeLabel(range)} · {category === 'feeds' ? 'Feed patterns' : category === 'nappies' ? 'Nappy patterns' : 'Pump output'}
            </p>
          </div>
          <RangeFilters range={range} updateFilters={updateFilters} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
          <div className="flex flex-col gap-4">
            <CategoryFilters category={category} updateFilters={updateFilters} />
            {category === 'feeds' && <FeedViewFilters feedView={feedView} updateFilters={updateFilters} />}
            <DesktopMetricStrip category={category} range={range} summary={summary} />

            <section className="flex min-h-[440px] flex-col rounded-xl border border-muted bg-muted/10 p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{chartTitle(category, feedView, summary)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category === 'feeds'
                      ? `${compactNumber(summary.totals.feedSessionCount)} sessions · ${compactNumber(summary.measuredFedMl)} ml measured`
                      : category === 'nappies'
                        ? `${compactNumber(summary.totals.totalNappies)} changes · ${summary.nappiesPerDay} per day`
                        : `${compactNumber(summary.totals.pumpMl)} ml · ${summary.totals.pumpCount} sessions`}
                  </p>
                </div>
                <div className="rounded-lg border border-muted/60 bg-background/50 px-3 py-2 text-right text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{activeDayLabel}</p>
                  <p>{summary.quietDays} quiet {summary.quietDays === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
              <div className="min-h-0 flex-1 text-xs">
                <AnalyticsChart category={category} feedView={feedView} chartData={chartData} summary={summary} xInterval={xInterval} desktop />
              </div>
            </section>
          </div>

          <DesktopInsightRail category={category} range={range} summary={summary} />
        </div>
      </div>
    </div>
  )
}
