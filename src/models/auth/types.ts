import type { AuthUser, UserProfile } from '@/services/supabase'

// Интерфейс состояния авторизации
export interface AuthState {
  user: AuthUser | null
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  testRole?: string // Тестовая роль для разработки
}

// Интерфейс действий авторизации
export interface AuthActions {
  setUser: (user: AuthUser | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setInitialized: (isInitialized: boolean) => void
  setTestRole: (role: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: { email: string; password: string; fullName: string; projectIds?: number[] }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  loadUserProfile: (userId: string) => Promise<void>
  reset: () => void
  getEffectiveRole: () => string
}

export type AuthStore = AuthState & AuthActions