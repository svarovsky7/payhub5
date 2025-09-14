/**
 * Theme CRUD operations
 * Direct Supabase API calls for theme management
 */

import { handleSupabaseError, supabase } from '../supabase'
import type { CustomThemeConfig } from '@/models/theme'

// Database table interfaces
export interface ThemeRecord {
  id: string
  name: string
  description?: string
  config: CustomThemeConfig
  is_default: boolean
  is_active: boolean
  is_global?: boolean
  user_id?: string
  shared_with_roles?: number[]
  created_at: string
  updated_at: string
}

export interface CreateThemeData {
  name: string
  description?: string
  config: CustomThemeConfig
  is_default?: boolean
  is_active?: boolean
  is_global?: boolean
  user_id?: string
  shared_with_roles?: number[]
}

export interface UpdateThemeData {
  name?: string
  description?: string
  config?: CustomThemeConfig
  is_default?: boolean
  is_active?: boolean
}

/**
 * Create a new theme record
 */
export const createTheme = async (data: CreateThemeData) => {
  console.log('[ThemeCRUD] Creating theme:', data.name)
  
  try {
    const { data: result, error } = await supabase
      .from('themes')
      .insert({
        name: data.name,
        description: data.description,
        config: data.config,
        is_default: data.is_default || false,
        is_active: data.is_active ?? true,
        is_global: data.is_global || false,
        user_id: data.user_id,
        shared_with_roles: data.shared_with_roles
      })
      .select('*')
      .single()

    if (error) {
      console.error('[ThemeCRUD] Create error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Theme created successfully:', result.id)
    return { data: result, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Create theme error:', error)
    return handleSupabaseError(error, 'Ошибка создания темы')
  }
}

/**
 * Get theme by ID
 */
export const getThemeById = async (id: string) => {
  console.log('[ThemeCRUD] Getting theme by ID:', id)
  
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('[ThemeCRUD] Get by ID error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Theme retrieved successfully:', data.id)
    return { data, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Get theme by ID error:', error)
    return handleSupabaseError(error, 'Ошибка получения темы')
  }
}

/**
 * Get all global themes and user themes
 * Note: company_id removed, using is_global instead
 */
export const getThemesByCompany = async (userId?: string) => {
  console.log('[ThemeCRUD] Getting global themes and user themes for:', userId)
  
  try {
    let query = supabase
      .from('themes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.or(`is_global.eq.true,user_id.eq.${userId}`)
    } else {
      query = query.eq('is_global', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ThemeCRUD] Get by company error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Themes retrieved successfully:', data?.length || 0, 'themes')
    return { data: data || [], error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Get themes by company error:', error)
    return handleSupabaseError(error, 'Ошибка получения тем')
  }
}

/**
 * Get themes for a specific user
 */
export const getThemesByUser = async (userId: string, companyId?: string) => {
  console.log('[ThemeCRUD] Getting themes for user:', userId)
  
  try {
    let query = supabase
      .from('themes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // User can see their themes and global themes
    query = query.or(`user_id.eq.${userId},is_global.eq.true`)

    const { data, error } = await query

    if (error) {
      console.error('[ThemeCRUD] Get by user error:', error)
      throw error
    }

    console.log('[ThemeCRUD] User themes retrieved successfully:', data?.length || 0, 'themes')
    return { data: data || [], error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Get themes by user error:', error)
    return handleSupabaseError(error, 'Ошибка получения пользовательских тем')
  }
}

/**
 * Update theme
 */
export const updateTheme = async (id: string, data: UpdateThemeData) => {
  console.log('[ThemeCRUD] Updating theme:', id)
  
  try {
    const { data: result, error } = await supabase
      .from('themes')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[ThemeCRUD] Update error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Theme updated successfully:', result.id)
    return { data: result, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Update theme error:', error)
    return handleSupabaseError(error, 'Ошибка обновления темы')
  }
}

/**
 * Delete theme (soft delete by setting is_active = false)
 */
export const deleteTheme = async (id: string) => {
  console.log('[ThemeCRUD] Deleting theme:', id)
  
  try {
    const { data, error } = await supabase
      .from('themes')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[ThemeCRUD] Delete error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Theme deleted successfully:', id)
    return { data, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Delete theme error:', error)
    return handleSupabaseError(error, 'Ошибка удаления темы')
  }
}

/**
 * Set default theme for user or globally
 */
export const setDefaultTheme = async (themeId: string, userId?: string) => {
  console.log('[ThemeCRUD] Setting default theme:', themeId, 'for user:', userId || 'global')
  
  try {
    // Get the theme to check if it's global or user-specific
    const { data: theme } = await supabase
      .from('themes')
      .select('is_global, user_id')
      .eq('id', themeId)
      .single()

    if (!theme) {
      throw new Error('Theme not found')
    }

    // Unset current defaults based on scope
    if (theme.is_global) {
      // Unset other global defaults
      await supabase
        .from('themes')
        .update({ is_default: false })
        .eq('is_global', true)
        .eq('is_default', true)
    } else if (userId) {
      // Unset other user defaults
      await supabase
        .from('themes')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
    }

    // Then set new default
    const { data, error } = await supabase
      .from('themes')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', themeId)
      .select('*')
      .single()

    if (error) {
      console.error('[ThemeCRUD] Set default error:', error)
      throw error
    }

    console.log('[ThemeCRUD] Default theme set successfully:', themeId)
    return { data, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Set default theme error:', error)
    return handleSupabaseError(error, 'Ошибка установки темы по умолчанию')
  }
}

/**
 * Get default theme for user or global default
 */
export const getDefaultTheme = async (userId?: string) => {
  console.log('[ThemeCRUD] Getting default theme for user:', userId || 'global')
  
  try {
    // First try to get user-specific default theme
    if (userId) {
      const { data: userTheme, error: userError } = await supabase
        .from('themes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (userTheme) {
        console.log('[ThemeCRUD] User default theme retrieved:', userTheme.id)
        return { data: userTheme, error: null }
      }

      // Ignore 'no rows' error and fall through to global default
      if (userError && userError.code !== 'PGRST116') {
        console.error('[ThemeCRUD] Get user default error:', userError)
        throw userError
      }
    }

    // If no user-specific default, get global default
    const { data: globalTheme, error: globalError } = await supabase
      .from('themes')
      .select('*')
      .eq('is_global', true)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (globalError && globalError.code !== 'PGRST116') {
      console.error('[ThemeCRUD] Get global default error:', globalError)
      throw globalError
    }

    if (!globalTheme) {
      console.log('[ThemeCRUD] No default theme found')
      return { data: null, error: null }
    }

    console.log('[ThemeCRUD] Global default theme retrieved:', globalTheme.id)
    return { data: globalTheme, error: null }
  } catch (error) {
    console.error('[ThemeCRUD] Get default theme error:', error)
    return handleSupabaseError(error, 'Ошибка получения темы по умолчанию')
  }
}

/**
 * Clone theme with new name
 */
export const cloneTheme = async (sourceId: string, newName: string, userId?: string) => {
  console.log('[ThemeCRUD] Cloning theme:', sourceId, 'as', newName)
  
  try {
    // First get the source theme
    const { data: sourceTheme, error: getError } = await supabase
      .from('themes')
      .select('*')
      .eq('id', sourceId)
      .single()

    if (getError) {
      console.error('[ThemeCRUD] Get source theme error:', getError)
      throw getError
    }

    // Create clone
    const cloneData: CreateThemeData = {
      name: newName,
      description: `Копия темы "${sourceTheme.name}"`,
      config: sourceTheme.config,
      is_default: false,
      is_active: true,
      is_global: false, // Clones are always user-specific
      user_id: userId
    }

    return await createTheme(cloneData)
  } catch (error) {
    console.error('[ThemeCRUD] Clone theme error:', error)
    return handleSupabaseError(error, 'Ошибка копирования темы')
  }
}