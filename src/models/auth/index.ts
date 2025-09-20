// Re-export everything from the modular auth structure
export { useAuthStore } from './store'
export { AuthProvider, useAuth } from './provider'
export type { AuthState, AuthActions, AuthStore } from './types'

// For backward compatibility with old imports
export { useAuthStore as default } from './store'