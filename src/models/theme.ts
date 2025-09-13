/**
 * Theme management store using Zustand
 * Manages application theme settings, presets, and persistence
 */

import {create} from 'zustand'
import {devtools, persist} from 'zustand/middleware'
import {immer} from 'zustand/middleware/immer'
import type {ThemeConfig} from 'antd'
import {theme} from 'antd'

// Google Fonts list for font selection
export const GOOGLE_FONTS = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Source Sans Pro',
    'Nunito',
    'Poppins',
    'Raleway',
    'Ubuntu'
]

// System fonts list
export const SYSTEM_FONTS = [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Arial',
    'sans-serif'
]

// Color palettes for quick selection
export const COLOR_PALETTES = {
    blue: {
        primary: '#1677ff',
        secondary: '#69b1ff',
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f'
    },
    green: {
        primary: '#52c41a',
        secondary: '#95de64',
        success: '#389e0d',
        warning: '#fa8c16',
        error: '#f5222d'
    },
    purple: {
        primary: '#722ed1',
        secondary: '#b37feb',
        success: '#52c41a',
        warning: '#fa541c',
        error: '#f5222d'
    },
    orange: {
        primary: '#fa541c',
        secondary: '#ff7a45',
        success: '#389e0d',
        warning: '#d4b106',
        error: '#cf1322'
    },
    red: {
        primary: '#f5222d',
        secondary: '#ff4d4f',
        success: '#389e0d',
        warning: '#d46b08',
        error: '#a8071a'
    }
}

// Theme configuration interface
export interface CustomThemeConfig {
    // Color settings
    colors: {
        primary: string
        secondary: string
        success: string
        warning: string
        error: string
        info: string

        // Background colors
        backgroundPrimary: string
        backgroundSecondary: string
        backgroundContainer: string

        // Text colors
        textPrimary: string
        textSecondary: string
        textDisabled: string

        // Border colors
        borderLight: string
        borderDefault: string
        borderDark: string
    }

    // Typography settings
    typography: {
        fontFamily: string
        fontSize: number
        fontSizeScale: number
        lineHeight: number
        fontWeight: {
            light: number
            normal: number
            medium: number
            semibold: number
            bold: number
        }
    }

    // Layout settings
    layout: {
        borderRadius: number
        borderRadiusSmall: number
        borderRadiusLarge: number

        // Spacing scale (base unit in px)
        spacing: number

        // Shadow settings
        shadowSmall: string
        shadowMedium: string
        shadowLarge: string
    }

    // Dark mode settings
    darkMode: boolean

    // Theme metadata
    id: string
    name: string
    description?: string
    isPreset: boolean
    createdAt: Date
    updatedAt: Date
}

// Default light theme
export const DEFAULT_LIGHT_THEME: CustomThemeConfig = {
    colors: {
        primary: '#1677ff',
        secondary: '#69b1ff',
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        info: '#1677ff',

        backgroundPrimary: '#ffffff',
        backgroundSecondary: '#fafafa',
        backgroundContainer: '#ffffff',

        textPrimary: '#000000d9',
        textSecondary: '#00000073',
        textDisabled: '#00000040',

        borderLight: '#f0f0f0',
        borderDefault: '#d9d9d9',
        borderDark: '#434343'
    },

    typography: {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 14,
        fontSizeScale: 1.2,
        lineHeight: 1.5715,
        fontWeight: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        }
    },

    layout: {
        borderRadius: 6,
        borderRadiusSmall: 4,
        borderRadiusLarge: 8,
        spacing: 8,
        shadowSmall: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        shadowMedium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        shadowLarge: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    },

    darkMode: false,

    id: 'default-light',
    name: 'Светлая тема по умолчанию',
    description: 'Стандартная светлая тема PayHub',
    isPreset: true,
    createdAt: new Date(),
    updatedAt: new Date()
}

// Default dark theme
export const DEFAULT_DARK_THEME: CustomThemeConfig = {
    ...DEFAULT_LIGHT_THEME,
    colors: {
        ...DEFAULT_LIGHT_THEME.colors,
        backgroundPrimary: '#141414',
        backgroundSecondary: '#1f1f1f',
        backgroundContainer: '#262626',

        textPrimary: '#ffffffd9',
        textSecondary: '#ffffff73',
        textDisabled: '#ffffff40',

        borderLight: '#303030',
        borderDefault: '#434343',
        borderDark: '#d9d9d9'
    },

    darkMode: true,
    id: 'default-dark',
    name: 'Темная тема по умолчанию',
    description: 'Стандартная темная тема PayHub'
}

// Theme state interface
interface ThemeState {
    // Current active theme
    currentTheme: CustomThemeConfig

    // Available theme presets
    presets: CustomThemeConfig[]

    // User saved themes
    savedThemes: CustomThemeConfig[]

