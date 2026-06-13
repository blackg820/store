'use client'

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language)
      document.documentElement.lang = language
      document.documentElement.dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr'
    }
  }, [language])

  if (!mounted) return <>{children}</>

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
