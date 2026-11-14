'use client'
import { Appointment, Theme } from '@/lib/types'
import { apptTypeStyle, toLocalDateStr, normalizeDateStr } from '@/lib/helpers'

export function CalendarGrid({
  calendarDate, setCalendarDate, selectedCalDate, setSelectedCalDate,
  appointments, theme, onSelectDate, onSelectAppt, onNewAppt,
}: {
  calendarDate: Date
  setCalendarDate: (d: Date) => void
  selectedCalDate: string | null
  setSelectedCalDate: (d: string | null) => void
  appointments: Appointment[]
  theme: Theme
  onSelectDate: (dateStr: string) => void
  onSelectAppt: (a: Appointment) => void
  onNewAppt: (dateStr: string) => void
}) {
  const todayLocalStr = toLocalDateStr(new Date())
  const y = calendarDate.getFullYear()
  const m = calendarDate.getMonth()
  const first = new Date(y, m, 1)
  const startDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: { date: Date | null; dateStr: string | null; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < startDay; i++) cells.push({ date: null, dateStr: null, isCurrentMonth: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m, d)
    cells.push({ date: dt, dateStr: toLocalDateStr(dt), isCurrentMonth: true })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, dateStr: null, isCurrentMonth: false })

  const getApptsForDate = (dateStr: string) =>
    appointments.filter((a) => normalizeDateStr(a.date) === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
      <div className={`p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800' : 'border-blue-50'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setCalendarDate(new Date(y, m - 1, 1))} className={`w-10 h-10 rounded-xl font-bold border active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>‹</button>
          <div className="font-bold text-sm text-center bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent min-w-[140px]">
            {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setCalendarDate(new Date(y, m + 1, 1))} className={`w-10 h-10 rounded-xl font-bold border active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>›</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setCalendarDate(new Date()); setSelectedCalDate(todayLocalStr) }} className={`h-10 px-4 rounded-xl text-sm font-bold border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>Today</button>
          <button onClick={() => onNewAppt(selectedCalDate || todayLocalStr)} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">+ Appointment</button>
        </div>
      </div>
      <div className={`grid grid-cols-7 border-b text-xs font-bold ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-blue-50/60 border-blue-50 text-slate-500'}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="p-2.5 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-blue-100 dark:bg-slate-800">
        {cells.map((cell, i) => {
          const isToday = cell.dateStr === todayLocalStr
          const isSelected = cell.dateStr && cell.dateStr === selectedCalDate
          const appts = cell.dateStr ? getApptsForDate(cell.dateStr) : []
          return (
            <div
              key={i}
              onClick={() => {
                if (!cell.dateStr) return
                setSelectedCalDate(cell.dateStr)
                if (appts.length === 0) onNewAppt(cell.dateStr)
              }}
              className={`
                aspect-square p-1 sm:p-1.5 flex flex-col relative cursor-pointer transition
                ${!cell.isCurrentMonth ? 'bg-slate-100 dark:bg-slate-900/20 text-slate-300' : theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-blue-50/80'}
                ${isSelected ? '!bg-blue-100/90 ring-2 ring-inset ring-blue-400 z-10' : ''}
              `}
            >
              {cell.date && (
                <>
                  <div className="flex justify-between items-start">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-xs font-bold
                      ${isToday ? 'bg-blue-600 text-white shadow' : ''}
                      ${isSelected && !isToday ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                      {cell.date.getDate()}
                    </div>
                    {appts.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 hidden sm:block"></div>}
                  </div>
                  <div className="mt-1 flex-1 flex-col gap-0.5 overflow-hidden hidden sm:flex">
                    {appts.slice(0, 3).map((a) => {
                      const ts = apptTypeStyle(a.type)
                      return (
                        <div
                          key={a.id}
                          onClick={(e) => { e.stopPropagation(); onSelectAppt(a) }}
                          className="truncate text-xs leading-[1.1] font-bold px-1.5 py-0.5 rounded-md hover:opacity-80"
                          style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}
                        >
                          {a.start_time.slice(0, 5)} {a.title}
                        </div>
                      )
                    })}
                    {appts.length > 3 && <div className="text-xs font-bold text-slate-500 px-1">+{appts.length - 3} more</div>}
                  </div>
                  {appts.length > 0 && (
                    <div className="sm:hidden mt-auto flex gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {appts.length > 1 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}