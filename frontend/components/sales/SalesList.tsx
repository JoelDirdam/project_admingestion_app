'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { Sale, Branch } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, ShoppingBag, Eye } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface SalesListProps {
  /** Si es true, muestra filtros y opciones de admin */
  adminMode?: boolean
}

export function SalesList({ adminMode = false }: SalesListProps) {
  const { toast } = useToast()
  const [sales, setSales] = useState<Sale[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = auth.isAdmin()

  useEffect(() => {
    if (isAdmin) {
      loadBranches()
    }
    loadSales()
  }, [])

  useEffect(() => {
    loadSales()
  }, [selectedBranchId])

  const loadBranches = async () => {
    try {
      const data = await apiClient.get<Branch[]>('/branches')
      setBranches(data)
    } catch (error: any) {
      console.error('Error al cargar sucursales:', error)
    }
  }

  const loadSales = async () => {
    try {
      setIsLoading(true)
      const params = adminMode && selectedBranchId ? `?location_id=${selectedBranchId}` : ''
      const data = await apiClient.get<Sale[]>(`/sales${params}`)
      setSales(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las ventas',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'STORE': return 'Tienda'
      case 'ROUTE': return 'Ruta'
      case 'ONLINE': return 'En línea'
      default: return channel
    }
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {adminMode ? 'Gestión de Ventas' : 'Historial de Ventas'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {adminMode
              ? 'Consulta y administra todas las ventas del sistema'
              : 'Consulta todas tus ventas registradas'}
          </p>
        </div>
        <Link href="/seller/sales/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Filtro por sucursal - solo para admin */}
      {adminMode && isAdmin && branches.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="branch">Filtrar por Sucursal</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={(value) => setSelectedBranchId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Ventas Registradas
          </CardTitle>
          <CardDescription>
            {adminMode && selectedBranchId
              ? `Ventas de ${branches.find(b => b.id === selectedBranchId)?.name || 'la sucursal seleccionada'}`
              : adminMode
              ? 'Todas las ventas del sistema'
              : 'Lista de todas las ventas que has registrado'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando ventas...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {adminMode && selectedBranchId
                  ? 'No hay ventas para esta sucursal'
                  : 'No hay ventas registradas'}
              </p>
              {!adminMode && (
                <Link href="/seller/sales/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Primera Venta
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    {adminMode && <TableHead>Sucursal</TableHead>}
                    {adminMode && <TableHead>Vendedor</TableHead>}
                    <TableHead>Canal</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell>
                        {new Date(sale.sale_date).toLocaleDateString('es-MX')}
                      </TableCell>
                      {adminMode && <TableCell>{sale.location.name}</TableCell>}
                      {adminMode && (
                        <TableCell>
                          {sale.user.first_name || sale.user.last_name
                            ? `${sale.user.first_name || ''} ${sale.user.last_name || ''}`.trim()
                            : sale.user.username}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {getChannelLabel(sale.channel)}
                        </span>
                      </TableCell>
                      <TableCell>{sale.customer_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(sale.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/seller/sales/${sale.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

