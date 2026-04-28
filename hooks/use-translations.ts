'use client'

import { useAuth } from '@/lib/auth-context'
import { translations, type TranslationKey } from '@/lib/types'

export function useTranslations() {
  const { language } = useAuth()
  
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key
  }
  
  return { t, language }
}
