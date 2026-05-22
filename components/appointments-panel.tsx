'use client'

import { useState, useCallback } from 'react'
import { useStorage, useAppointments } from '@/hooks/use-storage'

function formatDate(date: Date): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  
  if (isToday) return 'Today'
  if (isTomorrow) return 'Tomorrow'
  
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function AppointmentsPanel() {
  const storage = useStorage()
  const { appointments } = useAppointments()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isPast, setIsPast] = useState(false)

  const now = new Date()
  const upcoming = appointments.filter(a => !a.isPast && a.dateTime >= now)
  const past = appointments.filter(a => a.isPast || a.dateTime < now)

  const handleSubmit = useCallback(async () => {
    if (!title || !dateTime) return
    
    await storage.addAppointment({
      title,
      dateTime: new Date(dateTime),
      notes: notes || undefined,
      isPast,
    })
    
    setTitle('')
    setDateTime('')
    setNotes('')
    setIsPast(false)
    setShowForm(false)
  }, [storage, title, dateTime, notes, isPast])

  const handleDelete = useCallback(async (id: string) => {
    await storage.deleteAppointment(id)
  }, [storage])

  if (showForm) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Appointment</h3>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 text-muted-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Appointment title"
          className="w-full px-4 py-4 rounded-xl bg-muted text-foreground text-lg placeholder:text-muted-foreground"
        />

        <input
          type="datetime-local"
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          className="w-full px-4 py-4 rounded-xl bg-muted text-foreground text-lg"
        />

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={3}
          className="w-full px-4 py-4 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground resize-none"
        />

        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={isPast}
            onChange={e => setIsPast(e.target.checked)}
            className="w-5 h-5 rounded bg-muted"
          />
          <span className="text-muted-foreground">This is a past appointment</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!title || !dateTime}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold disabled:opacity-50 active:opacity-80 transition-opacity"
        >
          Save Appointment
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground mb-2 px-1">Upcoming</h3>
          <div className="flex flex-col gap-2">
            {upcoming.map(apt => (
              <div
                key={apt.id}
                className="flex items-start justify-between p-4 rounded-xl bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{apt.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(apt.dateTime)} at {formatTime(apt.dateTime)}
                  </p>
                  {apt.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {apt.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(apt.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground mb-2 px-1">Past</h3>
          <div className="flex flex-col gap-2">
            {past.slice(0, 5).map(apt => (
              <div
                key={apt.id}
                className="flex items-start justify-between p-4 rounded-xl bg-muted/30 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{apt.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(apt.dateTime)} at {formatTime(apt.dateTime)}
                  </p>
                  {apt.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {apt.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(apt.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {appointments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No appointments yet</p>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-4 rounded-2xl bg-muted text-foreground text-lg font-medium active:bg-muted/70 transition-colors"
      >
        + Add Appointment
      </button>
    </div>
  )
}
