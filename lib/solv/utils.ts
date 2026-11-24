import { PRODUCT_OPTIONS } from './constants'
export function normalizeProduct(v: string | null | undefined): typeof PRODUCT_OPTIONS[number] {
  const t = (v || '').trim().toLowerCase()
  if (!t) return 'Solv Optics'
  if (t.includes('opt')) return 'Solv Optics'
  if (t.includes('physio')) return 'Solv Physio'
  if (t.includes('meds') || t.includes('med')) return 'Solv Meds'
  if (t.includes('dent')) return 'Solv Dental'
  const match = PRODUCT_OPTIONS.find(o => o.toLowerCase() === t)
  return (match as any) || 'Solv Optics'
}
export function getProductShort(product: string | null | undefined) {
  if (!product) return 'No product'
  return product.replace('Solv ', '')
}
export function statusStyle(s: string) {
  if (s === 'Open') return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' }
  if (s === 'Closed') return { bg: '#dcfce7', color: '#166534', border: '#86efac' }
  return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }
}
export function apptTypeStyle(t: string) {
  if (t==='Meeting') return { bg:'#dbeafe', color:'#1e40af', border:'#93c5fd', dot:'#1e40af' }
  if (t==='Visit') return { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd', dot:'#8b5cf6' }
  if (t==='Call') return { bg:'#dcfce7', color:'#166534', border:'#86efac', dot:'#10b981' }
  if (t==='Personal') return { bg:'#fef3c7', color:'#92400e', border:'#fcd34d', dot:'#f59e0b' }
  return { bg:'#fce7f3', color:'#9d174d', border:'#f9a8d4', dot:'#ec4899' }
}
export const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export const normalizeDateStr = (s: string) => s.slice(0, 10)
