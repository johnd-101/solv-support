'use client'
import { Practice, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'
import { PracticeNumberBadge } from '@/components/ui/Badge'

export function PracticeDetail({
  practice, onClose, theme, onEdit, onDelete,
}: {
  practice: Practice | null
  onClose: () => void
  theme: Theme
  onEdit: (p: Practice) => void
  onDelete: (p: Practice) => void
}) {
  if (!practice) return null
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader
        title={practice.practice_name}
        onClose={onClose}
        theme={theme}
      />
      <div className="mt-4 text-xs space-y-1 text-slate-600 dark:text-slate-300">
        <div className="mb-2"><PracticeNumberBadge number={practice.practice_number} /></div>
        <div><b>Practice No:</b> {practice.practice_number || '—'}</div>
        <div><b>Contact:</b> {practice.contact_person}</div>
        <div><b>Phone:</b> {practice.phone} {practice.mobile && ` / ${practice.mobile}`}</div>
        <div><b>Email:</b> {practice.email}</div>
        <div><b>Product:</b> {practice.product}</div>
        <div><b>Address:</b> {practice.address}</div>
        <div className="pt-2 text-sm">{practice.notes}</div>
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={() => onEdit(practice)} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button>
        <button onClick={() => onDelete(practice)} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button>
      </div>
    </Modal>
  )
}