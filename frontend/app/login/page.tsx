"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { auth } from "@/lib/auth"
import { validateToken, getRedirectPathForUser } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface LoginResponse {
  accessToken: string
  user: {
    id: string
    username: string
    role: string
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Verificar si ya hay una sesión activa al cargar la página
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = auth.getToken()
      const user = auth.getUser()

      if (!token || !user) {
        setIsCheckingAuth(false)
        return
      }

      try {
        const validation = await validateToken()
        if (validation.isValid && validation.user) {
          // Ya hay una sesión válida, redirigir
          const redirectPath = getRedirectPathForUser(validation.user)
          router.push(redirectPath)
        } else {
          // Token inválido, limpiar y permitir login
          auth.logout()
          setIsCheckingAuth(false)
        }
      } catch (error) {
        // Error al validar, permitir login
        auth.logout()
        setIsCheckingAuth(false)
      }
    }

    checkExistingSession()
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username: username.trim(),
        password,
      })

      // Guardar token y datos del usuario
      auth.setAuth({
        accessToken: response.accessToken,
        user: response.user,
      })

      // Redirigir según el rol del usuario
      const redirectPath = getRedirectPathForUser(response.user)
      router.push(redirectPath)
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas")
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la sesión existente
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-4">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Panadería La Paz</CardTitle>
          <CardDescription>Inicia sesión para administrar producción</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
