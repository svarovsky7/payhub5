import React, { useContext, useEffect} from 'react'
import {create} from 'zustand'
import {devtools, persist} from 'zustand/middleware'
import {immer} from 'zustand/middleware/immer'
import {supabase} from '../services/supabase'
import type {AuthUser, UserProfile} from '../services/supabase'

// Интерфейс состояния авторизации
interface AuthState {
    user: AuthUser | null
    profile: UserProfile | null
    isAuthenticated: boolean
    isLoading: boolean
    isInitialized: boolean
    error: string | null
    testRole?: string // Тестовая роль для разработки
}

// Интерфейс действий авторизации
interface AuthActions {
    setUser: (user: AuthUser | null) => void
    setProfile: (profile: UserProfile | null) => void
    setLoading: (isLoading: boolean) => void
    setError: (error: string | null) => void
    setInitialized: (isInitialized: boolean) => void
    setTestRole: (role: string) => Promise<any> // Установка тестовой роли
    signIn: (email: string, password: string) => Promise<void>
    signUp: (data: { email: string; password: string; fullName: string; projectIds?: number[] }) => Promise<void>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<void>
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>
    loadUserProfile: (userId: string) => Promise<void>
    reset: () => void
    getEffectiveRole: () => string // Получить эффективную роль (тестовую или реальную)
}

