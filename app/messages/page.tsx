'use client'
import { useState } from 'react'
import ConversationList from '@/components/ConversationList'
import DirectChat from '@/components/DirectChat'

export default function MessagesPage() {
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="flex h-[80vh] gap-4 p-4">
      <div className="w-1/3 border rounded-xl p-3 overflow-y-auto">
        <ConversationList 
          conversations={[]} 
          onSelect={setSelected} 
          selectedId={selected?.id} 
        />
      </div>
      <div className="flex-1 border rounded-xl p-3">
        <DirectChat conversationId={selected?.id} />
      </div>
    </div>
  )
}