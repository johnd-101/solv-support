'use client'
import { Practice, Theme } from '@/lib/types'
import { Modal, ModalHeader } from '@/components/ui/Modal'

export function PracticeForm({
  open, onClose, theme, form, setForm, onSave, editing,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  form: any
  setForm: (f: any) => void
  onSave: () => void
  editing: Practice | null
}) {
  if (!open) return null
  const inputCls = `h-11 rounded-xl border px-4 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
  return (
    <Modal onClose={onClose} theme={theme}>
      <ModalHeader title={`${editing ? 'Edit' : 'New'} Practice`} onClose={onClose} theme={theme} />
      <div className="flex flex-col gap-3 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <input value={form.practice_name ?? ''} onChange={(e) => setForm({ ...form, practice_name: e.target.value })} placeholder="Practice Name *" className={`col-span-2 ${inputCls}`} />
          <input value={form.practice_number ?? ''} onChange={(e) => setForm({ ...form, practice_number: e.target.value })} placeholder="Practice No." className={`${inputCls} font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.contact_person ?? ''} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Contact Person" className={inputCls} />
          <select value={form.product ?? 'Solv Optics'} onChange={(e) => setForm({ ...form, product: e.target.value })} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}>
            <option>Solv Optics</option><option>Solv Physio</option><option>Solv Meds</option><option>Solv Dental</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputCls} />
          <input value={form.mobile ?? ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile" className={inputCls} />
        </div>
        <input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls} />
        <input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className={inputCls} />
        <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} className={`rounded-xl border p-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={onClose} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button>
        <button onClick={onSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button>
      </div>
    </Modal>
  )
}