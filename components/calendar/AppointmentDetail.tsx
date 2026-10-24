'use client'
import { Appointment, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'

export function AppointmentDetail({
  appointment, onClose, theme, onEdit, onDelete,
}: {
  appointment: Appointment | null
  onClose: () => void
  theme: Theme
  onEdit: (a: Appointment) => void
  onDelete: (a: Appointment) => void
}) {
  if (!appointment) return null
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader title={appointment.title} onClose={onClose} theme={theme} />
      <div className="mt-4 text-sm">
        <div>{appointment.date} • {appointment.start_time}-{appointment.end_time}</div>
        <div className="mt-2">{appointment.description}</div>
        <div className="mt-1 text-xs text-slate-500">{appointment.location}</div>
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={() => onEdit(appointment)} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button>
        <button onClick={() => onDelete(appointment)} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button>
      </div>
    </Modal>
  )
}