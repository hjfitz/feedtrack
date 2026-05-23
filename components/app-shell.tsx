import { BottomNav } from '@/components/bottom-nav'
import { formatAppDate } from '@/lib/timezone'

export function AppShell({ children }: { children: React.ReactNode }) {
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
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
