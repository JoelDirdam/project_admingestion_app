"use client"

import { auth } from "@/lib/auth"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ClipboardList } from "lucide-react"
import Link from "next/link"

export default function AdminPage() {
  const user = auth.getUser()
  const isAdmin = auth.isAdmin()

  return (
    <div className="container max-w-5xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenido, <span className="font-medium">{user?.username}</span> ({user?.role})
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {isAdmin && (
          <>
            <Link href="/admin/products" className="group">
              <Card className="transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="group-hover:text-primary transition-colors">Gestión de Productos</CardTitle>
                      <CardDescription className="mt-1.5">
                        Crear, editar y administrar productos (Roscas) y sus precios
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/production" className="group">
              <Card className="transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="group-hover:text-primary transition-colors">
                        Registro de Producción
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Registrar la cantidad de roscas producidas por día
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}

        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Acceso Limitado</CardTitle>
              <CardDescription>
                Tu cuenta de usuario no tiene permisos para administrar productos o producción. Contacta con un
                administrador para más información.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
