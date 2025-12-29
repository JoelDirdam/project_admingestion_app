"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { RoleGuard } from "@/components/RoleGuard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, XCircle, Package, Calendar, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EditRequest {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  rejection_reason?: string | null
  created_at: string
  reviewed_at?: string | null
  proposed_data: {
    date: string
    locationId: string
    notes?: string
    items: Array<{ productId: string; quantityReceived: number }>
  }
  warehouse_receipt: {
    id: string
    receipt_date: string
    confirmed_by_name: string | null
    notes: string | null
    location: {
      id: string
      name: string
    }
    user: {
      username: string
      first_name: string | null
      last_name: string | null
    }
    receipt_items?: Array<{
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
    }>
  }
  requester: {
    username: string
    first_name: string | null
    last_name: string | null
  }
  approver?: {
    username: string
    first_name: string | null
    last_name: string | null
  } | null
}

interface Product {
  id: string
  name: string
}

export default function EditRequestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("PENDING")

  useEffect(() => {
    loadEditRequests()
    loadProducts()
    
    // Si hay un requestId en los query params, abrir el diálogo de revisión
    const requestId = searchParams.get("requestId")
    if (requestId && editRequests.length > 0) {
      const request = editRequests.find(r => r.id === requestId)
      if (request && request.status === "PENDING") {
        setSelectedRequest(request)
        setShowReviewDialog(true)
      }
    }
  }, [searchParams, editRequests.length])

  const loadEditRequests = async () => {
    try {
      setIsLoading(true)
      setError("")
      const endpoint = filterStatus ? `/warehouse/edit-requests?status=${filterStatus}` : "/warehouse/edit-requests"
      const data = await apiClient.get<EditRequest[]>(endpoint)
      setEditRequests(data)
    } catch (err: any) {
      setError(err.message || "Error al cargar solicitudes de edición")
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await apiClient.get<Product[]>("/products")
      setProducts(data)
    } catch (err: any) {
      console.error("Error al cargar productos:", err)
    }
  }

  useEffect(() => {
    loadEditRequests()
  }, [filterStatus])

  const handleReviewClick = (request: EditRequest) => {
    if (request.status !== "PENDING") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Esta solicitud ya fue procesada",
      })
      return
    }
    setSelectedRequest(request)
    setReviewStatus(null)
    setRejectionReason("")
    setShowReviewDialog(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewStatus) return

    setIsSubmitting(true)

    try {
      await apiClient.patch(`/warehouse/edit-requests/${selectedRequest.id}/review`, {
        status: reviewStatus,
        rejectionReason: reviewStatus === "REJECTED" ? rejectionReason.trim() : undefined,
      })

      toast({
        title: `Solicitud ${reviewStatus === "APPROVED" ? "aprobada" : "rechazada"}`,
        description: `La solicitud de edición ha sido ${reviewStatus === "APPROVED" ? "aprobada" : "rechazada"} exitosamente.`,
      })

      setShowReviewDialog(false)
      setSelectedRequest(null)
      setReviewStatus(null)
      setRejectionReason("")
      await loadEditRequests()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al procesar la solicitud",
      })
    } finally {
      setIsSubmitting(false)
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

  const getUserName = (user: { username: string; first_name: string | null; last_name: string | null }) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.username
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product?.name || "Producto desconocido"
  }

  return (
    <RoleGuard requireAdmin>
      <div className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Edición de Recepciones</h1>
          <p className="mt-2 text-muted-foreground">
            Revisa y aprueba o rechaza las solicitudes de edición de recepciones del almacén
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex gap-2">
          <Button
            variant={filterStatus === "PENDING" ? "default" : "outline"}
            onClick={() => setFilterStatus("PENDING")}
          >
            Pendientes
          </Button>
          <Button
            variant={filterStatus === "APPROVED" ? "default" : "outline"}
            onClick={() => setFilterStatus("APPROVED")}
          >
            Aprobadas
          </Button>
          <Button
            variant={filterStatus === "REJECTED" ? "default" : "outline"}
            onClick={() => setFilterStatus("REJECTED")}
          >
            Rechazadas
          </Button>
          <Button
            variant={filterStatus === "" ? "default" : "outline"}
            onClick={() => setFilterStatus("")}
          >
            Todas
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : editRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filterStatus === "PENDING" 
                  ? "No hay solicitudes pendientes"
                  : filterStatus 
                    ? `No hay solicitudes ${filterStatus === "APPROVED" ? "aprobadas" : "rechazadas"}`
                    : "No hay solicitudes de edición"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {editRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">
                          Solicitud de Edición - {formatDate(request.warehouse_receipt.receipt_date)}
                        </CardTitle>
                        {request.status === "PENDING" && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Pendiente
                          </span>
                        )}
                        {request.status === "APPROVED" && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Aprobada
                          </span>
                        )}
                        {request.status === "REJECTED" && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Rechazada
                          </span>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        <div className="space-y-1">
                          <p>Ubicación: {request.warehouse_receipt.location.name}</p>
                          <p>Solicitado por: {getUserName(request.requester)}</p>
                          <p>Creado el: {formatDate(request.created_at)}</p>
                          {request.status !== "PENDING" && request.approver && (
                            <p>
                              {request.status === "APPROVED" ? "Aprobado" : "Rechazado"} por: {getUserName(request.approver)}
                            </p>
                          )}
                          {request.rejection_reason && (
                            <p className="text-red-600">Motivo: {request.rejection_reason}</p>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    {request.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewClick(request)}
                      >
                        Revisar
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Revisión */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Revisar Solicitud de Edición</DialogTitle>
              <DialogDescription>
                {selectedRequest && `Recepción del ${formatDate(selectedRequest.warehouse_receipt.receipt_date)} en ${selectedRequest.warehouse_receipt.location.name}`}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solicitado por</p>
                    <p className="text-base">{getUserName(selectedRequest.requester)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Firmado por</p>
                    <p className="text-base">
                      {selectedRequest.warehouse_receipt.confirmed_by_name || "No disponible"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de solicitud</p>
                    <p className="text-base">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                </div>

                {/* Datos Actuales (Antes) */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Datos Actuales</p>
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Fecha: {formatDate(selectedRequest.warehouse_receipt.receipt_date.split('T')[0])}</p>
                    </div>
                    {selectedRequest.warehouse_receipt.notes && (
                      <div>
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm">{selectedRequest.warehouse_receipt.notes}</p>
                      </div>
                    )}
                    {!selectedRequest.warehouse_receipt.notes && (
                      <div>
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm text-muted-foreground italic">Sin notas</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-2">Productos:</p>
                      <div className="border rounded divide-y bg-background">
                        {selectedRequest.warehouse_receipt.receipt_items && selectedRequest.warehouse_receipt.receipt_items.length > 0 ? (
                          selectedRequest.warehouse_receipt.receipt_items.map((item) => (
                            <div key={item.id} className="p-2 flex items-center justify-between">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 ml-2">{item.product_variant.product.name}</span>
                              <span className="font-semibold">{item.quantity_received} unidades</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground italic">Sin productos</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cambios Propuestos (Después) */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Cambios Propuestos</p>
                  <div className="border rounded-lg p-4 space-y-3 border-primary/50 bg-primary/5">
                    <div>
                      <p className="text-sm font-medium">Fecha: {formatDate(selectedRequest.proposed_data.date)}</p>
                    </div>
                    {selectedRequest.proposed_data.notes ? (
                      <div>
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm">{selectedRequest.proposed_data.notes}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">Notas:</p>
                        <p className="text-sm text-muted-foreground italic">Sin notas</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-2">Productos:</p>
                      <div className="border rounded divide-y bg-background">
                        {selectedRequest.proposed_data.items.map((item, index) => (
                          <div key={index} className="p-2 flex items-center justify-between">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 ml-2">{getProductName(item.productId)}</span>
                            <span className="font-semibold">{item.quantityReceived} unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Decisión</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={reviewStatus === "APPROVED" ? "default" : "outline"}
                      onClick={() => setReviewStatus("APPROVED")}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprobar
                    </Button>
                    <Button
                      variant={reviewStatus === "REJECTED" ? "destructive" : "outline"}
                      onClick={() => setReviewStatus("REJECTED")}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                </div>

                {reviewStatus === "REJECTED" && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Motivo del rechazo (opcional)</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Opcional: Explica por qué se rechaza esta solicitud..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Puedes dejar este campo vacío si no deseas proporcionar un motivo.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewDialog(false)
                  setSelectedRequest(null)
                  setReviewStatus(null)
                  setRejectionReason("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewStatus || isSubmitting}
                variant={reviewStatus === "REJECTED" ? "destructive" : "default"}
              >
                {isSubmitting ? "Procesando..." : reviewStatus === "APPROVED" ? "Aprobar" : "Rechazar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

