/**
 * Query and mutation keys for TanStack Query
 */

// Base key
const BASE_KEY = ['payhub'] as const;

// Query keys factory
export const queryKeys = {
  all: BASE_KEY,
  
  // Invoices
  invoices: {
    all: [...BASE_KEY, 'invoices'] as const,
    list: (companyId: string, filters?: any) => [...BASE_KEY, 'invoices', 'list', companyId, filters] as const,
    item: (id: string) => [...BASE_KEY, 'invoices', 'item', id] as const,
    stats: (companyId: string, filters?: any) => [...BASE_KEY, 'invoices', 'stats', companyId, filters] as const,
    dashboard: (companyId: string) => [...BASE_KEY, 'invoices', 'dashboard', companyId] as const,
    myTasks: (userId: string, companyId: string) => [...BASE_KEY, 'invoices', 'myTasks', userId, companyId] as const,
    workflowHistory: (invoiceId: string) => [...BASE_KEY, 'invoices', 'workflowHistory', invoiceId] as const,
  },

  // Payments
  payments: {
    all: [...BASE_KEY, 'payments'] as const,
    list: (invoiceId?: number | string) => [...BASE_KEY, 'payments', 'list', invoiceId] as const,
    item: (id: string) => [...BASE_KEY, 'payments', 'item', id] as const,
    stats: (companyId: string, filters?: any) => [...BASE_KEY, 'payments', 'stats', companyId, filters] as const,
    dashboard: (companyId: string) => [...BASE_KEY, 'payments', 'dashboard', companyId] as const,
    byInvoice: (invoiceId: string) => [...BASE_KEY, 'payments', 'byInvoice', invoiceId] as const,
    pending: (companyId: string) => [...BASE_KEY, 'payments', 'pending', companyId] as const,
  },

  // Contractors
  contractors: {
    all: [...BASE_KEY, 'contractors'] as const,
    list: (filters?: any) => [...BASE_KEY, 'contractors', 'list', filters] as const,
    detail: (id: string) => [...BASE_KEY, 'contractors', 'detail', id] as const,
    detailWithStats: (id: string) => [...BASE_KEY, 'contractors', 'detailWithStats', id] as const,
    stats: (filters?: any) => [...BASE_KEY, 'contractors', 'stats', filters] as const,
    search: (query: string) => [...BASE_KEY, 'contractors', 'search', query] as const,
    availability: (id: string) => [...BASE_KEY, 'contractors', 'availability', id] as const,
  },

  // Projects
  projects: {
    all: [...BASE_KEY, 'projects'] as const,
    list: (filters?: any) => [...BASE_KEY, 'projects', 'list', filters] as const,
    detail: (id: string) => [...BASE_KEY, 'projects', 'detail', id] as const,
    stats: (filters?: any) => [...BASE_KEY, 'projects', 'stats', filters] as const,
  },

  // Admin - Users
  users: {
    all: [...BASE_KEY, 'users'] as const,
    list: (companyId?: string, filters?: any) => [...BASE_KEY, 'users', 'list', companyId, filters] as const,
    detail: (id: string) => [...BASE_KEY, 'users', 'detail', id] as const,
    stats: (companyId: string) => [...BASE_KEY, 'users', 'stats', companyId] as const,
    active: (companyId: string) => [...BASE_KEY, 'users', 'active', companyId] as const,
    byRole: (companyId: string, roleId: string) => [...BASE_KEY, 'users', 'byRole', companyId, roleId] as const,
  },


  // Admin - Workflows
  workflows: {
    all: [...BASE_KEY, 'workflows'] as const,
    list: (companyId: string) => [...BASE_KEY, 'workflows', 'list', companyId] as const,
    item: (id: string) => [...BASE_KEY, 'workflows', 'item', id] as const,
    stats: (companyId: string) => [...BASE_KEY, 'workflows', 'stats', companyId] as const,
  },

  // Invoice Types
  invoiceTypes: {
    all: [...BASE_KEY, 'invoiceTypes'] as const,
    list: () => [...BASE_KEY, 'invoiceTypes', 'list'] as const,
    item: (id: number) => [...BASE_KEY, 'invoiceTypes', 'item', id] as const,
  },

  // Statuses (invoices/payments)
  statuses: {
    all: [...BASE_KEY, 'statuses'] as const,
    list: (entityType?: 'invoice' | 'payment') => [...BASE_KEY, 'statuses', 'list', entityType] as const,
    item: (id: number) => [...BASE_KEY, 'statuses', 'item', id] as const,
  },

  // Approvals
  approvals: {
    all: [...BASE_KEY, 'approvals'] as const,
    myApprovals: (userId: string, pagination?: any) => [...BASE_KEY, 'approvals', 'my', userId, pagination] as const,
    workflowDetails: (workflowId: number) => [...BASE_KEY, 'approvals', 'workflow', workflowId] as const,
  },

  // Dashboard
  dashboard: {
    all: [...BASE_KEY, 'dashboard'] as const,
    stats: () => [...BASE_KEY, 'dashboard', 'stats'] as const,
    activity: () => [...BASE_KEY, 'dashboard', 'activity'] as const,
  },

  // Material Responsible Persons (МОЛ)
  materialResponsiblePersons: {
    all: [...BASE_KEY, 'materialResponsiblePersons'] as const,
    lists: () => [...BASE_KEY, 'materialResponsiblePersons', 'list'] as const,
    list: (filters?: any) => [...BASE_KEY, 'materialResponsiblePersons', 'list', filters] as const,
    detail: (id: number) => [...BASE_KEY, 'materialResponsiblePersons', 'detail', id] as const,
  },

  // Roles
  roles: {
    all: [...BASE_KEY, 'roles'] as const,
    list: () => [...BASE_KEY, 'roles', 'list'] as const,
    detail: (id: number) => [...BASE_KEY, 'roles', 'detail', id] as const,
  },

  // Enums from database
  enums: {
    all: [...BASE_KEY, 'enums'] as const,
    paymentTypes: () => [...BASE_KEY, 'enums', 'paymentTypes'] as const,
    currencies: () => [...BASE_KEY, 'enums', 'currencies'] as const,
    priorities: () => [...BASE_KEY, 'enums', 'priorities'] as const,
  },
} as const

