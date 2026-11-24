'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Practice = any
export type LogRow = any
export type Appointment = any
export type Message = any

export function useSolvData() {
  const [practices, setPractices] = useState<Practice[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [directMessages, setDirectMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [p, l, a, m] = await Promise.all([
        supabase.from('practices').select('*').order('created_at', { ascending: false }),
        supabase.from('logs').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('date', { ascending: true }),
        supabase.from('messages').select('*').order('created_at', { ascending: false }),
      ])
      if (p.data) setPractices(p.data)
      if (l.data) setLogs(l.data)
      if (a.data) setAppointments(a.data)
      if (m.data) setMessages(m.data)
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    practices,
    logs,
    appointments,
    messages,
    profiles,
    directMessages,
    loading,
    fetchAll,
    setPractices,
    setLogs,
    setAppointments,
    setMessages,
    setProfiles,
    setDirectMessages,
  }
}

export default useSolvData