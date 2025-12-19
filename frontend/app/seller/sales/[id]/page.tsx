'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { apiClient } from '@/lib/api-client'
import { Sale } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { auth } from '@/lib/auth'

export default function SaleDetailPage() {
  // Permite acceso a sellers y admins
  const isSeller = auth.isSeller()
  const isAdmin = auth.isAdmin()

  if (!isSeller && !isAdmin) {
    return null // El layout o ProtectedRoute manejará la redirección
  }

  return <SaleDetailContent />
}

function SaleDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const saleId = params.id as string

  const [sale, setSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (saleId) {
      loadSale()
    }
  }, [saleId])

  const loadSale = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Sale>(`/sales/${saleId}`)
      setSale(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el detalle de la venta',
        variant: 'destructive',
      })
      router.push('/seller/sales')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 px-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!sale) {
    return null
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-6">
        <Link href="/seller/sales">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Historial
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Venta</h1>
        <p className="mt-2 text-muted-foreground">
          Venta #{sale.sale_number}
        </p>
      </div>

      {/* Información general */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información de la Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {new Date(sale.sale_date).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sucursal</p>
              <p className="font-medium">{sale.location.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Canal</p>
              <p className="font-medium">
                {sale.channel === 'STORE' ? 'Tienda' : 
                 sale.channel === 'ROUTE' ? 'Ruta' : 'En línea'}
              </p>
            </div>
            {sale.customer_name && (
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{sale.customer_name}</p>
              </div>
            )}
            {sale.notes && (
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{sale.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.sale_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product_variant.product.name} - {item.product_variant.name}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${Number(item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(item.subtotal).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  ${Number(sale.total).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

