'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Clock3, Home, Settings } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: Clock3 },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm lg:hidden">
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
