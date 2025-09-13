/**
 * CRUD operations for invoices
 * Re-exports all invoice service functionality
 */

import { InvoiceCrudOperations } from './invoice-crud'
import { InvoiceFileStorage } from './file-storage'

export type { InvoiceWithRelations } from './types'

/**
 * Main InvoiceCrudService class
 * Combines all invoice operations
 */
export class InvoiceCrudService {
  // Storage operations
  static ensureBucketExists = (...args: Parameters<typeof InvoiceFileStorage.ensureBucketExists>) =>
    InvoiceFileStorage.ensureBucketExists(...args)
  static uploadFile = (...args: Parameters<typeof InvoiceFileStorage.uploadFile>) =>
    InvoiceFileStorage.uploadFile(...args)
  static uploadFiles = (...args: Parameters<typeof InvoiceFileStorage.uploadFiles>) =>
    InvoiceFileStorage.uploadFiles(...args)
  static getInvoiceDocuments = (...args: Parameters<typeof InvoiceFileStorage.getInvoiceDocuments>) =>
    InvoiceFileStorage.getInvoiceDocuments(...args)
  static removeFile = (...args: Parameters<typeof InvoiceFileStorage.removeFile>) =>
    InvoiceFileStorage.removeFile(...args)

  // CRUD operations
  static create = (...args: Parameters<typeof InvoiceCrudOperations.create>) =>
    InvoiceCrudOperations.create(...args)
  static getById = (...args: Parameters<typeof InvoiceCrudOperations.getById>) =>
    InvoiceCrudOperations.getById(...args)
  static update = (...args: Parameters<typeof InvoiceCrudOperations.update>) =>
    InvoiceCrudOperations.update(...args)
  static delete = (...args: Parameters<typeof InvoiceCrudOperations.delete>) =>
    InvoiceCrudOperations.delete(...args)
  static clone = (...args: Parameters<typeof InvoiceCrudOperations.clone>) =>
    InvoiceCrudOperations.clone(...args)
}