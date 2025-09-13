/**
 * Database types for PayHub procurement system
 * Generated from Supabase schema prod.sql
 */

export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: {
          id: number
          invoice_number: string
          invoice_date: string // date type in DB
          project_id: number | null
          type_id: number
          supplier_id: number
          payer_id: number
          amount_net: number
          vat_rate: number
          vat_amount: number
          total_amount: number
          paid_amount: number
          description: string | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          created_by: string // uuid
          created_at: string
          updated_at: string
          currency: 'RUB' | 'USD' | 'EUR'
          status: string // Dynamic status from database
          delivery_days: number | null
          material_responsible_person_id: number | null
          internal_number: string | null
          delivery_days_type: string | null
          paid_at: string | null // Timestamp when invoice was fully paid
        }
        Insert: {
          id?: number
          invoice_number: string
          invoice_date: string
          project_id?: number | null
          type_id: number
          supplier_id: number
          payer_id: number
          amount_net: number
          vat_rate: number
          vat_amount?: number
          total_amount?: number
          paid_amount?: number
          description?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          created_by: string
          created_at?: string
          updated_at?: string
          currency?: 'RUB' | 'USD' | 'EUR'
          status?: string
          delivery_days?: number | null
          material_responsible_person_id?: number | null
          internal_number?: string | null
          delivery_days_type?: string | null
          paid_at?: string | null
        }
        Update: {
          invoice_number?: string
          invoice_date?: string
          project_id?: number | null
          type_id?: number
          supplier_id?: number
          payer_id?: number
          amount_net?: number
          vat_rate?: number
          vat_amount?: number
          total_amount?: number
          paid_amount?: number
          description?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          updated_at?: string
          currency?: 'RUB' | 'USD' | 'EUR'
          status?: string
          delivery_days?: number | null
          material_responsible_person_id?: number | null
          internal_number?: string | null
          delivery_days_type?: string | null
          paid_at?: string | null
        }
      }
      payments: {
        Row: {
          id: number
          invoice_id: number
          payment_date: string // date type in DB
          total_amount: number // Total amount including VAT
          payer_id: number
          comment: string | null
          created_by: string // uuid
          approved_by: string | null // uuid
          approved_at: string | null
          created_at: string
          updated_at: string
          status: string // Dynamic status from database
          type_id: number | null
          payment_type: 'ADV' | 'RET' | 'DEBT' // Аванс, Возврат удержаний, Погашение долга
          internal_number: string | null
          amount_net: number | null // Amount excluding VAT
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          id?: number
          invoice_id: number
          payment_date: string
          total_amount: number // Total amount including VAT
          payer_id: number
          comment?: string | null
          created_by: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
          status?: string
          type_id?: number | null
          payment_type: 'ADV' | 'RET' | 'DEBT'
          internal_number?: string | null
          amount_net?: number | null // Amount excluding VAT
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          invoice_id?: number
          payment_date?: string
          total_amount?: number // Total amount including VAT
          payer_id?: number
          comment?: string | null
          approved_by?: string | null
          approved_at?: string | null
          updated_at?: string
          status?: string
          type_id?: number | null
          payment_type?: 'ADV' | 'RET' | 'DEBT'
          internal_number?: string | null
          amount_net?: number | null // Amount excluding VAT
          vat_amount?: number | null
          vat_rate?: number | null
        }
      }
      contractors: {
        Row: {
          id: number
          name: string
          inn: string | null
          type_id: number | null
          is_active: boolean
          created_by: string | null // uuid
          created_at: string
          updated_at: string
          contractor_search: any | null // tsvector
          supplier_code: string | null
        }
        Insert: {
          id?: number
          name: string
          inn?: string | null
          type_id?: number | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          supplier_code?: string | null
        }
        Update: {
          name?: string
          inn?: string | null
          type_id?: number | null
          is_active?: boolean
          updated_at?: string
          supplier_code?: string | null
        }
      }
      contractor_types: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
        }
      }
      projects: {
        Row: {
          id: number
          name: string
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          project_code: string | null
        }
        Insert: {
          id?: number
          name: string
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          project_code?: string | null
        }
        Update: {
          name?: string
          address?: string | null
          is_active?: boolean
          updated_at?: string
          project_code?: string | null
        }
      }
      invoice_types: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
        }
      }
      material_responsible_persons: {
        Row: {
          id: number
          full_name: string
          phone: string | null
          position: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null // uuid
        }
        Insert: {
          id?: number
          full_name: string
          phone?: string | null
          position?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          full_name?: string
          phone?: string | null
          position?: string | null
          email?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string // uuid
          email: string
          full_name: string
          is_active: boolean
          created_at: string
          updated_at: string
          role_id: number | null
          project_ids: number[] | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          role_id?: number | null
          project_ids?: number[] | null
        }
        Update: {
          email?: string
          full_name?: string
          is_active?: boolean
          updated_at?: string
          role_id?: number | null
          project_ids?: number[] | null
        }
      }
      roles: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          view_own_project_only: boolean
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          view_own_project_only?: boolean
        }
        Update: {
          code?: string
          name?: string
          description?: string | null
          is_active?: boolean
          updated_at?: string
          view_own_project_only?: boolean
        }
      }
      workflows: {
        Row: {
          id: number
          name: string
          description: string | null
          project_required: boolean
          created_by: string
          is_active: boolean
          is_default: boolean
          priority: number
          rules: Record<string, any>
          created_at: string
          updated_at: string
          invoice_type_ids: number[] | null
          contractor_type_ids: number[] | null
          project_ids: number[] | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          project_required?: boolean
          created_by?: string
          is_active?: boolean
          is_default?: boolean
          priority?: number
          rules?: Record<string, any>
          created_at?: string
          updated_at?: string
          invoice_type_ids?: number[] | null
          contractor_type_ids?: number[] | null
          project_ids?: number[] | null
        }
        Update: {
          name?: string
          description?: string | null
          project_required?: boolean
          is_active?: boolean
          is_default?: boolean
          priority?: number
          rules?: Record<string, any>
          updated_at?: string
          invoice_type_ids?: number[] | null
          contractor_type_ids?: number[] | null
          project_ids?: number[] | null
        }
      }
      workflow_stages: {
        Row: {
          id: number
          workflow_id: number
          position: number
          name: string
          description: string | null
          stage_type: string
          approval_type: string | null
          approval_quorum: number | null
          approval_percentage: number | null
          auto_approve_timeout_hours: number | null
          rejection_stops_flow: boolean
          can_view: boolean
          can_comment: boolean
          can_edit_amount: boolean
          can_edit_description: boolean
          can_attach_files: boolean
          can_delegate: boolean
          skip_if_amount_less: number | null
          skip_if_same_approver: boolean
          assignment_type: string | null
          assigned_users: string[] | null
          assigned_roles: string[] | null
          assigned_departments: string[] | null // Will be removed in migration
          use_hierarchy_level: number | null
          notify_on_receive: boolean
          notify_on_approve: boolean
          notify_on_reject: boolean
          reminder_hours: number | null
          escalation_hours: number | null
          escalation_user_id: string | null
          created_at: string
          updated_at: string
          timeout_days: number | null
          permissions: Record<string, any>
        }
        Insert: {
          id?: number
          workflow_id: number
          position: number
          name: string
          description?: string | null
          stage_type?: string
          approval_type?: string | null
          approval_quorum?: number | null
          approval_percentage?: number | null
          auto_approve_timeout_hours?: number | null
          rejection_stops_flow?: boolean
          can_view?: boolean
          can_comment?: boolean
          can_edit_amount?: boolean
          can_edit_description?: boolean
          can_attach_files?: boolean
          can_delegate?: boolean
          skip_if_amount_less?: number | null
          skip_if_same_approver?: boolean
          assignment_type?: string | null
          assigned_users?: string[] | null
          assigned_roles?: string[] | null
          assigned_departments?: string[] | null
          use_hierarchy_level?: number | null
          notify_on_receive?: boolean
          notify_on_approve?: boolean
          notify_on_reject?: boolean
          reminder_hours?: number | null
          escalation_hours?: number | null
          escalation_user_id?: string | null
          created_at?: string
          updated_at?: string
          timeout_days?: number | null
          permissions?: Record<string, any>
        }
        Update: {
          workflow_id?: number
          position?: number
          name?: string
          description?: string | null
          stage_type?: string
          approval_type?: string | null
          approval_quorum?: number | null
          approval_percentage?: number | null
          auto_approve_timeout_hours?: number | null
          rejection_stops_flow?: boolean
          can_view?: boolean
          can_comment?: boolean
          can_edit_amount?: boolean
          can_edit_description?: boolean
          can_attach_files?: boolean
          can_delegate?: boolean
          skip_if_amount_less?: number | null
          skip_if_same_approver?: boolean
          assignment_type?: string | null
          assigned_users?: string[] | null
          assigned_roles?: string[] | null
          assigned_departments?: string[] | null
          use_hierarchy_level?: number | null
          notify_on_receive?: boolean
          notify_on_approve?: boolean
          notify_on_reject?: boolean
          reminder_hours?: number | null
          escalation_hours?: number | null
          escalation_user_id?: string | null
          updated_at?: string
          timeout_days?: number | null
          permissions?: Record<string, any>
        }
      }
      payment_workflows: {
        Row: {
          id: number
          payment_id: string
          invoice_id: string | null
          workflow_id: number
          current_stage_id: number | null
          current_stage_position: number | null
          status: string | null
          amount: number
          currency: string | null
          description: string | null
          contractor_id: string | null
          project_id: string | null
          payment_date: string | null // date type in DB
          stages_total: number
          stages_completed: number | null
          approval_progress: any
          started_at: string
          started_by: string | null
          completed_at: string | null
          completed_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          payment_id: string
          invoice_id?: string | null
          workflow_id: number
          current_stage_id?: number | null
          current_stage_position?: number | null
          status?: string | null
          amount: number
          currency?: string | null
          description?: string | null
          contractor_id?: string | null
          project_id?: string | null
          payment_date?: string | null
          stages_total?: number
          stages_completed?: number | null
          approval_progress?: any
          started_at?: string
          started_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          payment_id?: string
          invoice_id?: string | null
          workflow_id?: number
          current_stage_id?: number | null
          current_stage_position?: number | null
          status?: string | null
          amount?: number
          currency?: string | null
          description?: string | null
          contractor_id?: string | null
          project_id?: string | null
          payment_date?: string | null
          stages_total?: number
          stages_completed?: number | null
          approval_progress?: any
          started_at?: string
          started_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          updated_at?: string
        }
      }
      statuses: {
        Row: {
          id: number
          entity_type: string
          code: string
          name: string
          description: string | null
          color: string | null
          is_final: boolean
          is_active: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          entity_type: string
          code: string
          name: string
          description?: string | null
          color?: string | null
          is_final?: boolean
          is_active?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          entity_type?: string
          code?: string
          name?: string
          description?: string | null
          color?: string | null
          is_final?: boolean
          is_active?: boolean
          order_index?: number
          updated_at?: string
        }
      }
      themes: {
        Row: {
          id: string // uuid
          name: string
          description: string | null
          config: Record<string, any>
          is_default: boolean
          is_active: boolean
          is_global: boolean
          user_id: string | null // uuid
          shared_with_roles: string[] | null
          version: number | null
          parent_theme_id: string | null // uuid
          created_at: string
          updated_at: string
          created_by: string | null // uuid
          updated_by: string | null // uuid
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          config: Record<string, any>
          is_default?: boolean
          is_active?: boolean
          is_global?: boolean
          user_id?: string | null
          shared_with_roles?: string[] | null
          version?: number | null
          parent_theme_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          config?: Record<string, any>
          is_default?: boolean
          is_active?: boolean
          is_global?: boolean
          user_id?: string | null
          shared_with_roles?: string[] | null
          version?: number | null
          parent_theme_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      priority_level: 'low' | 'normal' | 'high' | 'urgent'
      currency_type: 'RUB' | 'USD' | 'EUR'
      payment_type: 'ADV' | 'RET' | 'DEBT'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}