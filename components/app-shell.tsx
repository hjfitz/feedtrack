import { BottomNav } from '@/components/bottom-nav'
import { formatAppDate } from '@/lib/timezone'

function babySubtitle(name?: string, dob?: string) {
  if (!name || !dob) return ''

  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return ''

  const ageDays = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (24 * 60 * 60 * 1000)))
  const weeks = Math.floor(ageDays / 7)
  const days = ageDays % 7
  return `${name} · ${weeks}w ${days}d`
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
  const subtitle = babySubtitle(babyName, babyDob)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-none px-4 pt-12 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Baby Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatAppDate(new Date(), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>}
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
