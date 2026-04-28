import fs from 'fs'
import path from 'path'

type Locale = 'en' | 'ar' | 'ku'

const locales: Record<Locale, any> = {
  en: JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/en.json'), 'utf8')),
  ar: JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/ar.json'), 'utf8')),
  ku: JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/ku.json'), 'utf8')),
}

import { NextRequest } from 'next/server'

export function getServerTranslations(lang: string = 'ar') {
  const locale = (locales[lang as Locale] || locales.ar)
  
  return {
    t: (key: string, variables?: Record<string, string | number>) => {
      let text = locale[key] || key
      
      if (variables) {
        Object.entries(variables).forEach(([name, value]) => {
          text = text.replace(`{{${name}}}`, String(value))
        })
      }
      
      return text
    }
  }
}

export function getTranslations(request: NextRequest) {
  const lang = request.headers.get('Accept-Language')?.split(',')[0].split('-')[0] || 'ar'
  return getServerTranslations(lang)
}
