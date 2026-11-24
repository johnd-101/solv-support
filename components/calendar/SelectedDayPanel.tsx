'use client'
import { Appointment, Theme } from '@/lib/types'
import { apptTypeStyle } from '@/lib/helpers'

export function SelectedDayPanel({
  date, appointments, theme, onClose, onSelect,
}: {
  date: string
  appointments: Appointment[]
  theme: Theme
  onClose: () => void
  onSelect: (a: Appointment) => void
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow backdrop-blur ${
        theme === 'dark'
          ? 'bg-slate-900/70 border-slate-800'
          : 'bg-white/90 border-blue-100'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">
          {date} — {appointments.length} appointments
        </h3>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full text-xs ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
          }`}
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {appointments.length === 0 ? (
          <div className="text-sm text-slate-400 py-4">No appointments.</div>
        ) : (
          appointments.map((a) => {
            const st = apptTypeStyle(a.type)
            return (
              <div
                key={a.id}
                onClick={() => onSelect(a)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  theme === 'dark'
                    ? 'border-slate-800 hover:bg-slate-800'
                    : 'border-blue-50 hover:bg-blue-50'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold"
                  style={{ background: st.bg, color: st.color }}
                >
                  <span className="text-sm leading-none">{a.start_time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{a.title}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {a.start_time}-{a.end_time} • {a.type}
                  </div>
                </div>
                <span
                  style={{ background: st.bg, color: st.color, borderColor: st.border }}
                  className="text-xs font-bold px-3 py-1 rounded-full border"
                >
                  {a.type}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}