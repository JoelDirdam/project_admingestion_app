"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ProductionByDateResponse } from "@/lib/types"
import { Package, AlertCircle } from "lucide-react"

interface ProductionDetailProps {
  date: string | null
  data: ProductionByDateResponse | null
  isLoading: boolean
  error: string | null
}

export function ProductionDetail({
  date,
  data,
  isLoading,
  error,
}: ProductionDetailProps) {
  const formatDate = (dateString: string): string => {
    // Parsear la fecha como fecha local para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return date.toLocaleDateString("es-ES", options)
  }

  if (!date) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Selecciona una fecha para ver el detalle de producción
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Producción - {formatDate(date)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              No hay producción registrada para esta fecha
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const totalUnits = data.products.reduce(
    (sum, product) => sum + product.quantityProduced,
    0,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Producción - {formatDate(date)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Total de unidades:</span>
            <span className="text-2xl font-bold">{totalUnits}</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Productos producidos:
            </h4>
            {data.products.map((product) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="font-medium">{product.productName}</span>
                <span className="text-lg font-semibold">
                  {product.quantityProduced} unidades
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}




