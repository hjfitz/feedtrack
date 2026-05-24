import { AppShell } from '@/components/app-shell'
import { Skeleton } from '@/components/ui/skeleton'

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-muted/50 p-4 border border-muted">
      <Skeleton className="mx-auto h-3 w-20" />
      <Skeleton className="mx-auto mt-3 h-8 w-24" />
      <Skeleton className="mx-auto mt-2 h-4 w-16" />
    </div>
  )
}

function ButtonGridSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: rows * 3 }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-2xl" />
      ))}
    </div>
  )
}

export function HomeLoadingBody() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="rounded-2xl bg-muted/30 p-4 border border-muted/50">
        <Skeleton className="h-3 w-14" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-xl bg-muted/40 border border-muted/60 px-2 py-3">
              <Skeleton className="mx-auto h-3 w-12" />
              <div className="mt-3 flex flex-col gap-2">
                <Skeleton className="mx-auto h-3 w-14" />
                <Skeleton className="mx-auto h-3 w-12" />
                <Skeleton className="mx-auto h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <Skeleton className="h-3 w-9" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <Skeleton className="h-3 w-12" />
        <ButtonGridSkeleton />
        <Skeleton className="h-3 w-16" />
        <ButtonGridSkeleton />
      </div>
    </div>
  )
}

export function HistoryLoadingBody() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 flex-1 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-11 rounded-xl" />

      {Array.from({ length: 3 }, (_, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <div className="rounded-xl bg-muted/30 border border-muted/50 px-4">
            {Array.from({ length: 3 }, (_, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsLoadingBody() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between gap-2 rounded-xl border border-muted/50 bg-muted/30 p-1">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-muted/30 border border-muted/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function SettingsLoadingBody() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <section key={sectionIndex} className="rounded-xl bg-muted/40 border border-muted p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-52" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </section>
      ))}
    </div>
  )
}

export function AuthLoadingBody() {
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <Skeleton className="mx-auto mt-8 h-5 w-44" />
      </div>
    </div>
  )
}

export function AppPageLoading({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
