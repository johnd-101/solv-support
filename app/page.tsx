'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Practice, LogRow, Appointment, Message, Theme } from '@/lib/types'
import { EMPTY_PRACTICE, EMPTY_LOG, EMPTY_APPT, EMPTY_MESSAGE, LOGO_PATH } from '@/lib/constants'
import { normalizeProduct, isUniqueViolation, normalizeDateStr } from '@/lib/helpers'
import { Toast } from '@/components/ui/Toast'
import { PracticeForm } from '@/components/practices/PracticeForm'
import { PracticeDetail } from '@/components/practices/PracticeDetail'
import { LogForm } from '@/components/logs/LogForm'
import { LogDetail } from '@/components/logs/LogDetail'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { AppointmentForm } from '@/components/calendar/AppointmentForm'
import { AppointmentDetail } from '@/components/calendar/AppointmentDetail'
import { MessageBoard } from '@/components/messages/MessageBoard'
import { KpiDashboard } from '@/components/kpi/KpiDashboard'
import { SelectedDayPanel } from '@/components/calendar/SelectedDayPanel'
import { UpcomingAppointments } from '@/components/calendar/UpcomingAppointments'

type Tab = 'logs' | 'practices' | 'messages' | 'calendar' | 'kpi' | 'profile'
type Profile = { id: string; username: string; password_hash: string; created_at?: string }
type ActiveUser = { profile_id: string; username: string; online_at: string }
type ViewMode = 'grid' | 'list'

const getPracNumber = (obj: any): string => {
  return obj?.prac_number || obj?.practice_number || ''
}

