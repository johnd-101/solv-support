'use client'
import { LogRow, Practice, Theme } from '@/lib/types'
import { statusStyle, normalizeProduct } from '@/lib/helpers'
import { PracticeNumberBadge } from '@/components/ui/Badge'

export function LogList({
  logs, practices, theme, statusFilter, onStatusFilter, onSelect, onNew,
}: {
  logs: LogRow[]
  practices: Practice[]
  theme: Theme
  statusFilter: string
  onStatusFilter: (s: any) => void
  onSelect: (l: LogRow) => void
  onNew: () => void
}) {
  const getPracticeForLog = (log: LogRow) => {
    if (log.practice_id) return practices.find((p) => p.id === log.practice_id)
    return practices.find((p) => p.practice_name === log.practice_name)
  }

  return (
    <div className={`rounded-2xl border shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] overflow-hidden backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
      <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center ${theme === 'dark' ? 'border-slate-800' : 'border-blue-50'}`}>
        <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs • {statusFilter}</h3>
        <button onClick={onNew} className="h-10 w-full sm:w-auto px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Log</button>
      </div>
      <div className={`flex gap-2 p-3 border-b overflow-x-auto scrollbar-none ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-blue-50/50 border-blue-50'}`}>
        {(['All', 'Open', 'In Progress', 'Closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusFilter(s)}
            className={`h-8 px-4 rounded-full text-xs font-bold border whitespace-nowrap transition shrink-0 ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black shadow-sm' : theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-blue-100 text-slate-500'}`}
          >{s}</button>
        ))}
      </div>
      <div className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-blue-50'}`}>
        {logs.map((l) => {
          const st = statusStyle(l.status)
          const linked = getPracticeForLog(l)
          return (
            <div key={l.id} onClick={() => onSelect(l)} className={`p-4 flex justify-between gap-3 cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate flex items-center gap-2">
                  <PracticeNumberBadge number={linked?.practice_number || l.practice_number || ''} />
                  <span>{l.practice_name}</span>
                  <span className="font-normal text-xs text-slate-400 ml-1">{normalizeProduct(l.product)}</span>
                </div>
                <div className="text-xs text-slate-500 line-clamp-2 mt-1">{l.issue}</div>
              </div>
              <span style={{ background: st.bg, color: st.color, borderColor: st.border }} className="h-fit text-xs font-bold px-3 py-1.5 rounded-full border shrink-0">{l.status}</span>
            </div>
          )
        })}
        {logs.length === 0 && <div className="p-10 text-center text-sm text-slate-400">No logs</div>}
      </div>
    </div>
  )
}