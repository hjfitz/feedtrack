'use client'

import { useState } from 'react'
import { formatAppDateTimeLocal } from '@/lib/timezone'
import { TIMESTAMP_OFFSET_OPTIONS } from '@/lib/logging-options'

interface TimestampControlProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  inputClassName?: string
  offsetClassName?: string
  offsetButtonClassName?: string
  offsetActiveButtonClassName?: string
  offsetInactiveButtonClassName?: string
  compactOffsetLabels?: boolean
  showOffsets?: boolean
}

export function TimestampControl({
  id,
  label = 'Date & time',
  value,
  onChange,
  disabled,
  className = 'flex flex-col gap-2',
  inputClassName = 'h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-45',
  offsetClassName = 'grid grid-cols-4 gap-2',
  offsetButtonClassName = 'h-12 rounded-xl border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
  offsetActiveButtonClassName = 'border-foreground bg-foreground text-background shadow-sm',
  offsetInactiveButtonClassName = 'border-muted/60 bg-muted/70 text-muted-foreground hover:border-muted hover:bg-muted hover:text-foreground',
  compactOffsetLabels = false,
  showOffsets = true,
}: TimestampControlProps) {
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null)

  function setOffset(minutesAgo: number) {
    setSelectedOffset(minutesAgo)
    onChange(formatAppDateTimeLocal(new Date(Date.now() - minutesAgo * 60000)))
  }

  function setManualValue(value: string) {
    setSelectedOffset(null)
    onChange(value)
  }

  return (
    <div className={className}>
      {label && id ? <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label> : null}
      {label && !id ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(event) => setManualValue(event.target.value)}
        disabled={disabled}
        className={inputClassName}
      />
      {showOffsets && (
        <div className={offsetClassName}>
          {TIMESTAMP_OFFSET_OPTIONS.map(option => {
            const active = selectedOffset === option.minutesAgo
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setOffset(option.minutesAgo)}
                disabled={disabled}
                aria-pressed={active}
                className={`${offsetButtonClassName} ${active ? offsetActiveButtonClassName : offsetInactiveButtonClassName}`}
              >
                {compactOffsetLabels ? option.compactLabel : option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