    // Preview mode for testing changes
    previewMode: boolean
    previewTheme: CustomThemeConfig | null

    // Loading states
    isLoading: boolean
    isSaving: boolean

    // Error handling
    error: string | null
}

// Theme actions interface
interface ThemeActions {
    // Theme application
    setCurrentTheme: (theme: CustomThemeConfig) => void
    applyTheme: (theme: CustomThemeConfig) => void

    // Theme management
    createTheme: (name: string, description?: string) => CustomThemeConfig
    updateTheme: (themeId: string, updates: Partial<CustomThemeConfig>) => void
    deleteTheme: (themeId: string) => void
    duplicateTheme: (themeId: string, newName: string) => CustomThemeConfig

    // Color management
    updateColors: (colors: Partial<CustomThemeConfig['colors']>) => void
    applyColorPalette: (palette: keyof typeof COLOR_PALETTES) => void

    // Typography management
    updateTypography: (typography: Partial<CustomThemeConfig['typography']>) => void
    setFontFamily: (fontFamily: string, loadGoogleFont?: boolean) => void

    // Layout management
    updateLayout: (layout: Partial<CustomThemeConfig['layout']>) => void

    // Dark mode toggle
    toggleDarkMode: () => void
    setDarkMode: (enabled: boolean) => void

    // Preview functionality
    startPreview: (theme: CustomThemeConfig) => void
    stopPreview: () => void
    applyPreview: () => void

    // Import/Export
    exportTheme: (themeId?: string) => string
    importTheme: (themeJson: string) => CustomThemeConfig

    // Preset management
    resetToDefault: () => void
    loadPresets: () => void

    // Persistence
    saveToDatabase: () => Promise<void>
    loadFromDatabase: () => Promise<void>

    // Utility
    generateAntdTheme: (customTheme?: CustomThemeConfig) => ThemeConfig
    setLoading: (loading: boolean) => void
    setError: (_error: string | null) => void
}

