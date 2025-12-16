"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type {
  Product,
  ProductionBatchPayload,
  ProductionSummaryItem,
  ProductionByDateResponse,
} from "@/lib/types"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Package, Calendar, List } from "lucide-react"
import { ProductionCalendar } from "@/components/production/ProductionCalendar"
import { ProductionListView } from "@/components/production/ProductionListView"
import { ProductionDetail } from "@/components/production/ProductionDetail"

type ViewMode = "calendar" | "list"

export default function ProductionPage() {
  // Estados para el formulario de producción
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para las vistas de calendario/lista
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [summary, setSummary] = useState<ProductionSummaryItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [detailData, setDetailData] = useState<ProductionByDateResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
    loadSummary()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadDetail(selectedDate)
    } else {
      setDetailData(null)
      setDetailError(null)
    }
  }, [selectedDate])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<Product[]>("/products")
      const activeProducts = data.filter((p) => p.is_active)
      setProducts(activeProducts)

      // Inicializar cantidades en 0
      const initialQuantities: Record<string, string> = {}
      activeProducts.forEach((product) => {
        initialQuantities[product.id] = "0"
      })
      setQuantities(initialQuantities)
    } catch (err: any) {
      setError(err.message || "Error al cargar productos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      setSummaryLoading(true)
      // Cargar resumen de los últimos 30 días
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 30)
      const toDate = new Date()

      const data = await apiClient.get<ProductionSummaryItem[]>(
        `/production-batches/summary?fromDate=${fromDate.toISOString().split("T")[0]}&toDate=${toDate.toISOString().split("T")[0]}`,
      )
      setSummary(data)
    } catch (err: any) {
      console.error("Error al cargar resumen:", err)
      setSummary([])
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadDetail = async (date: string) => {
    try {
      setDetailLoading(true)
      setDetailError(null)
      const data = await apiClient.get<ProductionByDateResponse>(
        `/production-batches/by-date?date=${date}`,
      )
      setDetailData(data)
    } catch (err: any) {
      setDetailError(err.message || "Error al cargar detalle")
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + (Number.parseInt(qty) || 0), 0)
  }

  const getProductsWithQuantity = () => {
    return Object.entries(quantities).filter(([_, qty]) => Number.parseInt(qty) > 0).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Filtrar solo productos con cantidad > 0
      const items = Object.entries(quantities)
        .filter(([_, qty]) => Number.parseInt(qty) > 0)
        .map(([productId, qty]) => ({
          productId,
          quantityProduced: Number.parseInt(qty, 10),
        }))

      if (items.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debes ingresar al menos una cantidad mayor a 0",
        })
        setIsSubmitting(false)
        return
      }

      const payload: ProductionBatchPayload = {
        date,
        items,
      }

      await apiClient.post("/production-batches", payload)

      toast({
        title: "Producción registrada",
        description: `Se registraron ${items.length} productos con un total de ${getTotalQuantity()} unidades.`,
      })

      // Limpiar cantidades
      const resetQuantities: Record<string, string> = {}
      products.forEach((product) => {
        resetQuantities[product.id] = "0"
      })
      setQuantities(resetQuantities)

      // Recargar resumen y detalle si la fecha coincide
      await loadSummary()
      if (selectedDate === date) {
        await loadDetail(date)
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al registrar la producción",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuantityChange = (productId: string, value: string) => {
    // Solo permitir números >= 0
    if (value === "" || (!isNaN(Number.parseInt(value, 10)) && Number.parseInt(value, 10) >= 0)) {
      setQuantities({ ...quantities, [productId]: value || "0" })
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setDate(date) // También actualizar la fecha del formulario
  }

  const totalQuantity = getTotalQuantity()
  const productsWithQuantity = getProductsWithQuantity()

  return (
    <RoleGuard requireAdmin>
      <div className="container max-w-7xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Producción</h1>
          <p className="mt-2 text-muted-foreground">
            Visualiza y registra la producción diaria de roscas
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toggle de vista */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Vista de Calendario
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Vista de Lista
          </Button>
        </div>

        {/* Grid principal: Vista + Detalle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vista de Calendario o Lista */}
          <div>
            {summaryLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Skeleton className="h-64 w-full" />
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "calendar" ? (
              <ProductionCalendar
                summary={summary}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            ) : (
              <ProductionListView
                summary={summary}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            )}
          </div>

          {/* Detalle de Producción */}
          <div>
            <ProductionDetail
              date={selectedDate}
              data={detailData}
              isLoading={detailLoading}
              error={detailError}
            />
          </div>
        </div>

        {/* Formulario de Registro */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Registrar Nueva Producción</CardTitle>
            <CardDescription>Ingresa la cantidad de roscas producidas para una fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="max-w-xs">
                <Label htmlFor="date">Fecha de Producción</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="mb-3 block">Cantidades Producidas</Label>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : products.length === 0 ? (
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      No hay productos activos. Por favor, crea productos primero en la sección de
                      Gestión de Productos.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-4 rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Precio Lista: ${Number(product.base_price).toFixed(2)} | Precio 1: $
                            {Number(product.price_1).toFixed(2)} | Precio 2: $
                            {Number(product.price_2).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${product.id}`} className="text-sm whitespace-nowrap">
                            Cantidad:
                          </Label>
                          <Input
                            id={`qty-${product.id}`}
                            type="number"
                            min="0"
                            value={quantities[product.id] || "0"}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            className="w-24 text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalQuantity > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Resumen</p>
                    <p className="text-lg font-semibold">
                      {productsWithQuantity} {productsWithQuantity === 1 ? "producto" : "productos"}
                      {" · "}
                      {totalQuantity} {totalQuantity === 1 ? "unidad" : "unidades"} total
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || products.length === 0 || totalQuantity === 0}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Registrando..." : "Registrar Producción"}
                </Button>
              </div>

              {totalQuantity === 0 && products.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Ingresa al menos una cantidad mayor a 0 para registrar la producción
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