// Mutation keys for optimistic updates
export const mutationKeys = {
  // Invoices
  createInvoice: 'createInvoice',
  updateInvoice: 'updateInvoice',
  deleteInvoice: 'deleteInvoice',
  submitInvoice: 'submitInvoice',
  approveInvoice: 'approveInvoice',
  rejectInvoice: 'rejectInvoice',
  cancelInvoice: 'cancelInvoice',

  // Payments
  createPayment: 'createPayment',
  updatePayment: 'updatePayment',
  deletePayment: 'deletePayment',
  confirmPayment: 'confirmPayment',
  rejectPayment: 'rejectPayment',
  cancelPayment: 'cancelPayment',

  // Contractors
  createContractor: 'createContractor',
  updateContractor: 'updateContractor',
  deleteContractor: 'deleteContractor',
  activateContractor: 'activateContractor',
  deactivateContractor: 'deactivateContractor',
  blockContractor: 'blockContractor',

  // Projects
  createProject: 'createProject',
  updateProject: 'updateProject',
  deleteProject: 'deleteProject',
  changeProjectStatus: 'changeProjectStatus',
  updateProjectBudget: 'updateProjectBudget',

  // Users
  createUser: 'createUser',
  updateUser: 'updateUser',
  activateUser: 'activateUser',
  deactivateUser: 'deactivateUser',
  resetPassword: 'resetPassword',
  changeUserRole: 'changeUserRole',


  // Workflows
  createWorkflow: 'createWorkflow',
  updateWorkflow: 'updateWorkflow',
  deleteWorkflow: 'deleteWorkflow',
  toggleWorkflow: 'toggleWorkflow',
  addWorkflowStep: 'addWorkflowStep',
  updateWorkflowStep: 'updateWorkflowStep',
  deleteWorkflowStep: 'deleteWorkflowStep',
} as const

// Export QUERY_KEYS for backward compatibility
export const QUERY_KEYS = {
  STATUSES: 'statuses',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  CONTRACTORS: 'contractors',
  PROJECTS: 'projects',
  USERS: 'users',
  WORKFLOWS: 'workflows',
  APPROVALS: 'approvals',
  DASHBOARD: 'dashboard',
  ROLES: 'roles',
  MATERIAL_RESPONSIBLE_PERSONS: 'materialResponsiblePersons',
  CURRENCIES: 'currencies',
  PRIORITIES: 'priorities',
} as const
