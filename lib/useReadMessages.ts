'use client'
import { useEffect, useState } from 'react'
import { READ_STORAGE_KEY } from '@/lib/constants'

export function useReadMessages() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_STORAGE_KEY)
      if (raw) setReadIds(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(readIds)))
    } catch {}
  }, [readIds])

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const markUnread = (id: string) => {
    setReadIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const markAllRead = (ids: string[]) => {
    setReadIds((prev) => {
      const n = new Set(prev)
      ids.forEach((i) => n.add(i))
      return n
    })
  }

  return { readIds, setReadIds, markRead, markUnread, markAllRead }
}