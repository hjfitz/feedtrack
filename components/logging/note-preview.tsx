'use client'

import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'

interface NotePreviewProps {
  note?: string
  className?: string
}

export function NotePreview({ note, className = '' }: NotePreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const cleanNote = note?.trim()
  if (!cleanNote) return null

  const preview = cleanNote.length > 42 ? `${cleanNote.slice(0, 42)}...` : cleanNote

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-muted/50 bg-muted/25 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-muted hover:bg-muted/40 hover:text-foreground"
        aria-expanded={expanded}
      >
        <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{expanded ? 'Hide note' : preview}</span>
      </button>
      {expanded && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-muted/50 bg-background/45 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {cleanNote}
        </p>
      )}
    </div>
  )
}
