"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { auth } from "@/lib/auth"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Package, Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReceiptItem {
  productId: string
  quantityReceived: number
}

interface ReceiptResponse {
  id: string
}

interface Location {
  id: string
  name: string
  type: string
}

export default function ReceivePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmedByName, setConfirmedByName] = useState("")
  const [isConfirming, setIsConfirming] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false)
  const [newLocationData, setNewLocationData] = useState({
    name: "",
    address: "",
    contact_name: "",
    contact_phone: "",
  })
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)

  useEffect(() => {
    loadProducts()
    loadLocations()
    // Si el usuario tiene location_id, seleccionarla automáticamente
    const user = auth.getUser()
    if (user && (user as any).location_id) {
      setSelectedLocationId((user as any).location_id)
    }
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<Product[]>("/products")
      setProducts(data.filter(p => p.is_active))
    } catch (err: any) {
      setError(err.message || "Error al cargar productos")
    } finally {
      setIsLoading(false)
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

  const handleCreateLocation = async () => {
    if (!newLocationData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre de la ubicación es obligatorio",
      })
      return
    }

    setIsCreatingLocation(true)

    try {
      const location = await apiClient.post<Location>("/locations", {
        name: newLocationData.name.trim(),
        type: "WAREHOUSE",
        address: newLocationData.address.trim() || undefined,
        contact_name: newLocationData.contact_name.trim() || undefined,
        contact_phone: newLocationData.contact_phone.trim() || undefined,
      })

      toast({
        title: "Ubicación creada",
        description: `La ubicación ${location.name} ha sido creada exitosamente.`,
      })

      await loadLocations()
      setSelectedLocationId(location.id)
      setShowNewLocationDialog(false)
      setNewLocationData({
        name: "",
        address: "",
        contact_name: "",
        contact_phone: "",
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al crear la ubicación",
      })
    } finally {
      setIsCreatingLocation(false)
    }
  }

  const handleQuantityChange = (productId: string, value: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handleSave = async () => {
    // Validar que hay al menos un producto con cantidad
    const items: ReceiptItem[] = Object.entries(quantities)
      .filter(([_, qty]) => qty && Number.parseInt(qty) > 0)
      .map(([productId, qty]) => ({
        productId,
        quantityReceived: Number.parseInt(qty),
      }))

    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar al menos una cantidad para algún producto",
      })
      return
    }

    // Validar que hay una ubicación seleccionada
    if (!selectedLocationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una ubicación de almacén",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const locationId = selectedLocationId

      const payload = {
        date,
        locationId,
        items: items.map(item => ({
          productId: item.productId,
          quantityReceived: item.quantityReceived,
        })),
      }

      const receipt = await apiClient.post<ReceiptResponse>("/warehouse/receipts", payload)
      setReceiptId(receipt.id)
      setShowConfirmDialog(true)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al guardar la recepción",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirmedByName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes escribir tu nombre completo para confirmar",
      })
      return
    }

    if (!receiptId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontró el ID de la recepción",
      })
      return
    }

    setIsConfirming(true)

    try {
      await apiClient.patch(`/warehouse/receipts/${receiptId}/confirm`, {
        confirmedByName: confirmedByName.trim(),
      })

      toast({
        title: "Recepción confirmada",
        description: `Recepción confirmada por ${confirmedByName.trim()}`,
      })

      // Redirigir al historial
      router.push("/warehouse/history")
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al confirmar la recepción",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 px-4">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
      <div className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Registrar Recepción</h1>
          <p className="mt-2 text-muted-foreground">
            Ingresa las cantidades de roscas recibidas en el almacén
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Datos de la Recepción</CardTitle>
            <CardDescription>Selecciona la fecha y las cantidades recibidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Recepción</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="location">
                  Ubicación (Almacén) <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewLocationDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ubicación
                </Button>
              </div>
              <Select
                value={selectedLocationId || undefined}
                onValueChange={(value) => setSelectedLocationId(value === "none" ? "" : value)}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Selecciona una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay ubicaciones disponibles
                    </SelectItem>
                  ) : (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecciona el almacén donde se recibieron los productos
              </p>
            </div>

            <div className="space-y-4">
              <Label>Productos Recibidos</Label>
              {products.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No hay productos activos disponibles</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={`qty-${product.id}`} className="font-medium">
                          {product.name}
                        </Label>
                        {product.description && (
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        )}
                      </div>
                      <div className="w-32">
                        <Input
                          id={`qty-${product.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={quantities[product.id] || ""}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSubmitting || products.length === 0 || !selectedLocationId}
                className="flex-1"
              >
                {isSubmitting ? "Guardando..." : "Guardar / Continuar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/warehouse")}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Confirmación */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Recepción</DialogTitle>
              <DialogDescription>
                Esta información no puede ser modificada sin autorización. ¿Estás seguro de que deseas continuar?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirmedByName">Escribe tu nombre completo para continuar</Label>
                <Input
                  id="confirmedByName"
                  type="text"
                  placeholder="Nombre completo"
                  value={confirmedByName}
                  onChange={(e) => setConfirmedByName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setConfirmedByName("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!confirmedByName.trim() || isConfirming}
              >
                {isConfirming ? "Confirmando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para crear nueva ubicación */}
        <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Ubicación</DialogTitle>
              <DialogDescription>
                Crea una nueva ubicación de tipo Almacén para recibir productos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="location_name">
                  Nombre de la Ubicación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location_name"
                  type="text"
                  placeholder="ej: Almacén Central"
                  value={newLocationData.name}
                  onChange={(e) =>
                    setNewLocationData({ ...newLocationData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_address">Dirección</Label>
                <Input
                  id="location_address"
                  type="text"
                  placeholder="Dirección del almacén"
                  value={newLocationData.address}
                  onChange={(e) =>
                    setNewLocationData({ ...newLocationData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location_contact_name">Contacto</Label>
                  <Input
                    id="location_contact_name"
                    type="text"
                    placeholder="Nombre del contacto"
                    value={newLocationData.contact_name}
                    onChange={(e) =>
                      setNewLocationData({ ...newLocationData, contact_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_contact_phone">Teléfono</Label>
                  <Input
                    id="location_contact_phone"
                    type="text"
                    placeholder="Teléfono de contacto"
                    value={newLocationData.contact_phone}
                    onChange={(e) =>
                      setNewLocationData({ ...newLocationData, contact_phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewLocationDialog(false)
                  setNewLocationData({
                    name: "",
                    address: "",
                    contact_name: "",
                    contact_phone: "",
                  })
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateLocation}
                disabled={isCreatingLocation || !newLocationData.name.trim()}
              >
                {isCreatingLocation ? "Creando..." : "Crear Ubicación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}

