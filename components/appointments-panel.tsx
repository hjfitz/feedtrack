'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { addAppointmentAction, deleteAppointmentAction, updateAppointmentAction } from '@/app/actions/tracker'
import type { Appointment } from '@/lib/types'

function formatDate(date: Date): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function AppointmentForm({
  appointment,
  onCancel,
}: {
  appointment?: Appointment
  onCancel: () => void
}) {
  const [title, setTitle] = useState(appointment?.title || '')
  const [dateTime, setDateTime] = useState(appointment ? toDateTimeLocalValue(appointment.dateTime) : '')
  const [notes, setNotes] = useState(appointment?.notes || '')
  const [isPast, setIsPast] = useState(Boolean(appointment?.isPast))
  const [isPending, startTransition] = useTransition()
  const action = appointment ? updateAppointmentAction : addAppointmentAction

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await action(formData)
          onCancel()
        })
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{appointment ? 'Edit Appointment' : 'New Appointment'}</h3>
        <button type="button" onClick={onCancel} className="p-2 text-muted-foreground" aria-label="Close form" title="Close form">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {appointment && <input type="hidden" name="id" value={appointment.id} />}
      <input type="text" name="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Appointment title" className="w-full px-4 py-4 rounded-xl bg-muted text-foreground text-lg placeholder:text-muted-foreground" required />
      <input type="datetime-local" name="dateTime" value={dateTime} onChange={e => setDateTime(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-muted text-foreground text-lg" required />
      <textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="w-full px-4 py-4 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground resize-none" />
      <label className="flex items-center gap-3 py-2">
        <input type="checkbox" name="isPast" checked={isPast} onChange={e => setIsPast(e.target.checked)} className="w-5 h-5 rounded bg-muted" />
        <span className="text-muted-foreground">This is a past appointment</span>
      </label>
      <button type="submit" disabled={!title || !dateTime || isPending} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold disabled:opacity-50 active:opacity-80 transition-opacity">
        {isPending ? 'Saving...' : 'Save Appointment'}
      </button>
    </form>
  )
}

function AppointmentCard({ appointment, muted }: { appointment: Appointment; muted?: boolean }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="p-4 rounded-xl bg-muted/40">
        <AppointmentForm appointment={appointment} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className={`flex items-start justify-between p-4 rounded-xl ${muted ? 'bg-muted/30 opacity-70' : 'bg-muted/50'}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{appointment.title}</p>
        <p className="text-sm text-muted-foreground">{formatDate(appointment.dateTime)} at {formatTime(appointment.dateTime)}</p>
        {appointment.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{appointment.notes}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit appointment" title="Edit appointment">
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
        <form action={deleteAppointmentAction}>
          <input type="hidden" name="id" value={appointment.id} />
          <button type="submit" className="p-2 text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete appointment" title="Delete appointment">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}

export function AppointmentsPanel({ upcoming, past }: { upcoming: Appointment[]; past: Appointment[] }) {
  const [showForm, setShowForm] = useState(false)
  const appointments = [...upcoming, ...past]

  if (showForm) {
    return <AppointmentForm onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground mb-2 px-1">Upcoming</h3>
          <div className="flex flex-col gap-2">
            {upcoming.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground mb-2 px-1">Past</h3>
          <div className="flex flex-col gap-2">
            {past.slice(0, 5).map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} muted />)}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No appointments yet</p>
        </div>
      )}

      <button onClick={() => setShowForm(true)} className="w-full py-4 rounded-2xl bg-muted text-foreground text-lg font-medium active:bg-muted/70 transition-colors">
        + Add Appointment
      </button>
    </div>
  )
}
