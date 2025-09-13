/**
 * Types and interfaces for InvoiceView components
 */

export interface InvoiceViewPageProps {
  userId?: string
  companyId?: string
}

export interface PaymentModalFormValues {
  amount_with_vat: number
  amount_net: number // Amount excluding VAT
  vat_amount: number
  vat_rate: number
  payment_date: any
  currency: string
  type: string
  reference: string
  comment?: string
}

export interface WorkflowModalState {
  visible: boolean
  payment: any | null
  workflows: any[]
  selectedWorkflow: number | null
  loading: boolean
  submitting: boolean
}

export interface FileModalState {
  visible: boolean
  payment: any | null
  files: File[]
}

export interface PreviewFile {
  url: string
  name: string
}

export interface TabConfig {
  key: string
  label: string
  children: React.ReactNode
}