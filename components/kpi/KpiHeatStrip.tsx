'use client'
import { Theme } from '@/lib/types'

export function KpiHeatStrip({ data, theme }: { data: { label: string; value: number }[]; theme: Theme }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      <div className="flex gap-1 items-end h-24">
        {data.map((d, i) => {
          const intensity = d.value / max
          const h = Math.max(4, Math.round(intensity * 80))
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.label}: ${d.value}`}>
              <div className="text-[9px] font-black text-slate-500 opacity-0 group-hover:opacity-100">{d.value}</div>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${h}px`,
                  background: d.value === 0 ? (theme === 'dark' ? '#1e293b' : '#e2e8f0') : `rgba(37, 99, 235, ${0.3 + intensity * 0.7})`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-[8px] text-center text-slate-400 font-bold truncate">{d.label}</div>
        ))}
      </div>
    </div>
  )
}