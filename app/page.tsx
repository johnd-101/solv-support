'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

const LOGO_PATH = "/solv-logo-blue.png"
type Practice = { id: string; created_at: string; practice_name: string; contact_person: string; phone: string; mobile: string; email: string; address: string; product: string; notes: string }
type LogRow = { id: string; created_at: string; practice_id: string | null; practice_name: string; contact_person: string; phone: string; product: string; issue: string; solution: string; notes: string; status: string }
type Todo = { id: string; text: string; done: boolean; created_at: string }
type Appointment = { id: string; created_at: string; title: string; description: string; date: string; start_time: string; end_time: string; type: 'Meeting'|'Call'|'Visit'|'Personal'|'Other'; location: string; practice_name?: string }
type KnowledgeRow = { id: string; created_at: string; issue: string; solution: string; product: string; notes: string }

const PRODUCT_OPTIONS = [ 'Solv Optics',  'Solv Physio', 'Solv GP', 'Solv Meds', 'Solv Clinics ', 'Solv Dental '] as const
const PRODUCT_COLORS: Record<string, string> = {
  'Solv Optics': '#3b82f6',
  'Solv Physio': '#06b6d4',
  'Solv GP': '#10b981',
  'Solv Meds': '#f59e0b',
  'Solv Clinics ': '#ef4444',
  'Solv Dental ': '#6315ca'
}

function normalizeProduct(v: string) {
  const t = (v || '').trim()
  if (!t) return 'Unknown'
  if (t.toLowerCase().includes('optom')) return 'Solv Optics'
  if (t.toLowerCase() === 'meds') return 'Solv Meds'
  const match = PRODUCT_OPTIONS.find(o => o.toLowerCase() === t.toLowerCase())
  return match || t
}

