'use client'
import { Theme } from '@/lib/types'
import { MESSAGE_COLORS } from '@/lib/constants'

export function MessageForm({
  form, setForm, theme, onPost,
}: {
  form: any
  setForm: (f: any) => void
  theme: Theme
  onPost: () => void
}) {
  return (
    <div className={`rounded-2xl border shadow backdrop-blur ${theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white/90 border-blue-100'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-blue-50'}`}>
        <div>
          <h3 className="font-bold text-sm bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">💬 Shared Messages</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">A team noticeboard for announcements, reminders, and quick notes.</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Your name (optional)"
            className={`h-10 rounded-xl border px-3 text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
          />
          <select
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className={`h-10 rounded-xl border px-3 text-sm font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            {Object.entries(MESSAGE_COLORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onPost() }}
          placeholder="Write a message to your team... (Ctrl/Cmd+Enter to post)"
          rows={3}
          className={`w-full rounded-xl border p-3 text-sm resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
        />
        <div className="flex justify-between items-center gap-2">
          <div className="text-[10px] text-slate-400 font-bold">
            Posting as <span style={{ color: MESSAGE_COLORS[form.color]?.accent || '#3b82f6' }}>{form.author.trim() || 'Anonymous'}</span>
          </div>
          <button onClick={onPost} className="h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold shadow active:scale-95">
            Post Message
          </button>
        </div>
      </div>
    </div>
  )
}