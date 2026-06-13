export const STOREFRONT_LOCALES = ['en', 'ar', 'ku']

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const LOCALE_COOKIE = 'dokani_locale'
const LOCALE_SOURCE_COOKIE = 'dokani_locale_source'

export function normalizeStorefrontLocale(value) {
  if (!value) return ''
  const code = String(value).toLowerCase().replace('_', '-').split('-')[0]
  return STOREFRONT_LOCALES.includes(code) ? code : ''
}

export function storefrontLocaleDirection(value) {
  return normalizeStorefrontLocale(value) === 'en' ? 'ltr' : 'rtl'
}

export function storefrontNumberLocale(value) {
  const code = normalizeStorefrontLocale(value)
  if (code === 'ar') return 'ar-IQ'
  if (code === 'ku') return 'ckb-IQ'
  return 'en-IQ'
}

export function useStorefrontLocale() {
  const { locale, locales, setLocale } = useI18n()
  const localeCookie = useCookie(LOCALE_COOKIE, {
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  const localeSourceCookie = useCookie(LOCALE_SOURCE_COOKIE, {
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  const requestHeaders = useRequestHeaders(['accept-language'])

  const currentLocale = computed(() => normalizeStorefrontLocale(locale.value) || 'en')
  const direction = computed(() => storefrontLocaleDirection(currentLocale.value))
  const availableLocales = computed(() => {
    return (locales.value || []).filter((item) => STOREFRONT_LOCALES.includes(item.code))
  })

  function htmlApply(code) {
    if (!process.client) return
    document.documentElement.setAttribute('lang', code)
    document.documentElement.setAttribute('dir', storefrontLocaleDirection(code))
  }

  function localStorageGet(key) {
    if (!process.client) return ''
    try {
      return window.localStorage.getItem(key) || ''
    } catch {
      return ''
    }
  }

  function localStorageSet(key, value) {
    if (!process.client) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Local storage can be disabled; the cookie still persists the selection.
    }
  }

  function userSelectedLocale() {
    const localSource = localStorageGet(LOCALE_SOURCE_COOKIE)
    const localLocale = normalizeStorefrontLocale(localStorageGet(LOCALE_COOKIE))
    if (localSource === 'user' && localLocale) return localLocale
    if (localeSourceCookie.value === 'user') {
      return normalizeStorefrontLocale(localeCookie.value)
    }
    return ''
  }

  function browserLocale() {
    const raw = process.client
      ? (navigator.languages || [navigator.language]).filter(Boolean).join(',')
      : requestHeaders['accept-language'] || ''

    return raw
      .split(',')
      .map((part) => normalizeStorefrontLocale(part.trim().split(';')[0]))
      .find(Boolean) || ''
  }

  async function applyStorefrontLocale(nextLocale, options = {}) {
    const code = normalizeStorefrontLocale(nextLocale) || 'en'
    const source = options.userSelected ? 'user' : options.source || 'auto'

    localeCookie.value = code
    localeSourceCookie.value = source

    if (options.userSelected) {
      localStorageSet(LOCALE_COOKIE, code)
      localStorageSet(LOCALE_SOURCE_COOKIE, 'user')
    }

    if (locale.value !== code) {
      await setLocale(code)
    }
    htmlApply(code)
    return code
  }

  async function ensureStorefrontLocale(storeDefaultLanguage = '') {
    const selected = userSelectedLocale()
    const normalizedDefault = normalizeStorefrontLocale(storeDefaultLanguage)
    const next = selected || normalizedDefault || browserLocale() || 'en'
    const source = selected ? 'user' : normalizedDefault ? 'store' : 'auto'
    return applyStorefrontLocale(next, { source })
  }

  async function selectStorefrontLocale(nextLocale) {
    return applyStorefrontLocale(nextLocale, { userSelected: true })
  }

  return {
    availableLocales,
    currentLocale,
    direction,
    ensureStorefrontLocale,
    selectStorefrontLocale,
  }
}
