'use client'
import { Message, Theme } from '@/lib/types'
import { MESSAGE_COLORS } from '@/lib/constants'
import { formatRelativeTime, formatTimestamp } from '@/lib/helpers'

export function MessageCard({
  message, theme, unread, onToggleRead, onTogglePin, onColorChange, onEdit, onDelete, onMarkRead,
}: {
  message: Message
  theme: Theme
  unread: boolean
  onToggleRead: () => void
  onTogglePin: () => void
  onColorChange: (color: string) => void
  onEdit: () => void
  onDelete: () => void
  onMarkRead: () => void
}) {
  const c = MESSAGE_COLORS[message.color] || MESSAGE_COLORS.blue
  return (
    <div
      className={`relative rounded-2xl border-l-4 p-4 shadow-sm backdrop-blur transition-all ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-slate-100'} ${unread ? (theme === 'dark' ? 'ring-1 ring-blue-500/40' : 'ring-1 ring-blue-300') : 'opacity-95'}`}
      style={{ borderLeftColor: c.accent }}
    >
      {unread && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" title="Unread" />
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: c.accent }}>
            {(message.author || 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black truncate flex items-center gap-1.5">
              <span className={unread ? 'font-black' : 'font-bold text-slate-600 dark:text-slate-300'}>{message.author || 'Anonymous'}</span>
              {unread && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">NEW</span>}
              {message.pinned && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">📌 PINNED</span>}
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.accent, border: `1px solid ${c.border}` }}>
                {c.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold" title={formatTimestamp(message.created_at)}>
              {formatRelativeTime(message.created_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleRead}
            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition ${unread ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'}`}
            title={unread ? 'Mark as read' : 'Mark as unread'}
          >{unread ? '●' : '○'}</button>
          <button
            onClick={onTogglePin}
            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition ${message.pinned ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}
            title={message.pinned ? 'Unpin' : 'Pin to top'}
          >📌</button>
          <div className="relative group">
            <button className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Change color">🎨</button>
            <div className={`absolute right-0 top-full mt-1 hidden group-hover:flex gap-1 p-1.5 rounded-xl border shadow-lg z-20 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {Object.entries(MESSAGE_COLORS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => onColorChange(k)}
                  className="w-6 h-6 rounded-full border-2 hover:scale-110 transition"
                  style={{ background: v.accent, borderColor: message.color === k ? '#0f172a' : 'transparent' }}
                  title={v.label}
                />
              ))}
            </div>
          </div>
          <button onClick={onEdit} className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Edit">✎</button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg text-sm flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100" title="Delete">🗑</button>
        </div>
      </div>
      <div className="mt-3">
        <div
          className="text-sm whitespace-pre-wrap rounded-xl p-3 cursor-pointer"
          style={{ background: c.bg, color: theme === 'dark' ? '#0f172a' : '#1e293b', border: `1px solid ${c.border}` }}
          onClick={() => { if (unread) onMarkRead() }}
          title={unread ? 'Click to mark as read' : undefined}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}