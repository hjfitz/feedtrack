'use client'

import { useEffect, useState } from 'react'

interface OptionalNoteProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  buttonLabel?: string
  rows?: number
  maxLength?: number
  textareaClassName?: string
  buttonClassName?: string
}

export function OptionalNote({
  value,
  onChange,
  disabled,
  placeholder = 'Optional note',
  buttonLabel = 'Add note',
  rows = 2,
  maxLength = 280,
  textareaClassName = 'rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-45',
  buttonClassName = 'h-9 self-center rounded-lg border border-muted/50 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-muted hover:bg-muted/35 hover:text-foreground disabled:opacity-45',
}: OptionalNoteProps) {
  const [open, setOpen] = useState(Boolean(value))

  useEffect(() => {
    if (value) setOpen(true)
  }, [value])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} className={buttonClassName}>
        {buttonLabel}
      </button>
    )
  }

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      className={textareaClassName}
    />
  )
}
