'use client'
/*
  SOLV CRM - Main Page
  Stack: Next.js (client component) + Supabase + Tailwind
  TABS: logs | practices | todos | calendar | kpi
  UPDATE: Practice_number + Logs autofill practice_number (greyed out) not practice_name
  UPDATE 2: Todo timestamp + Calendar square blocks + smaller labels + KPI comments
*/

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

const LOGO_PATH = "/solv-logo-blue.png"

// ================= TYPES =================
type Practice = {
  id: string;
  created_at: string;
  practice_name: string;
  practice_number: string;
  contact_person: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  product: string;
  notes: string
}
type LogRow = {
  id: string;
  created_at: string;
  practice_id: string | null;
  practice_name: string;
  practice_number?: string;
  contact_person: string;
  phone: string;
  product: string;
  issue: string;
  solution: string;
  notes: string;
  status: string
}
type Todo = { id: string; text: string; done: boolean; created_at: string }
type Appointment = { id: string; created_at: string; title: string; description: string; date: string; start_time: string; end_time: string; type: 'Meeting'|'Call'|'Visit'|'Personal'|'Other'; location: string; practice_name?: string }

const PRODUCT_OPTIONS = [ 'Solv Optics', 'Solv Physio', 'Solv Meds', 'Solv Dental'] as const
const PRODUCT_COLORS: Record<string, string> = {
  'Solv Optics': '#3b82f6',
  'Solv Physio': '#ef4444',
  'Solv Meds': '#f59e0b',
  'Solv Dental': '#6315ca'
}

function normalizeProduct(v: string) {
  const t = (v || '').trim()
  if (!t) return 'Unknown'
  const match = PRODUCT_OPTIONS.find(o => o.toLowerCase() === t.toLowerCase())
  if (match) return match
  if (t.toLowerCase().includes('optics') || t.toLowerCase().includes('optom')) return 'Solv Optics'
  if (t.toLowerCase().includes('physio')) return 'Solv Physio'
  if (t.toLowerCase().includes('meds')) return 'Solv Meds'
  if (t.toLowerCase().includes('dental') || t.toLowerCase().includes('dentistry')) return 'Solv Dental'
  return t
}

const EMPTY_PRACTICE = { practice_name: '', practice_number: '', contact_person: '', phone: '', mobile: '', email: '', address: '', product: 'Solv Optics', notes: '' }
const EMPTY_LOG = { practice_id: '', practice_name: '', practice_number: '', contact_person: '', phone: '', product: 'Solv Optics', issue: '', solution: '', notes: '', status: 'Open' }
const EMPTY_APPT = { title: '', description: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', type: 'Meeting' as Appointment['type'], location: '', practice_name: '' }
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'SolvOptics456'
const TODO_TITLE = "My To-Do List"

function statusStyle(s: string) {
  if (s === 'Open') return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' }
  if (s === 'Closed') return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }
  return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
}
function apptTypeStyle(t: string) {
  if (t==='Meeting') return { bg:'#dbeafe', color:'#1d4ed8', border:'#bfdbfe', dot:'#3b82f6' }
  if (t==='Visit') return { bg:'#dcfce7', color:'#15803d', border:'#bbf7d0', dot:'#22c55e' }
  if (t==='Call') return { bg:'#fef3c7', color:'#92400e', border:'#fde68a', dot:'#f59e0b' }
  if (t==='Personal') return { bg:'#e0f2fe', color:'#0c4a6e', border:'#bae6fd', dot:'#0ea5e9' }
  return { bg:'#f1f5f9', color:'#670bdf', border:'#e2e8f0', dot:'#1864ce' }
}

// Shows timestamp for each todo - when it was created
function formatTodoTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}