// Reusable Toggle - MOBILE FIRST: larger tap targets
function ViewToggle({ value, onChange, isDark }: { value: ViewMode, onChange: (v: ViewMode) => void, isDark: boolean }) {
  return (
    <div className={`flex p-1 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
      <button onClick={() => onChange('list')} className={`h-9 min-w- px-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${value === 'list' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <span>☰</span> List
      </button>
      <button onClick={() => onChange('grid')} className={`h-9 min-w- px-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${value === 'grid' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <span>▦</span> Cards
      </button>
    </div>
  )
}

export default function Page() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [pass, setPass] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [shake, setShake] = useState(false)

  const [practices, setPractices] = useState<Practice[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [tab, setTab] = useState<Tab>('logs')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All')
  const [toast, setToast] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // VIEW MODE STATES
  const [logsView, setLogsView] = useState<ViewMode>('grid')
  const [practicesView, setPracticesView] = useState<ViewMode>('grid')

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

  const [pUsername, setPUsername] = useState('')
  const [pPassword, setPPassword] = useState('')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('solv_theme') as Theme | null
    if (saved) setTheme(saved)
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
    const savedLogsView = localStorage.getItem('solv_logs_view') as ViewMode
    const savedPracView = localStorage.getItem('solv_practices_view') as ViewMode
    if (savedLogsView) setLogsView(savedLogsView)
    if (savedPracView) setPracticesView(savedPracView)

    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    const savedUser = localStorage.getItem('solv_username')
    const savedProfileId = localStorage.getItem('solv_profile_id')
    if (savedUser && savedProfileId) {
      setCurrentProfile({ id: savedProfileId, username: savedUser, password_hash: '' })
      setUsername(savedUser)
    }
    try { const raw = localStorage.getItem('solv_read_messages'); if (raw) setReadIds(new Set(JSON.parse(raw))) } catch {}
    fetchAll()
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('solv_theme', theme)
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [theme, mounted])

  useEffect(() => { localStorage.setItem('solv_logs_view', logsView) }, [logsView])
  useEffect(() => { localStorage.setItem('solv_practices_view', practicesView) }, [practicesView])

  // --- AUTO REFRESH EVERY 60 SECONDS ---
  useEffect(() => {
    if (!isLoggedIn) return
    
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing data...')
      fetchAll(true) // silent refresh
    }, 60 * 1000) // 60 seconds

    // Also refresh when user comes back to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAll(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || !currentProfile) return
    const channel = supabase.channel('online-profiles', { config: { presence: { key: currentProfile.id } } })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: ActiveUser[] = []
      for (const key in state) {
        const presences = state[key] as any[]
        presences.forEach((p: any) => { users.push({ profile_id: p.profile_id, username: p.username, online_at: p.online_at }) })
      }
      const unique = Array.from(new Map(users.map(u => [u.profile_id, u])).values())
      setActiveUsers(unique)
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ profile_id: currentProfile.id, username: currentProfile.username, online_at: new Date().toISOString() })
      }
    })
    const interval = setInterval(() => {
      channel.track({ profile_id: currentProfile.id, username: currentProfile.username, online_at: new Date().toISOString() })
    }, 30000)
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [isLoggedIn, currentProfile])

  useEffect(() => { try { localStorage.setItem('solv_read_messages', JSON.stringify(Array.from(readIds))) } catch {} }, [readIds])
  useEffect(() => { if (!isLocked) return; const t = setInterval(() => setCountdown(c => { if (c <= 1) { setIsLocked(false); setFailedAttempts(0); return 0 } return c - 1 }), 1000); return () => clearInterval(t) }, [isLocked])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) } }, [toast])

  // FIX: Mark messages as read when opening messages tab
  useEffect(() => {
    if (tab === 'messages' && messages.length > 0) {
      const unread = messages.filter(m => !readIds.has(m.id))
      if (unread.length > 0) {
        // delay slightly so user sees the bubble clear
        const t = setTimeout(() => {
          setReadIds(prev => {
            const next = new Set(prev)
            unread.forEach(m => next.add(m.id))
            return next
          })
        }, 800)
        return () => clearTimeout(t)
      }
    }
  }, [tab, messages])

  async function fetchAll(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [p, l, a, m, prof] = await Promise.all([
        supabase.from('practices').select('*').order('created_at', { ascending: false }),
        supabase.from('logs').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('date', { ascending: true }),
        supabase.from('messages').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])
      if (p.data) setPractices(p.data as any)
      if (l.data) setLogs(l.data as any)
      if (a.data) setAppointments(a.data as any)
      if (m.data) setMessages(m.data as any)
      if (prof.data) setProfiles(prof.data as any)
      setLastRefresh(new Date())
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleLogin() {
    if (isLocked) return
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (data && (data.password_hash === pass || data.password_hash === btoa(pass))) {
      localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('solv_username', data.username); localStorage.setItem('solv_profile_id', data.id)
      setCurrentProfile(data as any); setIsLoggedIn(true); setFailedAttempts(0); setPass(''); setUsername(data.username); return
    }
    if (profiles.length === 0 && username && pass) {
      if (pass.length >= 3) {
        localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('solv_username', username); localStorage.setItem('solv_profile_id', 'temp-' + username)
        setCurrentProfile({ id: 'temp-' + username, username, password_hash: '' }); setIsLoggedIn(true); return
      }
    }
    const n = failedAttempts + 1; setFailedAttempts(n); setShake(true); setShowErrorPopup(true); setTimeout(() => setShake(false), 400); setPass(''); if (n >= 3) { setIsLocked(true); setCountdown(30) }
  }

  const getPracticeForLog = (log: LogRow) => {
    if (log.practice_id) return practices.find((p) => p.id === log.practice_id)
    return practices.find((p) => p.practice_name === log.practice_name)
  }

  const filteredLogs = useMemo(() => {
    let f = logs
    if (statusFilter !== 'All') f = f.filter((l) => l.status === statusFilter)
    if (search) f = f.filter((l) => {
      const linked = getPracticeForLog(l)
      const s = (l.practice_name + l.issue + l.solution + l.product + getPracNumber(linked) + getPracNumber(l)).toLowerCase()
      return s.includes(search.toLowerCase())
    })
    return f
  }, [logs, search, statusFilter, practices])

  const filteredPractices = useMemo(() => practices.filter((p) =>
    (p.practice_name + ' ' + getPracNumber(p) + ' ' + (p.contact_person || '') + ' ' + (p.phone || '') + ' ' + (p.email || '') + ' ' + (p.product || '')).toLowerCase().includes(search.toLowerCase())
  ), [practices, search])

  const unreadMessages = useMemo(() => messages.filter((m) => !readIds.has(m.id)).length, [messages, readIds])

  async function savePractice() {
    if (!pForm.practice_name) { setToast('Practice Name required'); return }
    const pracVal = (pForm.prac_number || pForm.practice_number || '').trim()
    const cleanedForm = { ...pForm, product: normalizeProduct(pForm.product), prac_number: pracVal, practice_number: pracVal }
    const candidate = pracVal.toLowerCase()
    if (candidate) {
      const duplicate = practices.find((p) => { if (editingPractice && p.id === editingPractice.id) return false; return getPracNumber(p).toLowerCase() === candidate })
      if (duplicate) { setToast(`Prac number "${pracVal}" is already used by "${duplicate.practice_name}"`); return }
    }
    if (editingPractice) {
      const { error, data } = await supabase.from('practices').update(cleanedForm).eq('id', editingPractice.id).select().single()
      if (error) { if (isUniqueViolation(error)) setToast(`Prac number "${pracVal}" already used`); else setToast(error.message); return }
      setPractices((prev) => prev.map((x) => (x.id === editingPractice.id ? (data as any) : x)))
    } else {
      const { error, data } = await supabase.from('practices').insert(cleanedForm).select().single()
      if (error) { if (isUniqueViolation(error)) setToast(`Prac number "${pracVal}" already used`); else setToast(error.message); return }
      setPractices((prev) => [data as any, ...prev])
    }
    setShowPractice(false); setShowDetailPractice(null); setToast('Practice saved')
  }

  async function deletePractice(id: string) {
    const { error } = await supabase.from('practices').delete().eq('id', id)
    if (error) { setToast(error.message); return false }
    setPractices((prev) => prev.filter((p) => p.id !== id)); setToast('Practice deleted'); return true
  }

  async function saveLog() {
    if (!lForm.practice_id || !lForm.issue) { setToast('Select Practice + Issue required'); return }
    const linked = practices.find((p) => p.id === lForm.practice_id)
    const pracVal = getPracNumber(linked) || getPracNumber(lForm)
    const payload = {
      practice_id: lForm.practice_id || null,
      practice_name: linked?.practice_name || lForm.practice_name || '',
      prac_number: pracVal,
      practice_number: pracVal,
      contact_person: lForm.contact_person || '', phone: lForm.phone || '',
      product: normalizeProduct(lForm.product),
      issue: lForm.issue, solution: lForm.solution || '', notes: lForm.notes || '', status: lForm.status || 'Open',
    }
    if (editingLog) {
      const { error, data } = await supabase.from('logs').update(payload).eq('id', editingLog.id).select().single()
      if (error) { setToast(error.message); return }
      setLogs((prev) => prev.map((x) => (x.id === editingLog.id ? (data as any) : x)))
    } else {
      const { error, data } = await supabase.from('logs').insert(payload).select().single()
      if (error) { if (error.message.includes('prac_number') || error.message.includes('practice_number')) { const { prac_number, practice_number, ...fallback } = payload as any; const { error: e2, data: d2 } = await supabase.from('logs').insert(fallback).select().single(); if (e2) { setToast(e2.message); return } setLogs((prev) => [d2 as any, ...prev]) } else { setToast(error.message); return } } else { setLogs((prev) => [data as any, ...prev]) }
    }
    setShowLog(false); setShowDetailLog(null); setToast('Log saved')
  }

  function handlePracticeSelectForLog(practiceId: string) {
    if (!practiceId) { setLForm({ ...lForm, practice_id: '', practice_name: '', prac_number: '', practice_number: '', contact_person: '', phone: '', product: 'Solv Optics' }); return }
    const p = practices.find((x) => x.id === practiceId)
    if (p) { setLForm({ ...lForm, practice_id: p.id, practice_name: p.practice_name, prac_number: getPracNumber(p), practice_number: getPracNumber(p), contact_person: p.contact_person || '', phone: p.phone || (p as any).mobile || '', product: p.product || 'Solv Optics', }) }
  }

  async function saveAppt() {
    if (!aForm.title || !aForm.date) { setToast('Title + Date required'); return }
    if (editingAppt) { const { error, data } = await supabase.from('appointments').update(aForm).eq('id', editingAppt.id).select().single(); if (error) { setToast(error.message); return } setAppointments((prev) => prev.map((x) => (x.id === editingAppt.id ? (data as any) : x))) } else { const { error, data } = await supabase.from('appointments').insert(aForm).select().single(); if (error) { setToast(error.message); return } setAppointments((prev) => [...prev, data as any]) }
    setShowAppt(false); setShowDetailAppt(null); setToast('Appointment saved')
  }

  async function saveProfile() {
    if (!pUsername || !pPassword) { setToast('Username + Password required'); return }
    const payload = { username: pUsername.trim(), password_hash: pPassword }
    if (editingProfile) {
      const { error, data } = await supabase.from('profiles').update(payload).eq('id', editingProfile.id).select().single()
      if (error) { setToast(error.message); return } setProfiles(prev => prev.map(x => x.id === editingProfile.id ? data as any : x))
    } else {
      const { error, data } = await supabase.from('profiles').insert(payload).select().single()
      if (error) { setToast(error.message); return } setProfiles(prev => [data as any, ...prev])
    }
    setPUsername(''); setPPassword(''); setEditingProfile(null); setToast('Profile saved')
  }

  async function deleteProfile(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { setToast(error.message); return } setProfiles(prev => prev.filter(p => p.id !== id)); setToast('Profile deleted')
  }

  const isDark = theme === 'dark'
  const bgPage = isDark ? 'bg-[#020617] text-slate-100' : 'bg-[#eaf1fb] text-slate-900'
  const bgHeader = isDark ? 'bg-[#0a1228]/90 border-slate-800' : 'bg-[#f3f7fd]/90 border-blue-200/70'
  const bgCard = isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white/90 border-blue-100 text-slate-900'
  const bgInput = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400' : 'bg-white border-blue-100 text-slate-900 placeholder:text-slate-400'
  const bgChip = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-blue-100 text-slate-700'
  const bgSubtle = isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500'
  const textSubtle = isDark ? 'text-slate-500' : 'text-slate-400'

  const cardBase = `group relative rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col ${bgCard}`
  const listRowBase = `group relative rounded-xl border px-3 sm:px-4 py-3.5 flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all cursor-pointer ${bgCard}`
  const statusColors: Record<string,string> = isDark ? {
    Open: 'bg-amber-950/60 text-amber-300 border-amber-800',
    'In Progress': 'bg-blue-950/60 text-blue-300 border-blue-800',
    Closed: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  } : {
    Open: 'bg-amber-50 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-[#0f1a2e] via-[#162447] to-[#1e3a5f]">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl bg-blue-400/20" /></div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
        <div className={`relative w-full max-w-sm rounded-3xl p-[1.5px] shadow-[0_20px_80px_-20px_rgba(59,130,246,0.35)] ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 opacity-70" />
          <div className="relative w-full bg-white/95 backdrop-blur-xl rounded-3xl p-7 sm:p-8 text-center">
            {!logoError ? <img src={LOGO_PATH} alt="Logo" onError={() => setLogoError(true)} className="h-11 mx-auto mb-5 object-contain" /> : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white mx-auto mb-4">👁</div>}
            <div className="text-xs font-black tracking-[0.18em] bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">SOLV • SECURE</div>
            <div className="text-left mt-7 space-y-3">
              <div><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full h-11 mt-2 rounded-xl border border-blue-100 bg-white px-4 text-sm text-slate-900" /></div>
              <div><label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label><div className="relative mt-2"><input type={showPass ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" disabled={isLocked} className="w-full h-11 rounded-xl border border-blue-100 bg-white pl-4 pr-12 text-sm text-slate-900" /><button onClick={() => setShowPass(!showPass)} className="absolute right-1 top-1 w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-sm flex items-center justify-center">{showPass ? '🙈' : '👁'}</button></div></div>
              <button onClick={handleLogin} disabled={isLocked} className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 text-white text-sm font-bold">{isLocked ? `Locked ${countdown}s` : 'Unlock →'}</button>
            </div>
          </div>
        </div>
        {showErrorPopup && <div className="fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl"><div className="text-3xl">🚫</div><h3 className="font-extrabold text-sm mt-3 text-slate-900">Incorrect Username / Password</h3><button onClick={() => setShowErrorPopup(false)} className="w-full h-11 mt-5 rounded-xl bg-slate-900 text-white text-sm font-bold">Try Again</button></div></div>}
      </div>
    )
  }

  return (
    <div className={`min-h-screen pb-28 sm:pb-10 transition-colors relative overflow-hidden ${bgPage}`}>
      <header className={`sticky top-0 z-10 backdrop-blur-xl border-b ${bgHeader}`}>
        <div className="relative mx-auto w-full max-w-6xl px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {!logoError ? <div className="p-[1.5px] rounded-full bg-gradient-to-br from-blue-500 to-sky-600 shrink-0"><img src={LOGO_PATH} alt="Logo" onError={() => setLogoError(true)} className="h-8 w-8 rounded-full bg-white p-1" /></div> : <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">👁</div>}
            <div className={`font-black text- sm:text-sm truncate ${isDark ? 'text-white' : 'bg-gradient-to-r from-blue-700 to-sky-700 bg-clip-text text-transparent'}`}>SOLVMEDICAL</div>
            <div className={`hidden lg:flex ml-2 items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${bgChip}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-">{currentProfile?.username || 'Unknown'}</span>
              {activeUsers.length > 0 && <span className={textMuted}>• {activeUsers.length} online</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {lastRefresh && <div className={`hidden md:flex text- ${textMuted}`}>Updated {lastRefresh.toLocaleTimeString()}</div>}
            <div className={`hidden sm:flex h-10 px-3 rounded-xl items-center gap-2 border text-xs font-bold ${bgChip}`}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black">{(currentProfile?.username || 'U')[0].toUpperCase()}</div>
              <span className="max-w- truncate">{currentProfile?.username}</span>
            </div>
            <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${bgChip}`}>{theme === 'dark' ? '☀' : '🌙'}</button>
            <button onClick={() => { localStorage.removeItem('isLoggedIn'); localStorage.removeItem('solv_username'); localStorage.removeItem('solv_profile_id'); setIsLoggedIn(false); setCurrentProfile(null) }} className={`w-10 h-10 rounded-xl border shrink-0 ${bgChip}`}>↪</button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 pb-3 pt-1 sm:pt-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search practices, logs, product..." className={`w-full h-11 sm:h-11 rounded-xl pl-4 pr-4 text- sm:text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${bgInput}`} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-3 sm:p-6">
        {/* TABS - MOBILE FIRST: horizontal scroll, snap */}
        <div className={`flex gap-1.5 mb-4 sm:mb-5 p-1 rounded-full w-full sm:w-fit overflow-x-auto border shadow-sm backdrop-blur scrollbar-none snap-x snap-mandatory ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-blue-100'}`}>
          {[
            { k: 'logs', l: 'Logs', i: '📋' },
            { k: 'practices', l: 'Practices', i: '🏥' },
            { k: 'messages', l: 'Messages', i: '💬', badge: unreadMessages },
            { k: 'calendar', l: 'Calendar', i: '📅' },
            { k: 'kpi', l: 'KPI', i: '📊' },
            { k: 'profile', l: 'Profiles', i: '👤' }
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`relative h-10 sm:h-9 px-4 sm:px-4 rounded-full text- sm:text-sm font-bold flex items-center gap-1.5 transition-colors snap-start shrink-0 ${tab === t.k ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span>{t.i}</span> <span>{t.l}</span>
              {/* FIXED UNREAD BUBBLE */}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`ml-1 min-w- h-5 px-1.5 rounded-full text- font-black flex items-center justify-center leading-none
                  ${tab === t.k ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'}`}>
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========== LOGS ========== */}
        {tab === 'logs' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text- sm:text-lg font-black">Logs</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${bgChip}`}>{filteredLogs.length} total</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ViewToggle value={logsView} onChange={setLogsView} isDark={isDark} />
                <div className={`flex gap-1 p-1 rounded-full border overflow-x-auto scrollbar-none ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
                  {(['All','Open','In Progress','Closed'] as const).map(s => (
                    <button key={s} onClick={()=>setStatusFilter(s)} className={`h-9 sm:h-8 px-3 rounded-full text-xs font-bold transition-colors shrink-0 ${statusFilter===s ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>{s}</button>
                  ))}
                </div>
                <button onClick={()=>{ setLForm(EMPTY_LOG); setEditingLog(null); setShowLog(true) }} className="h-10 sm:h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow ml-auto sm:ml-0">+ New Log</button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className={`h-28 rounded-2xl animate-pulse ${isDark?'bg-slate-800':'bg-white/60'}`} />)}</div>
            ) : filteredLogs.length===0 ? (
              <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark?'border-slate-700 bg-slate-900/50':'bg-white/70 border-blue-200'}`}><div className="text-3xl">📋</div><p className={`mt-2 text-sm font-bold ${textMuted}`}>No logs found</p></div>
            ) : logsView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredLogs.map(log=>{
                  const linked = getPracticeForLog(log)
                  return (
                    <div key={log.id} onClick={()=>setShowDetailLog(log)} className={cardBase + ' cursor-pointer min-h-'}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`text- font-black tracking-widest uppercase px-2 py-1 rounded-full border ${statusColors[log.status] || statusColors.Open}`}>{log.status}</div>
                        <span className={`text- font-mono ${textSubtle}`}>{getPracNumber(linked) || getPracNumber(log) || ''}</span>
                      </div>
                      <h3 className="font-bold text- sm:text-sm leading-tight line-clamp-2">{log.practice_name || linked?.practice_name || 'Unlinked Practice'}</h3>
                      <p className={`text- sm:text-xs mt-1 line-clamp-2 ${textMuted}`}>{log.issue}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {log.product && <span className={`text- px-2 py-1 rounded-full border font-bold ${bgSubtle}`}>{log.product}</span>}
                        {log.contact_person && <span className={`text- px-2 py-1 rounded-full border ${isDark ? 'bg-blue-950/40 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{log.contact_person}</span>}
                      </div>
                      <div className={`mt-auto pt-3 flex items-center justify-between text- ${textSubtle}`}>
                        <span>{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}</span>
                        <span className={`font-bold group-hover:translate-x-0.5 transition-transform ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>View →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map(log=>{
                  const linked = getPracticeForLog(log)
                  return (
                    <div key={log.id} onClick={()=>setShowDetailLog(log)} className={listRowBase}>
                      <div className={`text- font-black uppercase px-2 py-1 rounded-full border shrink-0 ${statusColors[log.status] || statusColors.Open}`}>{log.status}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text- sm:text-sm truncate">{log.practice_name || linked?.practice_name}</span>
                          <span className={`text- font-mono hidden sm:inline ${textSubtle}`}>{getPracNumber(linked) || getPracNumber(log)}</span>
                        </div>
                        <p className={`text-xs truncate ${textMuted}`}>{log.issue} {log.product ? `• ${log.product}` : ''}</p>
                      </div>
                      <div className={`hidden sm:flex items-center gap-3 text-xs ${textMuted}`}>
                        <span className="truncate max-w-">{log.contact_person || ''}</span>
                        <span>{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>→</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== PRACTICES ========== */}
        {tab === 'practices' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text- sm:text-lg font-black">Practices</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${bgChip}`}>{filteredPractices.length} total</span>
              </div>
              <div className="flex items-center gap-2">
                <ViewToggle value={practicesView} onChange={setPracticesView} isDark={isDark} />
                <button onClick={()=>{ setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }} className="h-10 sm:h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">+ New Practice</button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className={`h-28 rounded-2xl animate-pulse ${isDark?'bg-slate-800':'bg-white/60'}`} />)}</div>
            ) : filteredPractices.length===0 ? (
              <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark?'border-slate-700 bg-slate-900/50':'bg-white/70 border-blue-200'}`}><div className="text-3xl">🏥</div><p className={`mt-2 text-sm font-bold ${textMuted}`}>No practices found</p></div>
            ) : practicesView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredPractices.map(p=>{
                  const logsCount = logs.filter(l=> l.practice_id===p.id || l.practice_name===p.practice_name).length
                  return (
                    <div key={p.id} onClick={()=>setShowDetailPractice(p)} className={cardBase + ' cursor-pointer min-h-'}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text- leading-tight truncate">{p.practice_name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text- font-mono px-1.5 py-0.5 rounded border ${bgSubtle}`}>{getPracNumber(p) || '—'}</span>
                            {p.product && <span className={`text- px-2 py-0.5 rounded-full border ${isDark ? 'bg-blue-950/40 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{p.product}</span>}
                          </div>
                        </div>
                        <button onClick={async (e)=>{ e.stopPropagation(); if(!confirm(`Delete "${p.practice_name}"?`)) return; await deletePractice(p.id) }} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shrink-0 ${bgChip}`}>🗑</button>
                      </div>
                      <div className={`mt-3 space-y-1.5 text-xs ${textMuted}`}>
                        {p.contact_person && <div className="flex items-center gap-1.5"><span>👤</span><span className="truncate">{p.contact_person}</span></div>}
                        {p.phone && <div className="flex items-center gap-1.5"><span>📞</span><span className="truncate">{p.phone}</span></div>}
                        {p.email && <div className="flex items-center gap-1.5"><span>✉</span><span className="truncate">{p.email}</span></div>}
                      </div>
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span className={`text- px-2 py-1 rounded-full border font-bold ${bgSubtle}`}>{logsCount} logs</span>
                        <span className={`text- font-bold group-hover:translate-x-0.5 transition-transform ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>View →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPractices.map(p=>{
                  const logsCount = logs.filter(l=> l.practice_id===p.id || l.practice_name===p.practice_name).length
                  return (
                    <div key={p.id} onClick={()=>setShowDetailPractice(p)} className={listRowBase}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0">{p.practice_name[0]?.toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text- sm:text-sm truncate">{p.practice_name}</span>
                          <span className={`text- font-mono px-1.5 py-0.5 rounded border hidden sm:inline ${bgSubtle}`}>{getPracNumber(p) || '—'}</span>
                          {p.product && <span className={`text- px-2 py-0.5 rounded-full border hidden sm:inline ${isDark ? 'bg-blue-950/40 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{p.product}</span>}
                        </div>
                        <div className={`text-xs truncate flex gap-3 ${textMuted}`}>
                          {p.contact_person && <span className="truncate">{p.contact_person}</span>}
                          {p.phone && <span className="hidden sm:inline truncate">{p.phone}</span>}
                          {p.email && <span className="hidden md:inline truncate">{p.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text- px-2 py-1 rounded-full border font-bold ${bgSubtle}`}>{logsCount}</span>
                        <button onClick={async (e)=>{ e.stopPropagation(); if(!confirm(`Delete "${p.practice_name}"?`)) return; await deletePractice(p.id) }} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs border hover:bg-red-50 hover:text-red-600 ${bgChip}`}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && <MessageBoard messages={messages} setMessages={setMessages as any} theme={theme} setToast={setToast} />}
        {tab === 'calendar' && (
          <div className="space-y-4">
            <CalendarGrid calendarDate={calendarDate} setCalendarDate={setCalendarDate} selectedCalDate={selectedCalDate} setSelectedCalDate={setSelectedCalDate} appointments={appointments} theme={theme} onSelectDate={() => {}} onSelectAppt={(a) => setShowDetailAppt(a)} onNewAppt={(dateStr) => { setAForm({ ...EMPTY_APPT, date: dateStr }); setEditingAppt(null); setShowAppt(true) }} />
            {selectedCalDate && <SelectedDayPanel date={selectedCalDate} appointments={appointments.filter((a) => normalizeDateStr(a.date) === selectedCalDate).sort((a,b)=>a.start_time.localeCompare(b.start_time))} theme={theme} onClose={() => setSelectedCalDate(null)} onSelect={(a) => setShowDetailAppt(a)} />}
            <UpcomingAppointments appointments={appointments} theme={theme} onSelect={(a) => setShowDetailAppt(a)} />
          </div>
        )}
        {tab === 'kpi' && <KpiDashboard practices={practices} logs={logs} appointments={appointments} messages={messages} unreadMessages={unreadMessages} theme={theme} />}

        {tab === 'profile' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className={`rounded-2xl border p-4 sm:p-5 shadow backdrop-blur ${bgCard}`}>
                <h3 className={`font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2 ${textMuted}`}><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> You - Logged In</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-lg shrink-0">{(currentProfile?.username || '?')[0].toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate flex items-center gap-2 flex-wrap">{currentProfile?.username} <span className={`text- px-2 py-0.5 rounded-full border ${isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>ONLINE NOW</span></div>
                    <div className={`text-xs truncate ${textMuted}`}>ID: {currentProfile?.id.slice(0,8)}... • now</div>
                  </div>
                </div>
              </div>
              <div className={`rounded-2xl border p-4 sm:p-5 shadow backdrop-blur flex flex-col justify-center ${bgCard}`}>
                <h3 className={`font-bold text-xs uppercase tracking-widest mb-2 ${textMuted}`}>Active Sessions</h3>
                <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">{activeUsers.length}</div>
                <div className={`text-xs mt-1 ${textMuted}`}>{activeUsers.filter(u => u.profile_id !== currentProfile?.id).length} other • {activeUsers.length} total online</div>
                <div className={`mt-3 h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}><div className="h-full bg-gradient-to-r from-blue-600 to-sky-500" style={{ width: `${Math.min(100, activeUsers.length * 25)}%` }} /></div>
              </div>
              <div className={`rounded-2xl border p-4 sm:p-5 shadow backdrop-blur ${bgCard}`}>
                <h4 className={`font-bold text-xs uppercase tracking-widest mb-3 ${textMuted}`}>Other Online ({activeUsers.filter(u => u.profile_id !== currentProfile?.id).length})</h4>
                <div className="space-y-2 max-h- overflow-y-auto">
                  {activeUsers.filter(u => u.profile_id !== currentProfile?.id).map(u => (
                    <div key={u.profile_id} className={`p-2.5 rounded-xl border flex justify-between items-center text-sm ${bgSubtle}`}>
                      <div className="flex items-center gap-2 truncate"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />{u.username}</div>
                      <span className={`text-xs shrink-0 ml-2 ${textMuted}`}>{new Date(u.online_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {activeUsers.filter(u => u.profile_id !== currentProfile?.id).length === 0 && <div className={`text-xs p-2 rounded-xl text-center ${bgSubtle} ${textMuted}`}>No other users online</div>}
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 sm:p-6 shadow backdrop-blur ${bgCard}`}>
              <h3 className="font-bold text-lg mb-1">Profile Management</h3>
              <p className={`text-xs mb-4 ${textMuted}`}>Stored in Supabase <code>profiles</code> • Vercel + Supabase • prac_number compatible</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input value={pUsername} onChange={e=>setPUsername(e.target.value)} placeholder="Username" className={`h-11 rounded-xl border px-4 text- sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${bgInput}`} />
                <input value={pPassword} onChange={e=>setPPassword(e.target.value)} placeholder={editingProfile ? "New Password" : "Password"} type="password" className={`h-11 rounded-xl border px-4 text- sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${bgInput}`} />
                <div className="flex gap-2"><button onClick={saveProfile} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold">{editingProfile ? 'Update' : 'Add'} Profile</button>{editingProfile && <button onClick={()=>{setEditingProfile(null); setPUsername(''); setPPassword('')}} className={`h-11 px-4 rounded-xl text-sm font-bold ${bgChip}`}>Cancel</button>}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {profiles.map(p => {
                  const isOnline = activeUsers.some(u => u.profile_id === p.id)
                  const isMe = p.id === currentProfile?.id
                  return (
                    <div key={p.id} className={`p-3 rounded-2xl border flex justify-between items-center ${isMe ? (isDark ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50/70 border-blue-200') : bgSubtle}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div className="min-w-0"><div className="font-bold text-sm flex items-center gap-1.5 truncate flex-wrap">{p.username} {isMe && <span className="text- px-1.5 py-0.5 rounded bg-blue-600 text-white">YOU</span>} {isOnline && <span className={`text- px-1.5 py-0.5 rounded border ${isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>ONLINE</span>}</div><div className={`text- ${textMuted}`}>{new Date(p.created_at || '').toLocaleDateString()}</div></div>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0"><button onClick={()=>{setEditingProfile(p); setPUsername(p.username); setPPassword('')}} className={`h-8 px-2.5 rounded-lg text-xs font-bold ${isDark ? 'bg-blue-950/40 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>Edit</button><button onClick={()=>{ if(confirm(`Delete ${p.username}?`)) deleteProfile(p.id)}} className={`h-8 px-2.5 rounded-lg text-xs font-bold ${isDark ? 'bg-red-950/40 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-100'}`}>Del</button></div>
                    </div>
                  )
                })}
                {profiles.length === 0 && <div className={`col-span-full p-6 text-center text-sm rounded-2xl border border-dashed ${textMuted} ${isDark ? 'border-slate-700' : 'border-blue-200'}`}>No profiles yet</div>}
              </div>
            </div>
          </div>
        )}
      </main>

      <PracticeDetail practice={showDetailPractice} onClose={() => setShowDetailPractice(null)} theme={theme} onEdit={(p) => { setEditingPractice(p); setPForm(p); setShowPractice(true) }} onDelete={async (p) => { if (!confirm(`Delete "${p.practice_name}"?`)) return; const ok = await deletePractice(p.id); if (ok) setShowDetailPractice(null) }} />
      <PracticeForm open={showPractice} onClose={() => setShowPractice(false)} theme={theme} form={pForm} setForm={setPForm} onSave={savePractice} editing={editingPractice} />
      <LogDetail log={showDetailLog} practices={practices} onClose={() => setShowDetailLog(null)} theme={theme} onEdit={(l) => { setEditingLog(l); setLForm(l); setShowLog(true) }} onDelete={async (l) => { await supabase.from('logs').delete().eq('id', l.id); setLogs((prev) => prev.filter((x) => x.id !== l.id)); setShowDetailLog(null) }} />
      <LogForm open={showLog} onClose={() => setShowLog(false)} theme={theme} form={lForm} setForm={setLForm} onSave={saveLog} editing={editingLog} practices={practices} onPracticeSelect={handlePracticeSelectForLog} />
      <AppointmentDetail appointment={showDetailAppt} onClose={() => setShowDetailAppt(null)} theme={theme} onEdit={(a) => { setEditingAppt(a); setAForm(a); setShowAppt(true) }} onDelete={async (a) => { await supabase.from('appointments').delete().eq('id', a.id); setAppointments((prev) => prev.filter((x) => x.id !== a.id)); setShowDetailAppt(null) }} />
      <AppointmentForm open={showAppt} onClose={() => setShowAppt(false)} theme={theme} form={aForm} setForm={setAForm} onSave={saveAppt} editing={editingAppt} />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}
