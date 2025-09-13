/**
 * Types for invoice services
 */

import type { Invoice } from '../supabase'

export interface InvoiceWithRelations extends Invoice {
  supplier?: {
    id: string
    name: string
    inn: string
  }
  payer?: {
    id: string
    name: string
    inn: string
  }
  project?: {
    id: string
    name: string
    address?: string
  }
  invoice_type?: {
    id: number
    code: string
    name: string
    description?: string
  }
  created_by_profile?: {
    id: string
    full_name: string
    email: string
  }
  creator?: {
    id: string
    full_name: string
    email: string
  }
  current_stage?: {
    id: string
    name: string
  }
  payments?: Array<{
    id: number
    reference: string
    payment_date: string
    amount: number
    status: string
    comment?: string | null
    payer_id?: number | null
    created_by?: string | null
    approved_by?: string | null
    approved_at?: string | null
    created_at: string
    updated_at: string
  }>
}

export interface FileUploadOptions {
  invoiceId?: string
  category?: string
  description?: string
  metadata?: Record<string, any>
}

export interface FileUploadResult {
  id?: string
  path: string
  fullPath: string
  invoice_id?: string
  category?: string
  description?: string
  metadata?: Record<string, any>
}