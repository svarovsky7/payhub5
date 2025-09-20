import type { FilterParams, Payment } from '../../supabase'
import type { PaymentWithRelations } from '../crud'

export interface PaymentFilters extends FilterParams {
  status?: Payment['status']
  amountFrom?: number
  amountTo?: number
  contractorId?: string
  invoiceId?: string
  paymentDateFrom?: string
  paymentDateTo?: string
  processedBy?: string
  userProjectIds?: number[]  // Проекты пользователя для фильтрации
  viewOwnProjectsOnly?: boolean  // Флаг ограничения по проектам
}

export interface PaymentStats {
  total: number
  totalAmount: number
  byStatus: Record<Payment['status'], number>
  byStatusAmount: Record<Payment['status'], number>
  avgAmount: number
  avgProcessingTime: number // в часах
}

export interface PaymentReportData {
  period: string
  payments: PaymentWithRelations[]
  stats: PaymentStats
  groupedByStatus: Record<string, PaymentWithRelations[]>
  groupedByContractor: Record<string, PaymentWithRelations[]>
}

export interface PaymentExportOptions {
  format: 'excel' | 'csv' | 'pdf'
  filters?: PaymentFilters
  columns?: string[]
  includeStats?: boolean
}