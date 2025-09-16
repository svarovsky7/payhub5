import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Отсутствуют переменные окружения для Supabase. Проверьте файл .env')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Типы для авторизации
export interface AuthUser {
  id: string
  email: string
  isAdmin?: boolean
  profile?: UserProfile
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  isAdmin?: boolean
  position?: string
  phone?: string
  avatarUrl?: string
  isActive: boolean
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Утилиты для работы с файлами
const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {throw error}
  return data
}

const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

const deleteFile = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {throw error}
  return data
}

// Утилиты для работе с RLS политиками
const setRLSContext = async (companyId: string) => {
  const { error } = await supabase.rpc('set_current_company', {
    company_id: companyId,
  })

  if (error && import.meta.env.DEV) {
    console.warn('Не удалось установить контекст компании:', error)
  }
}

// Типы для основных сущностей системы
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type Contractor = Database['public']['Tables']['contractors']['Row']
export type ContractorInsert = Database['public']['Tables']['contractors']['Insert']
export type ContractorUpdate = Database['public']['Tables']['contractors']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type WorkflowStage = Database['public']['Tables']['workflow_stages']['Row']
type WorkflowStageInsert = Database['public']['Tables']['workflow_stages']['Insert']
type WorkflowStageUpdate = Database['public']['Tables']['workflow_stages']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']


// Типы для ответов API
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Параметры для фильтрации и пагинации
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
  projectId?: string
  contractorId?: string
  userId?: string
  amount?: {
    from?: number
    to?: number
  }
}

// Утилиты для работы с ошибками
export const handleSupabaseError = (error: unknown, defaultMessage?: string): ApiResponse<any> => {
  let errorMessage = defaultMessage || 'Произошла неизвестная ошибка'
  
  if (error && typeof error === 'object') {
    // Check for PostgreSQL error code
    if ('code' in error) {
      const code = (error as { code: string }).code
      if (code === '42P01') {
        errorMessage = 'Таблица еще не создана в базе данных. Используется локальное хранилище.'
      }
    }
    
    if ('message' in error) {
      const message = (error as { message: string }).message
      
      // Специфичные ошибки Supabase
      if (message.includes('JWT')) {
        errorMessage = 'Сессия истекла. Необходимо войти в систему заново.'
      } else if (message.includes('Row Level Security')) {
        errorMessage = 'У вас нет прав доступа к этим данным.'
      } else if (message.includes('duplicate key value')) {
        errorMessage = 'Запись с такими данными уже существует.'
      } else if (message.includes('foreign key constraint')) {
        errorMessage = 'Невозможно выполнить операцию из-за связанных данных.'
      } else if (message.includes('violates not-null constraint')) {
        errorMessage = 'Не заполнены обязательные поля.'
      } else if (message.includes('violates check constraint')) {
        errorMessage = 'Данные не соответствуют требованиям системы.'
      } else if (message.includes('relation') && message.includes('does not exist')) {
        errorMessage = 'Таблица еще не создана в базе данных. Используется локальное хранилище.'
      } else if (!defaultMessage) {
        errorMessage = message
      }
    }
  }
  
  return { data: null, error: errorMessage }
}

// Утилиты для работы с реальным временем
const subscribeToTable = <T = any>(
  tableName: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: T
    old: T
  }) => void,
  filters?: { column: string; value: string }
) => {
  const channel = supabase
    .channel(`realtime:${tableName}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: tableName,
        ...(filters && { filter: `${filters.column}=eq.${filters.value}` })
      }, 
      callback
    )

  channel.subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

// Утилиты для экспорта данных
export const exportToExcel = async <T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) => {
  try {
    // Динамический импорт для уменьшения размера бандла
    const XLSX = await import('xlsx')
    
    // Подготавливаем данные для экспорта
    const exportData = columns 
      ? data.map(row => 
          columns.reduce((acc, col) => ({
            ...acc,
            [col.label]: row[col.key]
          }), {})
        )
      : data

    // Создаем рабочую книгу
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Данные')

    // Автоматически подстраиваем ширину колонок
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...exportData.map(row => String(row[key] || '').length)
      )
    }))
    ws['!cols'] = colWidths

    // Сохраняем файл
    XLSX.writeFile(wb, `${filename}.xlsx`)
  } catch (error) {
    console.error('Ошибка экспорта в Excel:', error)
    throw new Error('Не удалось экспортировать данные в Excel')
  }
}

// Утилиты для форматирования данных
export const formatCurrency = (amount: number, _currency = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

const formatDateShort = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}