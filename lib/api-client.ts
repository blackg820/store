/**
 * Centralized API client with auth token injection, tenant resolution, and auto-refresh.
 */

export async function getSiteSettings() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/settings`, {
      next: { revalidate: 3600 }
    })
    if (!res.ok) return { site_name: 'Storify', site_logo: '/favicon.png' }
    const json = await res.json()
    return json.data || { site_name: 'Storify', site_logo: '/favicon.png' }
  } catch (error) {
    return { site_name: 'Storify', site_logo: '/favicon.png' }
  }
}

export interface ApiRequestOptions extends RequestInit {
  storeId?: string | null
  storeSlug?: string | null
  params?: Record<string, string>
  retryWithoutStoreOnTenantDenied?: boolean
}

export class ApiClient {
  private refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('storify_access_token')
  }

  private getSelectedStoreId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('storify_selected_store_id')
  }

  private async refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = localStorage.getItem('storify_refresh_token')
    if (!refreshToken) throw new Error('No refresh token available')

    this.refreshPromise = (async () => {
      const refreshRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!refreshRes.ok) {
        throw new Error('Session expired')
      }

      const data = await refreshRes.json()
      if (!data.success || !data.data?.accessToken || !data.data?.refreshToken) {
        throw new Error('Authentication failed')
      }

      localStorage.setItem('storify_access_token', data.data.accessToken)
      localStorage.setItem('storify_refresh_token', data.data.refreshToken)

      return {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      }
    })().finally(() => {
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  private async refreshAndRetry(url: string, options: ApiRequestOptions): Promise<Response> {
    const tokens = await this.refreshTokens()
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
    return fetch(url, { ...options, headers })
  }

  private clearSession() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('storify_user')
    localStorage.removeItem('storify_access_token')
    localStorage.removeItem('storify_refresh_token')
    localStorage.removeItem('storify_selected_store_id')
    window.location.href = '/login'
  }

  async request<T = unknown>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const token = this.getAccessToken()
    const currentStoreId = options.storeId !== undefined ? options.storeId : this.getSelectedStoreId()
    const lang = typeof window !== 'undefined' ? localStorage.getItem('storify_lang') || 'ar' : 'ar'

    // Normalize URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    headers.set('Accept-Language', lang)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (token && currentStoreId) {
      headers.set('X-Store-ID', currentStoreId)
    }

    if (options.storeSlug) {
      headers.set('X-Store-Slug', options.storeSlug)
    }

    const queryString = options.params ? '?' + new URLSearchParams(options.params).toString() : ''
    const fullUrl = `${url}${queryString}`

    let res = await fetch(fullUrl, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401 && token) {
      try {
        res = await this.refreshAndRetry(fullUrl, { ...options, headers })
      } catch (e) {
        this.clearSession()
        throw new Error('Authentication failed')
      }
    }

    let json: any = null
    const contentType = res.headers.get('content-type')
    if (res.status !== 204 && contentType && contentType.includes('application/json')) {
      try {
        json = await res.json()
      } catch (e) {
        console.error('[ApiClient] JSON parse error:', e)
      }
    }

    const canRetryWithoutStore =
      (res.status === 401 || res.status === 403) &&
      (json?.code === 'TENANT_ACCESS_DENIED' || json?.code === 'UNAUTHENTICATED_TENANT') &&
      currentStoreId &&
      options.storeId === undefined &&
      options.retryWithoutStoreOnTenantDenied !== false &&
      ['GET', 'HEAD'].includes(options.method || 'GET')

    if (canRetryWithoutStore) {
      localStorage.removeItem('storify_selected_store_id')
      return this.request<T>(endpoint, {
        ...options,
        storeId: null,
        retryWithoutStoreOnTenantDenied: false,
      })
    }

    if (!res.ok) {
      const errorMsg = json?.error || json?.message || `HTTP error! status: ${res.status}`
      throw new Error(errorMsg)
    }

    return json as T
  }

  async get<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = unknown>(url: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) })
  }

  async patch<T = unknown>(url: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) })
  }

  async put<T = unknown>(url: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) })
  }

  async del<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
