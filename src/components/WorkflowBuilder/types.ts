// Типы для конструктора процессов согласования платежей

export interface WorkflowDefinition {
  id: number
  name: string
  description?: string
  company_id?: string
  is_active: boolean
  // Условия для платежей
  invoice_type_ids?: number[] // ID типов заявок
  stages?: WorkflowStage[]
  created_at: string
  updated_at: string
}

// WorkflowRules interface removed - rules field no longer exists in database

export interface WorkflowStage {
  id: number
  workflow_id: number
  position: number
  name: string
  approval_quorum: number
  description?: string
  timeout_days?: number
  is_final?: boolean // Финальный этап - после него счет считается оплаченным
  permissions: StagePermissions
  assigned_roles?: WorkflowRole[]
  assigned_users?: string[]
  created_at: string
  updated_at: string
}

export interface StagePermissions {
  can_view: boolean
  can_edit: boolean
  can_approve: boolean
  can_reject: boolean
  can_cancel: boolean
}

// StageConditions interface removed - not used in current implementation

export interface WorkflowRole {
  id: string
  name: string
  code: string
  permissions: string[]
}

export interface ApprovalAction {
  id: number
  invoice_id: number
  stage_id: number
  user_id: string
  action: 'approve' | 'reject' | 'cancel' | 'edit' | 'comment'
  comment?: string
  created_at: string
}

export interface WorkflowWithStages extends WorkflowDefinition {
  stages: WorkflowStage[]
  invoice_type?: {
    id: number
    name: string
    code: string
  }
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  invoice_type_id?: number
  stages: Omit<WorkflowStage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  is_active?: boolean
}

export interface CreateStageInput {
  workflow_id: number
  position: number
  name: string
  approval_quorum?: number
  description?: string
  timeout_days?: number
  permissions: StagePermissions
  assigned_roles?: string[]
  assigned_users?: string[]
}

export interface UpdateStageInput {
  position?: number
  name?: string
  approval_quorum?: number
  description?: string
  timeout_days?: number
  permissions?: StagePermissions
  assigned_roles?: string[]
  assigned_users?: string[]
}

// Предопределенные роли в системе
export const SYSTEM_ROLES = {
  ADMIN: { id: 'admin', name: 'Администратор', code: 'ADMIN' },
  MANAGER: { id: 'manager', name: 'Менеджер', code: 'MANAGER' },
  ACCOUNTANT: { id: 'accountant', name: 'Бухгалтер', code: 'ACCOUNTANT' },
  PROJECT_MANAGER: { id: 'project_manager', name: 'Руководитель проекта', code: 'PROJECT_MANAGER' },
  FINANCE_MANAGER: { id: 'finance_manager', name: 'Финансовый менеджер', code: 'FINANCE_MANAGER' },
  DIRECTOR: { id: 'director', name: 'Директор', code: 'DIRECTOR' },
} as const


// Типы счетов из БД (таблица invoice_types)
export const INVOICE_TYPES = {
  MTRL: { id: 1, name: 'МАТЕРИАЛЫ', code: 'MTRL', description: 'Счета за физические товары, строительные и расходные материалы' },
  SUBC: { id: 2, name: 'СУБПОДРЯД', code: 'SUBC', description: 'Счета на строительные работы и услуги подрядчиков' },
  RENT: { id: 3, name: 'АРЕНДА', code: 'RENT', description: 'Счета за аренду оборудования, опалубку, автотехнику' },
  UTIL: { id: 4, name: 'КОММУНАЛКА', code: 'UTIL', description: 'Счета за коммунальные услуги и эксплуатационные расходы' },
} as const

// Типы платежей - такие же как типы счетов (из таблицы invoice_types)
export const PAYMENT_TYPES = INVOICE_TYPES

// Типы контрагентов
const CONTRACTOR_TYPES = {
  SUPPLIER: { id: 'supplier', name: 'Поставщик' },
  CONTRACTOR: { id: 'contractor', name: 'Подрядчик' },
  OTHER: { id: 'other', name: 'Прочее' },
} as const

