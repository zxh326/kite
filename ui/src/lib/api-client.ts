// API client with authentication support
class ApiClient {
  private baseUrl: string = ''
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null
  private getCurrentCluster: (() => string | null) | null = null

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  // Set cluster provider function
  setClusterProvider(provider: () => string | null) {
    this.getCurrentCluster = provider
  }

  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return this.refreshPromise!
    }

    this.isRefreshing = true
    this.refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Token refresh failed')
        }
      })
      .finally(() => {
        this.isRefreshing = false
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const fullUrl = this.baseUrl + url

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add cluster header if available
    const currentCluster = this.getCurrentCluster?.()
    if (currentCluster) {
      headers['x-cluster-name'] = currentCluster
    }

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers,
      ...options,
    }

    try {
      let response = await fetch(fullUrl, defaultOptions)

      // Handle authentication errors with automatic retry
      if (response.status === 401) {
        try {
          // Try to refresh the token
          await this.refreshToken()
          // Retry the original request
          response = await fetch(fullUrl, defaultOptions)
        } catch (refreshError) {
          // If refresh fails, redirect to login page
          console.error('Token refresh failed:', refreshError)
          window.location.href = '/login'
          throw new Error('Authentication failed')
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        )
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return (await response.text()) as T
      }
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' })
  }

  async post<T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' })
  }

  async patch<T>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8080/api/v1'
  : '/api/v1'

// Create a singleton instance
export const apiClient = new ApiClient(API_BASE_URL)
