'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Practice, LogRow, Appointment, Message, Theme } from '@/lib/types'
import {
  EMPTY_PRACTICE, EMPTY_LOG, EMPTY_APPT, EMPTY_MESSAGE, LOGO_PATH, APP_PASSWORD,
} from '@/lib/constants'
import { normalizeProduct, isUniqueViolation, toLocalDateStr, normalizeDateStr } from '@/lib/helpers'
import { Toast } from '@/components/ui/Toast'
import { PracticeList } from '@/components/practices/PracticeList'
import { PracticeForm } from '@/components/practices/PracticeForm'
import { PracticeDetail } from '@/components/practices/PracticeDetail'
import { LogList } from '@/components/logs/LogList'
import { LogForm } from '@/components/logs/LogForm'
import { LogDetail } from '@/components/logs/LogDetail'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { AppointmentForm } from '@/components/calendar/AppointmentForm'
import { AppointmentDetail } from '@/components/calendar/AppointmentDetail'
import { MessageBoard } from '@/components/messages/MessageBoard'
import { KpiDashboard } from '@/components/kpi/KpiDashboard'
/*import { CalendarGrid } from '@/components/calendar/CalendarGrid'*/
import { SelectedDayPanel } from '@/components/calendar/SelectedDayPanel'
import { UpcomingAppointments } from '@/components/calendar/UpcomingAppointments'  // ← NEW


type Tab = 'logs' | 'practices' | 'messages' | 'calendar' | 'kpi'

