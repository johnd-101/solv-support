import { PRODUCT_OPTIONS } from './constants'

export function normalizeProduct(v: string) {
  const t = (v || '').trim()
  if (!t) return 'Unknown'
  const match = PRODUCT_OPTIONS.find((o) => o.toLowerCase() === t.toLowerCase())
  if (match) return match
  if (t.toLowerCase().includes('optics') || t.toLowerCase().includes('optom')) return 'Solv Optics'
  if (t.toLowerCase().includes('physio')) return 'Solv Physio'
  if (t.toLowerCase().includes('meds')) return 'Solv Meds'
  if (t.toLowerCase().includes('dental') || t.toLowerCase().includes('dentistry')) return 'Solv Dental'
  return t
}

export function statusStyle(s: string) {
  if (s === 'Open') return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' }
  if (s === 'Closed') return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }
  return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
}

export function apptTypeStyle(t: string) {
  if (t === 'Demo') return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' }
  if (t === 'Training') return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', dot: '#22c55e' }
  if (t === 'Call') return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', dot: '#f59e0b' }
  if (t === 'Personal') return { bg: '#e0f2fe', color: '#0c4a6e', border: '#bae6fd', dot: '#0ea5e9' }
  return { bg: '#f1f5f9', color: '#670bdf', border: '#e2e8f0', dot: '#1864ce' }
}

export function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export function formatRelativeTime(iso: string) {
  try {
    const then = new Date(iso).getTime()
    if (isNaN(then)) return iso
    const diff = Date.now() - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

export function isUniqueViolation(err: any): boolean {
  if (!err) return false
  const code = err.code || err?.details?.code
  const msg = (err.message || '').toLowerCase()
  return code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')
}

export function toLocalDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const normalizeDateStr = (s: string) => s.slice(0, 10)