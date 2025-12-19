"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Package, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
}

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  useEffect(() => {
    loadHistory()
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

  const handleViewDetail = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt)
    setShowDetailDialog(true)
  }

  const formatDate = (dateString: string) => {
    // Parsear la fecha como fecha local para evitar problemas de zona horaria
    // Si viene como ISO string, extraer solo la parte de fecha
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}

