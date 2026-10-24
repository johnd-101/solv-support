'use client'
import { KpiChartDatum, Theme } from '@/lib/types'

export function KpiDonut({ data, total, theme }: { data: KpiChartDatum[]; total: number; theme: Theme }) {
  const safeTotal = Math.max(total, 1)
  const radius = 44
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center justify-center gap-5 min-h-[190px]">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} strokeWidth="16" />
          {data.map((item, i) => {
            const length = (item.value / safeTotal) * circumference
            const circle = (
              <circle
                key={`${item.label}-${i}`}
                cx="60" cy="60" r={radius} fill="none"
                stroke={item.color || '#3b82f6'}
                strokeWidth="16"
                strokeDasharray={`${Math.max(length, item.value > 0 ? 0.5 : 0)} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            )
            offset += length
            return circle
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-black">{total}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total</div>
        </div>
      </div>
      <div className="space-y-3 min-w-0">
        {data.map((item) => {
          const pct = total ? Math.round((item.value / total) * 100) : 0
          return (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color || '#3b82f6' }} />
              <span className="text-xs font-bold truncate">{item.label}</span>
              <span className="text-xs font-black ml-auto">{item.value}</span>
              <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}