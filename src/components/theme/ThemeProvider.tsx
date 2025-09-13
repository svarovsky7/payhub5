/**
 * Theme Provider Component
 * Applies the current theme to Ant Design ConfigProvider and manages theme loading
 */

import React, { useEffect } from 'react'
import { ConfigProvider } from 'antd'
import type { ThemeConfig } from 'antd'
import { useTheme } from '@/models/theme'

interface ThemeProviderProps {
  children: React.ReactNode
  locale?: any
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  locale 
}) => {
  console.log('[ThemeProvider] Component rendered')
  
  const {
    currentTheme,
    effectiveTheme,
    isLoading,
    error,
    generateAntdTheme,
    loadFromDatabase
  } = useTheme()

  // Load themes from database on mount
  useEffect(() => {
    const initializeThemes = async () => {
      try {
        console.log('[ThemeProvider] Initializing themes from database')
        await loadFromDatabase()
      } catch (error: any) {
        console.error('[ThemeProvider] Theme initialization error:', error)
        // Check if it's a missing table error
        if (error?.message?.includes('Таблица еще не создана')) {
          console.warn('[ThemeProvider] Themes table not created yet. Using default themes only.')
        }
        // Continue with default theme if database load fails
      }
    }

    initializeThemes()
  }, [loadFromDatabase])

  // Generate Ant Design theme configuration
  const antdTheme: ThemeConfig = React.useMemo(() => {
    console.log('[ThemeProvider] Generating Ant Design theme for:', effectiveTheme.name)
    return generateAntdTheme(effectiveTheme)
  }, [effectiveTheme, generateAntdTheme])

  // Apply CSS custom properties for theme values
  useEffect(() => {
    console.log('[ThemeProvider] Applying CSS custom properties for theme:', effectiveTheme.name)
    
    const root = document.documentElement
    const { colors, typography, layout } = effectiveTheme
    
    // Color custom properties
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-secondary', colors.secondary)
    root.style.setProperty('--color-success', colors.success)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-error', colors.error)
    root.style.setProperty('--color-info', colors.info)
    
    root.style.setProperty('--bg-primary', colors.backgroundPrimary)
    root.style.setProperty('--bg-secondary', colors.backgroundSecondary)
    root.style.setProperty('--bg-container', colors.backgroundContainer)
    
    root.style.setProperty('--text-primary', colors.textPrimary)
    root.style.setProperty('--text-secondary', colors.textSecondary)
    root.style.setProperty('--text-disabled', colors.textDisabled)
    
    root.style.setProperty('--border-light', colors.borderLight)
    root.style.setProperty('--border-default', colors.borderDefault)
    root.style.setProperty('--border-dark', colors.borderDark)
    
    // Typography custom properties
    root.style.setProperty('--font-family', typography.fontFamily)
    root.style.setProperty('--font-size', `${typography.fontSize}px`)
    root.style.setProperty('--line-height', typography.lineHeight.toString())
    
    root.style.setProperty('--font-weight-light', typography.fontWeight.light.toString())
    root.style.setProperty('--font-weight-normal', typography.fontWeight.normal.toString())
    root.style.setProperty('--font-weight-medium', typography.fontWeight.medium.toString())
    root.style.setProperty('--font-weight-semibold', typography.fontWeight.semibold.toString())
    root.style.setProperty('--font-weight-bold', typography.fontWeight.bold.toString())
    
    // Layout custom properties
    root.style.setProperty('--border-radius', `${layout.borderRadius}px`)
    root.style.setProperty('--border-radius-small', `${layout.borderRadiusSmall}px`)
    root.style.setProperty('--border-radius-large', `${layout.borderRadiusLarge}px`)
    
    root.style.setProperty('--spacing', `${layout.spacing}px`)
    root.style.setProperty('--spacing-xs', `${layout.spacing / 2}px`)
    root.style.setProperty('--spacing-sm', `${layout.spacing * 0.75}px`)
    root.style.setProperty('--spacing-lg', `${layout.spacing * 1.5}px`)
    root.style.setProperty('--spacing-xl', `${layout.spacing * 2}px`)
    
    root.style.setProperty('--shadow-small', layout.shadowSmall)
    root.style.setProperty('--shadow-medium', layout.shadowMedium)
    root.style.setProperty('--shadow-large', layout.shadowLarge)
    
    // Dark mode class
    if (effectiveTheme.darkMode) {
      root.classList.add('dark-mode')
      root.classList.remove('light-mode')
    } else {
      root.classList.add('light-mode')
      root.classList.remove('dark-mode')
    }
    
  }, [effectiveTheme])

  // Apply body styles
  useEffect(() => {
    console.log('[ThemeProvider] Applying body styles')
    
    const body = document.body
    body.style.fontFamily = effectiveTheme.typography.fontFamily
    body.style.fontSize = `${effectiveTheme.typography.fontSize}px`
    body.style.lineHeight = effectiveTheme.typography.lineHeight.toString()
    body.style.backgroundColor = effectiveTheme.colors.backgroundSecondary
    body.style.color = effectiveTheme.colors.textPrimary
    
    // Smooth transitions for theme changes
    body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    
  }, [effectiveTheme])

  if (isLoading) {
    // Show minimal loading state without breaking the app
    console.log('[ThemeProvider] Loading themes...')
  }

  if (error) {
    console.error('[ThemeProvider] Theme error:', error)
    // Continue rendering with default theme instead of breaking
  }

  return (
    <ConfigProvider 
      locale={locale}
      theme={antdTheme}
    >
      {children}
    </ConfigProvider>
  )
}