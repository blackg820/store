import { getSiteSettings } from '@/lib/api-client'
import type { StoreLanguage, StorefrontClientProps } from '@/components/store/storefront-client'
import { headers } from 'next/headers'

export type StorefrontPageData = Pick<StorefrontClientProps, 'store' | 'products' | 'categories' | 'productTypes' | 'sections'>

export function normalizeInitialLanguage(language?: string | null): StoreLanguage {
  return language === 'en' || language === 'ar' || language === 'ku' ? language : 'ar'
}

const RESERVED_HOSTS = new Set([
  'admin',
  'api',
  'app',
  'dashboard',
  'cdn',
  'media',
  'ftp',
  'mail',
  'www',
  'support',
  'help',
  'docs',
  'status',
])

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
}

function hostWithoutPort(host: string | null) {
  return (host || '').split(':')[0].toLowerCase()
}

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

export function isReservedStorefrontHost(host: string | null) {
  const cleanHost = hostWithoutPort(host)
  if (!cleanHost || isLocalHost(cleanHost)) return false
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').replace(/^www\./, '').toLowerCase()
  const leftMost = rootDomain && cleanHost.endsWith(`.${rootDomain}`)
    ? cleanHost.replace(`.${rootDomain}`, '').split('.')[0]
    : cleanHost.split('.')[0]
  return RESERVED_HOSTS.has(leftMost)
}

export async function resolveStorefrontIdentifier(fallbackSlug: string) {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
  const cleanHost = hostWithoutPort(host)

  if (!cleanHost || isLocalHost(cleanHost) || isReservedStorefrontHost(cleanHost)) {
    return {
      identifier: fallbackSlug,
      host: cleanHost,
      canonicalOrigin: process.env.NEXT_PUBLIC_APP_URL || '',
      resolvedByHost: false,
    }
  }

  try {
    const res = await fetch(`${apiBaseUrl()}/api/v1/public/domain/resolve?host=${encodeURIComponent(cleanHost)}`, {
      next: { revalidate: 60, tags: [`domain:${cleanHost}`] },
    })
    if (res.ok) {
      const json = await res.json()
      const slug = json?.data?.store?.slug
      if (json?.success && slug) {
        return {
          identifier: slug as string,
          host: cleanHost,
          canonicalOrigin: `https://${cleanHost}`,
          resolvedByHost: true,
        }
      }
    }
  } catch (error) {
    console.error('[Storefront] Domain resolve error:', error)
  }

  return {
    identifier: fallbackSlug,
    host: cleanHost,
    canonicalOrigin: process.env.NEXT_PUBLIC_APP_URL || '',
    resolvedByHost: false,
  }
}

export async function getStoreData(slug: string): Promise<StorefrontPageData | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/api/v1/public/store/${slug}`, {
      next: { revalidate: 60, tags: [`storefront:${slug}`] },
    })

    if (!res.ok) return null
    const json = await res.json()
    if (!json.success) return null

    return json.data as StorefrontPageData
  } catch (error) {
    console.error('[Storefront] Fetch error:', error)
    return null
  }
}

export async function getStorefrontPageContext(slug: string) {
  const tenant = await resolveStorefrontIdentifier(slug)
  const [data, settings] = await Promise.all([
    getStoreData(tenant.identifier),
    getSiteSettings(),
  ])

  return { data, settings, tenant }
}

export function canonicalStoreUrl(tenant: Awaited<ReturnType<typeof resolveStorefrontIdentifier>>, slug: string, path = '/') {
  if (tenant.resolvedByHost && tenant.canonicalOrigin) {
    return `${tenant.canonicalOrigin}${path}`
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return `${appUrl}/store/${slug}${path === '/' ? '' : path}`
}
