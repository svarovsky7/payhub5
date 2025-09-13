/**
 * CRUD operations for Material Responsible Persons (МОЛ)
 */

import { 
  type ApiResponse, 
  handleSupabaseError,
  supabase
} from '../supabase'

export interface MaterialResponsiblePerson {
  id: number
  full_name: string
  phone?: string
  position?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface MaterialResponsiblePersonInsert {
  full_name: string
  phone?: string
  position?: string
  email?: string
  is_active?: boolean
  created_by?: string
}

export interface MaterialResponsiblePersonUpdate {
  full_name?: string
  phone?: string
  position?: string
  email?: string
  is_active?: boolean
  updated_at?: string
}

export class MaterialResponsiblePersonCrudService {
  
  /**
   * Создать нового МОЛ
   */
  static async create(data: MaterialResponsiblePersonInsert): Promise<ApiResponse<MaterialResponsiblePerson>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.create] Начало создания МОЛ:', data)
      
      const insertData = {
        ...data,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('[MaterialResponsiblePersonCrudService.create] Отправка данных в Supabase:', insertData)
      
      const { data: result, error } = await supabase
        .from('material_responsible_persons')
        .insert([insertData])
        .select()
        .single()

      console.log('[MaterialResponsiblePersonCrudService.create] Ответ от Supabase:', { result, error })

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.create] Ошибка:', error)
        console.error('[MaterialResponsiblePersonCrudService.create] Детали ошибки:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      if (!result) {
        console.error('[MaterialResponsiblePersonCrudService.create] Нет результата от Supabase')
        throw new Error('Не удалось создать МОЛ - нет ответа от сервера')
      }

      console.log('[MaterialResponsiblePersonCrudService.create] МОЛ успешно создан:', result)
      return { data: result as MaterialResponsiblePerson, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.create] Ошибка создания МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить МОЛ по ID
   */
  static async getById(id: number): Promise<ApiResponse<MaterialResponsiblePerson>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.getById] Получение МОЛ по ID:', id)
      
      const { data, error } = await supabase
        .from('material_responsible_persons')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.getById] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.getById] МОЛ получен:', data)
      return { data: data as MaterialResponsiblePerson, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.getById] Ошибка получения МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить список всех МОЛ
   */
  static async getList(filters?: {
    is_active?: boolean
  }): Promise<ApiResponse<MaterialResponsiblePerson[]>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.getList] Получение списка МОЛ с фильтрами:', filters)
      
      let query = supabase
        .from('material_responsible_persons')
        .select('*')
        .order('full_name', { ascending: true })

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      const { data, error } = await query

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.getList] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.getList] Получено МОЛ:', data?.length || 0)
      return { data: data as MaterialResponsiblePerson[], error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.getList] Ошибка получения списка МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить МОЛ
   */
  static async update(
    id: number, 
    updates: MaterialResponsiblePersonUpdate
  ): Promise<ApiResponse<MaterialResponsiblePerson>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.update] Обновление МОЛ:', { id, updates })
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('material_responsible_persons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.update] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.update] МОЛ обновлен:', data)
      return { data: data as MaterialResponsiblePerson, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.update] Ошибка обновления МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Удалить МОЛ (полное удаление из базы данных)
   */
  static async delete(id: number): Promise<ApiResponse<null>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.delete] Удаление МОЛ:', id)
      
      // Полное удаление из базы данных
      const { error } = await supabase
        .from('material_responsible_persons')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.delete] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.delete] МОЛ удален')
      return { data: null, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.delete] Ошибка удаления МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Деактивировать МОЛ (мягкое удаление)
   */
  static async deactivate(id: number): Promise<ApiResponse<null>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.deactivate] Деактивация МОЛ:', id)
      
      // Мягкое удаление - просто деактивируем
      const { error } = await supabase
        .from('material_responsible_persons')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.deactivate] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.deactivate] МОЛ деактивирован')
      return { data: null, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.deactivate] Ошибка деактивации МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Активировать МОЛ
   */
  static async activate(id: number): Promise<ApiResponse<MaterialResponsiblePerson>> {
    try {
      console.log('[MaterialResponsiblePersonCrudService.activate] Активация МОЛ:', id)
      
      const { data, error } = await supabase
        .from('material_responsible_persons')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[MaterialResponsiblePersonCrudService.activate] Ошибка:', error)
        throw error
      }

      console.log('[MaterialResponsiblePersonCrudService.activate] МОЛ активирован:', data)
      return { data: data as MaterialResponsiblePerson, error: null }
    } catch (error) {
      console.error('[MaterialResponsiblePersonCrudService.activate] Ошибка активации МОЛ:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }
}