const EMPTY_PRACTICE = { practice_name: '', contact_person: '', phone: '', mobile: '', email: '', address: '', product: 'Solv Optics', notes: '' }
const EMPTY_LOG = { practice_id: '', practice_name: '', contact_person: '', phone: '', product: 'Solv Optics', issue: '', solution: '', notes: '', status: 'Open' }
const EMPTY_APPT = { title: '', description: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', type: 'Meeting' as Appointment['type'], location: '', practice_name: '' }
const EMPTY_KNOWLEDGE = { issue: '', solution: '', product: 'Solv Optics', notes: '' }
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
  return { bg:'#f1f5f9', color:'#475569', border:'#e2e8f0', dot:'#64748b' }
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
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodoText, setNewTodoText] = useState('')
  const [todoFilter, setTodoFilter] = useState<'All' | 'Active' | 'Done'>('All')
  const [tab, setTab] = useState<'logs' | 'practices' | 'todos' | 'calendar' | 'kpi' | 'knowledge'>('logs')
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
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeRow | null>(null)
  const [kForm, setKForm] = useState<any>(EMPTY_KNOWLEDGE)
  const [showDetailKnowledge, setShowDetailKnowledge] = useState<KnowledgeRow | null>(null)
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
    const [p,l,t,a,kb] = await Promise.all([
      supabase.from('practices').select('*').order('created_at',{ascending:false}),
      supabase.from('logs').select('*').order('created_at',{ascending:false}),
      supabase.from('todos').select('*').order('created_at',{ascending:false}),
      supabase.from('appointments').select('*').order('date',{ascending:true}),
      supabase.from('knowledge_base').select('*').order('created_at',{ascending:false})
    ])
    if(p.data) setPractices(p.data as any)
    if(l.data) setLogs(l.data as any)
    if(t.data) setTodos(t.data as any)
    if(a.data) setAppointments(a.data as any)
    if(kb.data) setKnowledgeBase(kb.data as any)
    setLoading(false)
  }

  function handleLogin() {
    if (isLocked) return
    if (pass === APP_PASSWORD) { localStorage.setItem('isLoggedIn','true'); setIsLoggedIn(true); setFailedAttempts(0); setPass('') }
    else { const n=failedAttempts+1; setFailedAttempts(n); setShake(true); setShowErrorPopup(true); setTimeout(()=>setShake(false),400); setPass(''); if(n>=3){ setIsLocked(true); setCountdown(30) } }
  }

  const filteredLogs = useMemo(()=>{
    let f=logs
    if (statusFilter!=='All') f=f.filter(l=>l.status===statusFilter)
    if (search) f=f.filter(l=>(l.practice_name+l.issue+l.solution).toLowerCase().includes(search.toLowerCase()))
    return f
  }, [logs, search, statusFilter])
  const filteredPractices = useMemo(()=> practices.filter(p=>(p.practice_name+p.contact_person+p.phone+p.email).toLowerCase().includes(search.toLowerCase())), [practices, search])
  const filteredTodos = useMemo(()=>{
    let f = todos
    if (todoFilter==='Active') f=f.filter(t=>!t.done)
    if (todoFilter==='Done') f=f.filter(t=>t.done)
    if (search) f=f.filter(t=>t.text.toLowerCase().includes(search.toLowerCase()))
    return f
  }, [todos, todoFilter, search])
  const filteredKnowledge = useMemo(()=> knowledgeBase.filter(k=>(k.issue+k.solution+k.product+k.notes).toLowerCase().includes(search.toLowerCase())), [knowledgeBase, search])

  const productCounts = useMemo(() => {
    const map: Record<string, number> = {}
    practices.forEach(pr => { const key = normalizeProduct(pr.product); map[key] = (map[key] || 0) + 1 })
    return map
  }, [practices])
  const logProductCounts = useMemo(() => {
    const map: Record<string, number> = {}
    logs.forEach(l => { const key = normalizeProduct(l.product); map[key] = (map[key] || 0) + 1 })
    return map
  }, [logs])

  const calendarGrid = useMemo(()=>{
    const y=calendarDate.getFullYear(), m=calendarDate.getMonth()
    const first = new Date(y,m,1)
    const startDay = (first.getDay()+6)%7
    const daysInMonth = new Date(y,m+1,0).getDate()
    const cells: { date: Date | null, dateStr: string | null, isCurrentMonth: boolean }[] = []
    for(let i=0;i<startDay;i++) cells.push({date:null, dateStr:null, isCurrentMonth:false})
    for(let d=1; d<=daysInMonth; d++){ const dt = new Date(y,m,d); cells.push({date:dt, dateStr: dt.toISOString().split('T')[0], isCurrentMonth:true}) }
    while(cells.length%7!==0) cells.push({date:null, dateStr:null, isCurrentMonth:false})
    return cells
  }, [calendarDate])
  const getApptsForDate = (dateStr: string) => appointments.filter(a=>a.date===dateStr).sort((a,b)=>a.start_time.localeCompare(b.start_time))
  const upcomingAppts = useMemo(()=> [...appointments].filter(a=>a.date>=new Date().toISOString().split('T')[0]).sort((a,b)=> (a.date+a.start_time).localeCompare(b.date+b.start_time)).slice(0,8), [appointments])

  async function savePractice() {
    if (!pForm.practice_name) { setToast('Practice Name required'); return }
    const cleanedForm = {...pForm, product: normalizeProduct(pForm.product) }
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
  async function saveLog() {
    if (!lForm.practice_name ||!lForm.issue) { setToast('Practice + Issue required'); return }
    const cleanedForm = {...lForm, product: normalizeProduct(lForm.product) }
    if (editingLog) {
      const { error, data } = await supabase.from('logs').update(cleanedForm).eq('id', editingLog.id).select().single()
      if(error){ setToast(error.message); return }
      setLogs(logs.map(x=>x.id===editingLog.id? data as any : x))
    } else {
      const { error, data } = await supabase.from('logs').insert(cleanedForm).select().single()
      if(error){ setToast(error.message); return }
      setLogs([data as any,...logs])
    }
    setShowLog(false); setShowDetailLog(null); setToast('Log saved')
  }
  async function saveKnowledge() {
    if (!kForm.issue) { setToast('Issue required'); return }
    if (!kForm.solution) { setToast('Solution required'); return }
    const cleanedForm = {...kForm, product: normalizeProduct(kForm.product) }
    if (editingKnowledge) {
      const { error, data } = await supabase.from('knowledge_base').update(cleanedForm).eq('id', editingKnowledge.id).select().single()
      if(error){ setToast(error.message); return }
      setKnowledgeBase(knowledgeBase.map(x=>x.id===editingKnowledge.id? data as any : x))
    } else {
      const { error, data } = await supabase.from('knowledge_base').insert(cleanedForm).select().single()
      if(error){ setToast(error.message); return }
      setKnowledgeBase([data as any,...knowledgeBase])
    }
    setShowKnowledge(false); setShowDetailKnowledge(null); setToast('Knowledge saved')
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
    const byProduct = Object.entries(byProductMap).map(([product,count])=>({product,count})).sort((a,b)=>b.count-a.count)
    const byProductDetailed = Object.entries(byProductMap).map(([product,count])=>{
      const items = logs.filter(l=> normalizeProduct(l.product)===product)
      return { product, count, open: items.filter(l=>l.status==='Open').length, prog: items.filter(l=>l.status==='In Progress').length, closed: items.filter(l=>l.status==='Closed').length }
    }).sort((a,b)=>b.count-a.count)
    const byPracticeMap: Record<string, number> = {}
    logs.forEach(l=> { const k=l.practice_name||'Unknown'; byPracticeMap[k]=(byPracticeMap[k]||0)+1 })
    const byPracticeTop = Object.entries(byPracticeMap).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,5)
    const practicesByProductMap: Record<string, number> = {}
    PRODUCT_OPTIONS.forEach(o=> practicesByProductMap[o]=0)
    practices.forEach(p=> { const k=normalizeProduct(p.product); practicesByProductMap[k]=(practicesByProductMap[k]||0)+1 })
    const practicesByProduct = Object.entries(practicesByProductMap).map(([product,count])=>({product,count})).filter(x=>x.count>0 || PRODUCT_OPTIONS.includes(x.product as any))
    return { open, prog, closed, totalLogs, todoActive, todoDone, apptThisMonth, byType, logsByMonth, apptsByMonth, byProduct, byProductDetailed, byPracticeTop, practicesByProduct, months }
  }, [logs, todos, appointments, practices])

  const todoTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }, [todos, tab, todoFilter])

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
            <div className="font-black tracking-tight text-sm bg-gradient-to-r from-blue-700 to-sky-700 dark:from-blue-300 dark:to-sky-300 bg-clip-text text-transparent">SOLV</div>
            <div className={`hidden lg:flex ml-2 text-xs font-bold px-3 py-1 rounded-full border truncate ${theme==='dark'? 'bg-slate-800/80 border-slate-700/50 text-slate-300' : 'bg-white/80 border-blue-200/50 text-slate-600 shadow-sm'}`}>{loading?'Loading…':`${practices.length} • ${logs.length} • ${appointments.length} • ${knowledgeBase.length} KB`}</div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-blue-200 text-blue-600'}`}> {theme==='dark'? '☀' : '🌙'} </button>
            <button onClick={()=>{ localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false) }} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border active:scale-95 ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>↪</button>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 pb-3 pt-2">
          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition text-sm">⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search practices, logs, appointments, knowledge base..." className={`w-full h-10 sm:h-11 rounded-xl pl-10 pr-4 text-sm shadow-sm border focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${theme==='dark'? 'bg-slate-800/80 border-slate-700 placeholder:text-slate-500' : 'bg-white/90 border-blue-100 placeholder:text-slate-400'}`} />
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
            {k:'knowledge', l:'Knowledge', i:'📚'},
          ].map(t=>{
            const active = tab===t.k
            return <button key={t.k} onClick={()=>setTab(t.k as any)} className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 shrink-0 ${active? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.6)]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{t.i} {t.l}</button>
          })}
        </div>

        {tab==='logs' && (
          <div className={`rounded-2xl border shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}><h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs • {statusFilter}</h3><button onClick={()=>{ setLForm(EMPTY_LOG); setEditingLog(null); setShowLog(true) }} className="h-10 w-full sm:w-auto px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Log</button></div>
            <div className={`flex gap-2 p-3 border-b overflow-x-auto scrollbar-none ${theme==='dark'? 'bg-slate-800/50 border-slate-800' : 'bg-blue-50/50 border-blue-50'}`}>{(['All','Open','In Progress','Closed'] as const).map(s=><button key={s} onClick={()=>setStatusFilter(s)} className={`h-8 px-4 rounded-full text-xs font-bold border whitespace-nowrap transition shrink-0 ${statusFilter===s?'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black shadow-sm': theme==='dark'? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-blue-100 text-slate-500'}`}>{s}</button>)}</div>
            <div className={`divide-y ${theme==='dark'? 'divide-slate-800' : 'divide-blue-50'}`}>{filteredLogs.map(l=>{ const st=statusStyle(l.status); return <div key={l.id} onClick={()=>setShowDetailLog(l)} className={`p-4 flex justify-between gap-3 cursor-pointer ${theme==='dark'? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}><div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{l.practice_name}</div><div className="text-xs text-slate-500 line-clamp-2 mt-1">{l.issue}</div></div><span style={{ background: st.bg, color: st.color, borderColor: st.border }} className="h-fit text-xs font-bold px-3 py-1.5 rounded-full border shrink-0">{l.status}</span></div>})}{filteredLogs.length===0 && <div className="p-10 text-center text-sm text-slate-400">No logs</div>}</div>
          </div>
        )}

        

{tab==='knowledge' && (
  <div className={`rounded-2xl border shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
    <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}>
      <div>
        <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Knowledge Base • {filteredKnowledge.length}</h3>
        <p className="text-xs text-slate-500 mt-1">Quick reference of common issues and proven solutions</p>
      </div>
      <button onClick={()=>{ setKForm(EMPTY_KNOWLEDGE); setEditingKnowledge(null); setShowKnowledge(true) }} className="h-10 w-full sm:w-auto px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Knowledge</button>
    </div>

    <div className={`hidden sm:grid grid-cols-12 gap-4 px-5 py-3  text- font-black tracking-widest uppercase text-slate-500 ${theme==='dark'? 'bg-slate-800/60 border-slate-800' : 'bg-blue-50/60 border-blue-50'}`}>
      <div className="col-span-5">Issue</div>
      <div className="col-span-6">Solution</div>
      <div className="col-span-1">Prod</div>
    </div>

    <div className={`divide-y ${theme==='dark'? 'divide-slate-800' : 'divide-blue-50'}`}>
      {filteredKnowledge.map(k=>(
        <div key={k.id} onClick={()=>setShowDetailKnowledge(k)} className={`group p-4 sm:px-5 sm:py-4 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 cursor-pointer ${theme==='dark'? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'} transition`}>
          {/* Mobile */}
          <div className="sm:hidden">
            <div className="flex justify-between items-start gap-2">
              <span className="text- font-black tracking-widest uppercase text-blue-600">ISSUE</span>
              <span className={`text- font-bold px-2 py-0.5 rounded-full border ${theme==='dark'?'bg-slate-800 border-slate-700 text-slate-300':'bg-blue-50 border-blue-100 text-blue-700'}`}>{k.product}</span>
            </div>
            <div className="font-medium text-sm mt-1 leading-snug">{k.issue}</div>
            <div className="mt-3 text- font-black tracking-widest uppercase text-slate-500">SOLUTION</div>
            <div className="font-medium text-sm mt-1 leading-snug ">{k.solution}</div>
          </div>
          {/* Desktop - SAME STYLE FOR BOTH */}
          <div className="hidden sm:contents">
            <div className="col-span-5 font-medium text-sm leading-snug line-clamp-3">{k.issue}</div>
            <div className="col-span-6 font-medium text-sm leading-snug line-clamp-3 ">{k.solution}</div>
            <div className="col-span-1 text-right"><span className={`inline-flex text- font-bold px-2.5 py-1 rounded-full border ${theme==='dark'?'bg-slate-800 border-slate-700 text-slate-300':'bg-white border-blue-100 text-blue-700'}`}>{k.product}</span></div>
          </div>
        </div>
      ))}
      {filteredKnowledge.length===0 && <div className="p-10 text-center"><div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-xl">📚</div><p className="text-sm text-slate-400 mt-3 font-bold">No knowledge base entries</p></div>}
    </div>
  </div>
)}

        {tab==='practices' && (
          <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}>
              <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Practices • {practices.length}</h3>
              <button onClick={()=>{ setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">+ New Practice</button>
            </div>
            <div className={`divide-y ${theme==='dark'? 'divide-slate-800' : 'divide-blue-50'}`}>{filteredPractices.map(p=><div key={p.id} onClick={()=>setShowDetailPractice(p)} className={`p-4 flex justify-between items-center cursor-pointer ${theme==='dark'? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/60'}`}><div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{p.practice_name}</div><div className="text-xs text-slate-500 truncate">{p.contact_person} • {p.phone||p.mobile} • <span className="font-bold text-blue-600">{p.product}</span></div></div><span className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 ml-3">›</span></div>)}</div>
          </div>
        )}

        {tab==='todos' && (
          <div className="max-w-2xl mx-auto w-full">
            <div className={`rounded-2xl border p-6 mb-6 shadow backdrop-blur ${theme==='dark'? 'bg-[#0b122c]/80 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <h2 className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">{TODO_TITLE}</h2>
              <p className="text-sm text-slate-500 mt-3">{todoTimestamp} — {todos.filter(t=>!t.done).length} pending</p>
            </div>
            <div className={`rounded-2xl border p-3 flex gap-3 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <input value={newTodoText} onChange={e=>setNewTodoText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()} placeholder="Add a todo..." className={`flex-1 h-12 rounded-xl px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${theme==='dark'? 'bg-slate-800' : 'bg-blue-50/60'}`} />
              <button onClick={addTodo} className="h-12 px-7 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">Add</button>
            </div>
            <div className="flex gap-3 mt-6">{(['All','Active','Done'] as const).map(f=><button key={f} onClick={()=>setTodoFilter(f)} className={`h-9 px-5 rounded-full text-sm font-bold border transition ${todoFilter===f?'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black shadow-sm':'bg-white border-blue-100 text-slate-500'}`}>{f}</button>)}</div>
            <div className="mt-6 space-y-3.5">
              {filteredTodos.map(t=> <div key={t.id} className={`rounded-2xl border p-4 flex items-center gap-4 shadow-sm ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}><button onClick={()=>toggleTodo(t.id)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${t.done?'bg-blue-600 border-blue-600 text-white':'border-slate-300'}`}>{t.done?'✓':''}</button><div onClick={()=>toggleTodo(t.id)} className={`flex-1 text-sm cursor-pointer ${t.done?'line-through text-slate-400':''}`}>{t.text}</div><button onClick={()=>deleteTodo(t.id)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500">✕</button></div>)}
            </div>
          </div>
        )}

        {tab==='calendar' && (
          <div className="space-y-4">
            <div className={`rounded-2xl border shadow overflow-hidden backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <div className={`p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()-1,1))} className={`w-10 h-10 rounded-xl font-bold border ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>‹</button>
                  <div className="font-bold text-sm text-center bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">{calendarDate.toLocaleString('default',{month:'long', year:'numeric'})}</div>
                  <button onClick={()=>setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()+1,1))} className={`w-10 h-10 rounded-xl font-bold border ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>›</button>
                </div>
                <div className="flex gap-2"><button onClick={()=>setCalendarDate(new Date())} className={`h-10 px-4 rounded-xl text-sm font-bold border ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>Today</button><button onClick={()=>{ setAForm({...EMPTY_APPT, date: new Date().toISOString().split('T')[0]}); setEditingAppt(null); setShowAppt(true) }} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">+ Appointment</button></div>
              </div>
              <div className={`grid grid-cols-7 border-b text-xs font-bold ${theme==='dark'? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-blue-50/60 border-blue-50 text-slate-500'}`}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} className="p-2.5 text-center">{d}</div>)}</div>
              <div className="grid grid-cols-7">
                {calendarGrid.map((cell,i)=>{
                  const isToday = cell.dateStr===new Date().toISOString().split('T')[0]
                  const appts = cell.dateStr? getApptsForDate(cell.dateStr) : []
                  return <div key={i} onClick={()=> cell.dateStr && setSelectedCalDate(cell.dateStr)} className={`border-b border-r p-1.5 min-h- ${theme==='dark'? 'border-slate-800' : 'border-blue-50'} ${!cell.isCurrentMonth? 'bg-slate-50/60 text-slate-300' : 'bg-white/70'} cursor-pointer`}>
                    {cell.date && <><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isToday? 'bg-blue-600 text-white' : ''}`}>{cell.date.getDate()}</div>
                    <div className="mt-1.5 space-y-1 hidden sm:block">{appts.slice(0,2).map(a=>{ const ts=apptTypeStyle(a.type); return <div key={a.id} className="truncate text- font-bold px-2 py-1 rounded-full" style={{background:ts.bg, color:ts.color}}>{a.start_time} {a.title}</div>})}{appts.length>2&&<div className="text- text-slate-500">+{appts.length-2}</div>}</div></>}
                  </div>
                })}
              </div>
            </div>
            <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
              <h3 className="font-bold text-sm mb-4 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Upcoming</h3>
              <div className="space-y-2">{upcomingAppts.map(a=>{ const st=apptTypeStyle(a.type); return <div key={a.id} onClick={()=>setShowDetailAppt(a)} className={`flex items-center gap-3 p-3 rounded-xl border ${theme==='dark'? 'border-slate-800' : 'border-blue-50'}`}><div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold" style={{background:st.bg, color:st.color}}>{new Date(a.date).getDate()}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{a.title}</div><div className="text-xs text-slate-500 truncate">{a.date} • {a.start_time}-{a.end_time}</div></div><span style={{background:st.bg, color:st.color, borderColor:st.border}} className="text-xs font-bold px-3 py-1 rounded-full border">{a.type}</span></div>})}</div>
            </div>
          </div>
        )}

        {tab==='kpi' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {l:'PRACTICES', v:practices.length, g:'from-blue-600 to-sky-500'},
                {l:'OPEN LOGS', v:kpi.open, g:'from-blue-600 to-cyan-500'},
                {l:'TODOS LEFT', v:kpi.todoActive, g:'from-sky-500 to-blue-500'},
                {l:'APPTS MONTH', v:kpi.apptThisMonth, g:'from-blue-600 to-indigo-600'},
              ].map(card=> <div key={card.l} className={`rounded-2xl border p-1 shadow-sm ${theme==='dark'? 'border-slate-800' : 'border-blue-100'}`}><div className={`rounded-xl p-4 h-full ${theme==='dark'? 'bg-slate-900' : 'bg-white'}`}><div className="text- font-bold tracking-widest text-slate-500">{card.l}</div><div className={`text-2xl font-black mt-1 bg-gradient-to-r ${card.g} bg-clip-text text-transparent`}>{card.v}</div></div></div>)}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Logs by Status */}
              <div className={`rounded-2xl border p-5 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs by Status</h3>
                {(() => {
                  const max = Math.max(1, kpi.open, kpi.prog, kpi.closed);
                  const items = [
                    {label:'Open', val:kpi.open, grad:'from-blue-500 to-sky-400'},
                    {label:'In Progress', val:kpi.prog, grad:'from-amber-400 to-orange-400'},
                    {label:'Closed', val:kpi.closed, grad:'from-emerald-500 to-green-500'}
                  ];
                  return <div className="space-y-5">{items.map(it=><div key={it.label}><div className="flex justify-between text-sm font-bold mb-2.5"><span>{it.label}</span><span>{it.val}</span></div><div className={`h-2.5 rounded-full overflow-hidden ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}><div className={`h-full rounded-full bg-gradient-to-r ${it.grad} transition-all`} style={{width:`${(it.val/max)*100}%`}}></div></div></div>)}</div>
                })()}
                <div className="mt-7 flex gap-2 text-xs"><span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-bold">Completion {kpi.totalLogs? Math.round((kpi.closed/kpi.totalLogs)*100):0}%</span><span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-bold">Active {kpi.open+kpi.prog}</span></div>
              </div>

              {/* Appointments by Type */}
              <div className={`rounded-2xl border p-5 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Appointments by Type</h3>
                <div className="space-y-5">
                  {kpi.byType.map(t=>{
                    const max=Math.max(1,...kpi.byType.map(x=>x.count));
                    return (
                      <div key={t.type}>
                        <div className="flex justify-between text-sm font-bold mb-2.5">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{t.type}</span>
                          <span>{t.count}</span>
                        </div>
                        <div className={`h-2.5 rounded-full overflow-hidden ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${(t.count/max)*100}%`}}></div>
                        </div>
                      </div>
                    )
                  })}
                  {kpi.byType.every(t=>t.count===0) && <div className="text-xs text-slate-400">No appointments yet</div>}
                </div>
              </div>

              {/* Logs Trend */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs Trend • Last 6 Months</h3>
                <div className="flex items-end gap-2 h-32">
                  {kpi.logsByMonth.map(m=>{
                    const max = Math.max(1,...kpi.logsByMonth.map(x=>x.count))
                    const h = max? (m.count/max)*100 : 5
                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex justify-center items-end h-24">
                          <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition-all" style={{height:`${Math.max(h,6)}%`}}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{m.label}</span>
                        <span className="text-sm font-black">{m.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Appointments Trend */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Appointments • Last 6 Months</h3>
                <div className="flex items-end gap-2 h-32">
                  {kpi.apptsByMonth.map(m=>{
                    const max = Math.max(1,...kpi.apptsByMonth.map(x=>x.count))
                    const h = max? (m.count/max)*100 : 5
                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex justify-center items-end h-24">
                          <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-400 transition-all" style={{height:`${Math.max(h,6)}%`}}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{m.label}</span>
                        <span className="text-sm font-black">{m.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Logs by Product - FIXED */}
              <div className={`rounded-2xl border p-5 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Logs by Product</h3>
                  <span className={`text- font-bold px-2.5 py-1 rounded-full border ${theme==='dark'?'bg-slate-800 border-slate-700 text-slate-300':'bg-blue-50 border-blue-100 text-blue-700'}`}>{kpi.totalLogs} logs</span>
                </div>
                {kpi.totalLogs === 0? (
                  <div className="py-10 text-center">
                    <div className="w-24 h-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">📦</div>
                    <p className="text-xs text-slate-400 mt-3 font-bold">No product data yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="mx-auto lg:mx-0 relative w-36 h-36 shrink-0">
                      <div
                        className="w-full h-full rounded-full shadow-inner"
                        style={{
                          background: (() => {
                            let acc = 0
                            const total = kpi.byProductDetailed.filter(p=>p.count>0).reduce((s,x)=>s+x.count,0) || 1
                            const parts = kpi.byProductDetailed.filter(p=>p.count>0).map(p=>{
                              const start = acc
                              const pct = (p.count/total)*100
                              acc += pct
                              const color = PRODUCT_COLORS[p.product] || '#64748b'
                              return `${color} ${start}% ${acc}%`
                            }).join(', ')
                            return parts? `conic-gradient(${parts})` : '#e2e8f0'
                          })()
                        }}
                      />
                      <div className={`absolute inset-[14%] rounded-full flex flex-col items-center justify-center shadow-sm ${theme==='dark'?'bg-slate-900':'bg-white'}`}>
                        <span className="text-2xl font-black leading-none">{kpi.totalLogs}</span>
                        <span className="text- font-bold tracking-widest text-slate-500 uppercase mt-1">Logs</span>
                        <span className="text- font-bold text-slate-400">{kpi.byProductDetailed.filter(p=>p.count>0).length} products</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-3.5">
                      {kpi.byProductDetailed.filter(p=>p.count>0).map(p=>{
                        const max = Math.max(1,...kpi.byProductDetailed.map(x=>x.count))
                        const color = PRODUCT_COLORS[p.product] || '#64748b'
                        const pct = kpi.totalLogs? Math.round((p.count/kpi.totalLogs)*100) : 0
                        return (
                          <div key={p.product} className={`rounded-xl border p-3.5 ${theme==='dark'?'bg-slate-800/50 border-slate-700/50':'bg-slate-50/70 border-slate-100'}`}>
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: color}}></span>
                                <span className="text-sm font-bold truncate">{p.product}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-black">{p.count}</span>
                                <span className="text- font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{pct}%</span>
                              </div>
                            </div>
                            <div className={`mt-2.5 h-1.5 rounded-full overflow-hidden ${theme==='dark'?'bg-slate-700':'bg-slate-200'}`}>
                              <div className="h-full rounded-full" style={{width: `${(p.count/max)*100}%`, background: color}}></div>
                            </div>
                            <div className="mt-2.5 flex gap-1.5 flex-wrap">
                              <span className="text- font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">Open {p.open}</span>
                              <span className="text- font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Prog {p.prog}</span>
                              <span className="text- font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Closed {p.closed}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Practices */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Top Practices • Logs Volume</h3>
                <div className="space-y-4">
                  {kpi.byPracticeTop.map((pr,i)=>{
                    const max=Math.max(1,...kpi.byPracticeTop.map(x=>x.count));
                    return (
                      <div key={pr.name}>
                        <div className="flex justify-between text-sm font-bold mb-2"><span className="truncate pr-2">#{i+1} {pr.name}</span><span className="shrink-0">{pr.count}</span></div>
                        <div className={`h-2.5 rounded-full overflow-hidden flex ${theme==='dark'?'bg-slate-800':'bg-slate-100'}`}><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{width:`${(pr.count/max)*100}%`}}></div></div>
                      </div>
                    )
                  })}
                  {kpi.byPracticeTop.length===0 && <div className="text-xs text-slate-400">No practice data yet</div>}
                </div>
              </div>

              {/* Resolution Funnel */}
              <div className={`md:col-span-2 rounded-2xl border p-7 sm:p-8 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-base bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Resolution Funnel</h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme==='dark'?'bg-slate-800 border-slate-700 text-slate-300':'bg-slate-100 border-slate-200 text-slate-600'}`}>{kpi.totalLogs} Total Logs</span>
                </div>
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-14">
                  <div className="relative w-44 h-44 sm:w-52 sm:h-52 shrink-0 rounded-full shadow-inner" style={{background: `conic-gradient(#3b82f6 0% ${(kpi.open/(kpi.totalLogs||1))*100}%, #f59e0b ${(kpi.open/(kpi.totalLogs||1))*100}% ${((kpi.open+kpi.prog)/(kpi.totalLogs||1))*100}%, #10b981 ${((kpi.open+kpi.prog)/(kpi.totalLogs||1))*100}% 100%)`}}>
                    <div className={`absolute inset-[18%] rounded-full flex flex-col items-center justify-center shadow-sm ${theme==='dark'?'bg-slate-900':'bg-white'}`}>
                      <span className="text-3xl font-black leading-none">{kpi.totalLogs? Math.round((kpi.closed/kpi.totalLogs)*100):0}%</span>
                      <span className="text- font-bold text-slate-500 uppercase tracking-widest mt-1.5">Closed</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full flex flex-col gap-6">
                    <div className="space-y-4">
                      <div className={`flex items-center justify-between gap-4 py-4 px-5 rounded-xl border ${theme==='dark'?'bg-slate-800/60 border-slate-700/50':'bg-blue-50/70 border-blue-100/60'}`}>
                        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm"></span><span className="text-sm font-bold">Open</span></div>
                        <div className="flex items-center gap-3"><span className="text-sm font-black">{kpi.open}</span><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{kpi.totalLogs? Math.round(kpi.open/kpi.totalLogs*100):0}%</span></div>
                      </div>
                      <div className={`flex items-center justify-between gap-4 py-4 px-5 rounded-xl border ${theme==='dark'?'bg-slate-800/60 border-slate-700/50':'bg-amber-50/70 border-amber-100/60'}`}>
                        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm"></span><span className="text-sm font-bold">In Progress</span></div>
                        <div className="flex items-center gap-3"><span className="text-sm font-black">{kpi.prog}</span><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{kpi.totalLogs? Math.round(kpi.prog/kpi.totalLogs*100):0}%</span></div>
                      </div>
                      <div className={`flex items-center justify-between gap-4 py-4 px-5 rounded-xl border ${theme==='dark'?'bg-slate-800/60 border-slate-700/50':'bg-emerald-50/70 border-emerald-100/60'}`}>
                        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm"></span><span className="text-sm font-bold">Closed</span></div>
                        <div className="flex items-center gap-3"><span className="text-sm font-black">{kpi.closed}</span><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{kpi.totalLogs? Math.round(kpi.closed/kpi.totalLogs*100):0}%</span></div>
                      </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 pt-6 border-t ${theme==='dark'?'border-slate-800':'border-slate-100'}`}>
                      <div className={`p-4 rounded-xl ${theme==='dark'?'bg-slate-800':'bg-slate-50'}`}>
                        <div className="text- font-bold tracking-widest text-slate-500 uppercase">Todos Done</div>
                        <div className="text-xl font-black mt-1.5">{kpi.todoDone}<span className="text-slate-400 font-bold text-sm">/{kpi.todoDone+kpi.todoActive}</span></div>
                      </div>
                      <div className={`p-4 rounded-xl ${theme==='dark'?'bg-slate-800':'bg-slate-50'}`}>
                        <div className="text- font-bold tracking-widest text-slate-500 uppercase">Appts This Month</div>
                        <div className="text-xl font-black mt-1.5">{kpi.apptThisMonth}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Practices by Product */}
              <div className={`rounded-2xl border p-5 shadow backdrop-blur ${theme==='dark'? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                <h3 className="font-bold text-sm mb-6 bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Practices by Product • Distribution</h3>
                <div className="grid grid-cols-2 gap-3">
                  {kpi.practicesByProduct.map(pp=> <div key={pp.product} className={`rounded-xl p-4 border ${theme==='dark'?'bg-slate-800 border-slate-700':'bg-blue-50/60 border-blue-100'}`}><div className="text- font-bold tracking-widest text-slate-500 uppercase">{pp.product}</div><div className="text-lg font-black bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent mt-1">{pp.count}</div><div className="text-xs text-slate-500 mt-1">{practices.length? Math.round(pp.count/practices.length*100):0}% of practices</div></div>)}
                  {kpi.practicesByProduct.length===0 && <div className="col-span-2 text-xs text-slate-400">No practice product data</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 sm:hidden border-t backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {[
            {k:'logs', l:'Logs', i:'📋'},
            {k:'practices', l:'Practices', i:'🏥'},
            {k:'knowledge', l:'Know.', i:'📚'},
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

      {showDetailPractice && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-[1.5px] shadow-2xl overflow-hidden"><div className={`relative w-full rounded-t-3xl sm:rounded-2xl p-6 ${theme==='dark'? 'bg-slate-900' : 'bg-white'}`}><div className="flex justify-between items-center"><h2 className="font-bold text-sm truncate pr-3">{showDetailPractice.practice_name}</h2><button onClick={()=>setShowDetailPractice(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><button onClick={()=>{ setEditingPractice(showDetailPractice); setPForm(showDetailPractice); setShowPractice(true) }} className="w-full h-11 mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Edit Practice</button></div></div></div>)}
      {showDetailLog && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm">Log Detail</h2><button onClick={()=>setShowDetailLog(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="mt-4"><div className="font-bold text-sm">{showDetailLog.practice_name}</div><div className="mt-3 text-sm">{showDetailLog.issue}</div><div className={`mt-4 p-4 rounded-xl text-sm border ${theme==='dark'? 'bg-emerald-950/30 text-emerald-200' : 'bg-green-50 text-green-900'}`}>{showDetailLog.solution||'No solution yet'}</div></div><div className="flex gap-2 mt-6"><button onClick={()=>{ setEditingLog(showDetailLog); setLForm(showDetailLog); setShowLog(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button><button onClick={async()=>{ await supabase.from('logs').delete().eq('id', showDetailLog.id); setLogs(logs.filter(x=>x.id!==showDetailLog.id)); setShowDetailLog(null)}} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button></div></div></div>)}
      {showDetailKnowledge && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between items-start gap-3"><h2 className="font-bold text-sm">Knowledge Detail</h2><button onClick={()=>setShowDetailKnowledge(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="mt-5 space-y-4"><div><div className="text- font-black uppercase text-blue-600 mb-2">ISSUE</div><div className={`p-4 rounded-xl border text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-blue-50/60 border-blue-100'}`}>{showDetailKnowledge.issue}</div></div><div><div className="text- font-black uppercase text-emerald-600 mb-2">SOLUTION</div><div className={`p-4 rounded-xl border text-sm ${theme==='dark'? 'bg-emerald-950/30 text-emerald-200' : 'bg-emerald-50 text-emerald-900'}`}>{showDetailKnowledge.solution}</div></div></div><div className="flex gap-2 mt-6"><button onClick={()=>{ setEditingKnowledge(showDetailKnowledge); setKForm(showDetailKnowledge); setShowKnowledge(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button><button onClick={async()=>{ await supabase.from('knowledge_base').delete().eq('id', showDetailKnowledge.id); setKnowledgeBase(knowledgeBase.filter(x=>x.id!==showDetailKnowledge.id)); setShowDetailKnowledge(null)}} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button></div></div></div>)}
      {showDetailAppt && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm truncate pr-2">{showDetailAppt.title}</h2><button onClick={()=>setShowDetailAppt(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className={`mt-5 rounded-xl border divide-y text-sm ${theme==='dark'? 'border-slate-800' : 'border-slate-100'}`}><div className="flex"><div className={`w-28 p-3.5 text-xs font-bold uppercase ${theme==='dark'? 'bg-slate-800' : 'bg-blue-50/70'}`}>When</div><div className="p-3.5 flex-1">{showDetailAppt.date} • {showDetailAppt.start_time}-{showDetailAppt.end_time}</div></div><div className="p-3.5">{showDetailAppt.description||'No notes'}</div></div><div className="flex gap-2 mt-6"><button onClick={()=>{ setEditingAppt(showDetailAppt); setAForm(showDetailAppt); setShowAppt(true) }} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-bold dark:bg-white dark:text-black">Edit</button><button onClick={async()=>{ await supabase.from('appointments').delete().eq('id', showDetailAppt.id); setAppointments(appointments.filter(a=>a.id!==showDetailAppt.id)); setShowDetailAppt(null)}} className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 text-sm font-bold">Delete</button></div></div></div>)}
      {selectedCalDate && (<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm">📅 {new Date(selectedCalDate).toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'})}</h2><button onClick={()=>setSelectedCalDate(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="mt-5 space-y-2">{getApptsForDate(selectedCalDate).map(a=>{ const st=apptTypeStyle(a.type); return <div key={a.id} onClick={()=>setShowDetailAppt(a)} className={`border rounded-xl p-4 flex justify-between cursor-pointer ${theme==='dark'? 'border-slate-800' : 'border-blue-100'}`}><div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{a.title}</div><div className="text-xs text-slate-500 mt-1">{a.start_time}-{a.end_time} • {a.location||a.type}</div></div><span style={{background:st.bg, color:st.color, borderColor:st.border}} className="h-fit text-xs font-bold px-3 py-1.5 rounded-full border ml-2">{a.type}</span></div>})}{getApptsForDate(selectedCalDate).length===0&&<div className="text-sm text-center py-10 text-slate-400">No appointments</div>}</div><div className="flex gap-2 mt-6"><button onClick={()=>{ setAForm({...EMPTY_APPT, date:selectedCalDate}); setEditingAppt(null); setShowAppt(true) }} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold">+ Add on this day</button><button onClick={()=>setSelectedCalDate(null)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Close</button></div></div></div>)}

      {showPractice && (<div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h- overflow-y-auto ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm">{editingPractice?'Edit':'New'} Practice</h2><button onClick={()=>setShowPractice(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="flex flex-col gap-4 mt-6"><input value={pForm.practice_name} onChange={e=>setPForm({...pForm, practice_name: e.target.value})} placeholder="Practice Name *" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-blue-50/60 border-blue-100'}`} /><input value={pForm.contact_person} onChange={e=>setPForm({...pForm, contact_person: e.target.value})} placeholder="Contact Person" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><div className="grid grid-cols-2 gap-3"><input value={pForm.phone} onChange={e=>setPForm({...pForm, phone: e.target.value})} placeholder="Phone" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><input value={pForm.mobile} onChange={e=>setPForm({...pForm, mobile: e.target.value})} placeholder="Mobile" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /></div><input value={pForm.email} onChange={e=>setPForm({...pForm, email: e.target.value})} placeholder="Email" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><select value={pForm.product} onChange={e=>setPForm({...pForm, product: e.target.value})} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`}><option>Solv Optics</option><option>Solv Physio</option><option>Solv GP</option><option>Solv Meds</option><option>Solv Clinics</option><option>Solv Dental</option><option>Other</option></select><textarea value={pForm.address} onChange={e=>setPForm({...pForm, address: e.target.value})} placeholder="Address" className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><textarea value={pForm.notes} onChange={e=>setPForm({...pForm, notes: e.target.value})} placeholder="Notes" className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /></div><div className="flex gap-2 mt-6"><button onClick={()=>setShowPractice(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={savePractice} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button></div></div></div>)}
      {showLog && (<div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h- overflow-y-auto ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm">{editingLog?'Edit':'New'} Log</h2><button onClick={()=>setShowLog(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="flex flex-col gap-3 mt-5"><select value={lForm.practice_id} onChange={e=>{ const pr=practices.find(p=>p.id===e.target.value); setLForm(pr? {...lForm, practice_id: pr.id, practice_name: pr.practice_name, product: pr.product || lForm.product} : {...lForm, practice_id:'', practice_name:''}) }} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}><option value="">-- Select Practice --</option>{practices.map(p=><option key={p.id} value={p.id}>{p.practice_name} • {p.product}</option>)}</select><input value={lForm.practice_name} onChange={e=>setLForm({...lForm, practice_name: e.target.value})} placeholder="Practice name" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><select value={lForm.product} onChange={e=>setLForm({...lForm, product: e.target.value})} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}><option>Optics</option><option>Physio</option><option>Meds</option><option>Dentistry</option><option>GP</option><option>Clinics</option></select><textarea value={lForm.issue} onChange={e=>setLForm({...lForm, issue: e.target.value})} placeholder="Issue *" className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /><textarea value={lForm.solution} onChange={e=>setLForm({...lForm, solution: e.target.value})} placeholder="Solution" className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-green-50/60 border-slate-200'}`} /><div className="flex gap-2">{['Open','In Progress','Closed'].map(s=>{ const st=statusStyle(s); const active=lForm.status===s; return <button key={s} onClick={()=>setLForm({...lForm, status:s})} style={{ background: active?st.bg: theme==='dark'?'#1e293b':'white', color: active?st.color:'#64748b', borderColor: active?st.border:'#e2e8f0'}} className="flex-1 h-10 rounded-xl border text-sm font-bold">{s}</button>})}</div></div><div className="flex gap-2 mt-6"><button onClick={()=>setShowLog(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={saveLog} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button></div></div></div>)}
      {showKnowledge && (<div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"><div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border max-h- overflow-y-auto ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}><div className="flex justify-between"><h2 className="font-bold text-sm">{editingKnowledge?'Edit':'New'} Knowledge</h2><button onClick={()=>setShowKnowledge(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button></div><div className="flex flex-col gap-3 mt-5"><textarea value={kForm.issue} onChange={e=>setKForm({...kForm, issue: e.target.value})} placeholder="Issue *" className={`w-full rounded-xl border p-4 text-sm min-h- ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-blue-50/40 border-blue-100'}`} /><textarea value={kForm.solution} onChange={e=>setKForm({...kForm, solution: e.target.value})} placeholder="Solution *" className={`w-full rounded-xl border p-4 text-sm min-h- ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-emerald-50/40 border-emerald-100'}`} /><select value={kForm.product} onChange={e=>setKForm({...kForm, product: e.target.value})} className={`h-11 w-full rounded-xl border px-4 text-sm font-bold ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}><option>Optics</option><option>Physio</option><option>Meds </option><option>Clinics</option><option>Dentistry</option><option>Other</option></select></div><div className="flex gap-2 mt-6"><button onClick={()=>setShowKnowledge(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button><button onClick={saveKnowledge} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button></div></div></div>)}

      {showAppt && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 overflow-y-auto shadow-2xl border ${theme==='dark'? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">{editingAppt? 'Edit' : 'New'} Appointment</h2>
              <button onClick={()=>setShowAppt(false)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>✕</button>
            </div>
            <div className="flex flex-col gap-3 mt-5">
              <input value={aForm.title} onChange={e=>setAForm({...aForm, title:e.target.value})} placeholder="Title *" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <textarea value={aForm.description} onChange={e=>setAForm({...aForm, description:e.target.value})} placeholder="Notes" className={`rounded-xl border p-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={aForm.date} onChange={e=>setAForm({...aForm, date:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm col-span-2 ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <select value={aForm.type} onChange={e=>setAForm({...aForm, type:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}><option>Meeting</option><option>Visit</option><option>Call</option><option>Personal</option><option>Other</option></select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={aForm.start_time} onChange={e=>setAForm({...aForm, start_time:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                <input type="time" value={aForm.end_time} onChange={e=>setAForm({...aForm, end_time:e.target.value})} className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <input value={aForm.location} onChange={e=>setAForm({...aForm, location:e.target.value})} placeholder="Location" className={`h-11 rounded-xl border px-4 text-sm ${theme==='dark'? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={()=>setShowAppt(false)} className={`flex-1 h-11 rounded-xl font-bold text-sm ${theme==='dark'? 'bg-slate-800' : 'bg-slate-100'}`}>Cancel</button>
              <button onClick={saveAppt} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">Save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div onClick={()=>setToast('')} className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow z-[200] max-w- truncate dark:bg-white dark:text-black">{toast}</div>}
    </div>
  )
}