// Load Google Font dynamically
const loadGoogleFont = (fontFamily: string) => {
    console.log('[ThemeStore] Loading Google Font:', fontFamily)

    if (SYSTEM_FONTS.includes(fontFamily)) {
        return // Skip system fonts
    }

    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`
    link.rel = 'stylesheet'

    // Remove existing Google Font links for the same font
    const existing = document.head.querySelector(`link[href*="${fontFamily.replace(' ', '+')}"]`)
    if (existing) {
        document.head.removeChild(existing)
    }

    document.head.appendChild(link)
}

// Generate Ant Design theme configuration from custom theme
const generateAntdTheme = (customTheme: CustomThemeConfig): ThemeConfig => {
    const {colors, typography, layout, darkMode} = customTheme

    return {
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            // Colors
            colorPrimary: colors.primary,
            colorSuccess: colors.success,
            colorWarning: colors.warning,
            colorError: colors.error,
            colorInfo: colors.info,

            // Background
            colorBgContainer: colors.backgroundContainer,
            colorBgElevated: colors.backgroundPrimary,
            colorBgLayout: colors.backgroundSecondary,

            // Text
            colorText: colors.textPrimary,
            colorTextSecondary: colors.textSecondary,
            colorTextDisabled: colors.textDisabled,

            // Border
            colorBorder: colors.borderDefault,
            colorBorderSecondary: colors.borderLight,

            // Typography
            fontFamily: typography.fontFamily,
            fontSize: typography.fontSize,
            lineHeight: typography.lineHeight,

            // Layout
            borderRadius: layout.borderRadius,
            borderRadiusXS: layout.borderRadiusSmall,
            borderRadiusLG: layout.borderRadiusLarge,

            // Spacing
            padding: layout.spacing,
            paddingXS: layout.spacing / 2,
            paddingSM: layout.spacing * 0.75,
            paddingLG: layout.spacing * 1.5,
            paddingXL: layout.spacing * 2,

            // Shadows
            boxShadow: layout.shadowMedium,
            boxShadowSecondary: layout.shadowSmall
        },
        components: {
            Button: {
                borderRadius: layout.borderRadius,
                fontWeight: typography.fontWeight.medium
            },
            Input: {
                borderRadius: layout.borderRadius
            },
            Card: {
                borderRadius: layout.borderRadius
            },
            Modal: {
                borderRadius: layout.borderRadiusLarge
            },
            Table: {
                borderRadius: layout.borderRadius
            }
        }
    }
}

// Create the theme store
export const useThemeStore = create<ThemeState & ThemeActions>()(devtools(
        persist(
            immer((set, get) => ({
                // Initial state
                currentTheme: DEFAULT_LIGHT_THEME,
                presets: [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME],
                savedThemes: [],
                previewMode: false,
                previewTheme: null,
                isLoading: false,
                isSaving: false,
                _error: null, // Theme application
                setCurrentTheme: (theme) => {
                    console.log('[ThemeStore] Setting current theme:', theme.name)
                    set((state) => {
                        state.currentTheme = {...theme, updatedAt: new Date()}
                    })

                    // Load Google Font if needed
                    if (theme.typography.fontFamily && !SYSTEM_FONTS.includes(theme.typography.fontFamily)) {
                        loadGoogleFont(theme.typography.fontFamily)
                    }
                },

                applyTheme: (theme) => {
                    console.log('[ThemeStore] Applying theme:', theme.name)
                    get().setCurrentTheme(theme)

                    // If we have a preview running, stop it
                    if (get().previewMode) {
                        get().stopPreview()
                    }
                },

                // Theme management
                createTheme: (name, description) => {
                    console.log('[ThemeStore] Creating new theme:', name)
                    const newTheme: CustomThemeConfig = {
                        ...get().currentTheme,
                        id: `custom-${Date.now()}`,
                        name,
                        description,
                        isPreset: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }

                    set((state) => {
                        state.savedThemes.push(newTheme)
                    })

                    return newTheme
                },

                updateTheme: (themeId, updates) => {
                    console.log('[ThemeStore] Updating theme:', themeId)
                    set((state) => {
                        const theme = state.savedThemes.find(t => t.id === themeId)
                        if (theme) {
                            Object.assign(theme, updates, {updatedAt: new Date()})
                        }

                        // If updating current theme
                        if (state.currentTheme.id === themeId) {
                            Object.assign(state.currentTheme, updates, {updatedAt: new Date()})
                        }
                    })
                },

                deleteTheme: (themeId) => {
                    console.log('[ThemeStore] Deleting theme:', themeId)
                    set((state) => {
                        state.savedThemes = state.savedThemes.filter(t => t.id !== themeId)

                        // If deleting current theme, switch to default
                        if (state.currentTheme.id === themeId) {
                            state.currentTheme = DEFAULT_LIGHT_THEME
                        }
                    })
                },

                duplicateTheme: (themeId, newName) => {
                    console.log('[ThemeStore] Duplicating theme:', themeId, 'as', newName)
                    const originalTheme = [...get().savedThemes, ...get().presets].find(t => t.id === themeId)

                    if (!originalTheme) {
                        console.error('[ThemeStore] Theme not found for duplication:', themeId)
                        throw new Error('Тема не найдена')
                    }

                    const duplicatedTheme: CustomThemeConfig = {
                        ...originalTheme,
                        id: `custom-${Date.now()}`,
                        name: newName,
                        description: `Копия темы "${originalTheme.name}"`,
                        isPreset: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }

                    set((state) => {
                        state.savedThemes.push(duplicatedTheme)
                    })

                    return duplicatedTheme
                },

                // Color management
                updateColors: (colors) => {
                    console.log('[ThemeStore] Updating colors:', colors)
                    set((state) => {
                        Object.assign(state.currentTheme.colors, colors)
                        state.currentTheme.updatedAt = new Date()
                    })
                },

                applyColorPalette: (palette) => {
                    console.log('[ThemeStore] Applying color palette:', palette)
                    const paletteColors = COLOR_PALETTES[palette]
                    get().updateColors(paletteColors)
                },

                // Typography management
                updateTypography: (typography) => {
                    console.log('[ThemeStore] Updating typography:', typography)
                    set((state) => {
                        Object.assign(state.currentTheme.typography, typography)
                        state.currentTheme.updatedAt = new Date()
                    })
                },

                setFontFamily: (fontFamily, loadGoogleFont = true) => {
                    console.log('[ThemeStore] Setting font family:', fontFamily)
                    get().updateTypography({fontFamily})

                    if (loadGoogleFont && !SYSTEM_FONTS.includes(fontFamily)) {
                        loadGoogleFont(fontFamily)
                    }
                },

                // Layout management
                updateLayout: (layout) => {
                    console.log('[ThemeStore] Updating layout:', layout)
                    set((state) => {
                        Object.assign(state.currentTheme.layout, layout)
                        state.currentTheme.updatedAt = new Date()
                    })
                },

                // Dark mode
                toggleDarkMode: () => {
                    console.log('[ThemeStore] Toggling dark mode')
                    const isDark = get().currentTheme.darkMode
                    get().setDarkMode(!isDark)
                },

                setDarkMode: (enabled) => {
                    console.log('[ThemeStore] Setting dark mode:', enabled)
                    const baseTheme = enabled ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME

                    set((state) => {
                        // Preserve current customizations but switch color scheme
                        state.currentTheme = {
                            ...state.currentTheme,
                            colors: baseTheme.colors,
                            darkMode: enabled,
                            updatedAt: new Date()
                        }
                    })
                },

                // Preview functionality
                startPreview: (theme) => {
                    console.log('[ThemeStore] Starting preview mode with theme:', theme.name)
                    set((state) => {
                        state.previewMode = true
                        state.previewTheme = {...state.currentTheme} // Save current as backup
                        state.currentTheme = theme
                    })
                },

                stopPreview: () => {
                    console.log('[ThemeStore] Stopping preview mode')
                    const {previewTheme} = get()

                    set((state) => {
                        state.previewMode = false
                        if (state.previewTheme) {
                            state.currentTheme = state.previewTheme
                            state.previewTheme = null
                        }
                    })
                },

                applyPreview: () => {
                    console.log('[ThemeStore] Applying preview theme')
                    set((state) => {
                        state.previewMode = false
                        state.previewTheme = null
                    })
                },

                // Import/Export
                exportTheme: (themeId) => {
                    const theme = themeId
                        ? [...get().savedThemes, ...get().presets].find(t => t.id === themeId)
                        : get().currentTheme

                    if (!theme) {
                        throw new Error('Тема не найдена')
                    }

                    console.log('[ThemeStore] Exporting theme:', theme.name)
                    return JSON.stringify(theme, null, 2)
                },

                importTheme: (themeJson) => {
                    console.log('[ThemeStore] Importing theme from JSON')
                    try {
                        const theme: CustomThemeConfig = JSON.parse(themeJson)

                        // Validate theme structure
                        if (!theme.colors || !theme.typography || !theme.layout) {
                            throw new Error('Неверный формат темы')
                        }

                        // Assign new ID and mark as non-preset
                        theme.id = `imported-${Date.now()}`
                        theme.isPreset = false
                        theme.createdAt = new Date()
                        theme.updatedAt = new Date()

                        set((state) => {
                            state.savedThemes.push(theme)
                        })

                        return theme
                    } catch (error) {
                        console.error('[ThemeStore] Import error:', error)
                        throw new Error('Ошибка импорта темы')
                    }
                },

                // Preset management
                resetToDefault: () => {
                    console.log('[ThemeStore] Resetting to default theme')
                    get().applyTheme(DEFAULT_LIGHT_THEME)
                },

                loadPresets: () => {
                    console.log('[ThemeStore] Loading theme presets')
                    set((state) => {
                        state.presets = [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME]
                    })
                },

                // Persistence
                saveToDatabase: async () => {
                    console.log('[ThemeStore] Saving theme to database')
                    set((state) => {
                        state.isSaving = true
                    })

                    try {
                        // Import here to avoid circular dependencies
                        const {saveThemeConfigQuery} = await import('../services/themes/queries')

                        const {currentTheme} = get()
                        const result = await saveThemeConfigQuery(
                            currentTheme.name,
                            currentTheme,
                            currentTheme.description
                        )

                        if (result.error) {
                            throw new Error(result.error)
                        }

                        console.log('[ThemeStore] Theme saved to database successfully')
                    } catch (error) {
                        console.error('[ThemeStore] Database save error:', error)
                        set((state) => {
                            state.error = 'Ошибка сохранения в базу данных'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isSaving = false
                        })
                    }
                },

                loadFromDatabase: async () => {
                    console.log('[ThemeStore] Loading theme from database')
                    set((state) => {
                        state.isLoading = true
                    })

                    try {
                        // Import here to avoid circular dependencies
                        const {getThemesQuery} = await import('../services/themes/queries')

                        const result = await getThemesQuery()

                        if (result.error) {
                            throw new Error(result.error)
                        }

                        // Load saved themes into store
                        if (result.data && result.data.length > 0) {
                            set((state) => {
                                state.savedThemes = result.data ?? []
                            })
                        }

                        console.log('[ThemeStore] Theme loaded from database successfully')
                    } catch (error) {
                        console.error('[ThemeStore] Database load error:', error)
                        set((state) => {
                            state.error = 'Ошибка загрузки из базы данных'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                // Utility
                generateAntdTheme: (customTheme) => {
                    const theme = customTheme ?? get().currentTheme
                    return generateAntdTheme(theme)
                },

                setLoading: (loading) => {
                    set((state) => {
                        state.isLoading = loading
                    })
                },

                setError: (_error) => {
                    set((state) => {
                        state.error = error
                    })
                }
            })),
            {
                name: 'payhub-theme',
                partialize: (state) => ({
                    currentTheme: state.currentTheme,
                    savedThemes: state.savedThemes,
                }),
            }
        ),
        {
            name: 'theme-store',
        }
    )
)

// Hook for theme consumption
export const useTheme = () => {
    const state = useThemeStore()

    return {
        ...state,
        // Helper to get effective theme (current or preview)
        effectiveTheme: state.previewMode && state.previewTheme ? state.currentTheme : state.currentTheme,

        // Helper to get all themes (presets + saved)
        allThemes: [...state.presets, ...state.savedThemes],
    }
}