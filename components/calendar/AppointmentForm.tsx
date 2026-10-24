'use client'
import { Appointment, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'

export function AppointmentForm({
  open, onClose, theme, form, setForm, onSave, editing,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  form: any
  setForm: (f: any) => void
  onSave: () => void
  editing: Appointment | null
}) {
  if (!open) return null
  const inputCls = `h-11 rounded-xl border px-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader title={`${editing ? 'Edit' : 'New'} Appointment`} onClose={onClose} theme={theme} />
      <div className="flex flex-col gap-3 mt-5">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`h-11 rounded-xl border px-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <option>Demo</option><option>Call</option><option>Login</option><option>Personal</option><option>Training</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls} />
          <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputCls} />
        </div>
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className={inputCls} />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className={`rounded-xl border p-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={onClose} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button>
        <button onClick={onSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button>
      </div>
    </Modal>
  )
}