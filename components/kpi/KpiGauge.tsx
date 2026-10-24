'use client'
import { Theme } from '@/lib/types'

export function KpiGauge({
  value, label, theme, color = '#2563eb',
}: { value: number; label: string; theme: Theme; color?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 40
  const circumference = Math.PI * radius
  const filled = (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg viewBox="0 0 120 70" className="w-32 h-20">
        <path d="M 10 60 A 40 40 0 0 1 110 60" fill="none" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} strokeWidth="12" strokeLinecap="round" />
        <path
          d="M 10 60 A 40 40 0 0 1 110 60"
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-all duration-700"
        />
        <text x="60" y="52" textAnchor="middle" className={`font-black ${theme === 'dark' ? 'fill-white' : 'fill-slate-900'}`} fontSize="18">{Math.round(clamped)}%</text>
      </svg>
      <div className="text-xs font-bold text-slate-500 text-center mt-1">{label}</div>
    </div>
  )
}