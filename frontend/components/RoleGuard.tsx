"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

interface RoleGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function RoleGuard({ children, requireAdmin = false }: RoleGuardProps) {
  const router = useRouter()
  const isAdmin = auth.isAdmin()

  useEffect(() => {
    if (requireAdmin && !isAdmin) {
      // Don't redirect, just show access denied message
      return
    }
  }, [requireAdmin, isAdmin])

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Acceso Denegado</AlertTitle>
            <AlertDescription className="mt-2">
              No tienes permisos para acceder a esta página. Solo los usuarios con rol ADMIN pueden ver este contenido.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => router.push("/admin")}>Volver al Inicio</Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
