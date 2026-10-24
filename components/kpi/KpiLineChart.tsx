'use client'
import { KpiChartDatum, Theme } from '@/lib/types'

export function KpiLineChart({
  data, data2, theme,
}: { data: KpiChartDatum[]; data2?: KpiChartDatum[]; theme: Theme }) {
  const width = 700
  const height = 230
  const pad = { l: 34, r: 18, t: 22, b: 34 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const max = Math.max(1, ...data.map((x) => x.value), ...(data2 || []).map((x) => x.value))
  const point = (value: number, index: number, length: number) => {
    const x = pad.l + (length <= 1 ? plotW / 2 : (index / (length - 1)) * plotW)
    const y = pad.t + plotH - (value / max) * plotH
    return { x, y }
  }
  const points = data.map((d, i) => point(d.value, i, data.length))
  const points2 = data2?.map((d, i) => point(d.value, i, data2.length)) || []
  const poly = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')
  const grid = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-56">
        {grid.map((ratio, i) => {
          const y = pad.t + plotH - ratio * plotH
          return <line key={i} x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} strokeWidth="1" />
        })}
        <polyline fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={poly(points)} />
        {data2 && <polyline fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={poly(points2)} />}
        {points.map((p, i) => <circle key={`a-${i}`} cx={p.x} cy={p.y} r="5" fill="#2563eb" stroke={theme === 'dark' ? '#0f172a' : 'white'} strokeWidth="3" />)}
        {points2.map((p, i) => <circle key={`b-${i}`} cx={p.x} cy={p.y} r="5" fill="#8b5cf6" stroke={theme === 'dark' ? '#0f172a' : 'white'} strokeWidth="3" />)}
        {data.map((d, i) => {
          const p = points[i]
          return <text key={`t-${i}`} x={p.x} y={height - 10} textAnchor="middle" className="fill-slate-500" fontSize="12" fontWeight="700">{d.label}</text>
        })}
      </svg>
    </div>
  )
}