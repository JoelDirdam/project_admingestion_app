// API Client helper que automáticamente adjunta el JWT a las peticiones

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

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

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

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
