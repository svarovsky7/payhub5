/**
 * Invoices services barrel export
 */

// Export CRUD service and types
export { InvoiceCrudService } from './crud'
export type { InvoiceWithRelations } from './crud'

// Export Query service and types
export { InvoiceQueryService } from './queries'
export type { InvoiceFilters, InvoiceStats } from './queries'

// Export Workflow service
export { InvoiceWorkflowService } from './workflow'