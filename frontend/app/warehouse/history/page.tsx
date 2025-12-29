"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { auth } from "@/lib/auth"
import type { Product } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Package, Calendar, Edit, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WarehouseReceiptItem {
  id: string
  quantity_received: number
  product_variant: {
    id: string
    name: string
    product: {
      id: string
      name: string
    }
  }
}

interface WarehouseReceipt {
  id: string
  receipt_date: string
  confirmed: boolean
  confirmed_at: string | null
  confirmed_by_name: string | null
  totalUnits: number
  location: {
    id: string
    name: string
  }
  user: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
  }
  receipt_items: WarehouseReceiptItem[]
  notes?: string | null
}

interface Location {
  id: string
  name: string
  type: string
}

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  // Estados para edición
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showConfirmEditDialog, setShowConfirmEditDialog] = useState(false)
  const [editFormData, setEditFormData] = useState<{
    date: string
    locationId: string
    notes?: string
    items: Array<{ productId: string; quantityReceived: number }>
  } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [editQuantities, setEditQuantities] = useState<Record<string, string>>({})
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  const user = auth.getUser()
  const isAdmin = auth.isAdmin()
  const isWarehouse = auth.isWarehouse()

  useEffect(() => {
    loadHistory()
    if (isAdmin || isWarehouse) {
      loadProducts()
      loadLocations()
    }
  }, [])

  const loadHistory = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<WarehouseReceipt[]>("/warehouse/receipts")
      setReceipts(data)
    } catch (err: any) {
      setError(err.message || "Error al cargar el historial")
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await apiClient.get<Product[]>("/products")
      setProducts(data.filter(p => p.is_active))
    } catch (err: any) {
      console.error("Error al cargar productos:", err)
    }
  }

  const loadLocations = async () => {
    try {
      const data = await apiClient.get<Location[]>("/locations?type=WAREHOUSE")
      setLocations(data)
    } catch (err: any) {
      console.error("Error al cargar ubicaciones:", err)
    }
  }

  const handleViewDetail = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt)
    setShowDetailDialog(true)
  }

  const handleEditClick = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt)
    
    // Preparar datos del formulario de edición
    const quantities: Record<string, string> = {}
    receipt.receipt_items.forEach(item => {
      quantities[item.product_variant.product.id] = item.quantity_received.toString()
    })

    setEditQuantities(quantities)
    setEditFormData({
      date: receipt.receipt_date.split('T')[0],
      locationId: receipt.location.id,
      notes: receipt.notes || "",
      items: receipt.receipt_items.map(item => ({
        productId: item.product_variant.product.id,
        quantityReceived: item.quantity_received,
      })),
    })
    
    setShowDetailDialog(false)
    setShowEditDialog(true)
  }

  const handleQuantityChange = (productId: string, value: string) => {
    setEditQuantities(prev => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handleSubmitEdit = () => {
    if (!selectedReceipt || !editFormData) return

    // Validar que hay al menos un producto con cantidad
    const items = Object.entries(editQuantities)
      .filter(([_, qty]) => qty && Number.parseInt(qty) > 0)
      .map(([productId, qty]) => ({
        productId,
        quantityReceived: Number.parseInt(qty),
      }))

    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar al menos una cantidad mayor a 0",
      })
      return
    }

    // Si es warehouse, cerrar el diálogo de edición y mostrar diálogo de confirmación
    if (isWarehouse) {
      setShowEditDialog(false)
      setShowConfirmEditDialog(true)
    } else {
      // Si es admin, enviar directamente
      sendEditRequest()
    }
  }

  const handleConfirmEditRequest = async () => {
    setShowConfirmEditDialog(false)
    await sendEditRequest()
  }

  const handleCancelConfirmEdit = () => {
    setShowConfirmEditDialog(false)
    // Volver a abrir el diálogo de edición si se cancela
    setShowEditDialog(true)
  }

  const sendEditRequest = async () => {
    if (!selectedReceipt || !editFormData) return

    setIsSubmittingEdit(true)

    try {
      const items = Object.entries(editQuantities)
        .filter(([_, qty]) => qty && Number.parseInt(qty) > 0)
        .map(([productId, qty]) => ({
          productId,
          quantityReceived: Number.parseInt(qty),
        }))

      const updatePayload = {
        date: editFormData.date,
        locationId: editFormData.locationId,
        notes: editFormData.notes,
        items,
      }

      // El backend manejará si es admin (edita directamente) o warehouse (crea solicitud)
      await apiClient.put(`/warehouse/receipts/${selectedReceipt.id}`, updatePayload)

      if (isAdmin) {
        toast({
          title: "Recepción actualizada",
          description: "La recepción ha sido actualizada exitosamente.",
        })
        setShowEditDialog(false)
        await loadHistory()
      } else {
        toast({
          title: "Solicitud de edición enviada",
          description: "Se ha enviado una solicitud de edición al administrador. Recibirás una notificación cuando se apruebe o rechace.",
        })
        setShowEditDialog(false)
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al actualizar la recepción",
      })
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const formatDate = (dateString: string) => {
    const dateOnly = dateString.split('T')[0]
    const [year, month, day] = dateOnly.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 px-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
      <div className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Historial de Recepciones</h1>
          <p className="mt-2 text-muted-foreground">
            Ver todas las recepciones registradas en el almacén
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {receipts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay recepciones registradas</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/warehouse/receive")}
              >
                Registrar Primera Recepción
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">
                          {formatDate(receipt.receipt_date)}
                        </CardTitle>
                        {receipt.confirmed && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        <div className="space-y-1">
                          <p>Ubicación: {receipt.location.name}</p>
                          <p>Total de unidades: {receipt.totalUnits}</p>
                          {receipt.confirmed && receipt.confirmed_by_name && (
                            <p className="text-green-600 font-medium">
                              Confirmado por: {receipt.confirmed_by_name}
                            </p>
                          )}
                          {receipt.confirmed && receipt.confirmed_at && (
                            <p className="text-sm text-muted-foreground">
                              Fecha de confirmación: {formatDate(receipt.confirmed_at)}
                            </p>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(receipt)}
                      >
                        Ver Detalle
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Detalle */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Recepción</DialogTitle>
              <DialogDescription>
                {selectedReceipt && formatDate(selectedReceipt.receipt_date)}
              </DialogDescription>
            </DialogHeader>
            {selectedReceipt && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                    <p className="text-base">{selectedReceipt.location.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Unidades</p>
                    <p className="text-base">{selectedReceipt.totalUnits}</p>
                  </div>
                  {selectedReceipt.confirmed && selectedReceipt.confirmed_by_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Confirmado por</p>
                      <p className="text-base text-green-600">{selectedReceipt.confirmed_by_name}</p>
                    </div>
                  )}
                  {selectedReceipt.notes && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Notas</p>
                      <p className="text-base">{selectedReceipt.notes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Productos Recibidos</p>
                  <div className="border rounded-lg divide-y">
                    {selectedReceipt.receipt_items.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {item.product_variant.product.name}
                            {item.product_variant.name !== item.product_variant.product.name && (
                              <span className="text-muted-foreground"> - {item.product_variant.name}</span>
                            )}
                          </span>
                        </div>
                        <span className="font-semibold">{item.quantity_received} unidades</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(isAdmin || isWarehouse) && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleEditClick(selectedReceipt)}
                      className="w-full"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Recepción
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmación para Warehouse - Se muestra después de hacer clic en "Enviar solicitud" */}
        <Dialog open={showConfirmEditDialog} onOpenChange={(open) => {
          if (!open) {
            handleCancelConfirmEdit()
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Estás seguro de continuar?</DialogTitle>
              <DialogDescription>
                Al aceptar, se le pedirá permiso al Administrador para editar esta recepción.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelConfirmEdit}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmEditRequest}>
                Continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edición */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Recepción</DialogTitle>
              <DialogDescription>
                {isWarehouse && "Los cambios requerirán aprobación del administrador."}
              </DialogDescription>
            </DialogHeader>
            {selectedReceipt && editFormData && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Fecha de Recepción</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Ubicación</Label>
                    <Select
                      value={editFormData.locationId}
                      onValueChange={(value) => setEditFormData({ ...editFormData, locationId: value })}
                    >
                      <SelectTrigger id="edit-location">
                        <SelectValue placeholder="Selecciona una ubicación" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notas</Label>
                  <Textarea
                    id="edit-notes"
                    value={editFormData.notes || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Productos</Label>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <Label htmlFor={`edit-qty-${product.id}`} className="font-medium">
                            {product.name}
                          </Label>
                        </div>
                        <div className="w-32">
                          <Input
                            id={`edit-qty-${product.id}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editQuantities[product.id] || ""}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false)
                  setSelectedReceipt(null)
                  setEditFormData(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitEdit}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? "Guardando..." : isAdmin ? "Guardar Cambios" : "Enviar Solicitud"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
