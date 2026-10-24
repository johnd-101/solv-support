'use client'
import { LogRow, Practice, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'
import { PracticeNumberBadge } from '@/components/ui/Badge'

export function LogDetail({
  log, practices, onClose, theme, onEdit, onDelete,
}: {
  log: LogRow | null
  practices: Practice[]
  onClose: () => void
  theme: Theme
  onEdit: (l: LogRow) => void
  onDelete: (l: LogRow) => void
}) {
  if (!log) return null
  const linked = log.practice_id ? practices.find((p) => p.id === log.practice_id) : practices.find((p) => p.practice_name === log.practice_name)
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader title="Log Detail" onClose={onClose} theme={theme} />
      <div className="mt-4">
        <div className="font-bold text-sm flex items-center gap-2">
          <PracticeNumberBadge number={linked?.practice_number || log.practice_number || ''} />
          {log.practice_name} • {log.status}
        </div>
        <div className="mt-3 text-sm whitespace-pre-wrap"><b>Issue:</b> {log.issue}</div>
        <div className="mt-2 text-sm whitespace-pre-wrap"><b>Solution:</b> {log.solution}</div>
        <div className="mt-2 text-xs text-slate-500">{log.notes}</div>
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={() => onEdit(log)} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button>
        <button onClick={() => onDelete(log)} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button>
      </div>
    </Modal>
  )
}