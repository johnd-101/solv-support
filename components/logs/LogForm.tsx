'use client'
import { LogRow, Practice, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'

export function LogForm({
  open, onClose, theme, form, setForm, onSave, editing, practices, onPracticeSelect,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  form: any
  setForm: (f: any) => void
  onSave: () => void
  editing: LogRow | null
  practices: Practice[]
  onPracticeSelect: (id: string) => void
}) {
  if (!open) return null
  const inputCls = `h-11 rounded-xl border px-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader title={`${editing ? 'Edit' : 'New'} Log`} onClose={onClose} theme={theme} />
      <div className="flex flex-col gap-3 mt-5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Practice *</label>
        <select
          value={form.practice_id || ''}
          onChange={(e) => onPracticeSelect(e.target.value)}
          className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}
        >
          <option value="">-- Select Practice --</option>
          {practices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.practice_number ? `#${p.practice_number} - ` : ''}{p.practice_name} ({p.product})
            </option>
          ))}
        </select>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Practice Number</label>
          <input
            value={form.practice_number || ''}
            disabled readOnly
            placeholder="Select practice to auto-fill number"
            className={`h-11 w-full rounded-xl border px-4 text-sm font-black cursor-not-allowed mt-1 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={`h-11 rounded-xl border px-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}>
            <option>Solv Optics</option><option>Solv Physio</option><option>Solv Meds</option><option>Solv Dental</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`h-11 rounded-xl border px-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <option>Open</option><option>In Progress</option><option>Closed</option>
          </select>
        </div>
        <textarea value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Issue * - What is the problem?" rows={3} className={`rounded-xl border p-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
        <textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="Solution - How was it fixed?" rows={3} className={`rounded-xl border p-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`} />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className={`rounded-xl border p-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={onClose} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button>
        <button onClick={onSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save Log</button>
      </div>
    </Modal>
  )
}