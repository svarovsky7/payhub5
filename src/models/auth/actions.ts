import { supabase } from '@/services/supabase'
import type { StateCreator } from 'zustand'
import type { AuthActions, AuthStore } from './types'
import type { UserProfile } from '@/services/supabase'

export const createAuthActions: StateCreator<
  AuthStore,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  AuthActions
> = (set, get) => ({
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
    console.log('[Auth] Setting test role:', role)

    const currentUser = get().user
    const currentProfile = get().profile

    if (!currentUser || !currentProfile) {
      console.error('[Auth] No authenticated user to set role')
      return
    }

    try {
      // Get role info by code
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('code', role)
        .single()

      if (roleError ?? !roleData) {
        console.error('[Auth] Error fetching role:', roleError)
        return
      }

      console.log('[Auth] Found role:', roleData)

      // Update user role_id in database
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role_id: roleData.id })
        .eq('id', currentUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Auth] Error updating user role:', updateError)
        return
      }

      console.log('[Auth] Updated user role:', updatedUser)

      // Update local profile
      const updatedProfile = {
        ...currentProfile,
        role_id: roleData.id,
        role
      }

      set((state) => {
        state.profile = updatedProfile
        state.testRole = role
      })

      return { success: true, profile: updatedProfile }
    } catch (error) {
      console.error('[Auth] Error setting test role:', error)
      return { success: false, error }
    }
  },

  signIn: async (email, password) => {
    set((state) => {
      state.isLoading = true
      state.error = null
    })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {throw error}

      if (data.user) {
        // Load user profile
        await get().loadUserProfile(data.user.id)
      }
    } catch (error) {
      console.error('[Auth] Sign in error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Sign in failed'
      })
      throw error
    } finally {
      set((state) => {
        state.isLoading = false
      })
    }
  },

  signUp: async ({ email, password, fullName, projectIds }) => {
    set((state) => {
      state.isLoading = true
      state.error = null
    })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            project_ids: projectIds
          }
        }
      })

      if (error) {throw error}

      if (data.user) {
        await get().loadUserProfile(data.user.id)
      }
    } catch (error) {
      console.error('[Auth] Sign up error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Sign up failed'
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
      const { error } = await supabase.auth.signOut()
      if (error) {throw error}

      get().reset()
    } catch (error) {
      console.error('[Auth] Sign out error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Sign out failed'
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
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {throw error}
    } catch (error) {
      console.error('[Auth] Reset password error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Reset password failed'
      })
      throw error
    } finally {
      set((state) => {
        state.isLoading = false
      })
    }
  },

  updateProfile: async (updates) => {
    const userId = get().user?.id
    if (!userId) {
      console.error('[Auth] No user to update profile')
      return
    }

    set((state) => {
      state.isLoading = true
      state.error = null
    })

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {throw error}

      set((state) => {
        state.profile = data
      })
    } catch (error) {
      console.error('[Auth] Update profile error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Update profile failed'
      })
      throw error
    } finally {
      set((state) => {
        state.isLoading = false
      })
    }
  },

  loadUserProfile: async (userId) => {
    try {
      console.log('[Auth] Loading user profile:', userId)

      // Get user from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('[Auth] Error loading user:', userError)
        throw userError
      }

      // Get profile from user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[Auth] Error loading profile:', profileError)
        throw profileError
      }

      // Combine user and profile data
      const profile: UserProfile = {
        id: userId,
        user_id: userId,
        email: userData.email,
        full_name: userData.full_name || profileData?.full_name || '',
        role: userData.role?.code || 'user',
        role_id: userData.role_id,
        department: profileData?.department,
        position: profileData?.position,
        phone: profileData?.phone,
        avatar_url: profileData?.avatar_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      }

      console.log('[Auth] Loaded profile:', profile)

      set((state) => {
        state.profile = profile
      })
    } catch (error) {
      console.error('[Auth] Load profile error:', error)
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Load profile failed'
      })
    }
  },

  reset: () => set((state) => {
    state.user = null
    state.profile = null
    state.isAuthenticated = false
    state.isLoading = false
    state.error = null
  }),

  getEffectiveRole: () => {
    const state = get()
    return state.testRole || state.profile?.role || 'user'
  }
})