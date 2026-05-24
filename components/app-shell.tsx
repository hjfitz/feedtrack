import { BottomNav } from '@/components/bottom-nav'
import { formatAppDate } from '@/lib/timezone'

function babyAge(dob?: string) {
  if (!dob) return ''

  const birthDate = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return ''

  const ageDays = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (24 * 60 * 60 * 1000)))
  const weeks = Math.floor(ageDays / 7)
  const days = ageDays % 7
  return `${weeks}w ${days}d`
}

function trackerTitle(name?: string) {
  const trimmedName = name?.trim()
  if (!trimmedName) return 'Baby Tracker'
  return `${trimmedName}${trimmedName.endsWith('s') ? "'" : "'s"} Tracker`
}

export function AppShell({
  children,
  babyName,
  babyDob,
}: {
  children: React.ReactNode
  babyName?: string
  babyDob?: string
}) {
  const age = babyAge(babyDob)
  const dateLabel = formatAppDate(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-none px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{trackerTitle(babyName)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateLabel}{age ? ` · ${age}` : ''}
          </p>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
