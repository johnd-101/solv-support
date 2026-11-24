export type Practice = { id: string; created_at: string; practice_name: string; prac_number: string; contact_person: string; phone: string; mobile: string; email: string; address: string; product: string; notes: string }
export type LogRow = { id: string; created_at: string; practice_id: string | null; practice_name: string; contact_person: string; phone: string; product: string; issue: string; solution: string; notes: string; status: string }
export type Appointment = { id: string; created_at: string; title: string; description: string; date: string; start_time: string; end_time: string; type: 'Meeting'|'Call'|'Visit'|'Personal'|'Other'; location: string; practice_name?: string }
export type KpiDatum = { label: string; value: number; color?: string }
