// Типы для конструктора процессов согласования платежей

export interface WorkflowDefinition {
  id: number
  name: string
  description?: string
  company_id?: string
  is_active: boolean
  // Условия для платежей
  invoice_type_ids?: number[] // ID типов заявок
  contractor_type_ids?: number[] // ID типов контрагентов
  project_ids?: number[]
  stages?: WorkflowStage[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface WorkflowRules {
  max_amount_no_approval?: number
  requires_finance_approval?: boolean
  requires_project_manager?: boolean
  auto_approve_recurring?: boolean
  auto_approve_under?: number
  requires_receipt?: boolean
  project_ids?: number[]
  invoice_type_ids?: number[]
}

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

interface StageConditions {
  invoice_type_ids?: number[]
  project_ids?: number[]
  min_amount?: number
  max_amount?: number
  contractor_ids?: number[]
}

export interface WorkflowRole {
  id: string
  name: string
  code: string
  permissions: string[]
}

interface ApprovalAction {
  id: number
  invoice_id: number
  stage_id: number
  user_id: string
  action: 'approve' | 'reject' | 'cancel' | 'edit' | 'comment'
  comment?: string
  created_at: string
}

interface WorkflowWithStages extends WorkflowDefinition {
  stages: WorkflowStage[]
  invoice_type?: {
    id: number
    name: string
    code: string
  }
}

interface CreateWorkflowInput {
  name: string
  description?: string
  invoice_type_id?: number
  rules: WorkflowRules
  stages: Omit<WorkflowStage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]
}

interface UpdateWorkflowInput {
  name?: string
  description?: string
  is_active?: boolean
  rules?: WorkflowRules
}

interface CreateStageInput {
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

interface UpdateStageInput {
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

// Типы счетов
export const INVOICE_TYPES = {
  GOODS: { id: 1, name: 'Товары', code: 'goods' },
  WORKS: { id: 2, name: 'Работы', code: 'works' },
  RENT: { id: 3, name: 'Аренда', code: 'rent' },
  UTILITIES: { id: 4, name: 'Коммунальные услуги', code: 'utilities' },
} as const

// Типы платежей
const PAYMENT_TYPES = {
  MATERIALS: { id: 'materials', name: 'Материалы' },
  SERVICES: { id: 'services', name: 'Услуги' },
  OTHER: { id: 'other', name: 'Прочее' },
} as const

// Типы контрагентов
const CONTRACTOR_TYPES = {
  SUPPLIER: { id: 'supplier', name: 'Поставщик' },
  CONTRACTOR: { id: 'contractor', name: 'Подрядчик' },
  OTHER: { id: 'other', name: 'Прочее' },
} as const

// Действия в процессе
export const WORKFLOW_ACTIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  APPROVE: 'approve',
  REJECT: 'reject',
  CANCEL: 'cancel',
} as const

// Статусы процесса
export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const