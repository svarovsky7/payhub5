/**
 * Types for Admin components
 */

interface AdminPageProps {
  userId?: string
  companyId?: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  position?: string
  role_id?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  last_sign_in_at?: string
  avatar_url?: string
}

export interface Project {
  id: number
  name: string
  abbreviation?: string
  internal_code?: string
  description?: string
  address?: string
  status?: string
  budget?: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

interface InvoiceType {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Status {
  id: number
  code: string
  name: string
  description?: string
  entity_type: 'invoice' | 'payment'
  color?: string
  order_index?: number
  is_final?: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
}

interface Workflow {
  id: number
  name: string
  description?: string
  steps?: any[]
  is_active: boolean
  created_at: string
  updated_at?: string
}