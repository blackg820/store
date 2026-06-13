'use client'

import { useTranslation } from 'react-i18next'

export function useTranslations() {
  const { t, i18n } = useTranslation()

  return {
    t: (key: string, options?: any) => t(key, options) as string,
    language: i18n.language
  }
}
