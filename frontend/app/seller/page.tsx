'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { apiClient } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { Branch } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, User, ShoppingBag, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'

export default function SellerDashboardPage() {
  // La protección está en el layout, solo renderizamos el contenido
  return <SellerDashboardContent />
}

function SellerDashboardContent() {
  const user = auth.getUser()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.location_id) {
      loadBranch()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const loadBranch = async () => {
    if (!user?.location_id) return

    try {
      const data = await apiClient.get<Branch>(`/branches/${user.location_id}`)
      setBranch(data)
    } catch (error: any) {
      console.error('Error al cargar información de la sucursal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Panel de Vendedor
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenido, <span className="font-medium">{user?.username}</span>
        </p>
      </div>

      {/* Información del vendedor y sucursal */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Card de información personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Usuario</p>
              <p className="font-medium">{user?.username}</p>
            </div>
            {user?.location_id && (
              <div>
                <p className="text-sm text-muted-foreground">ID de Sucursal</p>
                <p className="font-medium text-sm">{user.location_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de información de sucursal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Sucursal Asignada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando información...</p>
            ) : branch ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{branch.name}</p>
                </div>
                {branch.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium text-sm">{branch.address}</p>
                  </div>
                )}
                {branch.contact_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium text-sm">{branch.contact_phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay sucursal asignada
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sección de funcionalidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Funcionalidades
          </CardTitle>
          <CardDescription>
            Herramientas disponibles para vendedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Registro de ventas */}
            <Link href="/seller/sales/new" className="group">
              <div className="p-4 border rounded-lg transition-all hover:shadow-lg hover:border-primary">
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Registro de Ventas</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registra las ventas realizadas en esta sucursal
                </p>
              </div>
            </Link>

            {/* Historial de ventas */}
            <Link href="/seller/sales" className="group">
              <div className="p-4 border rounded-lg transition-all hover:shadow-lg hover:border-primary">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Historial de Ventas</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consulta el historial de ventas registradas
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

