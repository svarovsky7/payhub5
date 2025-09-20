export interface Payment {
  id: number
  reference?: string // это payment_number в UI
  internal_number?: string // Уникальный внутренний номер платежа
  invoice_id: number
  invoice?: {
    invoice_number: string
    invoice_date?: string
    title?: string
    total_amount?: number
    type_id?: number
    contractor?: {
      name: string
    }
    supplier?: {
      name: string
    }
    payer?: {
      name: string
    }
    project?: {
      name: string
    }
  }
  amount: number
  total_amount?: number // Поле из БД
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'draft' | 'approved' | 'scheduled' | 'paid'
  payment_date: string
  approved_at?: string
  created_at?: string
  comment?: string
  workflow_status?: 'not_started' | 'in_approval' | 'approved' | 'rejected' | 'cancelled'
  workflow?: {
    id: number
    status: string
    stages_completed: number
    stages_total: number
    current_stage_position: number
  }
  created_by?: string
  creator?: {
    id?: string
    full_name?: string
    email?: string
  }
  confirmed_by?: {
    name?: string
    email?: string
  }
  approved_by?: {
    name?: string
    email?: string
  }
  updated_at: string
}

export const statusConfig = {
  draft: 'Черновик',
  pending: 'На согласовании',
  processing: 'Обработка',
  approved: 'Согласован',
  scheduled: 'В графике',
  paid: 'Оплачен',
  completed: 'Завершен',
  failed: 'Отклонен',
  cancelled: 'Отменен'
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'default'
    case 'pending': return 'processing'
    case 'approved': return 'blue'
    case 'scheduled': return 'cyan'
    case 'paid': return 'success'
    case 'completed': return 'success'
    case 'cancelled': return 'error'
    case 'failed': return 'error'
    default: return 'default'
  }
}

export interface PaymentsPageProps {
  embedded?: boolean
}