'use client'
import { Conversation } from '@/lib/types'

type Props = {
  conversations: Conversation[]
  onSelect?: (c: Conversation) => void
  selectedId?: string
}

export function ConversationList({ conversations, onSelect, selectedId }: Props) {
  if (!conversations?.length) return <div className="text-sm text-slate-400 p-3">No conversations</div>
  return (
    <div className="space-y-2">
      {conversations.map((c) => (
        <div
          key={c.id}
          onClick={() => onSelect?.(c)}
          className={`p-3 rounded-xl border cursor-pointer ${selectedId === c.id ? 'bg-blue-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <div className="text-sm font-bold truncate">{c.id.slice(0,8)}</div>
          <div className="text-xs opacity-70 truncate">{(c as any).last_message || ''}</div>
        </div>
      ))}
    </div>
  )
}

export default ConversationList