export default function Page() {
  // Theme + auth
  const [theme, setTheme] = useState<Theme>('light')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [shake, setShake] = useState(false)

  // Data
  const [practices, setPractices] = useState<Practice[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // UI
  const [tab, setTab] = useState<Tab>('logs')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All')
  const [toast, setToast] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Modals
  const [showPractice, setShowPractice] = useState(false)
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null)
  const [pForm, setPForm] = useState<any>(EMPTY_PRACTICE)
  const [showDetailPractice, setShowDetailPractice] = useState<Practice | null>(null)

  const [showLog, setShowLog] = useState(false)
  const [editingLog, setEditingLog] = useState<LogRow | null>(null)
  const [lForm, setLForm] = useState<any>(EMPTY_LOG)
  const [showDetailLog, setShowDetailLog] = useState<LogRow | null>(null)

  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null)
  const [showAppt, setShowAppt] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [aForm, setAForm] = useState<any>(EMPTY_APPT)
  const [showDetailAppt, setShowDetailAppt] = useState<Appointment | null>(null)

  // ====== BOOTSTRAP ======
  useEffect(() => {
    const saved = localStorage.getItem('solv_theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(saved || (prefersDark ? 'dark' : 'light'))
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    try {
      const raw = localStorage.getItem('solv_read_messages')
      if (raw) setReadIds(new Set(JSON.parse(raw)))
    } catch {}
    fetchAll()
  }, [])

  useEffect(() => {
    localStorage.setItem('solv_theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    try { localStorage.setItem('solv_read_messages', JSON.stringify(Array.from(readIds))) } catch {}
  }, [readIds])

  useEffect(() => {
    if (!isLocked) return
    const t = setInterval(() => setCountdown((c) => {
      if (c <= 1) { setIsLocked(false); setFailedAttempts(0); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [isLocked])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) }
  }, [toast])

  async function fetchAll() {
    setLoading(true)
    const [p, l, a, m] = await Promise.all([
      supabase.from('practices').select('*').order('created_at', { ascending: false }),
      supabase.from('logs').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('date', { ascending: true }),
      supabase.from('messages').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    ])
    if (p.data) setPractices(p.data as any)
    if (l.data) setLogs(l.data as any)
    if (a.data) setAppointments(a.data as any)
    if (m.data) setMessages(m.data as any)
    setLoading(false)
  }

  function handleLogin() {
    if (isLocked) return
    if (pass === APP_PASSWORD) {
      localStorage.setItem('isLoggedIn', 'true'); setIsLoggedIn(true); setFailedAttempts(0); setPass('')
    } else {
      const n = failedAttempts + 1; setFailedAttempts(n); setShake(true); setShowErrorPopup(true)
      setTimeout(() => setShake(false), 400); setPass('')
      if (n >= 3) { setIsLocked(true); setCountdown(30) }
    }
  }

  // ====== DERIVED ======
  const getPracticeForLog = (log: LogRow) => {
    if (log.practice_id) return practices.find((p) => p.id === log.practice_id)
    return practices.find((p) => p.practice_name === log.practice_name)
  }

  const filteredLogs = useMemo(() => {
    let f = logs
    if (statusFilter !== 'All') f = f.filter((l) => l.status === statusFilter)
    if (search) f = f.filter((l) => {
      const linked = getPracticeForLog(l)
      const s = (l.practice_name + l.issue + l.solution + l.product + (linked?.practice_number || '') + (l.practice_number || '')).toLowerCase()
      return s.includes(search.toLowerCase())
    })
    return f
  }, [logs, search, statusFilter, practices])

  const filteredPractices = useMemo(() => practices.filter((p) =>
    (p.practice_name + ' ' + (p.practice_number || '') + ' ' + p.contact_person + ' ' + p.phone + ' ' + p.email + ' ' + p.product)
      .toLowerCase().includes(search.toLowerCase())
  ), [practices, search])

  const unreadMessages = useMemo(() => messages.filter((m) => !readIds.has(m.id)).length, [messages, readIds])

  // ====== CRUD ======
  async function savePractice() {
    if (!pForm.practice_name) { setToast('Practice Name required'); return }
    const cleanedForm = { ...pForm, product: normalizeProduct(pForm.product), practice_number: (pForm.practice_number || '').trim() }
    const candidate = cleanedForm.practice_number.toLowerCase()
    if (candidate) {
      const duplicate = practices.find((p) => {
        if (editingPractice && p.id === editingPractice.id) return false
        return (p.practice_number || '').trim().toLowerCase() === candidate
      })
      if (duplicate) { setToast(`Practice number "${cleanedForm.practice_number}" is already used by "${duplicate.practice_name}"`); return }
    }
    if (editingPractice) {
      const { error, data } = await supabase.from('practices').update(cleanedForm).eq('id', editingPractice.id).select().single()
      if (error) { if (isUniqueViolation(error)) setToast(`Practice number "${cleanedForm.practice_number}" already used`); else setToast(error.message); return }
      setPractices((prev) => prev.map((x) => (x.id === editingPractice.id ? (data as any) : x)))
    } else {
      const { error, data } = await supabase.from('practices').insert(cleanedForm).select().single()
      if (error) { if (isUniqueViolation(error)) setToast(`Practice number "${cleanedForm.practice_number}" already used`); else setToast(error.message); return }
      setPractices((prev) => [data as any, ...prev])
    }
    setShowPractice(false); setShowDetailPractice(null); setToast('Practice saved')
  }

  async function deletePractice(id: string) {
    const { error } = await supabase.from('practices').delete().eq('id', id)
    if (error) { setToast(error.message); return false }
    setPractices((prev) => prev.filter((p) => p.id !== id))
    setToast('Practice deleted')
    return true
  }

  async function saveLog() {
    if (!lForm.practice_id || !lForm.issue) { setToast('Select Practice + Issue required'); return }
    const linked = practices.find((p) => p.id === lForm.practice_id)
    const payload = {
      practice_id: lForm.practice_id || null,
      practice_name: linked?.practice_name || lForm.practice_name || '',
      practice_number: linked?.practice_number || lForm.practice_number || '',
      contact_person: lForm.contact_person || '',
      phone: lForm.phone || '',
      product: normalizeProduct(lForm.product),
      issue: lForm.issue, solution: lForm.solution || '', notes: lForm.notes || '', status: lForm.status || 'Open',
    }
    if (editingLog) {
      const { error, data } = await supabase.from('logs').update(payload).eq('id', editingLog.id).select().single()
      if (error) { setToast(error.message); return }
      setLogs((prev) => prev.map((x) => (x.id === editingLog.id ? (data as any) : x)))
    } else {
      const { error, data } = await supabase.from('logs').insert(payload).select().single()
      if (error) {
        if (error.message.includes('practice_number')) {
          const { practice_number, ...fallback } = payload as any
          const { error: e2, data: d2 } = await supabase.from('logs').insert(fallback).select().single()
          if (e2) { setToast(e2.message); return }
          setLogs((prev) => [d2 as any, ...prev])
        } else { setToast(error.message); return }
      } else {
        setLogs((prev) => [data as any, ...prev])
      }
    }
    setShowLog(false); setShowDetailLog(null); setToast('Log saved')
  }

  function handlePracticeSelectForLog(practiceId: string) {
    if (!practiceId) {
      setLForm({ ...lForm, practice_id: '', practice_name: '', practice_number: '', contact_person: '', phone: '', product: 'Solv Optics' })
      return
    }
    const p = practices.find((x) => x.id === practiceId)
    if (p) {
      setLForm({
        ...lForm, practice_id: p.id, practice_name: p.practice_name,
        practice_number: p.practice_number || '', contact_person: p.contact_person || '',
        phone: p.phone || p.mobile || '', product: p.product || 'Solv Optics',
      })
    }
  }

  async function saveAppt() {
    if (!aForm.title || !aForm.date) { setToast('Title + Date required'); return }
    if (editingAppt) {
      const { error, data } = await supabase.from('appointments').update(aForm).eq('id', editingAppt.id).select().single()
      if (error) { setToast(error.message); return }
      setAppointments((prev) => prev.map((x) => (x.id === editingAppt.id ? (data as any) : x)))
    } else {
      const { error, data } = await supabase.from('appointments').insert(aForm).select().single()
      if (error) { setToast(error.message); return }
      setAppointments((prev) => [...prev, data as any])
    }
    setShowAppt(false); setShowDetailAppt(null); setToast('Appointment saved')
  }

  // ====== LOGIN RENDER ======
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-[#0f1a2e] via-[#162447] to-[#1e3a5f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl bg-gradient-to-br from-blue-300/50 via-sky-200/40 to-cyan-200/30" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl bg-gradient-to-br from-sky-300/40 via-blue-200/30 to-indigo-200/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl bg-white/60" />
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
        <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className="fixed top-4 right-4 w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xl border border-blue-200/50 text-slate-700 flex items-center justify-center shadow-lg z-20 active:scale-95">{theme === 'dark' ? '☀' : '🌙'}</button>
        <div className={`relative w-full max-w-sm rounded-3xl p-[1.5px] shadow-[0_20px_80px_-20px_rgba(59,130,246,0.35)] ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 opacity-70" />
          <div className="relative w-full bg-white/95 backdrop-blur-xl rounded-3xl p-7 sm:p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            {!logoError ? <img src={LOGO_PATH} alt="Logo" onError={() => setLogoError(true)} className="h-11 mx-auto mb-5 object-contain" /> : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">👁</div>}
            <div className="text-xs font-black tracking-[0.18em] bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">SOLV • SECURE</div>
            <div className="text-left mt-7">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
              <div className="relative mt-2">
                <input type={showPass ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" disabled={isLocked} className="w-full h-11 rounded-xl border border-blue-100 bg-white pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-inner" />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-1 top-1 w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-sm active:scale-95 flex items-center justify-center">{showPass ? '🙈' : '👁'}</button>
              </div>
              <button onClick={handleLogin} disabled={isLocked} className="w-full h-11 mt-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 text-white text-sm font-bold shadow-[0_8px_20px_-10px_rgba(59,130,246,0.6)] active:scale-[0.98] transition">{isLocked ? `Locked ${countdown}s` : 'Unlock →'}</button>
            </div>
          </div>
        </div>
        {showErrorPopup && (
          <div className="fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl border border-blue-100">
              <div className="text-3xl">🚫</div>
              <h3 className="font-extrabold text-sm mt-3">Incorrect Password</h3>
              <button onClick={() => setShowErrorPopup(false)} className="w-full h-11 mt-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white text-sm font-bold active:scale-95">Try Again</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ====== MAIN APP RENDER ======
  return (
    <div className={`min-h-screen pb-28 sm:pb-10 transition-colors relative overflow-hidden ${theme === 'dark' ? 'bg-[#010614] text-slate-100' : 'bg-[#dbe7f6] text-slate-900'}`}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className={`absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 ${theme === 'dark' ? 'bg-gradient-to-br from-blue-900/30 via-sky-900/20 to-transparent' : 'bg-gradient-to-br from-blue-300/60 via-sky-300/40 to-cyan-200/30'}`} />
        <div className={`absolute top-[40%] right-0 w-96 h-96 rounded-full blur-3xl translate-x-1/4 ${theme === 'dark' ? 'bg-gradient-to-br from-sky-900/20 via-blue-900/15 to-transparent' : 'bg-gradient-to-br from-sky-300/50 via-blue-200/30 to-transparent'}`} />
      </div>

      <header className={`sticky top-0 z-10 backdrop-blur-xl border-b ${theme === 'dark' ? 'bg-[#070e24]/80 border-slate-800/60' : 'bg-[#eaf0f9]/80 border-blue-200/70'}`}>
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!logoError ? (
              <div className="p-[1.5px] rounded-full bg-gradient-to-br from-blue-500 to-sky-600 shrink-0">
                <img src={LOGO_PATH} alt="Logo" onError={() => setLogoError(true)} className="h-8 w-8 rounded-full object-contain bg-white p-1" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white shadow-lg shrink-0">👁</div>
            )}
            <div className="font-black tracking-tight text-sm bg-gradient-to-r from-blue-700 to-sky-700 dark:from-blue-300 dark:to-sky-300 bg-clip-text text-transparent">SOLVMEDICAL</div>
            <div className={`hidden lg:flex ml-2 text-xs font-bold px-3 py-1 rounded-full border truncate ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50 text-slate-300' : 'bg-white/80 border-blue-200/50 text-slate-600 shadow-sm'}`}>
              {loading ? 'Loading…' : `${practices.length} • ${logs.length} • ${appointments.length} • ${messages.length}`}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={() => setTab('messages')} className={`relative w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} title="Message board">
              💬
              {unreadMessages > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow animate-pulse">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
            </button>
            <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-blue-200 text-blue-600'}`}>{theme === 'dark' ? '☀' : '🌙'}</button>
            <button onClick={() => { localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false) }} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>↪</button>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 pb-3 pt-2">
          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition text-sm">⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className={`w-full h-10 sm:h-11 rounded-xl pl-10 pr-4 text-sm shadow-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700 placeholder:text-slate-500' : 'bg-white/90 border-blue-100 placeholder:text-slate-400'}`} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className={`flex gap-1.5 mb-5 p-1 rounded-full w-full sm:w-fit overflow-x-auto scrollbar-none border shadow-sm backdrop-blur snap-x ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-blue-100'}`}>
          {[
            { k: 'logs', l: 'Logs', i: '📋' },
            { k: 'practices', l: 'Practices', i: '🏥' },
            { k: 'messages', l: 'Messages', i: '💬' },
            { k: 'calendar', l: 'Calendar', i: '📅' },
            { k: 'kpi', l: 'KPI', i: '📊' },
          ].map((t) => {
            const active = tab === t.k
            const showBadge = t.k === 'messages' && unreadMessages > 0
            return (
              <button key={t.k} onClick={() => setTab(t.k as Tab)} className={`relative h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 shrink-0 ${active ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.6)]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {t.i} {t.l}
                {showBadge && <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
              </button>
            )
          })}
        </div>

        {tab === 'logs' && (
          <LogList
            logs={filteredLogs} practices={practices} theme={theme}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            onSelect={(l) => setShowDetailLog(l)}
            onNew={() => { setLForm(EMPTY_LOG); setEditingLog(null); setShowLog(true) }}
          />
        )}

        {tab === 'practices' && (
          <PracticeList
            practices={filteredPractices} theme={theme}
            onSelect={(p) => setShowDetailPractice(p)}
            onDelete={deletePractice}
            onNew={() => { setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }}
          />
        )}

        {tab === 'messages' && (
          <MessageBoard messages={messages} setMessages={setMessages as any} theme={theme} setToast={setToast} />
        )}

       {tab === 'calendar' && (
  <div className="space-y-4">
    <CalendarGrid
      calendarDate={calendarDate}
      setCalendarDate={setCalendarDate}
      selectedCalDate={selectedCalDate}
      setSelectedCalDate={setSelectedCalDate}
      appointments={appointments}
      theme={theme}
      onSelectDate={() => {}}
      onSelectAppt={(a) => setShowDetailAppt(a)}
      onNewAppt={(dateStr) => {
        setAForm({ ...EMPTY_APPT, date: dateStr })
        setEditingAppt(null)
        setShowAppt(true)
      }}
    />

    {/* Selected day panel */}
    {selectedCalDate && (
      <SelectedDayPanel
        date={selectedCalDate}
        appointments={appointments
          .filter(
            (a) => normalizeDateStr(a.date) === selectedCalDate
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time))}
        theme={theme}
        onClose={() => setSelectedCalDate(null)}
        onSelect={(a) => setShowDetailAppt(a)}
      />
    )}

    {/* Upcoming appointments */}
    <UpcomingAppointments
      appointments={appointments}
      theme={theme}
      onSelect={(a) => setShowDetailAppt(a)}
    />
  </div>
)}

        {tab === 'kpi' && (
          <KpiDashboard
            practices={practices} logs={logs} appointments={appointments}
            messages={messages} unreadMessages={unreadMessages} theme={theme}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-20 sm:hidden border-t backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 gap-0.5 px-1 py-2">
          {[
            { k: 'logs', l: 'Logs', i: '📋' },
            { k: 'practices', l: 'Prac', i: '🏥' },
            { k: 'messages', l: 'Msgs', i: '💬' },
            { k: 'calendar', l: 'Cal', i: '📅' },
            { k: 'kpi', l: 'KPI', i: '📊' },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as Tab)} className={`relative flex flex-col items-center justify-center h-14 rounded-xl text-[10px] font-bold gap-0.5 active:scale-95 transition ${tab === t.k ? 'bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow' : 'text-slate-500'}`}>
              <span className="text-base leading-none">{t.i}</span>{t.l}
              {t.k === 'messages' && unreadMessages > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* All modals */}
      <PracticeDetail
        practice={showDetailPractice} onClose={() => setShowDetailPractice(null)} theme={theme}
        onEdit={(p) => { setEditingPractice(p); setPForm(p); setShowPractice(true) }}
        onDelete={async (p) => { if (!confirm(`Delete "${p.practice_name}"?`)) return; const ok = await deletePractice(p.id); if (ok) setShowDetailPractice(null) }}
      />
      <PracticeForm
        open={showPractice} onClose={() => setShowPractice(false)} theme={theme}
        form={pForm} setForm={setPForm} onSave={savePractice} editing={editingPractice}
      />
      <LogDetail
        log={showDetailLog} practices={practices} onClose={() => setShowDetailLog(null)} theme={theme}
        onEdit={(l) => { setEditingLog(l); setLForm(l); setShowLog(true) }}
        onDelete={async (l) => {
          await supabase.from('logs').delete().eq('id', l.id)
          setLogs((prev) => prev.filter((x) => x.id !== l.id))
          setShowDetailLog(null)
        }}
      />
      <LogForm
        open={showLog} onClose={() => setShowLog(false)} theme={theme}
        form={lForm} setForm={setLForm} onSave={saveLog} editing={editingLog}
        practices={practices} onPracticeSelect={handlePracticeSelectForLog}
      />
      <AppointmentDetail
        appointment={showDetailAppt} onClose={() => setShowDetailAppt(null)} theme={theme}
        onEdit={(a) => { setEditingAppt(a); setAForm(a); setShowAppt(true) }}
        onDelete={async (a) => {
          await supabase.from('appointments').delete().eq('id', a.id)
          setAppointments((prev) => prev.filter((x) => x.id !== a.id))
          setShowDetailAppt(null)
        }}
      />
      <AppointmentForm
        open={showAppt} onClose={() => setShowAppt(false)} theme={theme}
        form={aForm} setForm={setAForm} onSave={saveAppt} editing={editingAppt}
      />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}