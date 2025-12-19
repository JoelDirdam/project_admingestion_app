'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { apiClient } from '@/lib/api-client'
import { Branch, CreateBranchDto } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Store, Users } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function BranchesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <BranchesContent />
    </ProtectedRoute>
  )
}

function BranchesContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateBranchDto>({
    name: '',
    address: '',
    contact_name: '',
    contact_phone: '',
  })

  // Cargar branches al montar el componente
  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Branch[]>('/branches')
      setBranches(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las sucursales',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la sucursal es requerido',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsCreating(true)
      await apiClient.post<Branch>('/branches', {
        name: formData.name.trim(),
        address: formData.address?.trim() || undefined,
        contact_name: formData.contact_name?.trim() || undefined,
        contact_phone: formData.contact_phone?.trim() || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Sucursal creada correctamente',
      })

      // Limpiar formulario
      setFormData({
        name: '',
        address: '',
        contact_name: '',
        contact_phone: '',
      })

      // Recargar lista
      loadBranches()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la sucursal',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Sucursales</h1>
        <p className="mt-2 text-muted-foreground">
          Administra las sucursales y sus vendedores
        </p>
      </div>

      {/* Formulario para crear sucursal */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nueva Sucursal
          </CardTitle>
          <CardDescription>
            Registra una nueva sucursal en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Sucursal <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Sucursal Centro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nombre de Contacto</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Nombre del encargado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Teléfono"
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Sucursal'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de sucursales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Sucursales Registradas
          </CardTitle>
          <CardDescription>
            Lista de todas las sucursales activas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando sucursales...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay sucursales registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.address || '-'}</TableCell>
                    <TableCell>{branch.contact_name || '-'}</TableCell>
                    <TableCell>{branch.contact_phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/branches/${branch.id}/sellers`}>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          Vendedores
                        </Button>
                      </Link>
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

