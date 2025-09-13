/**
 * Типы для работы с платежами
 */

// Enum для типов платежей
export enum PaymentType {
  ADV = 'ADV',   // Аванс
  RET = 'RET',   // Возврат удержаний
  DEBT = 'DEBT'  // Погашение долга
}

// Описания типов платежей для UI
export const PaymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.ADV]: 'Аванс',
  [PaymentType.RET]: 'Возврат удержаний',
  [PaymentType.DEBT]: 'Погашение долга'
}

// Цвета для отображения типов платежей
export const PaymentTypeColors: Record<PaymentType, string> = {
  [PaymentType.ADV]: 'blue',
  [PaymentType.RET]: 'green',
  [PaymentType.DEBT]: 'orange'
}

// Расширенный интерфейс для платежа с типом
export interface PaymentWithType {
  id: string
  invoice_id: string
  payment_date: string
  total_amount: number // Total amount including VAT
  amount_net?: number // Amount excluding VAT
  payment_type: PaymentType
  payer_id?: string
  type_id?: string
  reference?: string
  comment?: string
  status: string // Dynamic status from database
  created_by?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  attachments?: string[]
}

// Интерфейс для создания платежа
export interface PaymentInsertWithType {
  invoice_id: string
  payment_date?: string
  total_amount: number // Total amount including VAT
  amount_net?: number // Amount excluding VAT
  payment_type: PaymentType
  payer_id?: string
  type_id?: string
  reference?: string
  comment?: string
  status?: string // Dynamic status from database
  created_by?: string
  attachments?: string[]
}

// Интерфейс для обновления платежа
export interface PaymentUpdateWithType {
  payment_date?: string
  total_amount?: number // Total amount including VAT
  amount_net?: number // Amount excluding VAT
  payment_type?: PaymentType
  payer_id?: string
  reference?: string
  comment?: string
  status?: string // Dynamic status from database
  approved_by?: string
  approved_at?: string
  attachments?: string[]
}