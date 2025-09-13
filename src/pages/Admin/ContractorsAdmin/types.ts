/**
 * Types for ContractorsAdmin components
 */

export interface ContractorType {
  id: number
  code: string
  name: string
  description?: string
  created_at?: string
}

export interface Contractor {
  id: number
  name: string
  inn?: string
  supplier_code?: string
  type_id?: number
  type?: ContractorType
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface ContractorsAdminProps {
  // No props currently defined
}