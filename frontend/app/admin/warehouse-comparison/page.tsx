"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, BarChart3 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ComparisonItem {
  productId: string
  productName: string
  producedTotal: number
  receivedTotal: number
  difference: number
}

interface ComparisonResponse {
  date: string
  comparison: ComparisonItem[]
}

export default function WarehouseComparisonPage() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadComparison = useCallback(async () => {
    if (!date) return

    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<ComparisonResponse>(`/warehouse/comparison?date=${date}`)
      setComparison(data)
    } catch (err: any) {
      setError(err.message || "Error al cargar la comparación")
      setComparison(null)
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadComparison()
  }, [loadComparison])

  const formatDate = (dateString: string) => {
    // Parsear la fecha como fecha local para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Comparación Producción vs Almacén</h1>
          <p className="mt-2 text-muted-foreground">
            Compara lo producido con lo recibido en almacén para una fecha específica
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Fecha</CardTitle>
            <CardDescription>Elige la fecha para comparar producción y recepciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : comparison ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle>Comparación para {formatDate(comparison.date)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {comparison.comparison.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hay datos de producción o recepciones para esta fecha
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Producido</TableHead>
                        <TableHead className="text-right">Recibido</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.comparison.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.producedTotal}</TableCell>
                          <TableCell className="text-right">{item.receivedTotal}</TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              item.difference === 0
                                ? "text-green-600"
                                : item.difference > 0
                                  ? "text-blue-600"
                                  : "text-red-600"
                            }`}
                          >
                            {item.difference > 0 ? "+" : ""}
                            {item.difference}
                            {item.difference !== 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({item.difference > 0 ? "sobrante" : "faltante"})
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}

