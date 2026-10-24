'use client'
import { useMemo, useState } from 'react'
import { Practice, LogRow, Appointment, Message, Theme } from '@/lib/types'
import { PRODUCT_OPTIONS, PRODUCT_COLORS } from '@/lib/constants'
import { apptTypeStyle, normalizeProduct } from '@/lib/helpers'
import { KpiDonut } from './KpiDonut'
import { KpiBarChart } from './KpiBarChart'
import { KpiLineChart } from './KpiLineChart'
import { KpiMiniStat } from './KpiMiniStat'
import { KpiGauge } from './KpiGauge'
import { KpiHeatStrip } from './KpiHeatStrip'
import { KpiRankTable } from './KpiRankTable'

export function KpiDashboard({
  practices, logs, appointments, messages, unreadMessages, theme,
}: {
  practices: Practice[]
  logs: LogRow[]
  appointments: Appointment[]
  messages: Message[]
  unreadMessages: number
  theme: Theme
}) {
  const [view, setView] = useState<'overview' | 'trends' | 'workload' | 'products' | 'practices' | 'performance' | 'time'>('overview')

  // All KPI calculations
  const kpi = useMemo(() => {
    const open = logs.filter((l) => l.status === 'Open').length
    const prog = logs.filter((l) => l.status === 'In Progress').length
    const closed = logs.filter((l) => l.status === 'Closed').length
    const totalLogs = logs.length
    const apptThisMonth = appointments.filter((a) => {
      const d = new Date(a.date)
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()
    }).length
    const byType = (['Demo', 'Call', 'Login', 'Personal', 'Training'] as const).map((t) => ({
      type: t, count: appointments.filter((a) => a.type === t).length,
    }))

    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      months.push({ key, label })
    }
    const logsByMonth = months.map((m) => ({ ...m, count: logs.filter((l) => (l.created_at || '').slice(0, 7) === m.key).length }))
    const apptsByMonth = months.map((m) => ({ ...m, count: appointments.filter((a) => a.date.slice(0, 7) === m.key).length }))

    const byProductMap: Record<string, number> = {}
    PRODUCT_OPTIONS.forEach((o) => (byProductMap[o] = 0))
    logs.forEach((l) => { const k = normalizeProduct(l.product); byProductMap[k] = (byProductMap[k] || 0) + 1 })
    const byProduct = Object.entries(byProductMap).map(([product, count]) => ({ product, count }))

    const byPracticeMap: Record<string, number> = {}
    logs.forEach((l) => { const k = l.practice_name || 'Unknown'; byPracticeMap[k] = (byPracticeMap[k] || 0) + 1 })
    const byPracticeTop = Object.entries(byPracticeMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)

    const practicesByProductMap: Record<string, number> = {}
    PRODUCT_OPTIONS.forEach((o) => (practicesByProductMap[o] = 0))
    practices.forEach((p) => { const k = normalizeProduct(p.product); practicesByProductMap[k] = (practicesByProductMap[k] || 0) + 1 })
    const practicesByProduct = Object.entries(practicesByProductMap).map(([product, count]) => ({ product, count })).filter((x) => x.count > 0 || PRODUCT_OPTIONS.includes(x.product as any))

    const productDeepDive = PRODUCT_OPTIONS.map((prod) => {
      const prodLogs = logs.filter((l) => normalizeProduct(l.product) === prod)
      const prodPractices = practices.filter((p) => normalizeProduct(p.product) === prod)
      const prodOpen = prodLogs.filter((l) => l.status === 'Open').length
      const prodClosed = prodLogs.filter((l) => l.status === 'Closed').length
      const prodProg = prodLogs.filter((l) => l.status === 'In Progress').length
      const resolution = prodLogs.length ? Math.round((prodClosed / prodLogs.length) * 100) : 0
      return {
        product: prod, color: PRODUCT_COLORS[prod] || '#94a3b8',
        totalLogs: prodLogs.length, open: prodOpen, inProgress: prodProg, closed: prodClosed,
        practices: prodPractices.length, resolution,
        logsPerPractice: prodPractices.length ? (prodLogs.length / prodPractices.length).toFixed(1) : '0',
      }
    })

    const practiceHealth = practices.map((p) => {
      const pLogs = logs.filter((l) => l.practice_id === p.id || l.practice_name === p.practice_name)
      const pOpen = pLogs.filter((l) => l.status === 'Open').length
      const pProg = pLogs.filter((l) => l.status === 'In Progress').length
      return {
        name: p.practice_name, number: p.practice_number || '',
        product: normalizeProduct(p.product), contact: p.contact_person || '',
        totalLogs: pLogs.length, open: pOpen, inProgress: pProg,
        health: pOpen === 0 ? 'good' : pOpen <= 2 ? 'watch' : 'attention',
      }
    }).sort((a, b) => b.open - a.open || b.totalLogs - a.totalLogs)

    const resolutionRate = totalLogs ? Math.round((closed / totalLogs) * 100) : 0
    const openRate = totalLogs ? Math.round((open / totalLogs) * 100) : 0
    const inProgressRate = totalLogs ? Math.round((prog / totalLogs) * 100) : 0
    const avgLogsPerPractice = practices.length ? (totalLogs / practices.length).toFixed(1) : '0'
    const avgApptsPerMonth = apptsByMonth.length ? (apptsByMonth.reduce((s, m) => s + m.count, 0) / apptsByMonth.length).toFixed(1) : '0'

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const logsByDay = dayNames.map((day) => ({ day, count: 0 }))
    logs.forEach((l) => {
      if (!l.created_at) return
      const d = new Date(l.created_at)
      if (isNaN(d.getTime())) return
      logsByDay[d.getDay()].count++
    })
    const logsByDayMonFirst = [...logsByDay.slice(1), logsByDay[0]]

    const hourBuckets = Array.from({ length: 8 }, (_, i) => ({ label: `${i * 3}:00`, count: 0 }))
    logs.forEach((l) => {
      if (!l.created_at) return
      const d = new Date(l.created_at)
      if (isNaN(d.getTime())) return
      const bucket = Math.min(7, Math.floor(d.getHours() / 3))
      hourBuckets[bucket].count++
    })

    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const count = logs.filter((l) => (l.created_at || '').slice(0, 10) === dateStr).length
      return { label: d.toLocaleDateString('en-ZA', { day: '2-digit' }), value: count, dateStr }
    })

    const contactMap: Record<string, number> = {}
    logs.forEach((l) => { const c = (l.contact_person || '').trim(); if (c) contactMap[c] = (contactMap[c] || 0) + 1 })
    const topContacts = Object.entries(contactMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)

    const productStatusMatrix = PRODUCT_OPTIONS.map((prod) => {
      const prodLogs = logs.filter((l) => normalizeProduct(l.product) === prod)
      return {
        product: prod, color: PRODUCT_COLORS[prod] || '#94a3b8',
        open: prodLogs.filter((l) => l.status === 'Open').length,
        inProgress: prodLogs.filter((l) => l.status === 'In Progress').length,
        closed: prodLogs.filter((l) => l.status === 'Closed').length,
      }
    })

    return {
      open, prog, closed, totalLogs, apptThisMonth, byType, logsByMonth, apptsByMonth,
      byProduct, byPracticeTop, practicesByProduct, productDeepDive, practiceHealth,
      resolutionRate, openRate, inProgressRate, avgLogsPerPractice, avgApptsPerMonth,
      logsByDayMonFirst, hourBuckets, last14, topContacts, productStatusMatrix,
    }
  }, [logs, appointments, practices])

  const cardCls = `rounded-2xl border p-5 shadow backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`

  return (
    <div className="space-y-5">
      {/* Header + view tabs */}
      <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-blue-50/80 border-blue-100'}`}>
        <h2 className="font-black text-sm tracking-tight">KPI REPORT</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Live performance overview.</p>
        <div className={`flex flex-wrap gap-1 rounded-xl p-1 border mt-3 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-blue-100'}`}>
          {[
            { k: 'overview', l: 'Overview', i: '📊' },
            { k: 'trends', l: 'Trends', i: '📈' },
            { k: 'workload', l: 'Workload', i: '⚖️' },
            { k: 'products', l: 'Products', i: '🏷️' },
            { k: 'practices', l: 'Practices', i: '🏥' },
            { k: 'performance', l: 'Performance', i: '🎯' },
            { k: 'time', l: 'Time', i: '🕐' },
          ].map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k as any)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 ${view === v.k ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span>{v.i}</span>{v.l}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'PRACTICES', v: practices.length, g: 'from-blue-600 to-sky-500', desc: 'Total practices registered' },
          { l: 'TOTAL LOGS', v: kpi.totalLogs, g: 'from-blue-600 to-cyan-500', desc: 'All support logs ever' },
          { l: 'OPEN LOGS', v: kpi.open, g: 'from-amber-500 to-orange-500', desc: 'Needs action now' },
          { l: 'UNREAD MESSAGES', v: unreadMessages, g: 'from-sky-500 to-blue-500', desc: 'Waiting for you to read' },
        ].map((card) => (
          <div key={card.l} className={`rounded-2xl border p-[1.5px] shadow-sm ${theme === 'dark' ? 'border-slate-800' : 'border-blue-100'}`}>
            <div className={`rounded-2xl p-4 h-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="text-xs font-bold tracking-widest text-slate-500">{card.l}</div>
              <div className={`text-2xl font-black mt-1 bg-gradient-to-r ${card.g} bg-clip-text text-transparent`}>{card.v}</div>
              <div className="text-xs text-slate-400 mt-1">{card.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMiniStat label="Resolution rate" value={`${kpi.resolutionRate}%`} sub={`${kpi.closed} closed logs`} theme={theme} />
        <KpiMiniStat label="Open workload" value={`${kpi.openRate}%`} sub={`${kpi.open} logs need action`} theme={theme} />
        <KpiMiniStat label="Team messages" value={messages.length} sub={`${messages.filter((m) => m.pinned).length} pinned`} theme={theme} />
        <KpiMiniStat label="Appointments" value={kpi.apptThisMonth} sub="This month" theme={theme} />
      </div>

      {/* ========== VIEW-SPECIFIC CONTENT ========== */}
      {view === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Log Status Distribution</h3>
              <p className="text-xs text-slate-400 mb-3">Current support workload by status.</p>
              <KpiDonut theme={theme} total={kpi.totalLogs} data={[
                { label: 'Open', value: kpi.open, color: '#3b82f6' },
                { label: 'In Progress', value: kpi.prog, color: '#f59e0b' },
                { label: 'Closed', value: kpi.closed, color: '#22c55e' },
              ]} />
            </div>
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Logs by Product</h3>
              <p className="text-xs text-slate-400 mb-3">Which product line generates the most support activity.</p>
              <KpiBarChart theme={theme} horizontal data={kpi.byProduct.map((p) => ({ label: p.product, value: p.count, color: PRODUCT_COLORS[p.product] || '#94a3b8' }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Practices by Product</h3>
              <KpiBarChart theme={theme} data={kpi.practicesByProduct.map((p) => ({ label: p.product, value: p.count, color: PRODUCT_COLORS[p.product] || '#94a3b8' }))} />
            </div>
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Top Practices by Logs</h3>
              {kpi.byPracticeTop.length ? (
                <KpiBarChart theme={theme} horizontal data={kpi.byPracticeTop.map((p, i) => ({ label: p.name, value: p.count, color: i === 0 ? '#2563eb' : '#60a5fa' }))} />
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-slate-400">No logs yet</div>
              )}
            </div>
          </div>
        </>
      )}

      {view === 'trends' && (
        <>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Six-Month Activity Trend</h3>
            <p className="text-xs text-slate-400">Support logs versus appointments.</p>
            <KpiLineChart theme={theme} data={kpi.logsByMonth.map((m) => ({ label: m.label, value: m.count }))} data2={kpi.apptsByMonth.map((m) => ({ label: m.label, value: m.count }))} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Monthly Logs</h3>
              <KpiBarChart theme={theme} data={kpi.logsByMonth.map((m) => ({ label: m.label, value: m.count }))} />
            </div>
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Monthly Appointments</h3>
              <KpiBarChart theme={theme} data={kpi.apptsByMonth.map((m) => ({ label: m.label, value: m.count, color: '#8b5cf6' }))} />
            </div>
          </div>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Last 14 Days Activity</h3>
            <KpiHeatStrip data={kpi.last14} theme={theme} />
          </div>
        </>
      )}

      {view === 'products' && (
        <>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Product Deep Dive</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kpi.productDeepDive.map((prod) => (
                <div key={prod.product} className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`} style={{ borderLeftWidth: '4px', borderLeftColor: prod.color }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: prod.color }} />
                      <span className="font-bold text-xs">{prod.product}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{prod.practices} practices</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-lg font-black" style={{ color: prod.color }}>{prod.totalLogs}</div><div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Logs</div></div>
                    <div><div className="text-lg font-black text-amber-500">{prod.open + prod.inProgress}</div><div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Active</div></div>
                    <div><div className="text-lg font-black text-emerald-500">{prod.resolution}%</div><div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Resolved</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Log Volume by Product</h3>
              <KpiBarChart theme={theme} horizontal data={kpi.byProduct.map((p) => ({ label: p.product, value: p.count, color: PRODUCT_COLORS[p.product] || '#94a3b8' }))} />
            </div>
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Resolution Rate by Product</h3>
              <div className="space-y-3 py-1">
                {kpi.productDeepDive.map((prod) => (
                  <div key={prod.product}>
                    <div className="flex justify-between text-xs font-bold mb-1"><span>{prod.product}</span><span>{prod.resolution}%</span></div>
                    <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prod.resolution}%`, background: prod.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'practices' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiMiniStat label="Avg logs / practice" value={kpi.avgLogsPerPractice} sub="Support load per client" theme={theme} />
            <KpiMiniStat label="With open logs" value={kpi.practiceHealth.filter((p) => p.open > 0).length} sub="Need attention" theme={theme} />
            <KpiMiniStat label="Fully resolved" value={kpi.practiceHealth.filter((p) => p.open === 0 && p.totalLogs > 0).length} sub="No open issues" theme={theme} />
            <KpiMiniStat label="Total practices" value={practices.length} sub="Active clients" theme={theme} />
          </div>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Practice Health Overview</h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {kpi.practiceHealth.slice(0, 20).map((p, i) => {
                const healthColor = p.health === 'good' ? '#22c55e' : p.health === 'watch' ? '#f59e0b' : '#ef4444'
                return (
                  <div key={`${p.name}-${i}`} className={`p-3 rounded-xl border flex items-center gap-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="w-2 h-8 rounded-full shrink-0" style={{ background: healthColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        {p.number && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black">#{p.number}</span>}
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{p.contact} • {p.product}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black">{p.totalLogs} logs</div>
                      <div className="text-[10px] text-slate-400">{p.open} open • {p.inProgress} prog</div>
                    </div>
                  </div>
                )
              })}
              {kpi.practiceHealth.length === 0 && <div className="text-sm text-slate-400 text-center py-6">No practices</div>}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Top Contacts</h3>
              <KpiRankTable theme={theme} rows={kpi.topContacts} valueLabel="logs" />
            </div>
            <div className={cardCls}>
              <h3 className="font-bold text-sm mb-1">Top Practices by Log Volume</h3>
              <KpiRankTable theme={theme} rows={kpi.byPracticeTop.map((p, i) => ({ name: p.name, value: p.count, color: i === 0 ? '#2563eb' : '#60a5fa' }))} valueLabel="logs" />
            </div>
          </div>
        </>
      )}

      {view === 'performance' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${cardCls} text-center`}>
              <KpiGauge value={kpi.resolutionRate} label="Log Resolution Rate" theme={theme} color="#22c55e" />
            </div>
            <div className={`${cardCls} text-center`}>
              <KpiGauge value={kpi.openRate} label="Open Workload" theme={theme} color="#f59e0b" />
            </div>
            <div className={`${cardCls} text-center`}>
              <KpiGauge value={(kpi.practiceHealth.filter((p) => p.open === 0).length / Math.max(1, practices.length)) * 100} label="Healthy Practices" theme={theme} color="#3b82f6" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiMiniStat label="Avg appts / month" value={kpi.avgApptsPerMonth} sub="6-month average" theme={theme} />
            <KpiMiniStat label="Avg logs / practice" value={kpi.avgLogsPerPractice} sub="Overall support load" theme={theme} />
            <KpiMiniStat label="In progress" value={kpi.prog} sub={`${kpi.inProgressRate}% of all logs`} theme={theme} />
            <KpiMiniStat label="Appointments (month)" value={kpi.apptThisMonth} sub="Current month" theme={theme} />
          </div>
        </>
      )}

      {view === 'time' && (
        <>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Logs by Day of Week</h3>
            <KpiBarChart theme={theme} data={kpi.logsByDayMonFirst.map((d, i) => ({ label: d.day, value: d.count, color: i >= 5 ? '#f59e0b' : '#3b82f6' }))} />
          </div>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">Logs by Time of Day</h3>
            <KpiBarChart theme={theme} data={kpi.hourBuckets.map((h, i) => ({ label: h.label, value: h.count, color: `hsl(${210 + i * 15}, 80%, ${60 - i * 4}%)` }))} />
          </div>
          <div className={cardCls}>
            <h3 className="font-bold text-sm mb-1">14-Day Activity Heatmap</h3>
            <KpiHeatStrip data={kpi.last14} theme={theme} />
          </div>
        </>
      )}

      {view === 'workload' && (
        <div className={cardCls}>
          <h3 className="font-bold text-sm mb-1">Status Matrix by Product</h3>
          <div className="space-y-3">
            {kpi.productStatusMatrix.map((row) => (
              <div key={row.product}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{row.product}</span>
                  <span className="text-[10px] text-slate-400">{row.open + row.inProgress + row.closed} total</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden">
                  {row.open > 0 && <div className="bg-blue-500" style={{ width: `${(row.open / (row.open + row.inProgress + row.closed || 1)) * 100}%` }} />}
                  {row.inProgress > 0 && <div className="bg-amber-500" style={{ width: `${(row.inProgress / (row.open + row.inProgress + row.closed || 1)) * 100}%` }} />}
                  {row.closed > 0 && <div className="bg-emerald-500" style={{ width: `${(row.closed / (row.open + row.inProgress + row.closed || 1)) * 100}%` }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ALWAYS-VISIBLE BOTTOM SECTIONS (like the original page)     */}
      {/* ============================================================ */}

      {/* Status Composition */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-sm">Status Composition</h3>
            <p className="text-xs text-slate-400">How all logs split across the three statuses.</p>
          </div>
          <div className="text-xs font-bold text-slate-500">{kpi.totalLogs} total logs</div>
        </div>
        <div className="flex h-6 rounded-full overflow-hidden">
          {kpi.open > 0 && (
            <div className="bg-blue-500 flex items-center justify-center text-white text-[10px] font-black" style={{ width: `${kpi.openRate}%` }}>
              {kpi.openRate > 10 ? `${kpi.openRate}%` : ''}
            </div>
          )}
          {kpi.prog > 0 && (
            <div className="bg-amber-500 flex items-center justify-center text-white text-[10px] font-black" style={{ width: `${kpi.inProgressRate}%` }}>
              {kpi.inProgressRate > 10 ? `${kpi.inProgressRate}%` : ''}
            </div>
          )}
          {kpi.closed > 0 && (
            <div className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black" style={{ width: `${kpi.resolutionRate}%` }}>
              {kpi.resolutionRate > 10 ? `${kpi.resolutionRate}%` : ''}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-blue-500" />Open ({kpi.open})
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-amber-500" />In Progress ({kpi.prog})
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-emerald-500" />Closed ({kpi.closed})
          </span>
        </div>
      </div>

      {/* Appointments by Type */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm">Appointments by Type</h3>
            <p className="text-xs text-slate-400">Breakdown of Demo / Call / Login / Personal / Training</p>
          </div>
          <div className="text-xs font-bold text-slate-500">{kpi.apptThisMonth} this month</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {kpi.byType.map((t) => {
            const st = apptTypeStyle(t.type)
            return (
              <div
                key={t.type}
                className="flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold"
                style={{ background: st.bg, color: st.color, borderColor: st.border }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: st.dot }}></span>
                {t.type}: {t.count}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}