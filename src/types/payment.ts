/**
 * Типы для работы с платежами
 */

// Описания типов платежей для UI (unused - removed)
// const PaymentTypeLabels: Record<PaymentType, string> = {
//   [PaymentType.ADV]: 'Аванс',
//   [PaymentType.RET]: 'Возврат удержаний',
//   [PaymentType.DEBT]: 'Погашение долга'
// }

// Цвета для отображения типов платежей (unused - removed)
// const PaymentTypeColors: Record<PaymentType, string> = {
//   [PaymentType.ADV]: 'blue',
//   [PaymentType.RET]: 'green',
//   [PaymentType.DEBT]: 'orange'
// }


// Интерфейс для создания платежа
export interface PaymentInsertWithType {
  invoice_id: string
  payment_date?: string
  total_amount: number // Total amount including VAT
  amount_net?: number // Amount excluding VAT
  payer_id?: string
  payment_type_id?: string
  reference?: string
  comment?: string
  status?: string // Dynamic status from database
  created_by?: string
  attachments?: string[]
}

