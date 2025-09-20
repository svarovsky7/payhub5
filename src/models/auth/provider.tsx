import React, { useContext, useEffect, createContext } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthStore } from './store'

// Контекст авторизации
const AuthContext = createContext<ReturnType<typeof useAuthStore> | undefined>(undefined)

// Провайдер авторизации
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore()

  // Подписка на изменения сессии
  useEffect(() => {
    console.log('[AuthProvider] Initializing auth listener')

    // Проверка текущей сессии
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[AuthProvider] Current session:', session)

        if (session?.user) {
          authStore.setUser(session.user)
          await authStore.loadUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('[AuthProvider] Session check error:', error)
      } finally {
        authStore.setInitialized(true)
      }
    }

    checkSession()

    // Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event, session)

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              authStore.setUser(session.user)
              await authStore.loadUserProfile(session.user.id)
            }
            break

          case 'SIGNED_OUT':
            authStore.reset()
            break

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              authStore.setUser(session.user)
            }
            break

          case 'USER_UPDATED':
            if (session?.user) {
              authStore.setUser(session.user)
              await authStore.loadUserProfile(session.user.id)
            }
            break

          default:
            break
        }
      }
    )

    return () => {
      console.log('[AuthProvider] Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  )
}

// Хук для использования контекста авторизации
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}