'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Language, Direction } from './types'

interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'store_owner'
  mode: 'controlled' | 'unlimited'
}

interface AuthContextType {
  user: AuthUser | null
  language: Language
  direction: Direction
  isLoading: boolean
  accessToken: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setLanguage: (lang: Language) => void
  updateUser: (data: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [language, setLanguageState] = useState<Language>('ar')
  const [isLoading, setIsLoading] = useState(true)

  const direction: Direction = (language === 'ar' || language === 'ku') ? 'rtl' : 'ltr'

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('storify_user')
    const storedToken = localStorage.getItem('storify_access_token')
    const storedRefresh = localStorage.getItem('storify_refresh_token')
    const storedLang = localStorage.getItem('storify_lang') as Language | null

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        setAccessToken(storedToken)

        // Try to refresh token silently
        if (storedRefresh) {
          refreshToken(storedRefresh).catch(() => {
            // Token expired, clear session
            clearSession()
          })
        }
      } catch {
        clearSession()
      }
    }

    if (storedLang && (storedLang === 'ar' || storedLang === 'en' || storedLang === 'ku')) {
      setLanguageState(storedLang)
    } else {
      // Default to Arabic — set document direction immediately
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ar'
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    document.documentElement.dir = direction
    document.documentElement.lang = language
  }, [direction, language])

  const clearSession = () => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('storify_user')
    localStorage.removeItem('storify_access_token')
    localStorage.removeItem('storify_refresh_token')
  }

  const refreshToken = async (token: string) => {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    })

    if (!res.ok) throw new Error('Refresh failed')

    const data = await res.json()
    if (data.success && data.data) {
      setAccessToken(data.data.accessToken)
      localStorage.setItem('storify_access_token', data.data.accessToken)
      localStorage.setItem('storify_refresh_token', data.data.refreshToken)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success && data.data) {
        const userData: AuthUser = {
          id: String(data.data.user.id),
          email: data.data.user.email,
          name: data.data.user.name,
          role: data.data.user.role,
          mode: data.data.user.mode,
        }

        setUser(userData)
        setAccessToken(data.data.accessToken)
        localStorage.setItem('storify_user', JSON.stringify(userData))
        localStorage.setItem('storify_access_token', data.data.accessToken)
        localStorage.setItem('storify_refresh_token', data.data.refreshToken)
        return true
      }

      return false
    } catch {
      return false
    }
  }

  const logout = () => {
    clearSession()
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('storify_lang', lang)
  }

  const updateUser = (data: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      localStorage.setItem('storify_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, language, direction, isLoading, accessToken, login, logout, setLanguage, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
