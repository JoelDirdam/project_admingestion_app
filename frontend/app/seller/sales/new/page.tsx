'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { auth } from '@/lib/auth'
import { CreateSaleDto, ProductVariantWithPrice, Branch, Campaign } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function NewSalePage() {
  // Permite acceso a sellers y admins (ambos pueden crear ventas)
  const isSeller = auth.isSeller()
  const isAdmin = auth.isAdmin()

  if (!isSeller && !isAdmin) {
    return null // El layout o ProtectedRoute manejará la redirección
  }

  return <NewSaleContent />
}

interface SaleItemForm {
  product_variant_id: string
  quantity: number
  unit_price: number
}

function NewSaleContent() {
  const router = useRouter()
  const { toast } = useToast()
  const user = auth.getUser()
  const isAdmin = auth.isAdmin()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [productVariants, setProductVariants] = useState<ProductVariantWithPrice[]>([])
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  // Si es seller, usar automáticamente su sucursal asignada
  const isSeller = auth.isSeller()
  const initialLocationId = isSeller ? (user?.location_id || '') : ''

  const [formData, setFormData] = useState<Omit<CreateSaleDto, 'items'>>({
    location_id: initialLocationId,
    sale_date: new Date().toISOString().split('T')[0],
    channel: 'STORE',
    customer_name: '',
    notes: '',
  })

  const [items, setItems] = useState<SaleItemForm[]>([])

  // Calcular el nombre de la sucursal del seller
  const sellerBranchName = useMemo(() => {
    if (!isSeller || !user?.location_id) return ''
    const branch = branches.find(b => b.id === user.location_id)
    return branch?.name || ''
  }, [isSeller, user?.location_id, branches])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Cargar campaña activa
      const campaignData = await apiClient.get<Campaign | null>('/sales/campaigns/active')
      if (!campaignData) {
        toast({
          title: 'Error',
          description: 'No hay una campaña activa. Contacta con un administrador.',
          variant: 'destructive',
        })
        router.push('/seller')
        return
      }
      setCampaign(campaignData)

      // Cargar variantes de productos con precios
      const variants = await apiClient.get<ProductVariantWithPrice[]>('/products/variants/with-prices')
      setProductVariants(variants)

      // Cargar sucursales (necesario tanto para admin como para mostrar nombre al seller)
      try {
        const branchesData = await apiClient.get<Branch[]>('/branches')
        setBranches(branchesData)

        if (isAdmin) {
          // Si es admin y no hay location_id seleccionado, usar la primera sucursal
          if (!formData.location_id && branchesData.length > 0) {
            setFormData(prev => ({ ...prev, location_id: branchesData[0].id }))
          }
        }
      } catch (branchError: any) {
        // Si falla la carga de sucursales, mostrar error pero continuar
        console.error('Error al cargar sucursales:', branchError)
        toast({
          title: 'Advertencia',
          description: 'No se pudieron cargar las sucursales. Algunas funciones pueden estar limitadas.',
          variant: 'destructive',
        })
      }

      if (isSeller && !user?.location_id) {
        // Si es seller sin sucursal asignada, mostrar error
        toast({
          title: 'Error',
          description: 'No tienes una sucursal asignada. Contacta con un administrador.',
          variant: 'destructive',
        })
        router.push('/seller')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al cargar datos',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { product_variant_id: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof SaleItemForm, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Si cambia el producto, prellenar automáticamente con el precio lista (base_price)
    if (field === 'product_variant_id' && value) {
      const variant = productVariants.find(v => v.id === value)
      if (variant && variant.product) {
        // Usar base_price (precio lista) por defecto
        newItems[index].unit_price = Number(variant.product.base_price) || 0
      }
    }

    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que haya sucursal seleccionada
    if (!formData.location_id) {
      toast({
        title: 'Error',
        description: isSeller 
          ? 'No tienes una sucursal asignada. Contacta con un administrador.'
          : 'Debe seleccionar una sucursal',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos un producto a la venta',
        variant: 'destructive',
      })
      return
    }

    // Validar que todos los items tengan producto y cantidad
    const invalidItems = items.filter(item => !item.product_variant_id || item.quantity <= 0)
    if (invalidItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Todos los productos deben tener cantidad mayor a 0',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Preparar datos de la venta
      const saleData: CreateSaleDto = {
        sale_date: formData.sale_date,
        channel: formData.channel,
        customer_name: formData.customer_name || undefined,
        notes: formData.notes || undefined,
        // Para sellers, no enviar location_id (el backend lo obtiene del usuario)
        // Para admins, enviar location_id si está seleccionado
        location_id: isAdmin ? (formData.location_id || undefined) : undefined,
        items: items.map(item => ({
          product_variant_id: item.product_variant_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      }

      await apiClient.post('/sales', saleData)

      toast({
        title: 'Éxito',
        description: 'Venta registrada correctamente',
      })

      router.push('/seller/sales')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar la venta',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
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

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-6">
        <Link href="/seller/sales">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Historial
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Nueva Venta</h1>
        <p className="mt-2 text-muted-foreground">
          {campaign && `Campaña: ${campaign.name}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Venta</CardTitle>
            <CardDescription>
              Completa los datos básicos de la venta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Selector de sucursal solo para admin */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="location_id">
                    Sucursal <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.location_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                    required
                  >
                    <SelectTrigger id="location_id">
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Información de sucursal para seller (solo lectura) */}
              {isSeller && user?.location_id && (
                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <Input
                    value={sellerBranchName || 'Cargando...'}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sucursal asignada automáticamente
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sale_date">
                  Fecha <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">
                  Canal <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: 'STORE' | 'ROUTE' | 'ONLINE') =>
                    setFormData({ ...formData, channel: value })
                  }
                  required
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORE">Tienda</SelectItem>
                    <SelectItem value="ROUTE">Ruta</SelectItem>
                    {/* <SelectItem value="ONLINE">En línea</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Nombre del Cliente (opcional)</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales sobre la venta"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Productos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>
                  Agrega los productos vendidos
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay productos agregados</p>
                <Button type="button" onClick={addItem} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Producto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unitario</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const selectedVariant = productVariants.find(v => v.id === item.product_variant_id)
                      const subtotal = item.unit_price * item.quantity

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.product_variant_id}
                              onValueChange={(value) => updateItem(index, 'product_variant_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                              <SelectContent>
                                {productVariants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.product.name} - {variant.name}
                                    {` (Lista: $${Number(variant.product.base_price).toFixed(2)})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="text-right flex-1"
                              />
                              {selectedVariant?.product && (
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItem(index, 'unit_price', Number(selectedVariant.product.base_price))}
                                    title="Precio Lista"
                                  >
                                    L
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItem(index, 'unit_price', Number(selectedVariant.product.price_1))}
                                    title="Precio 1"
                                  >
                                    1
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateItem(index, 'unit_price', Number(selectedVariant.product.price_2))}
                                    title="Precio 2"
                                  >
                                    2
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${subtotal.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/seller/sales')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
          </Button>
        </div>
      </form>
    </div>
  )
}

