// Auth helpers para manejar autenticación y tokens JWT

export interface User {
  id: string
  username: string
  role: string
  location_id?: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export const auth = {
  // Guardar token y datos del usuario
  setAuth: (authData: AuthResponse) => {
    if (typeof window === "undefined") return
    localStorage.setItem("authToken", authData.accessToken)
    localStorage.setItem("user", JSON.stringify(authData.user))
  },

  // Obtener token
  getToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("authToken")
  },

  // Obtener usuario
  getUser: (): User | null => {
    if (typeof window === "undefined") return null
    const userStr = localStorage.getItem("user")
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  // Verificar si está autenticado
  isAuthenticated: (): boolean => {
    return auth.getToken() !== null
  },

  // Verificar si es admin
  isAdmin: (): boolean => {
    const user = auth.getUser()
    return user?.role === "ADMIN"
  },

  // Verificar si es warehouse
  isWarehouse: (): boolean => {
    const user = auth.getUser()
    return user?.role === "WAREHOUSE"
  },

  // Verificar si tiene permisos de almacén (WAREHOUSE o ADMIN)
  hasWarehouseAccess: (): boolean => {
    const user = auth.getUser()
    return user?.role === "WAREHOUSE" || user?.role === "ADMIN"
  },

  // Cerrar sesión
  logout: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
  },
}
