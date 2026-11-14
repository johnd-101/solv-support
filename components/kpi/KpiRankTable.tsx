'use client'
import { Theme } from '@/lib/types'

export function KpiRankTable({
  rows, theme, valueLabel = 'count',
}: { rows: { name: string; value: number; extra?: string; color?: string }[]; theme: Theme; valueLabel?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="space-y-2">
      <div className={`grid grid-cols-[24px_1fr_60px] text-[10px] font-black uppercase tracking-widest text-slate-400 pb-1 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
        <div>#</div><div>Name</div><div className="text-right">{valueLabel}</div>
      </div>
      {rows.map((r, i) => (
        <div key={`${r.name}-${i}`} className="grid grid-cols-[24px_1fr_60px] items-center gap-1 py-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
            i === 0 ? 'bg-amber-400 text-white'
              : i === 1 ? 'bg-slate-300 text-white'
              : i === 2 ? 'bg-orange-400 text-white'
              : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
          }`}>{i + 1}</div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{r.name}</div>
            {r.extra && <div className="text-[10px] text-slate-400 truncate">{r.extra}</div>}
            <div className={`h-1 rounded-full mt-1 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color || '#3b82f6' }} />
            </div>
          </div>
          <div className="text-xs font-black text-right">{r.value}</div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-sm text-slate-400 text-center py-4">No data</div>}
    </div>
  )
}