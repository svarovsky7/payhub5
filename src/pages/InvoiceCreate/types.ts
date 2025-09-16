/**
 * Types for InvoiceCreate components
 */

import { Dayjs } from 'dayjs'
import type { UploadFile } from 'antd/es/upload/interface'

export interface PaymentRow {
  key: string
  amount: number
  payment_date: Dayjs | null
  description: string
}

export interface InvoiceFormValues {
  invoice_number?: string
  internal_number?: string
  invoice_date: Dayjs
  invoice_type_id?: number
  title?: string
  description?: string
  supplier_id: number
  payer_id: number
  project_id?: number
  amount_with_vat: number
  amount_net?: number
  vat_rate: number
  vat_amount?: number
  delivery_days?: number
  delivery_days_type?: 'calendar' | 'working'
  estimated_delivery_date?: Dayjs
  priority?: string
  material_responsible_person_id?: number
  notes?: string
  payments?: PaymentRow[]
}

interface FileUploadState {
  fileList: UploadFile[]
  previewOpen: boolean
  previewImage: string
  previewTitle: string
  totalFileSize: number
}

interface InvoiceCreateProps {
  userId?: string
  companyId?: string
}