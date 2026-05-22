'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Clock3, Home, Settings } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: Clock3 },
  { href: '/appointments', label: 'Appts', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-none fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border safe-area-pb">
      <div className="flex justify-around py-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors min-w-[80px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
