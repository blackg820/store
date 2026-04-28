/**
 * Centralized API client with auth token injection and auto-refresh.
 */

export class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('storify_access_token')
  }

  private async refreshAndRetry(url: string, options: RequestInit): Promise<Response> {
    const refreshToken = localStorage.getItem('storify_refresh_token')
    if (!refreshToken) throw new Error('No refresh token')

    const refreshRes = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!refreshRes.ok) {
      // Clear session — force re-login
      localStorage.removeItem('storify_user')
      localStorage.removeItem('storify_access_token')
      localStorage.removeItem('storify_refresh_token')
      window.location.href = '/'
      throw new Error('Session expired')
    }

    const data = await refreshRes.json()
    localStorage.setItem('storify_access_token', data.data.accessToken)
    localStorage.setItem('storify_refresh_token', data.data.refreshToken)

    // Retry original request with new token
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${data.data.accessToken}`)
    return fetch(url, { ...options, headers })
  }

  async request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const lang = typeof window !== 'undefined' ? localStorage.getItem('storify_lang') || 'ar' : 'ar'
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    headers.set('Accept-Language', lang)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    let res = await fetch(url, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401 && token) {
      try {
        res = await this.refreshAndRetry(url, { ...options, headers })
      } catch {
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

    if (!res.ok) {
      throw new Error(json?.error || `HTTP error! status: ${res.status}`)
    }
    return json as T 
  }

  async get<T = unknown>(url: string, params?: Record<string, string>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<T>(`${url}${queryString}`)
  }

  async post<T = unknown>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body) })
  }

  async patch<T = unknown>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, { method: 'PATCH', body: JSON.stringify(body) })
  }

  async del<T = unknown>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
