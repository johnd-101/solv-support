'use client'
import { Appointment, Theme } from '@/lib/types'
import { apptTypeStyle, toLocalDateStr, normalizeDateStr } from '@/lib/helpers'

export function UpcomingAppointments({
  appointments, theme, onSelect,
}: {
  appointments: Appointment[]
  theme: Theme
  onSelect: (a: Appointment) => void
}) {
  const todayLocalStr = toLocalDateStr(new Date())

  const upcoming = appointments
    .filter((a) => normalizeDateStr(a.date) >= todayLocalStr)
    .sort((a, b) =>
      (normalizeDateStr(a.date) + a.start_time).localeCompare(
        normalizeDateStr(b.date) + b.start_time
      )
    )
    .slice(0, 8)

  return (
    <div
      className={`rounded-2xl border p-5 shadow backdrop-blur ${
        theme === 'dark'
          ? 'bg-slate-900/70 border-slate-800'
          : 'bg-white/90 border-blue-100'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">
          Upcoming
        </h3>
        <span className="text-xs font-bold text-slate-500">
          {upcoming.length} next
        </span>
      </div>

      <div className="space-y-2">
        {upcoming.map((a) => {
          const st = apptTypeStyle(a.type)
          return (
            <div
              key={a.id}
              onClick={() => onSelect(a)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                theme === 'dark'
                  ? 'border-slate-800 hover:bg-slate-800'
                  : 'border-blue-50 hover:bg-blue-50/60'
              }`}
            >
              <div
                className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold shrink-0"
                style={{ background: st.bg, color: st.color }}
              >
                <span className="text-sm leading-none font-black">
                  {new Date(a.date).getDate()}
                </span>
                <span className="text-[9px] uppercase leading-none mt-0.5">
                  {new Date(a.date).toLocaleString('default', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{a.title}</div>
                <div className="text-xs text-slate-500 truncate">
                  {a.date} • {a.start_time}-{a.end_time}
                </div>
              </div>
              <span
                style={{ background: st.bg, color: st.color, borderColor: st.border }}
                className="text-xs font-bold px-3 py-1 rounded-full border shrink-0"
              >
                {a.type}
              </span>
            </div>
          )
        })}
        {upcoming.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-4">
            No upcoming appointments
          </div>
        )}
      </div>
    </div>
  )
}