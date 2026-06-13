import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
  ],
}

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const hostname = req.headers.get('host') || ''

  // Define allowed domains (including localhost and root domain)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'blackt.uk'
  const useSubdomains = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true'
  const hostWithoutPort = hostname.split(':')[0]
  const reservedSubdomains = new Set([
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

  if (!useSubdomains) {
    return NextResponse.next()
  }

  const isLocalHost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort === '0.0.0.0' ||
    hostWithoutPort === '::1' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostWithoutPort)

  const isAppPath =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register')

  if (isLocalHost || isAppPath) {
    return NextResponse.next()
  }

  // Extract the subdomain from the hostname
  const currentHost = hostWithoutPort
    .replace(`.${rootDomain}`, '')
    .replace(rootDomain, '')

  // Reserved operational subdomains are handled by their own apps/ingress rules.
  if (reservedSubdomains.has(currentHost) || currentHost === 'store' || currentHost === '') {
    return NextResponse.next()
  }

  // Special case: if the user is already on a subdomain but the path starts with /store/[slug]
  // Redirect them to the clean path on the subdomain
  if (url.pathname.startsWith(`/store/${currentHost}`)) {
    const newPath = url.pathname.replace(`/store/${currentHost}`, '') || '/'
    return NextResponse.redirect(new URL(newPath, req.url))
  }

  // Redirect /store or /store/ on a subdomain to the subdomain root
  if (url.pathname === '/store' || url.pathname === '/store/') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Prevent accessing other stores via subdomain
  if (url.pathname.startsWith('/store/')) {
    const slugInPath = url.pathname.split('/')[2]
    if (slugInPath && slugInPath !== currentHost) {
      return NextResponse.redirect(new URL(`https://${slugInPath}.${rootDomain}${url.pathname.replace(`/store/${slugInPath}`, '')}`))
    }
  }

  // Rewrite the request to the store page
  const debug = process.env.NEXT_PUBLIC_DEBUG === 'true'
  if (debug) {
    console.log(`[Middleware] Hostname: ${hostname}, Subdomain: ${currentHost}, Original: ${req.nextUrl.pathname}, Target: /store/${currentHost}${url.pathname}`)
  }

  url.pathname = `/store/${currentHost}${url.pathname}`
  return NextResponse.rewrite(url)
}
