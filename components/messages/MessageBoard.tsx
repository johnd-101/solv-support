'use client'
import { useEffect, useMemo, useState } from 'react'
import { Message, Theme } from '@/lib/types'
import { MESSAGE_COLORS, EMPTY_MESSAGE } from '@/lib/constants'
import { useReadMessages } from '@/lib/useReadMessages'
import { supabase } from '@/lib/supabaseClient'
import { MessageForm } from './MessageForm'
import { MessageCard } from './MessageCard'

export function MessageBoard({
  messages, setMessages, theme, setToast,
}: {
  messages: Message[]
  setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void
  theme: Theme
  setToast: (s: string) => void
}) {
  const [form, setForm] = useState<any>(EMPTY_MESSAGE)
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Pinned'>('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const { readIds, setReadIds, markRead, markUnread, markAllRead } = useReadMessages()

  // Seed device read state from DB on first load
  useEffect(() => {
    setReadIds((prev) => {
      if (prev.size === 0) return new Set(messages.filter((x) => x.read).map((x) => x.id))
      return prev
    })
  }, [messages, setReadIds])

  const isUnread = (m: Message) => !readIds.has(m.id)
  const unreadCount = useMemo(() => messages.filter(isUnread).length, [messages, readIds])

  const filtered = useMemo(() => {
    let f = messages
    if (filter === 'Pinned') f = f.filter((m) => m.pinned)
    if (filter === 'Unread') f = f.filter(isUnread)
    return [...f].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      const au = isUnread(a), bu = isUnread(b)
      if (au !== bu) return au ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [messages, filter, readIds])

  async function postMessage() {
    const content = (form.content || '').trim()
    const author = (form.author || '').trim() || 'Anonymous'
    if (!content) { setToast('Write a message first'); return }
    const payload = { author, content, color: form.color || 'blue', pinned: false, read: false }
    const { data, error } = await supabase.from('messages').insert(payload).select().single()
    if (error) { setToast(error.message); return }
    const newMsg = data as any as Message
    setMessages((prev) => [newMsg, ...prev])
    setReadIds((prev) => { const n = new Set(prev); n.add(newMsg.id); return n })
    setForm({ ...EMPTY_MESSAGE, author })
    setToast('Message posted')
  }

  async function togglePin(id: string) {
    const m = messages.find((x) => x.id === id); if (!m) return
    const { data, error } = await supabase.from('messages').update({ pinned: !m.pinned }).eq('id', id).select().single()
    if (error) { setToast(error.message); return }
    setMessages((prev) => prev.map((x) => (x.id === id ? (data as any) : x)))
    setToast(m.pinned ? 'Unpinned' : 'Pinned to top')
  }

  async function updateMessage(id: string) {
    const txt = editingText.trim()
    if (!txt) { setToast('Message cannot be empty'); return }
    const { data, error } = await supabase.from('messages').update({ content: txt }).eq('id', id).select().single()
    if (error) { setToast(error.message); return }
    setMessages((prev) => prev.map((x) => (x.id === id ? (data as any) : x)))
    setEditingId(null)
    setToast('Message updated')
  }

  async function deleteMessage(id: string) {
    if (!confirm('Delete this message?')) return
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) { setToast(error.message); return }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setReadIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    setToast('Message deleted')
  }

  async function changeColor(id: string, color: string) {
    const { data, error } = await supabase.from('messages').update({ color }).eq('id', id).select().single()
    if (error) { setToast(error.message); return }
    setMessages((prev) => prev.map((x) => (x.id === id ? (data as any) : x)))
  }

  async function handleMarkRead(id: string) {
    markRead(id)
    supabase.from('messages').update({ read: true }).eq('id', id).then(({ error }) => {
      if (error) console.warn('read sync failed:', error.message)
    })
  }

  async function handleMarkUnread(id: string) {
    markUnread(id)
    supabase.from('messages').update({ read: false }).eq('id', id).then(({ error }) => {
      if (error) console.warn('unread sync failed:', error.message)
    })
  }

  async function handleMarkAllRead() {
    const ids = messages.map((m) => m.id)
    if (ids.length === 0) { setToast('Nothing to mark'); return }
    markAllRead(ids)
    setToast('All marked read')
    supabase.from('messages').update({ read: true }).in('id', ids).then(({ error }) => {
      if (error) console.warn('bulk read sync failed:', error.message)
    })
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4">
      <MessageForm form={form} setForm={setForm} theme={theme} onPost={postMessage} />

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex gap-2 p-1 rounded-full w-fit border ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-blue-100'}`}>
          {(['All', 'Unread', 'Pinned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-full text-xs font-bold transition ${filter === f ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {f}
              {f === 'Pinned' && ` (${messages.filter((m) => m.pinned).length})`}
              {f === 'Unread' && ` (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className={`h-9 px-4 rounded-full text-xs font-bold border transition active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm'}`}
            title="Mark every message as read for this device"
          >
            ✓ Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((m) => {
          const isEditing = editingId === m.id
          return (
            <div key={m.id}>
              {isEditing ? (
                <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className={`w-full rounded-xl border p-3 text-sm resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => setEditingId(null)} className={`h-8 px-3 rounded-lg text-xs font-bold ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                    <button onClick={() => updateMessage(m.id)} className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white">Save</button>
                  </div>
                </div>
              ) : (
                <MessageCard
                  message={m}
                  theme={theme}
                  unread={isUnread(m)}
                  onToggleRead={() => (readIds.has(m.id) ? handleMarkUnread(m.id) : handleMarkRead(m.id))}
                  onMarkRead={() => handleMarkRead(m.id)}
                  onTogglePin={() => togglePin(m.id)}
                  onColorChange={(color) => changeColor(m.id, color)}
                  onEdit={() => { setEditingId(m.id); setEditingText(m.content) }}
                  onDelete={() => deleteMessage(m.id)}
                />
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className={`rounded-2xl border p-10 text-center backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800 text-slate-400' : 'bg-white/90 border-blue-100 text-slate-400'}`}>
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm font-bold">
              {filter === 'Unread' ? 'All caught up 🎉' : filter === 'Pinned' ? 'No pinned messages' : 'No messages yet'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}