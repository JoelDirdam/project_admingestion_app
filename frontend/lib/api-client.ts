// API Client helper que automáticamente adjunta el JWT a las peticiones

// Determinar la URL base de la API
// En el cliente (navegador): SIEMPRE usar ruta relativa /api para que Nginx maneje el routing
// En el servidor (SSR): usar la URL completa del backend para server-side rendering
function getApiBaseUrl(): string {
  // Si estamos en el servidor (SSR de Next.js), usar URL completa
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }
  
  // Si estamos en el cliente (navegador), SIEMPRE usar ruta relativa
  // Esto es crítico para que Nginx reverse proxy funcione correctamente
  // Las rutas relativas se resuelven contra el mismo origen (sin puerto)
  return "/api"
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    throw {
      message: "Sesión expirada. Por favor, inicia sesión nuevamente.",
      statusCode: 401,
    }
  }

  if (!response.ok) {
    const error: ApiError = {
      message: "Error en la petición",
      statusCode: response.status,
    }

    try {
      const errorData = await response.json()
      error.message = errorData.message || error.message
    } catch {
      // Si no se puede parsear el error, usar el mensaje por defecto
    }

    throw error
  }

  return response.json()
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
