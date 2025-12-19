// API Client helper que automáticamente adjunta el JWT a las peticiones

// Determinar la URL base de la API
function getApiBaseUrl(): string {
  // Si hay una URL explícita configurada, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Si estamos en el servidor (SSR de Next.js), usar localhost
  if (typeof window === "undefined") {
    return "http://localhost:3000"
  }
  
  // Si estamos en el cliente (navegador)
  // En producción: construir URL usando el mismo hostname pero con puerto 3000
  // En desarrollo: usar localhost:3000
  const hostname = window.location.hostname
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1"
  
  if (isLocalhost) {
    // Desarrollo: usar localhost
    return "http://localhost:3000"
  } else {
    // Producción: usar el mismo hostname pero con puerto 3000
    const protocol = window.location.protocol
    return `${protocol}//${hostname}:3000`
  }
}

const API_BASE_URL = getApiBaseUrl()

export interface ApiError {
  message: string
  statusCode?: number
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  return localStorage.getItem("authToken")
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()
  const isDev = process.env.NODE_ENV === 'development'

  // Construir headers como un objeto Record para evitar problemas de tipo
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Si hay headers en options, agregarlos
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value
      })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value
      })
    } else {
      Object.assign(headers, options.headers)
    }
  }

  // Agregar token de autorización si existe
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint}`
  
  // Log en desarrollo para debugging
  if (isDev) {
    console.log(`[API Request] ${options.method || 'GET'} ${url}`)
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
      const error = {
        message: "Sesión expirada. Por favor, inicia sesión nuevamente.",
        statusCode: 401,
      }
      if (isDev) {
        console.error('[API Error]', error)
      }
      throw error
    }

    if (!response.ok) {
      const error: ApiError = {
        message: "Error en la petición",
        statusCode: response.status,
      }

      try {
        const errorData = await response.json()
        error.message = errorData.message || error.message
        
        // Log detallado en desarrollo
        if (isDev) {
          console.error('[API Error]', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          })
        }
      } catch {
        // Si no se puede parsear el error, usar el mensaje por defecto
        if (isDev) {
          console.error('[API Error]', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            message: 'No se pudo parsear la respuesta de error',
          })
        }
      }

      throw error
    }

    const data = await response.json()
    
    // Log exitoso en desarrollo (opcional, comentado para no saturar)
    // if (isDev) {
    //   console.log(`[API Success] ${options.method || 'GET'} ${endpoint}`)
    // }
    
    return data
  } catch (error: any) {
    // Si es un error de red o conexión
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: ApiError = {
        message: `Error de conexión: No se pudo conectar con el servidor en ${API_BASE_URL}`,
        statusCode: 0,
      }
      if (isDev) {
        console.error('[API Network Error]', {
          endpoint,
          url,
          error: error.message,
          suggestion: 'Verifica que el servidor backend esté corriendo',
        })
      }
      throw networkError
    }
    
    // Re-lanzar otros errores
    throw error
  }
}

export const apiClient = {
  get: <T = unknown>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),

  post: <T = unknown>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
}
