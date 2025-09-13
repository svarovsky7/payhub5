/**
 * Theme Query Layer
 * Error handling and data transformation for theme operations
 */

import {
  cloneTheme,
  createTheme,
  type CreateThemeData,
  deleteTheme,
  getDefaultTheme,
  getThemeById,
  getThemesByCompany,
  getThemesByUser,
  setDefaultTheme,
  type ThemeRecord,
  updateTheme,
  type UpdateThemeData
} from './crud'
import type { CustomThemeConfig } from '@/models/theme'

// Transform database record to theme config
const transformThemeRecord = (record: ThemeRecord): CustomThemeConfig => {
  return {
    ...record.config,
    id: record.id,
    name: record.name,
    description: record.description,
    isPreset: false, // Database themes are not presets
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  }
}

/**
 * Create new theme with error handling
 */
export const createThemeQuery = async (data: CreateThemeData) => {
  console.log('[ThemeQueries] Creating theme:', data.name)
  
  try {
    const result = await createTheme(data)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      throw new Error('Не удалось создать тему')
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Theme created successfully:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Create theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка создания темы'
    }
  }
}

/**
 * Update existing theme
 */
export const updateThemeQuery = async (id: string, data: UpdateThemeData) => {
  console.log('[ThemeQueries] Updating theme:', id)
  
  try {
    const result = await updateTheme(id, data)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      throw new Error('Не удалось обновить тему')
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Theme updated successfully:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Update theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка обновления темы'
    }
  }
}

/**
 * Delete theme
 */
export const deleteThemeQuery = async (id: string) => {
  console.log('[ThemeQueries] Deleting theme:', id)
  
  try {
    const result = await deleteTheme(id)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    console.log('[ThemeQueries] Theme deleted successfully:', id)
    
    return {
      data: { id },
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Delete theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка удаления темы'
    }
  }
}

/**
 * Get theme by ID
 */
export const getThemeByIdQuery = async (id: string) => {
  console.log('[ThemeQueries] Getting theme by ID:', id)
  
  try {
    const result = await getThemeById(id)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      return {
        data: null,
        error: null
      }
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Theme retrieved successfully:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Get theme by ID error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка получения темы'
    }
  }
}

/**
 * Get all themes for company/user
 */
export const getThemesQuery = async (companyId?: string, userId?: string) => {
  console.log('[ThemeQueries] Getting themes for company:', companyId, 'user:', userId)
  
  try {
    const result = userId 
      ? await getThemesByUser(userId, companyId)
      : await getThemesByCompany(companyId)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    const transformedThemes = result.data?.map(transformThemeRecord) || []
    console.log('[ThemeQueries] Themes retrieved successfully:', transformedThemes.length, 'themes')
    
    return {
      data: transformedThemes,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Get themes error:', error)
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Ошибка получения тем'
    }
  }
}

/**
 * Get default theme for company
 */
export const getDefaultThemeQuery = async (companyId?: string) => {
  console.log('[ThemeQueries] Getting default theme for company:', companyId)
  
  try {
    const result = await getDefaultTheme(companyId)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      console.log('[ThemeQueries] No default theme found')
      return {
        data: null,
        error: null
      }
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Default theme retrieved:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Get default theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка получения темы по умолчанию'
    }
  }
}

/**
 * Set default theme for company
 */
export const setDefaultThemeQuery = async (themeId: string, companyId: string) => {
  console.log('[ThemeQueries] Setting default theme:', themeId, 'for company:', companyId)
  
  try {
    const result = await setDefaultTheme(themeId, companyId)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      throw new Error('Не удалось установить тему по умолчанию')
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Default theme set successfully:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Set default theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка установки темы по умолчанию'
    }
  }
}

/**
 * Clone existing theme
 */
export const cloneThemeQuery = async (
  sourceId: string, 
  newName: string, 
  userId?: string, 
  companyId?: string
) => {
  console.log('[ThemeQueries] Cloning theme:', sourceId, 'as', newName)
  
  try {
    const result = await cloneTheme(sourceId, newName, userId, companyId)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    if (!result.data) {
      throw new Error('Не удалось скопировать тему')
    }
    
    const transformedTheme = transformThemeRecord(result.data)
    console.log('[ThemeQueries] Theme cloned successfully:', transformedTheme.id)
    
    return {
      data: transformedTheme,
      error: null
    }
  } catch (error) {
    console.error('[ThemeQueries] Clone theme error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Ошибка копирования темы'
    }
  }
}

/**
 * Save current theme configuration to database
 */
export const saveThemeConfigQuery = async (
  name: string,
  config: CustomThemeConfig,
  description?: string,
  userId?: string,
  companyId?: string
) => {
  console.log('[ThemeQueries] Saving theme config:', name)
  
  const themeData: CreateThemeData = {
    name,
    description,
    config,
    is_default: false,
    is_active: true,
    user_id: userId,
    company_id: companyId
  }
  
  return await createThemeQuery(themeData)
}

/**
 * Update theme configuration in database
 */
export const updateThemeConfigQuery = async (
  id: string,
  config: CustomThemeConfig,
  name?: string,
  description?: string
) => {
  console.log('[ThemeQueries] Updating theme config:', id)
  
  const updateData: UpdateThemeData = {
    config,
    ...(name && { name }),
    ...(description !== undefined && { description })
  }
  
  return await updateThemeQuery(id, updateData)
}