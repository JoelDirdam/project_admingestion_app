"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type { Product, ProductionBatchPayload } from "@/lib/types"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Package } from "lucide-react"

export default function ProductionPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
  }, [])

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

  const totalQuantity = getTotalQuantity()
  const productsWithQuantity = getProductsWithQuantity()

  return (
    <RoleGuard requireAdmin>
      <div className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Registro de Producción Diaria</h1>
          <p className="mt-2 text-muted-foreground">Ingresa la cantidad de roscas producidas por día</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fecha de Producción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cantidades Producidas</CardTitle>
              <CardDescription>Ingresa la cantidad de cada producto producido</CardDescription>
            </CardHeader>
            <CardContent>
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
                    No hay productos activos. Por favor, crea productos primero en la sección de Gestión de Productos.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Precio Lista: ${Number(product.base_price).toFixed(2)} | Precio 1: $
                          {Number(product.price_1).toFixed(2)} | Precio 2: ${Number(product.price_2).toFixed(2)}
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
            </CardContent>
          </Card>

          {totalQuantity > 0 && (
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
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
              </CardContent>
            </Card>
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
      </div>
    </RoleGuard>
  )
}
