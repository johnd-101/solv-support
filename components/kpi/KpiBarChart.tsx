'use client'
import { KpiChartDatum, Theme } from '@/lib/types'

export function KpiBarChart({
  data, theme, horizontal = false,
}: { data: KpiChartDatum[]; theme: Theme; horizontal?: boolean }) {
  const max = Math.max(1, ...data.map((x) => x.value))
  if (horizontal) {
    return (
      <div className="space-y-3 py-1">
        {data.map((item) => (
          <div key={item.label} className="grid grid-cols-[minmax(80px,1fr)_minmax(90px,2fr)_34px] items-center gap-2">
            <div className="text-xs font-bold truncate" title={item.label}>{item.label}</div>
            <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color || 'linear-gradient(90deg,#2563eb,#38bdf8)',
                }}
              />
            </div>
            <div className="text-xs font-black text-right">{item.value}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-52 flex items-end gap-2 sm:gap-3 pt-3">
      {data.map((item) => {
        const height = item.value ? Math.max(6, Math.round((item.value / max) * 100)) : 2
        return (
          <div key={item.label} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5">
            <div className="text-[10px] font-black">{item.value}</div>
            <div className="w-full max-w-12 h-full flex items-end">
              <div
                className="w-full rounded-t-xl transition-all duration-500"
                style={{ height: `${height}%`, background: item.color || 'linear-gradient(180deg,#38bdf8,#2563eb)' }}
              />
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 truncate max-w-full">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}