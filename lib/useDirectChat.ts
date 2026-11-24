'use client'
import { useState } from 'react'
// Fix import path - was "./types", should be "@/lib/types"
import { DirectMessage } from '@/lib/types'

type Props = {
  conversationId?: string
}

export function useDirectChat({ conversationId }: Props = {}) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(false)

  return { messages, setMessages, loading, setLoading, conversationId }
}

export default useDirectChat