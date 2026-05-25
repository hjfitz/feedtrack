import Link from 'next/link'
import { BarChart2, Clock3, Home, Settings } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { formatAppDate } from '@/lib/timezone'

const desktopNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: Clock3 },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

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
      <header className="flex-none px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-4 lg:border-b lg:border-border lg:px-8 lg:pt-6">
        <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">{trackerTitle(babyName)}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateLabel}{age ? ` · ${age}` : ''}
            </p>
          </div>
          <nav className="hidden items-center gap-1 rounded-xl border border-border bg-muted/20 p-1 lg:flex" aria-label="Primary">
            {desktopNav.map(item => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-24 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
