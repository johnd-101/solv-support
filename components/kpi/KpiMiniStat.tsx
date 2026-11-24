'use client'
import { Theme } from '@/lib/types'

export function KpiMiniStat({
  label, value, sub, theme,
}: { label: string; value: string | number; sub: string; theme: Theme }) {
  return (
    <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
      <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}