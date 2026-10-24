export const LOGO_PATH = '/solv-logo-blue.png'

export const PRODUCT_OPTIONS = ['Solv Optics', 'Solv Physio', 'Solv Meds', 'Solv Dental'] as const

export const PRODUCT_COLORS: Record<string, string> = {
  'Solv Optics': '#3b82f6',
  'Solv Physio': '#ef4444',
  'Solv Meds': '#f59e0b',
  'Solv Dental': '#6315ca',
}

export const MESSAGE_COLORS: Record<string, { bg: string; border: string; accent: string; label: string }> = {
  blue:   { bg: '#dbeafe', border: '#bfdbfe', accent: '#3b82f6', label: 'Info' },
  yellow: { bg: '#fef3c7', border: '#fde68a', accent: '#f59e0b', label: 'Note' },
  green:  { bg: '#dcfce7', border: '#bbf7d0', accent: '#22c55e', label: 'Done' },
  red:    { bg: '#fee2e2', border: '#fecaca', accent: '#ef4444', label: 'Urgent' },
  purple: { bg: '#f3e8ff', border: '#e9d5ff', accent: '#a855f7', label: 'Idea' },
  slate:  { bg: '#f1f5f9', border: '#e2e8f0', accent: '#64748b', label: 'General' },
}

export const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'SolvOptics456'
export const READ_STORAGE_KEY = 'solv_read_messages'

export const EMPTY_PRACTICE = {
  practice_name: '', practice_number: '', contact_person: '', phone: '', mobile: '',
  email: '', address: '', product: 'Solv Optics', notes: '',
}
export const EMPTY_LOG = {
  practice_id: '', practice_name: '', practice_number: '', contact_person: '', phone: '',
  product: 'Solv Optics', issue: '', solution: '', notes: '', status: 'Open',
}
export const EMPTY_APPT = {
  title: '', description: '', date: new Date().toISOString().split('T')[0],
  start_time: '09:00', end_time: '10:00', type: 'Demo' as const, location: '', practice_name: '',
}
export const EMPTY_MESSAGE = { author: '', content: '', color: 'blue' }