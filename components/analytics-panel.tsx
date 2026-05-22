'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { Baby, Droplets, Flame, GlassWater } from 'lucide-react'

interface DailyData {
  date: string
  rawDate: string
  formulaMl: number
  breastMins: number
  wet: number
  dirty: number
  both: number
  totalNappies: number
}

type RangeOption = '7d' | '30d'
type CategoryOption = 'feeds' | 'nappies'
type FeedSubtypeOption = 'formula' | 'breast'

export function AnalyticsPanel({ data }: { data: DailyData[] }) {
  const [mounted, setMounted] = useState(false)
  const [range, setRange] = useState<RangeOption>('7d')
  const [category, setCategory] = useState<CategoryOption>('feeds')
  const [feedSubtype, setFeedSubtype] = useState<FeedSubtypeOption>('formula')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter data based on selected range (7d or 30d)
  const chartData = useMemo(() => {
    const limit = range === '7d' ? 7 : 30
    return data.slice(-limit)
  }, [data, range])

  // Calculate summaries for the selected range
  const summary = useMemo(() => {
    let totalFormula = 0
    let totalBreast = 0
    let totalWet = 0
    let totalDirty = 0
    let totalBoth = 0
    let totalNappies = 0

    chartData.forEach(d => {
      totalFormula += d.formulaMl
      totalBreast += d.breastMins
      totalWet += d.wet
      totalDirty += d.dirty
      totalBoth += d.both
      totalNappies += d.totalNappies
    })

    const days = chartData.length
    return {
      formula: {
        total: totalFormula,
        avg: days ? Math.round(totalFormula / days) : 0,
      },
      breast: {
        total: totalBreast,
        avg: days ? Math.round((totalBreast / days) * 10) / 10 : 0,
      },
      nappies: {
        total: totalNappies,
        wet: totalWet,
        dirty: totalDirty,
        both: totalBoth,
        avg: days ? Math.round((totalNappies / days) * 10) / 10 : 0,
      },
    }
  }, [chartData])

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 border border-border p-3 rounded-xl shadow-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
          {payload.map((pld: any) => (
            <p key={pld.name} className="text-sm font-bold" style={{ color: pld.color || pld.fill }}>
              {pld.name}: {pld.value} {unit}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Pre-mounting skeleton view to match SSR hydration
  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-muted rounded-lg" />
          <div className="flex-1 h-10 bg-muted rounded-lg" />
        </div>
        <div className="h-44 bg-muted/50 rounded-2xl" />
        <div className="h-64 bg-muted/30 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center bg-muted/30 p-1 rounded-xl border border-muted/50">
        <button
          onClick={() => setRange('7d')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            range === '7d' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setRange('30d')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            range === '30d' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Last 30 Days
        </button>
      </div>

      {/* Category Tabs: Feeds vs Nappies */}
      <div className="flex gap-3">
        <button
          onClick={() => setCategory('feeds')}
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
          onClick={() => setCategory('nappies')}
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

      {/* Subcategory selection for Feeds */}
      {category === 'feeds' && (
        <div className="flex gap-2 bg-muted/15 p-1 rounded-xl border border-muted/30">
          <button
            onClick={() => setFeedSubtype('formula')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              feedSubtype === 'formula'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GlassWater className="w-3.5 h-3.5" />
            Formula (ml)
          </button>
          <button
            onClick={() => setFeedSubtype('breast')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              feedSubtype === 'breast'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Breast (mins)
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {category === 'feeds' ? (
          feedSubtype === 'formula' ? (
            <>
              <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Formula</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{summary.formula.total} ml</p>
              </div>
              <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Daily Avg</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.formula.avg} ml</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Duration</p>
                <p className="text-2xl font-bold text-sky-400 mt-1">{summary.breast.total} min</p>
              </div>
              <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Daily Avg</p>
                <p className="text-2xl font-bold text-foreground mt-1">{summary.breast.avg} min</p>
              </div>
            </>
          )
        ) : (
          <>
            <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Nappies</p>
              <p className="text-2xl font-bold text-violet-400 mt-1">{summary.nappies.total}</p>
            </div>
            <div className="bg-muted/30 border border-muted/50 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Daily Avg</p>
              <p className="text-2xl font-bold text-foreground mt-1">{summary.nappies.avg}</p>
            </div>
          </>
        )}
      </div>

      {/* Chart Section */}
      <div className="bg-muted/20 border border-muted/30 rounded-2xl p-4 h-80 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">
          {category === 'feeds'
            ? feedSubtype === 'formula'
              ? 'Formula volume over time'
              : 'Breast feed minutes over time'
            : 'Nappy changes breakdown'}
        </h3>
        
        <div className="flex-1 w-full h-full text-xs">
          {category === 'feeds' ? (
            feedSubtype === 'formula' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFormula" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip unit="ml" />} cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="formulaMl"
                    name="Formula"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFormula)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBreast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip unit="mins" />} cursor={{ stroke: 'rgba(14,165,233,0.2)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="breastMins"
                    name="Breast Duration"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBreast)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" tickLine={false} />
                <YAxis stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="wet" name="Wet" stackId="nappy" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="dirty" name="Dirty" stackId="nappy" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="both" name="Both" stackId="nappy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Legends for Nappies */}
      {category === 'nappies' && (
        <div className="flex justify-center gap-4 bg-muted/10 p-3 rounded-xl border border-muted/30 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-muted-foreground">Wet ({summary.nappies.wet})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-orange-500 rounded-sm" />
            <span className="text-muted-foreground">Dirty ({summary.nappies.dirty})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-purple-500 rounded-sm" />
            <span className="text-muted-foreground">Both ({summary.nappies.both})</span>
          </div>
        </div>
      )}
    </div>
  )
}
