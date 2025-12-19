'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { apiClient } from '@/lib/api-client'
import { Branch, Seller, CreateSellerDto } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function SellersPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <SellersContent />
    </ProtectedRoute>
  )
}

function SellersContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const branchId = params.branchId as string

  const [branch, setBranch] = useState<Branch | null>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateSellerDto>({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
  })

  // Cargar datos al montar
  useEffect(() => {
    if (branchId) {
      loadBranch()
      loadSellers()
    }
  }, [branchId])

  const loadBranch = async () => {
    try {
      const data = await apiClient.get<Branch>(`/branches/${branchId}`)
      setBranch(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar la información de la sucursal',
        variant: 'destructive',
      })
    }
  }

  const loadSellers = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Seller[]>(`/branches/${branchId}/sellers`)
      setSellers(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar los vendedores',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.username.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de usuario es requerido',
        variant: 'destructive',
      })
      return
    }

    if (/\s/.test(formData.username.trim())) {
      toast({
        title: 'Error',
        description: 'El nombre de usuario no puede contener espacios',
        variant: 'destructive',
      })
      return
    }

    if (!formData.password || formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    // Validar que al menos tenga nombre o apellido
    if (!formData.first_name?.trim() && !formData.last_name?.trim()) {
      toast({
        title: 'Error',
        description: 'Debe proporcionar al menos un nombre o apellido',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsCreating(true)
      await apiClient.post<Seller>(`/branches/${branchId}/sellers`, {
        username: formData.username.trim(),
        password: formData.password,
        first_name: formData.first_name?.trim() || undefined,
        last_name: formData.last_name?.trim() || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Vendedor creado correctamente',
      })

      // Limpiar formulario
      setFormData({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
      })

      // Recargar lista
      loadSellers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el vendedor',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-6">
        <Link href="/admin/branches">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Sucursales
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Vendedores - {branch?.name || 'Cargando...'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Administra los vendedores asignados a esta sucursal
        </p>
      </div>

      {/* Formulario para crear vendedor */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nuevo Vendedor
          </CardTitle>
          <CardDescription>
            Registra un nuevo vendedor para esta sucursal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Usuario <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="usuario_sin_espacios"
                  required
                  pattern="^\S+$"
                  title="El usuario no puede contener espacios"
                />
                <p className="text-xs text-muted-foreground">
                  Sin espacios, será usado para iniciar sesión
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Vendedor'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Vendedores Registrados
          </CardTitle>
          <CardDescription>
            Lista de vendedores asignados a esta sucursal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando vendedores...</p>
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay vendedores registrados en esta sucursal</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.username}</TableCell>
                    <TableCell>
                      {seller.first_name || seller.last_name
                        ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {seller.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(seller.created_at).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {seller.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

