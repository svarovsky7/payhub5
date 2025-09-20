import type { Dayjs } from 'dayjs'

export interface FinancialSummary {
  amountNet: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  balance: number
}

export interface InvoiceViewState {
  isEditing: boolean
  hasChanges: boolean
  deliveryDate: Dayjs | null
  activeTab: string
  documents: any[]
  loadingDocuments: boolean
  uploadingFile: boolean
  paymentModalVisible: boolean
  approvalModalVisible: boolean
  selectedPaymentForApproval: any
  workflows: any[]
  loadingWorkflows: boolean
  selectedWorkflow: string | null
  currentPaymentAmount: number
  financialSummary: FinancialSummary
  previewModalVisible: boolean
  previewFile: any
  previewLoading: boolean
  fieldChangesHistory: any[]
  originalValues: any
  editPaymentModalVisible: boolean
  editingPayment: any
}

export interface InvoiceViewProps {
  id?: string
}