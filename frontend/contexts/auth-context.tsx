"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  getAuthToken,
  setAuthToken,
  type UserProfile,
  ApiError,
} from "@/lib/api"

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing token on mount
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken()
      if (token) {
        try {
          const userData = await getCurrentUser()
          setUser(userData)
        } catch {
          // Token invalid, clear it
          apiLogout()
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await apiLogin(email, password)
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Login failed"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await apiRegister(email, password)
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Registration failed"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