export default function Page() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [shake, setShake] = useState(false)

  const [practices, setPractices] = useState<Practice[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const [newTodoText, setNewTodoText] = useState('')
  const [editingTodoId, setEditingTodoId] = useState<string|null>(null)
  const [editingTodoText, setEditingTodoText] = useState('')
  const [todoFilter, setTodoFilter] = useState<'All' | 'Active' | 'Done'>('All')

  const [tab, setTab] = useState<'logs' | 'practices' | 'todos' | 'calendar' | 'kpi'>('logs')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All')

  const [showPractice, setShowPractice] = useState(false)
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null)
  const [pForm, setPForm] = useState<any>(EMPTY_PRACTICE)
  const [showLog, setShowLog] = useState(false)
  const [editingLog, setEditingLog] = useState<LogRow | null>(null)
  const [lForm, setLForm] = useState<any>(EMPTY_LOG)
  const [showDetailLog, setShowDetailLog] = useState<LogRow | null>(null)
  const [showDetailPractice, setShowDetailPractice] = useState<Practice | null>(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null)
  const [showAppt, setShowAppt] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [aForm, setAForm] = useState<any>(EMPTY_APPT)
  const [showDetailAppt, setShowDetailAppt] = useState<Appointment | null>(null)
  const [toast, setToast] = useState('')
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('solv_theme') as 'light'|'dark'|null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(saved || (prefersDark? 'dark' : 'light'))
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    fetchAll()
  }, [])

  useEffect(() => {
    localStorage.setItem('solv_theme', theme)
    document.documentElement.classList.toggle('dark', theme==='dark')
  }, [theme])

  useEffect(() => { if (!isLocked) return; const t = setInterval(() => setCountdown(c => { if (c<=1){ setIsLocked(false); setFailedAttempts(0); return 0 } return c-1 }), 1000); return () => clearInterval(t) }, [isLocked])
  useEffect(() => { if(toast){ const t=setTimeout(()=>setToast(''),2500); return()=>clearTimeout(t) } }, [toast])

  async function fetchAll(){
    setLoading(true)
    const [p,l,t,a] = await Promise.all([
      supabase.from('practices').select('*').order('created_at',{ascending:false}),
      supabase.from('logs').select('*').order('created_at',{ascending:false}),
      supabase.from('todos').select('*').order('created_at',{ascending:false}),
      supabase.from('appointments').select('*').order('date',{ascending:true}),
    ])
    if(p.data) setPractices(p.data as any)
    if(l.data) setLogs(l.data as any)
    if(t.data) setTodos(t.data as any)
    if(a.data) setAppointments(a.data as any)
    setLoading(false)
  }

  function handleLogin() {
    if (isLocked) return
    if (pass === APP_PASSWORD) { localStorage.setItem('isLoggedIn','true'); setIsLoggedIn(true); setFailedAttempts(0); setPass('') }
    else { const n=failedAttempts+1; setFailedAttempts(n); setShake(true); setShowErrorPopup(true); setTimeout(()=>setShake(false),400); setPass(''); if(n>=3){ setIsLocked(true); setCountdown(30) } }
  }

  const getPracticeForLog = (log: LogRow) => {
    if (log.practice_id) return practices.find(p => p.id === log.practice_id)
    return practices.find(p => p.practice_name === log.practice_name)
  }

  const filteredLogs = useMemo(()=>{
    let f=logs
    if (statusFilter!=='All') f=f.filter(l=>l.status===statusFilter)
    if (search) f=f.filter(l=>{
      const linked = getPracticeForLog(l)
      const searchStr = (l.practice_name+l.issue+l.solution+l.product+(linked?.practice_number||'')+(l.practice_number||'')).toLowerCase()
      return searchStr.includes(search.toLowerCase())
    })
    return f
  }, [logs, search, statusFilter, practices])

  const filteredPractices = useMemo(()=> practices.filter(p=>
    (p.practice_name+' '+(p.practice_number||'')+' '+p.contact_person+' '+p.phone+' '+p.email+' '+p.product)
 .toLowerCase().includes(search.toLowerCase())
  ), [practices, search])

  const filteredTodos = useMemo(()=>{
    let f = todos
    if (todoFilter==='Active') f=f.filter(t=>!t.done)
    if (todoFilter==='Done') f=f.filter(t=>t.done)
    if (search) f=f.filter(t=>t.text.toLowerCase().includes(search.toLowerCase()))
    return f
  }, [todos, todoFilter, search])

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const normalizeDateStr = (s: string) => s.slice(0, 10)
  const todayLocalStr = toLocalDateStr(new Date())

  const calendarGrid = useMemo(() => {
    const y = calendarDate.getFullYear(), m = calendarDate.getMonth()
    const first = new Date(y, m, 1)
    const startDay = (first.getDay() + 6) % 7
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells: { date: Date | null, dateStr: string | null, isCurrentMonth: boolean }[] = []
    for (let i = 0; i < startDay; i++) cells.push({ date: null, dateStr: null, isCurrentMonth: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d)
      cells.push({ date: dt, dateStr: toLocalDateStr(dt), isCurrentMonth: true })
    }
    while (cells.length % 7!== 0) cells.push({ date: null, dateStr: null, isCurrentMonth: false })
    return cells
  }, [calendarDate])

  const getApptsForDate = (dateStr: string) =>
    appointments.filter(a => normalizeDateStr(a.date) === dateStr).sort((a,b) => a.start_time.localeCompare(b.start_time))

  const upcomingAppts = useMemo(() => {
    return [...appointments].filter(a => normalizeDateStr(a.date) >= todayLocalStr).sort((a,b) => (normalizeDateStr(a.date) + a.start_time).localeCompare(normalizeDateStr(b.date) + b.start_time)).slice(0, 8)
  }, [appointments])

  const selectedDayAppts = useMemo(() => {
    if (!selectedCalDate) return []
    return getApptsForDate(selectedCalDate)
  }, [selectedCalDate, appointments])

  async function savePractice() {
    if (!pForm.practice_name) { setToast('Practice Name required'); return }
    const cleanedForm = {
   ...pForm,
      product: normalizeProduct(pForm.product),
      practice_number: (pForm.practice_number || '').trim()
    }
    if (editingPractice) {
      const { error, data } = await supabase.from('practices').update(cleanedForm).eq('id', editingPractice.id).select().single()
      if(error){ setToast(error.message); return }
      setPractices(practices.map(x=>x.id===editingPractice.id? data as any : x))
    } else {
      const { error, data } = await supabase.from('practices').insert(cleanedForm).select().single()
      if(error){ setToast(error.message); return }
      setPractices([data as any,...practices])
    }
    setShowPractice(false); setShowDetailPractice(null); setToast('Practice saved')
  }

  async function deletePractice(id: string) {
    const { error } = await supabase.from('practices').delete().eq('id', id)
    if (error) { setToast(error.message); return false }
    setPractices(prev => prev.filter(p => p.id!== id))
    setToast('Practice deleted')
    return true
  }

  async function saveLog() {
    if (!lForm.practice_id ||!lForm.issue) { setToast('Select Practice + Issue required'); return }
    const linkedPractice = practices.find(p => p.id === lForm.practice_id)
    const payload = {
      practice_id: lForm.practice_id || null,
      practice_name: linkedPractice?.practice_name || lForm.practice_name || '',
      practice_number: linkedPractice?.practice_number || lForm.practice_number || '',
      contact_person: lForm.contact_person || '',
      phone: lForm.phone || '',
      product: normalizeProduct(lForm.product),
      issue: lForm.issue,
      solution: lForm.solution || '',
      notes: lForm.notes || '',
      status: lForm.status || 'Open'
    }
    if (editingLog) {
      const { error, data } = await supabase.from('logs').update(payload).eq('id', editingLog.id).select().single()
      if(error){ setToast(error.message); return }
      setLogs(logs.map(x=>x.id===editingLog.id? data as any : x))
    } else {
      const { error, data } = await supabase.from('logs').insert(payload).select().single()
      if(error){
        if(error.message.includes('practice_number')){
          const { practice_number,...fallback } = payload as any
          const { error: e2, data: d2 } = await supabase.from('logs').insert(fallback).select().single()
          if(e2){ setToast(e2.message); return }
          setLogs([d2 as any,...logs])
        } else {
          setToast(error.message); return
        }
      } else {
        setLogs([data as any,...logs])
      }
    }
    setShowLog(false); setShowDetailLog(null); setToast('Log saved')
  }

  function handlePracticeSelectForLog(practiceId: string) {
    if (!practiceId) {
      setLForm({...lForm, practice_id: '', practice_name: '', practice_number: '', contact_person: '', phone: '', product: 'Solv Optics'})
      return
    }
    const p = practices.find(x=>x.id===practiceId)
    if (p) {
      setLForm({
      ...lForm,
        practice_id: p.id,
        practice_name: p.practice_name,
        practice_number: p.practice_number || '',
        contact_person: p.contact_person || '',
        phone: p.phone || p.mobile || '',
        product: p.product || 'Solv Optics'
      })
    }
  }

  async function saveAppt(){
    if(!aForm.title ||!aForm.date){ setToast('Title + Date required'); return }
    if(editingAppt){
      const { error, data } = await supabase.from('appointments').update(aForm).eq('id', editingAppt.id).select().single()
      if(error){ setToast(error.message); return }
      setAppointments(appointments.map(x=>x.id===editingAppt.id? data as any : x))
    } else {
      const { error, data } = await supabase.from('appointments').insert(aForm).select().single()
      if(error){ setToast(error.message); return }
      setAppointments([...appointments, data as any])
    }
    setShowAppt(false); setShowDetailAppt(null); setToast('Appointment saved')
  }

  async function addTodo(){
    const txt=newTodoText.trim(); if(!txt){ setToast('Type something'); return }
    const { data, error } = await supabase.from('todos').insert({ text: txt, done: false }).select().single()
    if(error){ setToast(error.message); return }
    setTodos([data as any,...todos]); setNewTodoText('')
  }
  async function toggleTodo(id:string){
    const t=todos.find(x=>x.id===id); if(!t) return
    const { data, error } = await supabase.from('todos').update({ done:!t.done }).eq('id', id).select().single()
    if(error){ setToast(error.message); return }
    setTodos(todos.map(x=>x.id===id? data as any : x))
  }
  async function deleteTodo(id:string){
    await supabase.from('todos').delete().eq('id', id)
    setTodos(todos.filter(t=>t.id!==id))
  }
  async function updateTodoText(id:string){
    const txt = editingTodoText.trim()
    if(!txt){ setToast('Text required'); return }
    const { data, error } = await supabase.from('todos').update({ text: txt }).eq('id', id).select().single()
    if(error){ setToast(error.message); return }
    setTodos(todos.map(x=>x.id===id? data as any : x))
    setEditingTodoId(null)
    setToast('To-Do updated')
  }

  // ================= KPI REPORT EXPLAINED =================
  // This KPI dashboard is your business overview:
  // - Top cards: total counts for PRACTICES, TOTAL LOGS, OPEN LOGS (needs action), TODOS LEFT
  // - Logs by Status: % of Open vs In Progress vs Closed = workload and completion rate
  // - Logs by Product: which product line (Optics/Physio/Meds/Dental) creates most tickets
  // - Practices by Product: how many practices you have per product
  // - Top Practices by Logs: top 5 practices with most issues = high-maintenance clients
  // - Logs Last 6 Months: support trend over time (is support increasing?)
  // - Appointments Last 6 Months: field visit/meeting trend
  // - Appointments by Type: Meeting / Visit / Call / Personal / Other breakdown
  // - Appts this month + To-Do done/left: short-term activity
  const kpi = useMemo(()=>{
    const open = logs.filter(l=>l.status==='Open').length
    const prog = logs.filter(l=>l.status==='In Progress').length
    const closed = logs.filter(l=>l.status==='Closed').length
    const totalLogs = logs.length
    const todoActive = todos.filter(t=>!t.done).length
    const todoDone = todos.filter(t=>t.done).length
    const apptThisMonth = appointments.filter(a=>{ const d=new Date(a.date); return d.getMonth()===new Date().getMonth() && d.getFullYear()===new Date().getFullYear() }).length
    const byType = (['Meeting','Visit','Call','Personal','Other'] as const).map(t=>({ type:t, count: appointments.filter(a=>a.type===t).length }))
    const months: { key: string; label: string }[] = []
    for(let i=5;i>=0;i--){
      const d = new Date(); d.setMonth(d.getMonth()-i)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleString('default',{month:'short'})
      months.push({key, label})
    }
    const logsByMonth = months.map(m=> ({...m, count: logs.filter(l=> (l.created_at||'').slice(0,7)===m.key).length }))
    const apptsByMonth = months.map(m=> ({...m, count: appointments.filter(a=> a.date.slice(0,7)===m.key).length }))
    const byProductMap: Record<string, number> = {}
    PRODUCT_OPTIONS.forEach(o => byProductMap[o] = 0)
    logs.forEach(l=> { const k = normalizeProduct(l.product); byProductMap[k]=(byProductMap[k]||0)+1 })
    const byProduct = Object.entries(byProductMap).map(([product,count])=>({product,count}))
    const byPracticeMap: Record<string, number> = {}
    logs.forEach(l=> { const k=l.practice_name||'Unknown'; byPracticeMap[k]=(byPracticeMap[k]||0)+1 })
    const byPracticeTop = Object.entries(byPracticeMap).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,5)
    const practicesByProductMap: Record<string, number> = {}
    PRODUCT_OPTIONS.forEach(o=> practicesByProductMap[o]=0)
    practices.forEach(p=> { const k=normalizeProduct(p.product); practicesByProductMap[k]=(practicesByProductMap[k]||0)+1 })
    const practicesByProduct = Object.entries(practicesByProductMap).map(([product,count])=>({product,count})).filter(x=>x.count>0 || PRODUCT_OPTIONS.includes(x.product as any))
    const maxLogsMonth = Math.max(1,...logsByMonth.map(m=>m.count))
    const maxApptsMonth = Math.max(1,...apptsByMonth.map(m=>m.count))
    return { open, prog, closed, totalLogs, todoActive, todoDone, apptThisMonth, byType, logsByMonth, apptsByMonth, byProduct, byPracticeTop, practicesByProduct, maxLogsMonth, maxApptsMonth }
  }, [logs, todos, appointments, practices])

  const [nowStr, setNowStr] = useState('')
  useEffect(() => {
    const update = () => setNowStr(new Date().toLocaleString('en-ZA', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-[#0f1a2e] via-[#162447] to-[#1e3a5f]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl bg-gradient-to-br from-blue-300/50 via-sky-200/40 to-cyan-200/30" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl bg-gradient-to-br from-sky-300/40 via-blue-200/30 to-indigo-200/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl bg-white/60" />
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
        <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} className="fixed top-4 right-4 w-10 h-10 rounded-xl bg-white/80 backdrop-blur-xl border border-blue-200/50 text-slate-700 flex items-center justify-center shadow-lg z-20 active:scale-95"> {theme==='dark'?'☀':'🌙'} </button>
        <div className={`relative w-full max-w-sm rounded-3xl p-[1.5px] shadow-[0_20px_80px_-20px_rgba(59,130,246,0.35)] ${shake? 'animate-[shake_0.4s_ease]' : ''}`}>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 opacity-70" />
          <div className="relative w-full bg-white/95 backdrop-blur-xl rounded-3xl p-7 sm:p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            {!logoError? <img src={LOGO_PATH} alt="Logo" onError={()=>setLogoError(true)} className="h-11 mx-auto mb-5 object-contain" /> : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">👁</div>}
            <div className="text-xs font-black tracking-[0.18em] bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">SOLV • SECURE</div>
            <div className="text-left mt-7">
              <label className="text- font-bold uppercase tracking-widest text-slate-500">Password</label>
              <div className="relative mt-2">
                <input type={showPass?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="••••••••" disabled={isLocked} className="w-full h-11 rounded-xl border border-blue-100 bg-white pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-inner" />
                <button onClick={()=>setShowPass(!showPass)} className="absolute right-1 top-1 w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-sm active:scale-95 flex items-center justify-center"> {showPass?'🙈':'👁'} </button>
              </div>
              <button onClick={handleLogin} disabled={isLocked} className="w-full h-11 mt-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 text-white text-sm font-bold shadow-[0_8px_20px_-10px_rgba(59,130,246,0.6)] active:scale-[0.98] transition"> {isLocked?`Locked ${countdown}s`:'Unlock →'} </button>
            </div>
          </div>
        </div>
        {showErrorPopup && <div className="fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl border border-blue-100"><div className="text-3xl">🚫</div><h3 className="font-extrabold text-sm mt-3">Incorrect Password</h3><button onClick={()=>setShowErrorPopup(false)} className="w-full h-11 mt-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white text-sm font-bold active:scale-95">Try Again</button></div></div>}
      </div>
    )
  }

  return (
    <div className={`min-h-screen pb-28 sm:pb-10 transition-colors relative overflow-hidden ${theme==='dark'? 'bg-[#010614] text-slate-100' : 'bg-[#dbe7f6] text-slate-900'}`}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className={`absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 ${theme==='dark'? 'bg-gradient-to-br from-blue-900/30 via-sky-900/20 to-transparent' : 'bg-gradient-to-br from-blue-300/60 via-sky-300/40 to-cyan-200/30'}`} />
        <div className={`absolute top-[40%] right-0 w-96 h-96 rounded-full blur-3xl translate-x-1/4 ${theme==='dark'? 'bg-gradient-to-br from-sky-900/20 via-blue-900/15 to-transparent' : 'bg-gradient-to-br from-sky-300/50 via-blue-200/30 to-transparent'}`} />
      </div>

      <header className={`sticky top-0 z-10 backdrop-blur-xl border-b ${theme==='dark'? 'bg-[#070e24]/80 border-slate-800/60' : 'bg-[#eaf0f9]/80 border-blue-200/70'} shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.06] via-sky-500/[0.04] to-cyan-500/[0.04] pointer-events-none" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!logoError? <div className="p-[1.5px] rounded-full bg-gradient-to-br from-blue-500 to-sky-600 shrink-0"><img src={LOGO_PATH} alt="Logo" onError={()=>setLogoError(true)} className="h-8 w-8 rounded-full object-contain bg-white p-1" /></div> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white shadow-lg shrink-0">👁</div>}
            <div className="font-black tracking-tight text-sm bg-gradient-to-r from-blue-700 to-sky-700 dark:from-blue-300 dark:to-sky-300 bg-clip-text text-transparent">SOLVMEDICAL</div>
            <div className={`hidden lg:flex ml-2 text-xs font-bold px-3 py-1 rounded-full border truncate ${theme==='dark'? 'bg-slate-800/80 border-slate-700/50 text-slate-300' : 'bg-white/80 border-blue-200/50 text-slate-600 shadow-sm'}`}>{loading?'Loading…':`${practices.length} • ${logs.length} • ${appointments.length}`}</div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-blue-200 text-blue-600'}`}> {theme==='dark'? '☀' : '🌙'} </button>
            <button onClick={()=>{ localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false) }} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>↪</button>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 pb-3 pt-2">
          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition text-sm">⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search practices, logs, appointments..." className={`w-full h-10 sm:h-11 rounded-xl pl-10 pr-4 text-sm shadow-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${theme==='dark'? 'bg-slate-800/80 border-slate-700 placeholder:text-slate-500' : 'bg-white/90 border-blue-100 placeholder:text-slate-400'}`} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className={`flex gap-1.5 mb-5 p-1 rounded-full w-full sm:w-fit overflow-x-auto scrollbar-none border shadow-sm backdrop-blur snap-x ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-blue-100'}`}>
          {[
            {k:'logs', l:'Logs', i:'📋'},
            {k:'practices', l:'Practices', i:'🏥'},
            {k:'todos', l:'To-Do', i:'✅'},
            {k:'calendar', l:'Calendar', i:'📅'},
            {k:'kpi', l:'KPI', i:'📊'},
          ].map(t=>{
            const active = tab===t.k
            return <button key={t.k} onClick={()=>setTab(t.k as any)} className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 shrink-0 ${active? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.6)]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{t.i} {t.l}</button>
          })}
        </div>

        {tab==='logs' && (
          <div className={`rounded-2xl border shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}><h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs • {statusFilter}</h3><button onClick={()=>{ setLForm(EMPTY_LOG); setEditingLog(null); setShowLog(true) }} className="h-10 w-full sm:w-auto px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Log</button></div>
            <div className={`flex gap-2 p-3 border-b overflow-x-auto scrollbar-none ${theme==='dark'? 'bg-slate-800/50 border-slate-800' : 'bg-blue-50/50 border-blue-50'}`}>{(['All','Open','In Progress','Closed'] as const).map(s=><button key={s} onClick={()=>setStatusFilter(s)} className={`h-8 px-4 rounded-full text-xs font-bold border whitespace-nowrap transition shrink-0 ${statusFilter===s?'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black shadow-sm': theme==='dark'? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-blue-100 text-slate-500'}`}>{s}</button>)}</div>
            <div className={`divide-y ${theme==='dark'? 'divide-slate-800' : 'divide-blue-50'}`}>
              {filteredLogs.map(l=>{
                const st=statusStyle(l.status);
                const linked = getPracticeForLog(l)
                return (
                  <div key={l.id} onClick={()=>setShowDetailLog(l)} className={`p-4 flex justify-between gap-3 cursor-pointer ${theme==='dark'? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate flex items-center gap-2">
                        {(linked?.practice_number || l.practice_number) && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text- font-black">#{(linked?.practice_number || l.practice_number)}</span>}
                        <span>{l.practice_name}</span>
                        <span className="font-normal text- text-slate-400 ml-1">{normalizeProduct(l.product)}</span>
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-1">{l.issue}</div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, borderColor: st.border }} className="h-fit text-xs font-bold px-3 py-1.5 rounded-full border shrink-0">{l.status}</span>
                  </div>
                )
              })}
              {filteredLogs.length===0 && <div className="p-10 text-center text-sm text-slate-400">No logs</div>}
            </div>
          </div>
        )}

        {tab==='practices' && (
          <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}>
              <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Practices • {practices.length}</h3>
              <button onClick={()=>{ setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Practice</button>
            </div>
            <div className={`divide-y ${theme==='dark'? 'divide-slate-800' : 'divide-blue-50'}`}>
              {filteredPractices.map(p=>(
                <div key={p.id} onClick={()=>setShowDetailPractice(p)} className={`p-4 flex justify-between items-center cursor-pointer group ${theme==='dark'? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate flex items-center gap-2">
                      {p.practice_number && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text- font-black">#{p.practice_number}</span>}
                      <span>{p.practice_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{p.contact_person} • {p.phone||p.mobile} • <span className="font-bold text-blue-600">{p.product}</span></div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={async (e)=>{ e.stopPropagation(); if(!confirm(`Delete "${p.practice_name}"?`)) return; await deletePractice(p.id) }} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition">🗑</button>
                    <span className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">›</span>
                  </div>
                </div>
              ))}
              {filteredPractices.length===0 && <div className="p-10 text-center text-sm text-slate-400">No practices found</div>}
            </div>
          </div>
        )}

        {tab==='todos' && (
          <div className="max-w-2xl mx-auto w-full">
            <div className={`rounded-2xl border p-6 mb-6 shadow backdrop-blur ${theme==='dark'? 'bg-[#0b122c]/80 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <h2 className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">{TODO_TITLE}</h2>
              <p className="text-sm text-slate-500 mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {nowStr} — {todos.filter(t=>!t.done).length} pending
              </p>
            </div>
            <div className={`rounded-2xl border p-3 flex gap-3 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <input value={newTodoText} onChange={e=>setNewTodoText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()} placeholder="Add a todo..." className={`flex-1 h-12 rounded-xl px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme==='dark'? 'bg-slate-800' : 'bg-blue-50/60'}`} />
              <button onClick={addTodo} className="h-12 px-7 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">Add</button>
            </div>
            <div className="flex gap-3 mt-6">{(['All','Active','Done'] as const).map(f=><button key={f} onClick={()=>setTodoFilter(f)} className={`h-9 px-5 rounded-full text-sm font-bold border transition ${todoFilter===f?'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black shadow-sm':'bg-white border-blue-100 text-slate-500'}`}>{f}</button>)}</div>
            <div className="mt-6 space-y-3.5">
              {filteredTodos.map(t=> (
                <div key={t.id} className={`rounded-2xl border p-4 flex items-center gap-4 shadow-sm ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                  <button onClick={()=>toggleTodo(t.id)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${t.done?'bg-blue-600 border-blue-600 text-white':'border-slate-300'}`}>{t.done?'✓':''}</button>
                  <div className="flex-1 min-w-0">
                    {editingTodoId===t.id? (
                      <div className="flex gap-2">
                        <input value={editingTodoText} onChange={e=>setEditingTodoText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&updateTodoText(t.id)} className={`flex-1 h-10 rounded-xl px-3 text-sm border ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`} autoFocus />
                        <button onClick={()=>updateTodoText(t.id)} className="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold">Save</button>
                        <button onClick={()=>setEditingTodoId(null)} className={`h-10 px-3 rounded-xl text-xs font-bold ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button>
                      </div>
                    ) : (
                      <div className="cursor-pointer" onClick={()=>toggleTodo(t.id)}>
                        <div className={`text-sm font-medium leading-snug ${t.done?'line-through text-slate-400':''}`}>{t.text}</div>
                        {/* TIMESTAMP - shows when todo was created */}
                        <div className="text- font-bold tracking-widest uppercase text-slate-400 mt-1.5 flex items-center gap-1.5">
                          <span className="text-">🕒</span> {formatTodoTimestamp(t.created_at)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={()=>{ setEditingTodoId(t.id); setEditingTodoText(t.text) }} className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center">✎</button>
                    <button onClick={()=>deleteTodo(t.id)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500">✕</button>
                  </div>
                </div>
              ))}
              {filteredTodos.length===0 && <div className="text-center py-10 text-sm text-slate-400">No todos — {nowStr}</div>}
            </div>
          </div>
        )}

        {tab==='calendar' && (
          <div className="space-y-4">
            <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <div className={`p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()-1,1))} className={`w-10 h-10 rounded-xl font-bold border active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>‹</button>
                  <div className="font-bold text-sm text-center bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent min-w-">{calendarDate.toLocaleString('default',{month:'long', year:'numeric'})}</div>
                  <button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()+1,1))} className={`w-10 h-10 rounded-xl font-bold border active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>›</button>
                </div>
                <div className="flex gap-2"><button onClick={()=>{ setCalendarDate(new Date()); setSelectedCalDate(todayLocalStr) }} className={`h-10 px-4 rounded-xl text-sm font-bold border ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>Today</button><button onClick={()=>{ setAForm({...EMPTY_APPT, date: selectedCalDate || todayLocalStr}); setEditingAppt(null); setShowAppt(true) }} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">+ Appointment</button></div>
              </div>
              <div className={`grid grid-cols-7 border-b text- font-bold ${theme==='dark'? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-blue-50/60 border-blue-50 text-slate-500'}`}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} className="p-2.5 text-center">{d}</div>)}</div>

              {/* SQUARE CALENDAR GRID - each cell is aspect-square */}
              <div className="grid grid-cols-7 gap-px bg-blue-100 dark:bg-slate-800">
                {calendarGrid.map((cell,i)=>{
                  const isToday = cell.dateStr===todayLocalStr
                  const isSelected = cell.dateStr && cell.dateStr===selectedCalDate
                  const appts = cell.dateStr? getApptsForDate(cell.dateStr) : []
                  return (
                    <div
                      key={i}
                      onClick={()=> {
                        if (!cell.dateStr) return
                        setSelectedCalDate(cell.dateStr)
                        if (appts.length===0) {
                          setAForm({...EMPTY_APPT, date: cell.dateStr})
                          setEditingAppt(null)
                          setShowAppt(true)
                        }
                      }}
                      className={`
                        aspect-square p-1 sm:p-1.5 flex flex-col relative cursor-pointer transition
                        ${!cell.isCurrentMonth? 'bg-slate-100 dark:bg-slate-900/20 text-slate-300' : theme==='dark'? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-blue-50/80'}
                        ${isSelected? '!bg-blue-100/90 ring-2 ring-inset ring-blue-400 z-10' : ''}
                      `}
                    >
                      {cell.date && <>
                        <div className="flex justify-between items-start">
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text- sm:text-xs font-bold
                            ${isToday? 'bg-blue-600 text-white shadow' : ''}
                            ${isSelected &&!isToday? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                            {cell.date.getDate()}
                          </div>
                          {appts.length>0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 hidden sm:block"></div>}
                        </div>
                        {/* SMALLER APPOINTMENT LABELS */}
                        <div className="mt-1 flex-1 flex flex-col gap-0.5 overflow-hidden hidden sm:flex">
                          {appts.slice(0,3).map(a=>{
                            const ts=apptTypeStyle(a.type)
                            return <div key={a.id} onClick={(e)=>{ e.stopPropagation(); setShowDetailAppt(a) }} className="truncate text- leading-[1.1] font-bold px-1.5 py-0.5 rounded-md hover:opacity-80" style={{background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`}}>{a.start_time.slice(0,5)} {a.title}</div>
                          })}
                          {appts.length>3&&<div className="text- font-bold text-slate-500 px-1">+{appts.length-3} more</div>}
                        </div>
                        {appts.length>0 && <div className="sm:hidden mt-auto flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{appts.length>1&&<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}</div>}
                      </>}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedCalDate && (
              <div className={`rounded-2xl border p-4 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm">{selectedCalDate} — {selectedDayAppts.length} appointments</h3>
                  <button onClick={()=>setSelectedCalDate(null)} className={`w-8 h-8 rounded-full text-xs ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button>
                </div>
                <div className="space-y-2">
                  {selectedDayAppts.length===0? <div className="text-sm text-slate-400 py-4">No appointments.</div> :
                  selectedDayAppts.map(a=>{ const st=apptTypeStyle(a.type); return <div key={a.id} onClick={()=>setShowDetailAppt(a)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${theme==='dark'? 'border-slate-800 hover:bg-slate-800' : 'border-blue-50 hover:bg-blue-50'}`}><div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text- font-bold" style={{background:st.bg, color:st.color}}><span className="text-sm leading-none">{a.start_time}</span></div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{a.title}</div><div className="text-xs text-slate-500 truncate">{a.start_time}-{a.end_time} • {a.type}</div></div><span style={{background:st.bg, color:st.color, borderColor:st.border}} className="text-xs font-bold px-3 py-1 rounded-full border">{a.type}</span></div>})}
                </div>
              </div>
            )}

            <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <h3 className="font-bold text-sm mb-4 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Upcoming</h3>
              <div className="space-y-2">{upcomingAppts.map(a=>{ const st=apptTypeStyle(a.type); return <div key={a.id} onClick={()=>setShowDetailAppt(a)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}><div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold" style={{background:st.bg, color:st.color}}>{new Date(a.date).getDate()}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{a.title}</div><div className="text-xs text-slate-500 truncate">{a.date} • {a.start_time}-{a.end_time}</div></div><span style={{background:st.bg, color:st.color, borderColor:st.border}} className="text-xs font-bold px-3 py-1 rounded-full border">{a.type}</span></div>})}{upcomingAppts.length===0&&<div className="text-sm text-slate-400">No upcoming appointments</div>}</div>
            </div>
          </div>
        )}

        {/* ================= KPI TAB WITH CLEAR COMMENTS ================= */}
        {tab==='kpi' && (
          <div className="space-y-5">
            {/* KPI HEADER EXPLANATION */}
            <div className={`rounded-2xl border p-4 ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-blue-50/80 border-blue-100'}`}>
              <h2 className="font-black text-sm tracking-tight">KPI REPORT - What is this?</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                KPI = Key Performance Indicators. This dashboard shows your support & sales performance at a glance:
                Open issues that need fixing, which products cause most logs, which practices need attention, and monthly trends.
              </p>
            </div>

            {/* TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {l:'PRACTICES', v:practices.length, g:'from-blue-600 to-sky-500', desc:'Total practices registered'},
                {l:'TOTAL LOGS', v:kpi.totalLogs, g:'from-blue-600 to-cyan-500', desc:'All support logs ever'},
                {l:'OPEN LOGS', v:kpi.open, g:'from-amber-500 to-orange-500', desc:'Needs action now'},
                {l:'TODOS LEFT', v:kpi.todoActive, g:'from-sky-500 to-blue-500', desc:'Pending tasks'},
              ].map(card=> <div key={card.l} className={`rounded-2xl border p-[1.5px] shadow-sm ${theme==='dark'? 'border-slate-800' : 'border-blue-100'}`}><div className={`rounded- p-4 h-full ${theme==='dark'? 'bg-slate-900' : 'bg-white'}`}><div className="text- font-bold tracking-widest text-slate-500">{card.l}</div><div className={`text-2xl font-black mt-1 bg-gradient-to-r ${card.g} bg-clip-text text-transparent`}>{card.v}</div><div className="text- text-slate-400 mt-1">{card.desc}</div></div></div>)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Logs by Status = Workload health */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-1">Logs by Status</h3>
                <p className="text- text-slate-400 mb-4">Health check: Open = to-do, In Progress = working, Closed = done</p>
                <div className="space-y-3">
                  {[
                    {label:'Open', count:kpi.open, color:'#3b82f6'},
                    {label:'In Progress', count:kpi.prog, color:'#f59e0b'},
                    {label:'Closed', count:kpi.closed, color:'#22c55e'},
                  ].map(s=>{
                    const pct = kpi.totalLogs? Math.round(s.count/kpi.totalLogs*100):0
                    return (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className="w-20 text-xs font-bold text-slate-500">{s.label}</div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background:s.color}}></div>
                        </div>
                        <div className="w-12 text-xs font-black text-right">{s.count} <span className="font-normal text-slate-400">{pct}%</span></div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-500">To-Dos: {kpi.todoDone} done / {kpi.todoActive} left</span>
                  <span className="text-slate-500">Appts this month: {kpi.apptThisMonth}</span>
                </div>
              </div>

              {/* Logs by Product = Which product has most issues */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-1">Logs by Product</h3>
                <p className="text- text-slate-400 mb-4">Which product line generates most support tickets</p>
                <div className="space-y-2.5">
                  {kpi.byProduct.map(p=>{
                    const pct = kpi.totalLogs? Math.round(p.count/kpi.totalLogs*100):0
                    return (
                      <div key={p.product} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{background:PRODUCT_COLORS[p.product]||'#94a3b8'}}></div>
                        <div className="flex-1 min-w-0 text-xs font-bold truncate">{p.product}</div>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-">
                          <div className="h-full rounded-full" style={{width:`${pct}%`, background:PRODUCT_COLORS[p.product]||'#94a3b8'}}></div>
                        </div>
                        <div className="text-xs font-black w-8 text-right">{p.count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Practices by Product + Top clients */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-1">Practices by Product</h3>
                <p className="text- text-slate-400 mb-4">Client distribution per product</p>
                <div className="space-y-2.5">
                  {kpi.practicesByProduct.map(p=>(
                    <div key={p.product} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{background:PRODUCT_COLORS[p.product]||'#94a3b8'}}></div>
                      <div className="flex-1 text-xs font-bold">{p.product}</div>
                      <div className="text-xs font-black">{p.count}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text- font-bold tracking-widest text-slate-400 mb-2">TOP PRACTICES BY LOGS - High maintenance clients</h4>
                  <div className="space-y-1.5">
                    {kpi.byPracticeTop.map(tp=>(
                      <div key={tp.name} className="flex justify-between text-xs"><span className="truncate font-medium">{tp.name}</span><span className="font-black ml-2">{tp.count}</span></div>
                    ))}
                    {kpi.byPracticeTop.length===0&&<div className="text-xs text-slate-400">No logs yet</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 6-month log trend */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-1">Logs - Last 6 Months</h3>
                <p className="text- text-slate-400 mb-4 tracking-widest font-bold uppercase">Support trend - increasing or decreasing?</p>
                <div className="flex items-end gap-2 h-32">
                  {kpi.logsByMonth.map(m=>{
                    const h = Math.round(m.count/kpi.maxLogsMonth*100)
                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text- font-black">{m.count}</div>
                        <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition-all" style={{height:`${h}%`, minHeight: m.count>0?'8px':'2px'}}></div>
                        <div className="text- font-bold text-slate-500">{m.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 6-month appointment trend */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-1">Appointments - Last 6 Months</h3>
                <p className="text- text-slate-400 mb-4 tracking-widest font-bold uppercase">Field activity trend</p>
                <div className="flex items-end gap-2 h-32">
                  {kpi.apptsByMonth.map(m=>{
                    const h = Math.round(m.count/kpi.maxApptsMonth*100)
                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text- font-black">{m.count}</div>
                        <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-400 transition-all" style={{height:`${h}%`, minHeight: m.count>0?'8px':'2px'}}></div>
                        <div className="text- font-bold text-slate-500">{m.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Appointments by Type */}
            <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <h3 className="font-bold text-sm mb-1">Appointments by Type</h3>
              <p className="text- text-slate-400 mb-4">Breakdown of Meeting / Visit / Call / Personal / Other</p>
              <div className="flex flex-wrap gap-2">
                {kpi.byType.map(t=>{
                  const st = apptTypeStyle(t.type)
                  return <div key={t.type} className="flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold" style={{background:st.bg, color:st.color, borderColor:st.border}}><span className="w-2 h-2 rounded-full" style={{background:st.dot}}></span>{t.type}: {t.count}</div>
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 sm:hidden border-t backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            {k:'logs', l:'Logs', i:'📋'},
            {k:'practices', l:'Practices', i:'🏥'},
            {k:'todos', l:'To-Do', i:'✅'},
            {k:'calendar', l:'Cal', i:'📅'},
            {k:'kpi', l:'KPI', i:'📊'},
          ].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k as any)} className={`flex flex-col items-center justify-center h-14 rounded-xl text- font-bold gap-0.5 active:scale-95 transition ${tab===t.k? 'bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow' : 'text-slate-500'}`}>
              <span className="text-base leading-none">{t.i}</span>{t.l}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showDetailPractice && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-[1.5px] shadow-2xl overflow-hidden">
            <div className={`relative w-full rounded-t-3xl sm:rounded-2xl p-6 ${theme==='dark'? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-sm truncate pr-3 flex items-center gap-2">
                  {showDetailPractice.practice_number && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-">#{showDetailPractice.practice_number}</span>}
                  {showDetailPractice.practice_name}
                </h2>
                <button onClick={()=>setShowDetailPractice(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button>
              </div>
              <div className="mt-4 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div><b>Practice No:</b> {showDetailPractice.practice_number || '—'}</div>
                <div><b>Contact:</b> {showDetailPractice.contact_person}</div>
                <div><b>Phone:</b> {showDetailPractice.phone} {showDetailPractice.mobile && ` / ${showDetailPractice.mobile}`}</div>
                <div><b>Email:</b> {showDetailPractice.email}</div>
                <div><b>Product:</b> {showDetailPractice.product}</div>
                <div><b>Address:</b> {showDetailPractice.address}</div>
                <div className="pt-2 text-sm">{showDetailPractice.notes}</div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={()=>{ setEditingPractice(showDetailPractice); setPForm(showDetailPractice); setShowPractice(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button>
                <button onClick={async()=>{ if(!confirm(`Delete "${showDetailPractice.practice_name}"?`)) return; const ok = await deletePractice(showDetailPractice.id); if(ok) setShowDetailPractice(null) }} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailLog && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between"><h2 className="font-bold text-sm">Log Detail</h2><button onClick={()=>setShowDetailLog(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div>
            <div className="mt-4">
              <div className="font-bold text-sm flex items-center gap-2">
                {(getPracticeForLog(showDetailLog)?.practice_number || showDetailLog.practice_number) && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-">#{(getPracticeForLog(showDetailLog)?.practice_number || showDetailLog.practice_number)}</span>}
                {showDetailLog.practice_name} • {showDetailLog.status}
              </div>
              <div className="mt-3 text-sm whitespace-pre-wrap"><b>Issue:</b> {showDetailLog.issue}</div>
              <div className="mt-2 text-sm whitespace-pre-wrap"><b>Solution:</b> {showDetailLog.solution}</div>
              <div className="mt-2 text-xs text-slate-500">{showDetailLog.notes}</div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={()=>{ setEditingLog(showDetailLog); setLForm(showDetailLog); setShowLog(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button><button onClick={async()=>{ await supabase.from('logs').delete().eq('id', showDetailLog.id); setLogs(logs.filter(x=>x.id!==showDetailLog.id)); setShowDetailLog(null)}} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button></div>
          </div>
        </div>
      )}

      {showDetailAppt && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm truncate pr-2">{showDetailAppt.title}</h2><button onClick={()=>setShowDetailAppt(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="mt-4 text-sm"><div>{showDetailAppt.date} • {showDetailAppt.start_time}-{showDetailAppt.end_time}</div><div className="mt-2">{showDetailAppt.description}</div><div className="mt-1 text-xs text-slate-500">{showDetailAppt.location}</div></div><div className="flex gap-2 mt-6"><button onClick={()=>{ setEditingAppt(showDetailAppt); setAForm(showDetailAppt); setShowAppt(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button><button onClick={async()=>{ await supabase.from('appointments').delete().eq('id', showDetailAppt.id); setAppointments(appointments.filter(a=>a.id!==showDetailAppt.id)); setShowDetailAppt(null)}} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button></div></div></div>)}

      {showPractice && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h- overflow-y-auto ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between"><h2 className="font-bold text-sm">{editingPractice?'Edit':'New'} Practice</h2><button onClick={()=>setShowPractice(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div>
            <div className="flex flex-col gap-3 mt-6">
              <div className="grid grid-cols-3 gap-3">
                <input value={pForm.practice_name?? ''} onChange={e=>setPForm({...pForm, practice_name: e.target.value})} placeholder="Practice Name *" className={`col-span-2 h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-blue-50/60 border-blue-100'}`} />
                <input value={pForm.practice_number?? ''} onChange={e=>setPForm({...pForm, practice_number: e.target.value})} placeholder="Practice No." className={`h-11 rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={pForm.contact_person?? ''} onChange={e=>setPForm({...pForm, contact_person: e.target.value})} placeholder="Contact Person" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <select value={pForm.product?? 'Solv Optics'} onChange={e=>setPForm({...pForm, product: e.target.value})} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}><option>Solv Optics</option><option>Solv Physio</option><option>Solv Meds</option><option>Solv Dental</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={pForm.phone?? ''} onChange={e=>setPForm({...pForm, phone: e.target.value})} placeholder="Phone" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <input value={pForm.mobile?? ''} onChange={e=>setPForm({...pForm, mobile: e.target.value})} placeholder="Mobile" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <input value={pForm.email?? ''} onChange={e=>setPForm({...pForm, email: e.target.value})} placeholder="Email" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <input value={pForm.address?? ''} onChange={e=>setPForm({...pForm, address: e.target.value})} placeholder="Address" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <textarea value={pForm.notes?? ''} onChange={e=>setPForm({...pForm, notes: e.target.value})} placeholder="Notes" rows={3} className={`rounded-xl border p-3 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="flex gap-2 mt-6"><button onClick={()=>setShowPractice(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={savePractice} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button></div>
          </div>
        </div>
      )}

      {showLog && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h- overflow-y-auto ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between"><h2 className="font-bold text-sm">{editingLog?'Edit':'New'} Log</h2><button onClick={()=>setShowLog(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div>
            <div className="flex flex-col gap-3 mt-5">
              <label className="text- font-bold uppercase tracking-widest text-slate-500">Select Practice *</label>
              <select value={lForm.practice_id || ''} onChange={e=>handlePracticeSelectForLog(e.target.value)} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}>
                <option value="">-- Select Practice --</option>
                {practices.map(p=> <option key={p.id} value={p.id}>{p.practice_number? `#${p.practice_number} - ` : ''}{p.practice_name} ({p.product})</option>)}
              </select>
              <div>
                <label className="text- font-bold uppercase tracking-widest text-slate-500">Practice Number</label>
                <input value={lForm.practice_number || ''} disabled readOnly placeholder="Select practice to auto-fill number" className={`h-11 w-full rounded-xl border px-4 text-sm font-black cursor-not-allowed mt-1 ${theme==='dark'? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={lForm.product} onChange={e=>setLForm({...lForm, product: e.target.value})} className={`h-11 rounded-xl border px-3 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}><option>Solv Optics</option><option>Solv Physio</option><option>Solv Meds</option><option>Solv Dental</option></select>
                <select value={lForm.status} onChange={e=>setLForm({...lForm, status: e.target.value})} className={`h-11 rounded-xl border px-3 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}><option>Open</option><option>In Progress</option><option>Closed</option></select>
              </div>
              <textarea value={lForm.issue} onChange={e=>setLForm({...lForm, issue: e.target.value})} placeholder="Issue * - What is the problem?" rows={3} className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <textarea value={lForm.solution} onChange={e=>setLForm({...lForm, solution: e.target.value})} placeholder="Solution - How was it fixed?" rows={3} className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`} />
              <textarea value={lForm.notes} onChange={e=>setLForm({...lForm, notes: e.target.value})} placeholder="Notes (optional)" rows={2} className={`rounded-xl border p-3 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="flex gap-2 mt-6"><button onClick={()=>setShowLog(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={saveLog} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save Log</button></div>
          </div>
        </div>
      )}

      {showAppt && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 overflow-y-auto shadow-2xl border max-h- ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center"><h2 className="font-bold text-sm">{editingAppt? 'Edit' : 'New'} Appointment</h2><button onClick={()=>setShowAppt(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div>
            <div className="flex flex-col gap-3 mt-5">
              <input value={aForm.title} onChange={e=>setAForm({...aForm, title:e.target.value})} placeholder="Title *" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={aForm.date} onChange={e=>setAForm({...aForm, date:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <select value={aForm.type} onChange={e=>setAForm({...aForm, type:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}><option>Meeting</option><option>Call</option><option>Visit</option><option>Personal</option><option>Other</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={aForm.start_time} onChange={e=>setAForm({...aForm, start_time:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <input type="time" value={aForm.end_time} onChange={e=>setAForm({...aForm, end_time:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <input value={aForm.location} onChange={e=>setAForm({...aForm, location:e.target.value})} placeholder="Location" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <textarea value={aForm.description} onChange={e=>setAForm({...aForm, description:e.target.value})} placeholder="Description" rows={3} className={`rounded-xl border p-3 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="flex gap-2 mt-6"><button onClick={()=>setShowAppt(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={saveAppt} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button></div>
          </div>
        </div>
      )}

      {toast && <div onClick={()=>setToast('')} className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow z-[200] max-w- truncate dark:bg-white dark:text-black">{toast}</div>}
    </div>
  )
}
