import { Appointment } from './types'
export const LOGO_PATH = "/solv-logo-blue.png"
export const PRODUCT_OPTIONS = ['Solv Optics', 'Solv Physio', 'Solv Meds', 'Solv Dental'] as const
export const PRODUCT_COLORS: Record<string, string> = {
  'Solv Optics': '#0ea5e9',
  'Solv Physio': '#8b5cf6',
  'Solv Meds': '#10b981',
  'Solv Dental': '#f59e0b'
}
export const CHART_PALETTE = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4','#f43f5e','#6366f1']
export const EMPTY_PRACTICE = { practice_name: '', prac_number: '', contact_person: '', phone: '', mobile: '', email: '', address: '', product: 'Solv Optics' as string, notes: '' }
export const EMPTY_LOG = { practice_id: '', practice_name: '', contact_person: '', phone: '', product: 'Solv Optics' as string, issue: '', solution: '', notes: '', status: 'Open' }
export const EMPTY_APPT = { title: '', description: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', type: 'Meeting' as Appointment['type'], location: '', practice_name: '' }
export const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'SolvOptics456'