// Zustand store для авторизации
export const useAuthStore = create<AuthState & AuthActions>()(devtools(
        persist(
            immer((set, get) => ({
                // Начальное состояние
                user: null,
                profile: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: false,
                error: null,
                testRole: 'user', // По умолчанию обычный пользователь

                // Действия
                setUser: (user) => set((state) => {
                    state.user = user
                    state.isAuthenticated = !!user
                }),

                setProfile: (profile) => set((state) => {
                    state.profile = profile
                }),

                setLoading: (isLoading) => set((state) => {
                    state.isLoading = isLoading
                }),

                setError: (error) => set((state) => {
                    state.error = error
                }),

                setInitialized: (isInitialized) => set((state) => {
                    state.isInitialized = isInitialized
                }),

                setTestRole: async (role) => {
                    console.log('[Авторизация] Установка роли:', role)

                    const currentUser = get().user
                    const currentProfile = get().profile

                    if (!currentUser || !currentProfile) {
                        console.error('[Авторизация] Нет авторизованного пользователя для смены роли')
                        return
                    }

                    try {
                        // Получаем информацию о роли по коду
                        const {data: roleData, error: roleError} = await supabase
                            .from('roles')
                            .select('*')
                            .eq('code', role)
                            .single()

                        if (roleError ?? !roleData) {
                            console.error('[Авторизация] Ошибка получения роли:', roleError)
                            return
                        }

                        console.log('[Авторизация] Найдена роль:', roleData)

                        // Обновляем role_id пользователя в базе данных
                        const {data: updatedUser, error: updateError} = await supabase
                            .from('users')
                            .update({
                                role_id: roleData.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', currentUser.id)
                            .select(`
                                *,
                                roles!role_id(
                                  id,
                                  code,
                                  name,
                                  description,
                                  is_active,
                                  view_own_project_only
                                )
                            `)
                            .single()

                        if (updateError) {
                            console.error('[Авторизация] Ошибка обновления роли пользователя:', updateError)
                            return
                        }

                        console.log('[Авторизация] Роль пользователя обновлена:', updatedUser)

                        // Обновляем профиль в состоянии
                        set((state) => {
                            state.testRole = role
                            if (state.profile && updatedUser) {
                                state.profile = {
                                    ...state.profile,
                                    role_id: updatedUser.role_id,
                                    roles: updatedUser.roles
                                }
                            }
                        })

                        console.log('[Авторизация] Профиль обновлен в состоянии')

                        // Возвращаем успешный результат
                        return updatedUser

                    } catch (error) {
                        console.error('[Авторизация] Ошибка установки роли:', error)
                    }
                },

                signIn: async (email, password) => {
                    set((state) => {
                        state.isLoading = true
                        state.error = null
                    })

                    try {
                        const {data, error} = await supabase.auth.signInWithPassword({
                            email,
                            password,
                        })

                        if (error) {
                            throw error
                        }

                        if (data.user && data.session) {
                            const authUser: AuthUser = {
                                id: data.user.id,
                                email: data.user.email,
                            }
                            get().setUser(authUser)
                            await get().loadUserProfile(data.user.id)
                        }

                        // Пользователь будет установлен через onAuthStateChange
                    } catch (error) {
                        set((state) => {
                            state.error = error instanceof Error ? error.message : 'Ошибка входа в систему'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                signUp: async ({email, password, fullName, projectIds}) => {
                    set((state) => {
                        state.isLoading = true
                        state.error = null
                    })

                    try {
                        console.log('[Auth] Starting registration for:', email)

                        // Регистрируем пользователя в Supabase Auth
                        const {data: authData, error: authError} = await supabase.auth.signUp({
                            email,
                            password,
                            options: {
                                data: {
                                    full_name: fullName,
                                },
                                emailRedirectTo: `${window.location.origin}/login`
                            }
                        })

                        if (authError) {
                            throw authError
                        }

                        // После создания пользователя через Auth, обновляем профиль в таблице users
                        if (authData.user) {
                            console.log('[Auth] User created in Auth, updating profile...')

                            // Получаем ID роли 'user' из таблицы roles
                            const {data: userRole, error: roleError} = await supabase
                                .from('roles')
                                .select('id')
                                .eq('code', 'user')
                                .single()

                            if (roleError) {
                                console.error('[Auth] Error getting user role:', roleError)
                                // Используем fallback значение если не нашли роль
                            }

                            const roleId = userRole?.id || 1 // По умолчанию ID роли user = 1

                            // Разбиваем ФИО на части
                            const nameParts = fullName.trim().split(' ')
                            const lastName = nameParts[0] || ''
                            const firstName = nameParts[1] || ''
                            const middleName = nameParts[2] || ''

                            // Проверяем, создана ли запись триггером
                            console.log('[Auth] Checking if user record was created by trigger...')
                            const {data: existingUser, error: checkError} = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', authData.user.id)
                                .single()

                            if (checkError) {
                                console.log('[Auth] User record not found, creating new record...')
                                console.log('[Auth] Check error:', checkError)

                                // Создаем запись пользователя в таблице users
                                const {data: newUser, error: insertError} = await supabase
                                    .from('users')
                                    .insert({
                                        id: authData.user.id,
                                        email: email,
                                        full_name: fullName, // Используем full_name вместо отдельных полей
                                        role_id: roleId,
                                        project_ids: projectIds ?? [],
                                        is_active: true,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    })
                                    .select()
                                    .single()

                                if (insertError) {
                                    console.error('[Auth] Error creating user profile:', insertError)
                                    console.error('[Auth] Insert error details:', {
                                        code: insertError.code,
                                        message: insertError.message,
                                        details: insertError.details,
                                        hint: insertError.hint
                                    })
                                } else {
                                    console.log('[Auth] User profile created successfully:', newUser)
                                }
                            } else {
                                console.log('[Auth] User record already exists (created by trigger), updating...')
                                console.log('[Auth] Existing user:', existingUser)

                                // Обновляем существующую запись
                                const {data: updatedUser, error: updateError} = await supabase
                                    .from('users')
                                    .update({
                                        full_name: fullName,
                                        role_id: roleId,
                                        project_ids: projectIds ?? [],
                                        is_active: true,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', authData.user.id)
                                    .select()
                                    .single()

                                if (updateError) {
                                    console.error('[Auth] Error updating existing user profile:', updateError)
                                    console.error('[Auth] Update error details:', {
                                        code: updateError.code,
                                        message: updateError.message,
                                        details: updateError.details,
                                        hint: updateError.hint
                                    })
                                } else {
                                    console.log('[Auth] User profile updated successfully:', updatedUser)
                                }
                            }
                        }


                        // После успешной регистрации автоматически входим в систему
                        // Это работает только если email подтверждение отключено
                        if (authData.user) {
                            // Если сессия уже создана при регистрации
                            if (authData.session) {
                                const authUser: AuthUser = {
                                    id: authData.user.id,
                                    email: authData.user.email,
                                }
                                get().setUser(authUser)
                                await get().loadUserProfile(authData.user.id)
                            }
                            // Если сессии нет, пробуем войти автоматически
                            else {
                                const {data: signInData, error: signInError} = await supabase.auth.signInWithPassword({
                                    email,
                                    password
                                })

                                if (signInError) {
                                    // Не прерываем процесс, регистрация прошла успешно
                                } else if (signInData.session) {
                                    // Устанавливаем пользователя и профиль
                                    const authUser: AuthUser = {
                                        id: signInData.user.id,
                                        email: signInData.user.email,
                                    }
                                    get().setUser(authUser)
                                    await get().loadUserProfile(signInData.user.id)
                                }
                            }
                        }

                        return authData
                    } catch (error) {
                        set((state) => {
                            state.error = error instanceof Error ? error.message : 'Ошибка регистрации'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                signOut: async () => {
                    set((state) => {
                        state.isLoading = true
                        state.error = null
                    })

                    try {
                        const {error} = await supabase.auth.signOut()
                        if (error) {
                            throw error
                        }

                        get().reset()
                        set((state) => {
                            state.isAuthenticated = false
                        })
                    } catch (error) {
                        set((state) => {
                            state.error = error instanceof Error ? error.message : 'Ошибка выхода из системы'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                resetPassword: async (email) => {
                    set((state) => {
                        state.isLoading = true
                        state.error = null
                    })

                    try {
                        const {error} = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: `${window.location.origin}/reset-password`,
                        })

                        if (error) {
                            throw error
                        }
                    } catch (error) {
                        set((state) => {
                            state.error = error instanceof Error ? error.message : 'Ошибка восстановления пароля'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                updateProfile: async (updates) => {
                    if (!get().profile) {
                        return
                    }

                    set((state) => {
                        state.isLoading = true
                        state.error = null
                    })

                    try {
                        const {data, error} = await supabase
                            .from('users')
                            .update(updates)
                            .eq('id', get().profile.id)
                            .select()
                            .single()

                        if (error) {
                            throw error
                        }

                        set((state) => {
                            state.profile = data
                        })
                    } catch (error) {
                        set((state) => {
                            state.error = error instanceof Error ? error.message : 'Ошибка обновления профиля'
                        })
                        throw error
                    } finally {
                        set((state) => {
                            state.isLoading = false
                        })
                    }
                },

                loadUserProfile: async (userId: string) => {
                    try {
                        const {data, error} = await supabase
                            .from('users')
                            .select(`
                *,
                roles!role_id(
                  id,
                  code,
                  name,
                  description,
                  is_active,
                  view_own_project_only
                )
              `)
                            .eq('id', userId)
                            .single()

                        if (error) {
                            if (error.code === 'PGRST116') {
                                // Профиль не найден - это нормально для новых пользователей
                                return
                            }
                            throw error
                        }

                        // Устанавливаем профиль
                        get().setProfile(data)

                        // Устанавливаем testRole из кода роли
                        if (data?.roles?.code) {
                            set((state) => {
                                state.testRole = data.roles.code
                            })
                            console.log('[Авторизация] Установлена роль из профиля:', data.roles.code, 'view_own_project_only:', data.roles.view_own_project_only)
                        }
                    } catch (error) {
                        get().setError('Не удалось загрузить профиль пользователя')
                    }
                },

                reset: () => set((state) => {
                    state.user = null
                    state.profile = null
                    state.isAuthenticated = false
                    state.error = null
                }),

                getEffectiveRole: () => {
                    const state = get()
                    // Теперь testRole всегда соответствует реальной роли в БД
                    return state.testRole || state.profile?.roles?.code || 'user'
                },
            })),
            {
                name: 'payhub-auth',
                partialize: (state) => ({
                    user: state.user,
                    profile: state.profile,
                    isAuthenticated: state.isAuthenticated,
                    testRole: state.testRole,
                }),
            }
        ),
        {
            name: 'auth-store',
        }
    )
)


// Provider компонент для авторизации
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {
        user,
        profile,
        setUser,
        setProfile,
        setLoading,
        setError,
        setInitialized,
        reset,
    } = useAuthStore()

    // Загрузка профиля пользователя
    const loadUserProfile = async (userId: string) => {
        try {
            const {data, error} = await supabase
                .from('users')
                .select(`
          *,
          roles!role_id(
            id,
            code,
            name,
            description,
            is_active,
            view_own_project_only
          )
        `)
                .eq('id', userId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // Профиль не найден - это нормально для новых пользователей
                    console.log('Профиль пользователя не найден')
                    return
                }
                throw error
            }

            setProfile(data)

            // Устанавливаем testRole из кода роли
            if (data?.roles?.code) {
                useAuthStore.setState({testRole: data.roles.code})
                console.log('[AuthProvider] Установлена роль из профиля:', data.roles.code, 'view_own_project_only:', data.roles.view_own_project_only)
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error)
            setError('Не удалось загрузить профиль пользователя')
        }
    }

    // Инициализация при монтировании
    useEffect(() => {
        let isMounted = true

        const initAuth = async () => {
            try {
                void setLoading(true)

                // Получаем текущую сессию
                const {data: {session}} = await supabase.auth.getSession()

                if (session?.user && isMounted) {
                    const authUser: AuthUser = {
                        id: session.user.id,
                        email: session.user.email,
                    }

                    setUser(authUser)
                    await loadUserProfile(session.user.id)
                }

                // Подписываемся на изменения авторизации
                const {data: {subscription}} = supabase.auth.onAuthStateChange(async (event, session) => {
                        if (!isMounted) {
                            return
                        }

                        if (event === 'SIGNED_IN' && session?.user) {
                            const authUser: AuthUser = {
                                id: session.user.id,
                                email: session.user.email,
                            }

                            setUser(authUser)
                            await loadUserProfile(session.user.id)
                        } else if (event === 'SIGNED_OUT') {
                            reset()
                        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                            // Обновляем пользователя при обновлении токена
                            const authUser: AuthUser = {
                                id: session.user.id,
                                email: session.user.email,
                            }

                            setUser(authUser)
                        }
                    }
                )

                return () => {
                    subscription.unsubscribe()
                }
            } catch (error) {
                if (isMounted) {
                    setError('Ошибка инициализации авторизации')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                    setInitialized(true)
                }
            }
        }

        const cleanup = initAuth()

        return () => {
            isMounted = false
            void cleanup.then(fn => fn?.())
        }
    }, [setUser, setProfile, setLoading, setError, setInitialized, reset])

    return <>{children}</>
}

// Хук для использования авторизации
export const useAuth = () => {
    const state = useAuthStore()

    return {
        ...state,
    }
}

// Хук для контроля доступа
const useAccessControl = () => {
    return useContext(AccessControlContext)
}