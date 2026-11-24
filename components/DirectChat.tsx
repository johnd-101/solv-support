'use client'

type Props = {
  conversationId?: string
}

export function DirectChat({ conversationId }: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-bold mb-2">Direct Chat {conversationId ? `- ${conversationId.slice(0,8)}` : ''}</div>
      <div className="flex-1 border rounded-xl p-3 bg-slate-50 text-sm text-slate-500">
        Select a conversation
      </div>
    </div>
  )
}

export default DirectChat