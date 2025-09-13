/**
 * CRUD operations for contractors
 */

import { 
  type ApiResponse, 
  type Contractor, 
  type ContractorInsert, 
  type ContractorUpdate, 
  formatCurrency, 
  formatDate,
  handleSupabaseError,
  supabase
} from '../supabase'
import { generateFullSupplierCode } from '../../utils/supplier-code-generator'

export interface ContractorWithStats extends Contractor {
  stats: {
    invoicesCount: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    lastInvoiceDate?: string
    avgInvoiceAmount: number
  }
}

export class ContractorCrudService {
  
  /**
   * Создать нового поставщика
   */
  static async create(contractor: ContractorInsert): Promise<ApiResponse<Contractor>> {
    console.log('[ContractorCrudService] Creating contractor with data:', contractor)
    
    try {
      // Проверяем уникальность ИНН если он указан
      if (contractor.inn) {
        console.log('[ContractorCrudService] Checking INN uniqueness:', contractor.inn)
        const { data: existingContractor, error: checkError } = await supabase
          .from('contractors')
          .select('id')
          .eq('inn', contractor.inn)
          .single()

        console.log('[ContractorCrudService] INN check result:', { existingContractor, checkError })

        if (existingContractor) {
          console.log('[ContractorCrudService] INN already exists, returning error')
          return {
            data: null,
            error: 'Контрагент с таким ИНН уже существует'
          }
        }
      }

      // Генерируем код поставщика
      const supplierCode = generateFullSupplierCode(contractor.name, contractor.inn)
      console.log('[ContractorCrudService] Generated supplier code:', supplierCode)

      const contractorData: any = {
        ...contractor,
        supplier_code: supplierCode,
        is_active: contractor.is_active !== undefined ? contractor.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('[ContractorCrudService] Prepared contractor data for insert:', contractorData)

      const { data, error } = await supabase
        .from('contractors')
        .insert([contractorData])
        .select()
        .single()

      console.log('[ContractorCrudService] Insert result:', { data, error })

      if (error) {
        console.error('[ContractorCrudService] Supabase error:', error)
        throw error
      }

      console.log('[ContractorCrudService] Contractor created successfully:', data)
      return { data: data as Contractor, error: null }
    } catch (error) {
      console.error('[ContractorCrudService] Error creating contractor:', error)
      console.error('[ContractorCrudService] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить поставщика по ID
   */
  static async getById(id: string): Promise<ApiResponse<Contractor>> {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {throw error}

      return { data: data as Contractor, error: null }
    } catch (error) {
      console.error('Ошибка получения поставщика:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить поставщика со статистикой
   */
  static async getByIdWithStats(id: string): Promise<ApiResponse<ContractorWithStats>> {
    try {
      const contractorResult = await this.getById(id)
      if (contractorResult.error || !contractorResult.data) {
        return contractorResult as ApiResponse<ContractorWithStats>
      }

      const stats = await this.getContractorStats(id)

      const contractorWithStats: ContractorWithStats = {
        ...contractorResult.data,
        stats,
      }

      return { data: contractorWithStats, error: null }
    } catch (error) {
      console.error('Ошибка получения поставщика со статистикой:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить поставщика
   */
  static async update(
    id: string, 
    updates: ContractorUpdate
  ): Promise<ApiResponse<Contractor>> {
    try {
      // Проверяем уникальность ИНН если он изменился
      if (updates.inn) {
        const { data: currentContractor } = await supabase
          .from('contractors')
          .select('inn')
          .eq('id', id)
          .single()

        if (currentContractor && updates.inn !== currentContractor.inn) {
          const { data: existingContractor } = await supabase
            .from('contractors')
            .select('id')
            .eq('inn', updates.inn)
            .neq('id', id)
            .single()

          if (existingContractor) {
            return {
              data: null,
              error: 'Поставщик с таким ИНН уже существует'
            }
          }
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('contractors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Contractor, error: null }
    } catch (error) {
      console.error('Ошибка обновления поставщика:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Удалить поставщика (только если нет связанных заявок)
   */
  static async delete(id: string): Promise<ApiResponse<null>> {
    try {
      // Проверяем наличие связанных заявок
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('contractor_id', id)
        .limit(1)

      if (invoicesError) {throw invoicesError}

      if (invoices && invoices.length > 0) {
        return {
          data: null,
          error: 'Нельзя удалить поставщика, по которому есть заявки'
        }
      }

      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id)

      if (error) {throw error}

      return { data: null, error: null }
    } catch (error) {
      console.error('Ошибка удаления поставщика:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Деактивировать поставщика
   */
  static async deactivate(id: string): Promise<ApiResponse<Contractor>> {
    try {
      const updateData: ContractorUpdate = {
        is_active: false,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('contractors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Contractor, error: null }
    } catch (error) {
      console.error('Ошибка деактивации поставщика:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Активировать поставщика
   */
  static async activate(id: string): Promise<ApiResponse<Contractor>> {
    try {
      const updateData: ContractorUpdate = {
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('contractors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Contractor, error: null }
    } catch (error) {
      console.error('Ошибка активации поставщика:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }



  /**
   * Получить статистику по поставщику
   */
  private static async getContractorStats(contractorId: string) {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status, created_at')
        .eq('contractor_id', contractorId)

      if (error) {throw error}

      const invoicesList = invoices || []
      const invoicesCount = invoicesList.length
      const totalAmount = invoicesList.reduce((sum, inv) => sum + inv.amount, 0)
      const paidAmount = invoicesList
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0)
      const pendingAmount = invoicesList
        .filter(inv => ['pending', 'approved'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amount, 0)
      
      const avgInvoiceAmount = invoicesCount > 0 ? totalAmount / invoicesCount : 0
      
      // Дата последней заявки
      const sortedInvoices = invoicesList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const lastInvoiceDate = sortedInvoices.length > 0 ? sortedInvoices[0].created_at : undefined

      return {
        invoicesCount,
        totalAmount,
        paidAmount,
        pendingAmount,
        lastInvoiceDate,
        avgInvoiceAmount,
      }
    } catch (error) {
      console.error('Ошибка получения статистики поставщика:', error)
      return {
        invoicesCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        avgInvoiceAmount: 0,
      }
    }
  }

  /**
   * Проверить доступность поставщика для заявок
   */
  static async checkAvailability(contractorId: string): Promise<{
    isAvailable: boolean
    reason?: string
  }> {
    try {
      const result = await this.getById(contractorId)
      if (result.error || !result.data) {
        return { isAvailable: false, reason: 'Поставщик не найден' }
      }

      const contractor = result.data

      if (!contractor.is_active) {
        return { isAvailable: false, reason: 'Поставщик деактивирован' }
      }

      return { isAvailable: true }
    } catch (error) {
      console.error('Ошибка проверки доступности поставщика:', error)
      return { isAvailable: false, reason: 'Ошибка проверки доступности' }
    }
  }

  /**
   * Форматированные данные поставщика для отображения
   */
  static formatContractorForDisplay(contractor: ContractorWithStats) {
    return {
      ...contractor,
      formattedCreatedDate: formatDate(contractor.created_at),
      formattedUpdatedDate: formatDate(contractor.updated_at),
      formattedTotalAmount: formatCurrency(contractor.stats.totalAmount),
      formattedPaidAmount: formatCurrency(contractor.stats.paidAmount),
      formattedPendingAmount: formatCurrency(contractor.stats.pendingAmount),
      formattedAvgAmount: formatCurrency(contractor.stats.avgInvoiceAmount),
    }
  }

}