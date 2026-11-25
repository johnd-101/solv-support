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
import { KpiDashboard } from '@/components/kpi/KpiDashboard'
import { SelectedDayPanel } from '@/components/calendar/SelectedDayPanel'
import { UpcomingAppointments } from '@/components/calendar/UpcomingAppointments'

type Tab = 'logs' | 'practices' | 'messages' | 'calendar' | 'kpi' | 'profile'
type Profile = { id: string; username: string; password_hash: string; created_at?: string }
type ActiveUser = { profile_id: string; username: string; online_at: string }
type ViewMode = 'grid' | 'list'
type DirectMessage = { 
  id: string; 
  sender_id: string; 
  sender_name: string; 
  receiver_id: string; 
  receiver_name: string; 
  content: string; 
  created_at: string; 
  conversation_id?: string;
  is_read?: boolean;
  read?: boolean;
  read_at?: string | null;
}

const getPracNumber = (obj: any): string => { return obj?.prac_number || obj?.practice_number || '' }

// helper to determine if DM is read from DB
const isDMReadFromDB = (m: DirectMessage, fallbackReadIds?: Set<string>) => {
  if (m.is_read === true) return true
  if ((m as any).read === true) return true
  if (m.read_at) return true
  if (fallbackReadIds && fallbackReadIds.has(m.id)) return true
  return false
}

