export function getStoreUrl(slug: string, path: string = '') {
  const useSubdomains = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true'
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'

  if (useSubdomains) {
    return `${protocol}://${slug}.${rootDomain}${path}`
  }

  return `/store/${slug}${path}`
}

export function getAbsoluteStoreUrl(slug: string, path: string = '') {
  const useSubdomains = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true'
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${rootDomain}`

  if (useSubdomains) {
    return `${protocol}://${slug}.${rootDomain}${path}`
  }

  return `${appUrl}/store/${slug}${path}`
}

export function getStorePath(slug: string, path: string = '') {
  const useSubdomains = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true'
  if (useSubdomains) {
    return path || '/'
  }
  return `/store/${slug}${path}`
}
