export type Practice = {
  id: string
  created_at: string
  practice_name: string
  practice_number: string
  contact_person: string
  phone: string
  mobile: string
  email: string
  address: string
  product: string
  notes: string
}

export type LogRow = {
  id: string
  created_at: string
  practice_id: string | null
  practice_name: string
  practice_number?: string
  contact_person: string
  phone: string
  product: string
  issue: string
  solution: string
  notes: string
  status: string
}

export type Appointment = {
  id: string
  created_at: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  type: 'Demo' | 'Login' | 'Call' | 'Personal' | 'Training'
  location: string
  practice_name?: string
}

export type Message = {
  id: string
  created_at: string
  author: string
  content: string
  pinned: boolean
  color: string
  read: boolean
}

export type KpiChartDatum = { label: string; value: number; color?: string }
export type Theme = 'light' | 'dark'