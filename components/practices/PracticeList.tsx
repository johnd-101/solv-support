'use client'
import { Practice, Theme } from '@/lib/types'
import { PracticeNumberBadge } from '@/components/ui/Badge'

export function PracticeList({
  practices, theme, onSelect, onDelete, onNew,
}: {
  practices: Practice[]
  theme: Theme
  onSelect: (p: Practice) => void
  onDelete: (id: string, name: string) => Promise<boolean>
  onNew: () => void
}) {
  return (
    <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-800' : 'border-blue-50'}`}>
        <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Practices • {practices.length}</h3>
        <button onClick={onNew} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Practice</button>
      </div>
      <div className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-blue-50'}`}>
        {practices.map((p) => (
          <div key={p.id} onClick={() => onSelect(p)} className={`p-4 flex justify-between items-center cursor-pointer group ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate flex items-center gap-2">
                <PracticeNumberBadge number={p.practice_number} />
                <span>{p.practice_name}</span>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {p.contact_person} • {p.phone || p.mobile} • <span className="font-bold text-blue-600">{p.product}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={async (e) => { e.stopPropagation(); if (!confirm(`Delete "${p.practice_name}"?`)) return; await onDelete(p.id, p.practice_name) }}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition"
              >🗑</button>
              <span className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">›</span>
            </div>
          </div>
        ))}
        {practices.length === 0 && <div className="p-10 text-center text-sm text-slate-400">No practices found</div>}
      </div>
    </div>
  )
}