function ViewToggle({ value, onChange, isDark }: { value: ViewMode, onChange: (v: ViewMode) => void, isDark: boolean }) {
  return (
    <div className={`flex p-1 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
      <button onClick={() => onChange('list')} className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${value === 'list' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>☰ List</button>
      <button onClick={() => onChange('grid')} className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${value === 'grid' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>▦ Cards</button>
    </div>
  )
}

function MessageBoardInline({ messages, theme, setToast, currentProfile, activeUsers, dmTarget, setDmTarget, directMessages, setDirectMessages, fetchAll, readIds, dmReadIds, setDmReadIds }: any) {
  const isDark = theme === 'dark'
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try { const raw = localStorage.getItem('solv_saved_dms'); return new Set(raw ? JSON.parse(raw) : []) } catch { return new Set() }
  })
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const bgInput = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-blue-100 text-slate-900'
  const bgCard = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-blue-100'

  const conversation = useMemo(() => {
    if (!dmTarget || !currentProfile) return []
    return directMessages
      .filter((m: DirectMessage) => 
        (m.sender_id === currentProfile.id && m.receiver_id === dmTarget.profile_id) ||
        (m.receiver_id === currentProfile.id && m.sender_id === dmTarget.profile_id)
      )
      .sort((a: any,b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [directMessages, dmTarget, currentProfile])

  const filteredConversation = useMemo(() => {
    if (!showSavedOnly) return conversation
    return conversation.filter((m: DirectMessage) => savedIds.has(m.id))
  }, [conversation, showSavedOnly, savedIds])

  const isRecipientOnline = dmTarget ? activeUsers.some((u: ActiveUser) => u.profile_id === dmTarget.profile_id) : true

  useEffect(() => {
    try { localStorage.setItem('solv_saved_dms', JSON.stringify(Array.from(savedIds))) } catch {}
  }, [savedIds])

  function toggleSaveDM(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); setToast('Removed from saved') } 
      else { next.add(id); setToast('Private message saved') }
      return next
    })
  }

  async function deleteBoardMessage(id: string) {
    if (!confirm('Delete your message?')) return
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) { setToast(error.message); return }
    setToast('Message deleted')
    fetchAll(true)
  }

  async function deleteDM(id: string) {
    if (!confirm('Delete this private message?')) return
    const { error } = await supabase.from('direct_messages').delete().eq('id', id)
    if (error) { setToast(error.message); return }
    setDirectMessages((prev: DirectMessage[]) => prev.filter(m => m.id !== id))
    setToast('Private message deleted')
  }

  async function sendMessage() {
    if (!content.trim() || !currentProfile) return
    if (dmTarget && !isRecipientOnline) { setToast(`${dmTarget.username} went offline`); return }
    setSending(true)
    try {
      if (dmTarget) {
        let convoId: string | null = null
        const existing = directMessages.find((m: DirectMessage) => 
          (m.sender_id === currentProfile.id && m.receiver_id === dmTarget.profile_id) ||
          (m.sender_id === dmTarget.profile_id && m.receiver_id === currentProfile.id)
        ) as any
        if (existing?.conversation_id) convoId = existing.conversation_id
        else {
          const newId = crypto.randomUUID()
          try { await supabase.from('conversations').insert({ id: newId } as any) } catch {}
          convoId = newId
        }
        const payload = {
          conversation_id: convoId,
          sender_id: currentProfile.id,
          sender_name: currentProfile.username,
          receiver_id: dmTarget.profile_id,
          receiver_name: dmTarget.username,
          content: content.trim(),
          is_read: false,
          read: false,
        }
        let { error, data } = await supabase.from('direct_messages').insert(payload).select().single()
        if (error) {
          // fallback if is_read/read columns don't exist yet
          const fallback: any = { ...payload }
          delete fallback.is_read
          delete fallback.read
          if (error.message.includes('conversation_id')) delete fallback.conversation_id
          const r = await supabase.from('direct_messages').insert(fallback).select().single()
          if (r.error) throw r.error
          data = r.data
        }
        setDirectMessages((prev: DirectMessage[]) => [...prev, data as any])
        setContent('')
      } else {
        const fullPayload = {
          author: currentProfile.username,
          content: content.trim(),
          color: 'blue',
          pinned: false,
          read: false,
          profile_id: currentProfile.id,
          username: currentProfile.username,
          user_id: null as any,
        }
        let { error } = await supabase.from('messages').insert(fullPayload)
        if (error) {
          if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
            const retry1 = { author: fullPayload.author, content: fullPayload.content, username: fullPayload.username, profile_id: fullPayload.profile_id, color: 'blue', pinned: false, read: false }
            const r1 = await supabase.from('messages').insert(retry1)
            if (r1.error) {
              const r2 = await supabase.from('messages').insert({ content: fullPayload.content, author: fullPayload.author })
              if (r2.error) {
                const r3 = await supabase.from('messages').insert({ content: fullPayload.content })
                if (r3.error) throw r3.error
              }
            }
          } else throw error
        }
        setContent('')
        fetchAll(true)
      }
    } catch (e: any) { setToast(e.message) } finally { setSending(false) }
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-3 flex gap-2 overflow-x-auto scrollbar-none ${bgCard}`}>
        <button onClick={() => setDmTarget(null)} className={`shrink-0 h-10 px-4 rounded-full text-xs font-bold border ${!dmTarget ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : bgCard}`}>💬 Board {messages.filter((m:any)=>!readIds.has(m.id)).length>0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full">{messages.filter((m:any)=>!readIds.has(m.id)).length}</span>}</button>
        {activeUsers.filter((u: ActiveUser) => u.profile_id !== currentProfile?.id).map((u: ActiveUser) => {
          const isSelected = dmTarget?.profile_id === u.profile_id
          const privateUnread = directMessages.filter((m: DirectMessage) => m.sender_id === u.profile_id && m.receiver_id === currentProfile?.id && !isDMReadFromDB(m, dmReadIds)).length
          return (
            <button key={u.profile_id} onClick={() => setDmTarget(u)} className={`shrink-0 h-10 px-3 rounded-full text-xs font-bold border flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600' : bgCard}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {u.username} {privateUnread > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text- font-black">{privateUnread > 99 ? '99+' : privateUnread}</span>}
            </button>
          )
        })}
        {activeUsers.filter((u: ActiveUser) => u.profile_id !== currentProfile?.id).length === 0 && <span className="text-xs text-slate-400 self-center">No other users online for private DM</span>}
      </div>

      <div className={`rounded-2xl border shadow backdrop-blur flex flex-col ${bgCard}`} style={{ height: '68vh' }}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            {dmTarget ? (
              <>
                <span className="text- px-2 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">PRIVATE by ID</span>
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">{currentProfile?.username?.[0]?.toUpperCase()}</span>
                <span>You</span>
                <span className="text-slate-400">→</span>
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">{dmTarget.username[0]?.toUpperCase()}</span>
                <span>{dmTarget.username}</span>
                <span className={`text-xs ${isRecipientOnline ? 'text-emerald-600' : 'text-amber-600'}`}>{isRecipientOnline ? '• online' : '• offline'}</span>
              </>
            ) : '💬 Message Board'}
          </div>
          <div className="flex items-center gap-2">
            {dmTarget && (
              <button onClick={() => setShowSavedOnly(v => !v)} className={`text-xs font-bold px-3 py-1 rounded-full border ${showSavedOnly ? 'bg-amber-500 text-white border-amber-500' : bgCard}`}>
                {showSavedOnly ? '★ Saved' : '☆ All'}
              </button>
            )}
            {dmTarget && <button onClick={() => setDmTarget(null)} className="text-xs font-bold text-blue-600">Back</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {!dmTarget ? (
            messages.map((m: any) => {
              const isOwn = m.profile_id === currentProfile?.id || m.username === currentProfile?.username || m.author === currentProfile?.username
              const isUnread = !readIds.has(m.id)
              return (
                <div key={m.id} className={`p-3 rounded-xl border group ${isUnread ? 'ring-1 ring-blue-200' : ''} ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold flex items-center gap-2">{m.profiles?.username || m.username || m.author || 'Unknown'} {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full" />}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{new Date(m.created_at).toLocaleTimeString()}</span>
                      {isOwn && <button onClick={() => deleteBoardMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 text-xs font-bold">Delete</button>}
                    </div>
                  </div>
                  <div className="text-sm mt-1">{m.content}</div>
                </div>
              )
            })
          ) : (
            filteredConversation.length === 0 ? <div className="text-center text-sm text-slate-400 mt-10">{showSavedOnly ? 'No saved messages with ' + dmTarget.username : <>Private conversation with {dmTarget.username}<br/>Only you and {dmTarget.username} can see these messages</>}</div> :
            filteredConversation.map((m: DirectMessage) => {
              const isMe = m.sender_id === currentProfile?.id
              const isSaved = savedIds.has(m.id)
              const readState = isDMReadFromDB(m, dmReadIds)
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/dm`}>
                  <div className={`flex items-center gap-1.5 mb-1 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text- text-white ${isMe ? 'bg-blue-600' : 'bg-emerald-600'}`}>{(isMe ? currentProfile?.username : m.sender_name)[0]?.toUpperCase()}</span>
                    <span className={isMe ? 'text-blue-600' : 'text-emerald-600'}>{isMe ? 'You' : m.sender_name}</span>
                    <span>→</span>
                    <span>{isMe ? m.receiver_name : 'You'}</span>
                    <span className="font-normal">• {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isMe && (readState ? '✓✓ read' : '✓ sent')}</span>
                    {isSaved && <span className="text-amber-500">★</span>}
                  </div>
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm relative ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : isDark ? 'bg-slate-800 border border-slate-700 rounded-bl-sm text-white' : 'bg-white border border-blue-100 rounded-bl-sm'} ${!isMe && !readState ? 'ring-1 ring-blue-200' : ''}`}>
                    {m.content}
                    <div className="absolute -top-2 -right-2 hidden group-hover/dm:flex gap-1">
                      <button onClick={() => toggleSaveDM(m.id)} className={`w-6 h-6 rounded-full text-xs flex items-center justify-center shadow border ${isSaved ? 'bg-amber-400 text-white' : 'bg-white text-slate-600'}`}>{isSaved ? '★' : '☆'}</button>
                      <button onClick={() => deleteDM(m.id)} className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow">✕</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 border-t flex gap-2">
          <input value={content} onChange={e => setContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={dmTarget ? `Private message to ${dmTarget.username}...` : 'Post to board...'} className={`flex-1 h-11 rounded-xl border px-4 text-sm ${bgInput}`} disabled={dmTarget ? !isRecipientOnline : false} />
          <button onClick={sendMessage} disabled={sending || !content.trim() || (dmTarget ? !isRecipientOnline : false)} className="h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold disabled:opacity-50">{sending ? '...' : dmTarget ? 'Send Private' : 'Post'}</button>
        </div>
        {dmTarget && <div className="px-3 pb-2 text-xs text-slate-400 text-center">🔒 Private • Saved: {savedIds.size} • {isRecipientOnline ? 'Online' : 'Offline'} {showSavedOnly && '(showing saved only)'}</div>}
      </div>
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
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [dmTarget, setDmTarget] = useState<ActiveUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [tab, setTab] = useState<Tab>('logs')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All')
  const [toast, setToast] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [dmReadIds, setDmReadIds] = useState<Set<string>>(new Set())

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
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('solv_theme') as Theme | null
    if (saved) setTheme(saved)
    else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
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
    try { const raw2 = localStorage.getItem('solv_read_dms'); if (raw2) setDmReadIds(new Set(JSON.parse(raw2))) } catch {}
    fetchAll()
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('solv_theme', theme)
    const root = document.documentElement
    if (theme === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark' }
    else { root.classList.remove('dark'); root.style.colorScheme = 'light' }
  }, [theme, mounted])

  useEffect(() => { localStorage.setItem('solv_logs_view', logsView) }, [logsView])
  useEffect(() => { localStorage.setItem('solv_practices_view', practicesView) }, [practicesView])

  useEffect(() => {
    if (!isLoggedIn) return
    const intervalId = setInterval(() => { fetchAll(true) }, 10 * 1000)
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchAll(true) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(intervalId); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [isLoggedIn])

  // --- AUTO LOGOUT AFTER 5 MIN IDLE ---
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('solv_username')
    localStorage.removeItem('solv_profile_id')
    setIsLoggedIn(false)
    setCurrentProfile(null)
    setDmTarget(null)
    setToast('Logged out due to 5 min inactivity')
  }

  useEffect(() => {
    if (!isLoggedIn) return
    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { handleLogout() }, 5 * 60 * 1000)
    }
    const events: (keyof WindowEventMap)[] = ['mousemove','mousedown','keydown','touchstart','scroll','click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true } as any))
    resetTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || !currentProfile) return
    const channel = supabase.channel('online-profiles', { config: { presence: { key: currentProfile.id } } })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: ActiveUser[] = []
      for (const key in state) { const presences = state[key] as any[]; presences.forEach((p: any) => { users.push({ profile_id: p.profile_id, username: p.username, online_at: p.online_at }) }) }
      const unique = Array.from(new Map(users.map(u => [u.profile_id, u])).values())
      setActiveUsers(unique)
    })
    channel.subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ profile_id: currentProfile.id, username: currentProfile.username, online_at: new Date().toISOString() }) })
    const interval = setInterval(() => { channel.track({ profile_id: currentProfile.id, username: currentProfile.username, online_at: new Date().toISOString() }) }, 30000)
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [isLoggedIn, currentProfile])

  useEffect(() => {
    if (!isLoggedIn || !currentProfile) return
    const dmChannel = supabase.channel(`dm-private-${currentProfile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${currentProfile.id}` }, (payload) => {
        const row = payload.new as DirectMessage
        setDirectMessages(prev => { if (prev.some(m => m.id === row.id)) return prev; return [...prev, row] })
        setToast(`New private DM from ${row.sender_name}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${currentProfile.id}` }, (payload) => {
        const row = payload.new as DirectMessage
        setDirectMessages(prev => { if (prev.some(m => m.id === row.id)) return prev; return [...prev, row] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
        const row = payload.new as DirectMessage
        setDirectMessages(prev => prev.map(m => m.id === row.id ? { ...m, ...row } : m))
      })
      .subscribe()
    return () => { supabase.removeChannel(dmChannel) }
  }, [isLoggedIn, currentProfile])

  useEffect(() => { try { localStorage.setItem('solv_read_messages', JSON.stringify(Array.from(readIds))) } catch {} }, [readIds])
  useEffect(() => { try { localStorage.setItem('solv_read_dms', JSON.stringify(Array.from(dmReadIds))) } catch {} }, [dmReadIds])
  useEffect(() => { if (!isLocked) return; const t = setInterval(() => setCountdown(c => { if (c <= 1) { setIsLocked(false); setFailedAttempts(0); return 0 } return c - 1 }), 1000); return () => clearInterval(t) }, [isLocked])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) } }, [toast])

  // Board read (localStorage)
  useEffect(() => {
    if (tab === 'messages' && !dmTarget && messages.length > 0) {
      const unread = messages.filter(m => !readIds.has(m.id))
      if (unread.length > 0) { 
        const t = setTimeout(() => { 
          setReadIds(prev => { const next = new Set(prev); unread.forEach(m => next.add(m.id)); return next }) 
        }, 800); 
        return () => clearTimeout(t) 
      }
    }
  }, [tab, messages, dmTarget])

  // DM read SYNCED TO direct_messages table
  useEffect(() => {
    if (tab !== 'messages' || !dmTarget || !currentProfile) return
    const unreadDMs = directMessages.filter(m => m.receiver_id === currentProfile.id && m.sender_id === dmTarget.profile_id && !isDMReadFromDB(m, dmReadIds))
    if (unreadDMs.length === 0) return

    const markRead = async () => {
      const ids = unreadDMs.map(m => m.id)
      const now = new Date().toISOString()
      
      // 1. Optimistic local update + localStorage
      setDmReadIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next })
      setDirectMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true, read: true, read_at: now } : m))

      // 2. Sync to Supabase direct_messages table
      try {
        // Try with all possible columns
        await supabase.from('direct_messages').update({ is_read: true, read: true, read_at: now } as any).in('id', ids)
      } catch {}
      // Fallbacks for schema variations
      try { await supabase.from('direct_messages').update({ is_read: true } as any).in('id', ids) } catch {}
      try { await supabase.from('direct_messages').update({ read: true } as any).in('id', ids) } catch {}
      try { await supabase.from('direct_messages').update({ read_at: now } as any).in('id', ids) } catch {}
    }

    const t = setTimeout(markRead, 800)
    return () => clearTimeout(t)
  }, [tab, dmTarget, directMessages, currentProfile])

  async function fetchAll(silent = false) {
    if (!silent) setLoading(true)
    try {
      const savedProfileId = localStorage.getItem('solv_profile_id') || currentProfile?.id
      const dmQuery = savedProfileId
        ? supabase.from('direct_messages').select('*').or(`sender_id.eq.${savedProfileId},receiver_id.eq.${savedProfileId}`).order('created_at', { ascending: false }).limit(200)
        : supabase.from('direct_messages').select('*').eq('sender_id', '___no_user___').limit(0)

      const [p, l, a, m, prof, dm] = await Promise.all([
        supabase.from('practices').select('*').order('created_at', { ascending: false }),
        supabase.from('logs').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('date', { ascending: true }),
        supabase.from('messages').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        dmQuery,
      ])
      if (p.data) setPractices(p.data as any)
      if (l.data) setLogs(l.data as any)
      if (a.data) setAppointments(a.data as any)
      if (m.data) setMessages(m.data as any)
      if (prof.data) setProfiles(prof.data as any)
      if (dm.data) setDirectMessages(dm.data.reverse() as any)
      setLastRefresh(new Date())
    } finally { if (!silent) setLoading(false) }
  }

  async function handleLogin() {
    if (isLocked) return
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (data && (data.password_hash === pass || data.password_hash === btoa(pass))) {
      localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('solv_username', data.username); localStorage.setItem('solv_profile_id', data.id)
      setCurrentProfile(data as any); setIsLoggedIn(true); setFailedAttempts(0); setPass(''); setUsername(data.username); return
    }
    if (profiles.length === 0 && username && pass && pass.length >= 3) {
      localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('solv_username', username); localStorage.setItem('solv_profile_id', 'temp-' + username)
      setCurrentProfile({ id: 'temp-' + username, username, password_hash: '' }); setIsLoggedIn(true); return
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

  // FIXED: notifier synced to direct_messages table
  const unreadMessages = useMemo(() => {
    const boardUnread = messages.filter((m) => !readIds.has(m.id)).length
    const dmUnread = directMessages.filter(d => d.receiver_id === currentProfile?.id && !isDMReadFromDB(d, dmReadIds)).length
    return boardUnread + dmUnread
  }, [messages, readIds, directMessages, dmReadIds, currentProfile])

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
    const payload = { practice_id: lForm.practice_id || null, practice_name: linked?.practice_name || lForm.practice_name || '', prac_number: pracVal, practice_number: pracVal, contact_person: lForm.contact_person || '', phone: lForm.phone || '', product: normalizeProduct(lForm.product), issue: lForm.issue, solution: lForm.solution || '', notes: lForm.notes || '', status: lForm.status || 'Open' }
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
    if (id === currentProfile?.id) { setToast('Cannot delete yourself'); return }
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
  const statusColors: Record<string,string> = isDark ? { Open: 'bg-amber-950/60 text-amber-300 border-amber-800', 'In Progress': 'bg-blue-950/60 text-blue-300 border-blue-800', Closed: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' } : { Open: 'bg-amber-50 text-amber-700 border-amber-200', 'In Progress': 'bg-blue-50 text-blue-700 border-blue-200', Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200' }

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
            <div className={`font-black text-sm truncate ${isDark ? 'text-white' : 'bg-gradient-to-r from-blue-700 to-sky-700 bg-clip-text text-transparent'}`}>SOLVMEDICAL</div>
            <div className={`hidden lg:flex ml-2 items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${bgChip}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{currentProfile?.username || 'Unknown'}</span>
              {activeUsers.length > 0 && <span className={textMuted}>• {activeUsers.length} online</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {lastRefresh && (<span className={`hidden sm:flex text-xs font-bold ${textMuted}`}>{lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>)}
            <div className={`hidden sm:flex h-10 px-3 rounded-xl items-center gap-2 border text-xs font-bold ${bgChip}`}><div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black">{(currentProfile?.username || 'U')[0].toUpperCase()}</div><span className="truncate">{currentProfile?.username}</span></div>
            <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bgChip}`}>{theme === 'dark' ? '☀' : '🌙'}</button>
            <button onClick={handleLogout} className={`w-10 h-10 rounded-xl border ${bgChip}`}>↪</button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 pb-3 pt-1 sm:pt-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search practices, logs, product..." className={`w-full h-11 rounded-xl pl-4 pr-4 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${bgInput}`} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-3 sm:p-6">
        <div className={`flex gap-1.5 mb-4 sm:mb-5 p-1 rounded-full w-full sm:w-fit overflow-x-auto border shadow-sm backdrop-blur scrollbar-none snap-x snap-mandatory ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-blue-100'}`}>
          {[
            { k: 'logs', l: 'Logs', i: '📋' },
            { k: 'practices', l: 'Practices', i: '🏥' },
            { k: 'messages', l: 'Messages', i: '💬', badge: unreadMessages },
            { k: 'calendar', l: 'Calendar', i: '📅' },
            { k: 'kpi', l: 'KPI', i: '📊' },
            { k: 'profile', l: 'Profiles', i: '👤' }
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as Tab)} className={`relative h-10 sm:h-9 px-4 rounded-full text-sm font-bold flex items-center gap-1.5 snap-start shrink-0 ${tab === t.k ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{t.i}</span> <span>{t.l}</span>
              {t.badge !== undefined && t.badge > 0 && (<span className={`ml-1 min-w-5 h-5 px-1.5 rounded-full text- font-black flex items-center justify-center ${tab === t.k ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'}`}>{t.badge > 99 ? '99+' : t.badge}</span>)}
            </button>
          ))}
        </div>

        {tab === 'logs' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2"><h2 className="text-lg font-black">Logs</h2><span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${bgChip}`}>{filteredLogs.length} total</span></div>
              <div className="flex items-center gap-2 flex-wrap">
                <ViewToggle value={logsView} onChange={setLogsView} isDark={isDark} />
                <div className={`flex gap-1 p-1 rounded-full border overflow-x-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
                  {(['All','Open','In Progress','Closed'] as const).map(s => (<button key={s} onClick={()=>setStatusFilter(s)} className={`h-9 sm:h-8 px-3 rounded-full text-xs font-bold ${statusFilter===s ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{s}</button>))}
                </div>
                <button onClick={()=>{ setLForm(EMPTY_LOG); setEditingLog(null); setShowLog(true) }} className="h-10 sm:h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow ml-auto sm:ml-0">+ New Log</button>
              </div>
            </div>
            {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className={`h-28 rounded-2xl animate-pulse ${isDark?'bg-slate-800':'bg-white/60'}`} />)}</div>) : filteredLogs.length===0 ? (<div className={`rounded-2xl border border-dashed p-10 text-center ${isDark?'border-slate-700 bg-slate-900/50':'bg-white/70 border-blue-200'}`}><div className="text-3xl">📋</div><p className={`mt-2 text-sm font-bold ${textMuted}`}>No logs found</p></div>) : logsView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredLogs.map(log=>{ const linked = getPracticeForLog(log); return (
                    <div key={log.id} onClick={()=>setShowDetailLog(log)} className={cardBase + ' cursor-pointer'}>
                      <div className="flex items-start justify-between gap-2 mb-2"><div className={`text-xs font-black tracking-widest uppercase px-2 py-1 rounded-full border ${statusColors[log.status] || statusColors.Open}`}>{log.status}</div><span className={`text-xs font-mono ${textSubtle}`}>{getPracNumber(linked) || getPracNumber(log) || ''}</span></div>
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{log.practice_name || linked?.practice_name || 'Unlinked Practice'}</h3>
                      <p className={`text-xs mt-1 line-clamp-2 ${textMuted}`}>{log.issue}</p>
                    </div>)})}
              </div>) : (<div className="space-y-2">{filteredLogs.map(log=>{ const linked = getPracticeForLog(log); return (<div key={log.id} onClick={()=>setShowDetailLog(log)} className={listRowBase}><div className={`text-xs font-black uppercase px-2 py-1 rounded-full border shrink-0 ${statusColors[log.status] || statusColors.Open}`}>{log.status}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-bold text-sm truncate">{log.practice_name || linked?.practice_name}</span></div><p className={`text-xs truncate ${textMuted}`}>{log.issue}</p></div><span className={`text-xs font-bold shrink-0 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>→</span></div>)})}</div>)}
          </div>
        )}

        {tab === 'practices' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">Practices</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${bgChip}`}>{filteredPractices.length} / {practices.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <ViewToggle value={practicesView} onChange={setPracticesView} isDark={isDark} />
                <button onClick={()=>{ setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }} className="h-10 sm:h-9 px-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow">+ New Practice</button>
              </div>
            </div>
            {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{[1,2,3,4,5,6].map(i=><div key={i} className={`h-32 rounded-2xl animate-pulse ${isDark?'bg-slate-800':'bg-white/60'}`} />)}</div>) : filteredPractices.length === 0 ? (<div className={`rounded-2xl border border-dashed p-10 text-center ${isDark?'border-slate-700 bg-slate-900/50':'bg-white/70 border-blue-200'}`}><div className="text-3xl">🏥</div><p className={`mt-2 text-sm font-bold ${textMuted}`}>No practices found</p><button onClick={()=>{ setPForm(EMPTY_PRACTICE); setEditingPractice(null); setShowPractice(true) }} className="mt-3 text-sm font-bold text-blue-600">Create first practice</button></div>) : practicesView === 'grid' ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{filteredPractices.map(p=> { const logCount = logs.filter(l => l.practice_id === p.id || l.practice_name === p.practice_name).length; return (<div key={p.id} onClick={()=>setShowDetailPractice(p)} className={cardBase + ' cursor-pointer'}><div className="flex items-start justify-between gap-2 mb-2"><h3 className="font-bold text-sm truncate pr-2 leading-tight">{p.practice_name}</h3><span className={`text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 ${bgSubtle}`}>{getPracNumber(p) || '—'}</span></div><div className={`space-y-1.5 text-xs ${textMuted}`}>{p.contact_person && <div className="flex items-center gap-1.5 truncate">👤 {p.contact_person}</div>}{(p.phone || (p as any).mobile) && <div className="flex items-center gap-1.5 truncate">📞 {p.phone || (p as any).mobile}</div>}{p.email && <div className="flex items-center gap-1.5 truncate">✉ {p.email}</div>}<div className="flex items-center gap-2 pt-1"><span className={`px-2 py-0.5 rounded-full border text- font-bold ${bgSubtle}`}>{p.product || 'Solv Optics'}</span><span className={`ml-auto text-xs ${textSubtle}`}>{logCount} logs</span></div></div></div>)})}</div>) : (<div className="space-y-2">{filteredPractices.map(p=> (<div key={p.id} onClick={()=>setShowDetailPractice(p)} className={listRowBase}><div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0">{p.practice_name[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-bold text-sm truncate">{p.practice_name}</span><span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${bgSubtle}`}>{getPracNumber(p) || '—'}</span></div><p className={`text-xs truncate ${textMuted}`}>{p.contact_person || ''} {p.contact_person && (p.phone || (p as any).mobile) ? '•' : ''} {p.phone || (p as any).mobile || ''} {p.email ? `• ${p.email}` : ''}</p></div><span className={`text-xs font-bold shrink-0 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>→</span></div>))}</div>)}
          </div>
        )}

        {tab === 'messages' && <MessageBoardInline messages={messages} theme={theme} setToast={setToast} currentProfile={currentProfile} activeUsers={activeUsers} dmTarget={dmTarget} setDmTarget={setDmTarget} directMessages={directMessages} setDirectMessages={setDirectMessages} fetchAll={fetchAll} readIds={readIds} dmReadIds={dmReadIds} setDmReadIds={setDmReadIds} />}
        {tab === 'calendar' && (<div className="space-y-4"><CalendarGrid calendarDate={calendarDate} setCalendarDate={setCalendarDate} selectedCalDate={selectedCalDate} setSelectedCalDate={setSelectedCalDate} appointments={appointments} theme={theme} onSelectDate={() => {}} onSelectAppt={(a) => setShowDetailAppt(a)} onNewAppt={(dateStr) => { setAForm({ ...EMPTY_APPT, date: dateStr }); setEditingAppt(null); setShowAppt(true) }} />{selectedCalDate && <SelectedDayPanel date={selectedCalDate} appointments={appointments.filter((a) => normalizeDateStr(a.date) === selectedCalDate).sort((a,b)=>a.start_time.localeCompare(b.start_time))} theme={theme} onClose={() => setSelectedCalDate(null)} onSelect={(a) => setShowDetailAppt(a)} />}<UpcomingAppointments appointments={appointments} theme={theme} onSelect={(a) => setShowDetailAppt(a)} /></div>)}
        {tab === 'kpi' && <KpiDashboard practices={practices} logs={logs} appointments={appointments} messages={messages} unreadMessages={unreadMessages} theme={theme} />}
        {tab === 'profile' && (<div className="space-y-4 sm:space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4"><div className={`rounded-2xl border p-4 sm:p-5 shadow ${bgCard}`}><h3 className={`font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2 ${textMuted}`}><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> You</h3><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-lg">{(currentProfile?.username || '?')[0].toUpperCase()}</div><div><div className="font-bold text-sm">{currentProfile?.username}</div><div className={`text-xs ${textMuted}`}>ID: {currentProfile?.id.slice(0,8)}... (private)</div></div></div></div><div className={`rounded-2xl border p-4 sm:p-5 shadow ${bgCard}`}><h3 className={`font-bold text-xs uppercase tracking-widest mb-2 ${textMuted}`}>Active Sessions</h3><div className="text-3xl font-black">{activeUsers.length}</div><div className={`text-xs ${textMuted}`}>{activeUsers.filter(u => u.profile_id !== currentProfile?.id).length} other online</div></div><div className={`rounded-2xl border p-4 sm:p-5 shadow ${bgCard}`}><h4 className={`font-bold text-xs uppercase tracking-widest mb-3 ${textMuted}`}>Other Online - Click to DM</h4><div className="space-y-2 max-h-32 overflow-y-auto">{activeUsers.filter(u => u.profile_id !== currentProfile?.id).map(u => (<div key={u.profile_id} className={`p-2.5 rounded-xl border flex justify-between items-center text-sm ${bgSubtle}`}><div className="flex items-center gap-2 truncate"><span className="w-2 h-2 rounded-full bg-emerald-500" />{u.username}</div><button onClick={() => { setDmTarget(u); setTab('messages') }} className="h-7 px-3 rounded-full bg-blue-600 text-white text-xs font-bold">DM Private</button></div>))}{activeUsers.filter(u => u.profile_id !== currentProfile?.id).length === 0 && <div className={`text-xs p-2 rounded-xl text-center ${bgSubtle} ${textMuted}`}>No other users online</div>}</div></div></div><div className={`rounded-2xl border p-4 sm:p-5 shadow ${bgCard}`}><h3 className="font-black text-sm mb-4">{editingProfile ? `Edit: ${editingProfile.username}` : '+ New Profile'}</h3><div className="flex flex-col sm:flex-row gap-3"><input value={pUsername} onChange={e => setPUsername(e.target.value)} placeholder="Username" className={`flex-1 h-11 rounded-xl border px-4 text-sm ${bgInput}`} /><input value={pPassword} onChange={e => setPPassword(e.target.value)} placeholder="Password" type="text" className={`flex-1 h-11 rounded-xl border px-4 text-sm ${bgInput}`} /><div className="flex gap-2"><button onClick={saveProfile} className="h-11 px-6 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold">{editingProfile ? 'Update' : 'Create'}</button>{editingProfile && <button onClick={()=>{ setEditingProfile(null); setPUsername(''); setPPassword(''); }} className={`h-11 px-4 rounded-xl border text-sm font-bold ${bgChip}`}>Cancel</button>}</div></div></div><div className={`rounded-2xl border shadow overflow-hidden ${bgCard}`}><div className={`p-4 border-b font-bold text-sm flex justify-between ${isDark ? 'border-slate-800' : 'border-blue-100'}`}><span>All Profiles ({profiles.length})</span><button onClick={()=>fetchAll(true)} className={`text-xs ${textMuted}`}>↻ Refresh</button></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{profiles.map(pr => (<div key={pr.id} className="p-3 sm:p-4 flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black shrink-0">{pr.username[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="font-bold text-sm truncate flex items-center gap-2">{pr.username} {pr.id === currentProfile?.id && <span className="text- px-1.5 py-0.5 rounded-full bg-blue-600 text-white">YOU</span>}</div><div className={`text-xs truncate ${textMuted}`}>{pr.id} • {pr.created_at ? new Date(pr.created_at).toLocaleDateString() : ''}</div></div><div className="flex gap-1.5 shrink-0"><button onClick={()=>{ setEditingProfile(pr); setPUsername(pr.username); setPPassword(pr.password_hash); }} className={`h-8 px-3 rounded-full border text-xs font-bold ${bgChip}`}>Edit</button><button disabled={pr.id === currentProfile?.id} onClick={()=>{ if(confirm(`Delete ${pr.username}?`)) deleteProfile(pr.id) }} className="h-8 px-3 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-bold disabled:opacity-40">Delete</button></div></div>))}{profiles.length === 0 && <div className={`p-8 text-center text-sm ${textMuted}`}>No profiles yet. Create one above.</div>}</div></div></div>)}
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
