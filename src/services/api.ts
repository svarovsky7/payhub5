/**
 * API сервис для PayHub
 * Централизованное место для всех API запросов
 */

import { supabase } from './supabase'

// Базовые типы для API ответов
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  companyId?: string
  projectId?: string
}

// Базовый класс для API сервисов
export abstract class BaseApiService<T> {
  protected abstract tableName: string

  protected buildQuery(filters?: FilterParams, pagination?: PaginationParams) {
    let query = supabase.from(this.tableName).select('*', { count: 'exact' })

    // Применяем фильтры
    if (filters) {
      if (filters.search) {
        // Поиск будет зависеть от конкретной таблицы
        query = this.applySearch(query, filters.search)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
    }

    // Применяем пагинацию и сортировку
    if (pagination) {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)
    }

    return query
  }

  protected abstract applySearch(query: any, search: string): any

  async getAll(filters?: FilterParams, pagination?: PaginationParams): Promise<ApiResponse<T[]>> {
    try {
      const { data, error, count } = await this.buildQuery(filters, pagination)

      if (error) {throw error}

      return { data: data as T[], error: null, count: count || 0 }
    } catch (error) {
      console.error(`Ошибка получения данных из ${this.tableName}:`, error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }

  async getById(id: string): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {throw error}

      return { data: data as T, error: null }
    } catch (error) {
      console.error(`Ошибка получения записи из ${this.tableName}:`, error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }

  async create(item: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([item])
        .select()
        .single()

      if (error) {throw error}

      return { data: data as T, error: null }
    } catch (error) {
      console.error(`Ошибка создания записи в ${this.tableName}:`, error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }

  async update(id: string, updates: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as T, error: null }
    } catch (error) {
      console.error(`Ошибка обновления записи в ${this.tableName}:`, error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {throw error}

      return { data: null, error: null }
    } catch (error) {
      console.error(`Ошибка удаления записи из ${this.tableName}:`, error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    }
  }
}

// Обработка ошибок API
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    // Специфичные ошибки Supabase
    if (error.message.includes('JWT')) {
      return 'Сессия истекла. Необходимо войти в систему заново.'
    }
    if (error.message.includes('Row Level Security')) {
      return 'У вас нет прав доступа к этим данным.'
    }
    if (error.message.includes('duplicate key value')) {
      return 'Запись с такими данными уже существует.'
    }
    if (error.message.includes('foreign key constraint')) {
      return 'Невозможно выполнить операцию из-за связанных данных.'
    }
    
    return error.message
  }
  
  return 'Произошла неизвестная ошибка'
}