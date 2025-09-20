import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createAuthActions } from './actions'
import type { AuthStore } from './types'

// Initial state
const initialState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  testRole: 'user'
}

// Zustand store for authentication
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        ...createAuthActions(set, get)
      })),
      {
        name: 'auth-store',
        partialize: (state) => ({
          testRole: state.testRole
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
)