/**
 * Status service types
 */

export interface Status {
  id: number
  entity_type: 'invoice' | 'payment' | 'project'
  code: string
  name: string
  description?: string
  color: string
  is_final: boolean
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface StatusMap {
  [code: string]: Status
}

export interface StatusesByEntity {
  invoice: StatusMap
  payment: StatusMap
  project: StatusMap
}