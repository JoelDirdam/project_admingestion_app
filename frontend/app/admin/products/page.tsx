"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type { Product } from "@/lib/types"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Package } from "lucide-react" // Import the Package component

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    price_1: "",
    price_2: "",
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<Product[]>("/products")
      setProducts(data)
    } catch (err: any) {
      setError(err.message || "Error al cargar productos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        base_price: Number.parseFloat(formData.base_price),
        price_1: Number.parseFloat(formData.price_1),
        price_2: Number.parseFloat(formData.price_2),
      }

      if (editingProduct) {
        await apiClient.patch(`/products/${editingProduct.id}`, payload)
        toast({
          title: "Producto actualizado",
          description: "El producto se ha actualizado correctamente.",
        })
      } else {
        await apiClient.post("/products", payload)
        toast({
          title: "Producto creado",
          description: "El producto se ha creado correctamente.",
        })
      }

      setShowDialog(false)
      resetForm()
      loadProducts()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al guardar producto",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      base_price: Number(product.base_price).toString(),
      price_1: Number(product.price_1).toString(),
      price_2: Number(product.price_2).toString(),
    })
    setShowDialog(true)
  }

  const handleNew = () => {
    resetForm()
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      description: "",
      base_price: "",
      price_1: "",
      price_2: "",
    })
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    setIsDeleting(true)
    try {
      await apiClient.delete(`/products/${productToDelete.id}`)
      toast({
        title: "Producto eliminado",
        description: `El producto "${productToDelete.name}" ha sido marcado como inactivo.`,
      })
      setShowDeleteDialog(false)
      setProductToDelete(null)
      loadProducts()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al eliminar el producto",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <RoleGuard requireAdmin>
      <div className="container max-w-6xl py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
            <p className="mt-2 text-muted-foreground">Administrar productos (Roscas) y sus precios</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No hay productos registrados</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">Comienza creando tu primer producto</p>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Producto
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Precio Lista</TableHead>
                      <TableHead className="text-right">Precio 1</TableHead>
                      <TableHead className="text-right">Precio 2</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.description || "-"}</TableCell>
                        <TableCell className="text-right">${Number(product.base_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${Number(product.price_1).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${Number(product.price_2).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {product.is_active ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Activo
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Inactivo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                              <Edit className="mr-2 h-3 w-3" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Actualiza los datos del producto"
                    : "Completa los datos para crear un nuevo producto"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Rosca de Canela"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del producto"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_price">
                      Precio Lista <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.base_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, base_price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_1">
                      Precio 1 (5%) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price_1"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price_1: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_2">
                      Precio 2 (10%) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price_2"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price_2: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : editingProduct ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de eliminación */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Confirmar Eliminación
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar el producto{" "}
                <span className="font-semibold text-foreground">"{productToDelete?.name}"</span>?
              </DialogDescription>
            </DialogHeader>

            {/* <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                El producto será marcado como inactivo. Esta acción no eliminará los registros históricos
                de producción o ventas asociados a este producto.
              </AlertDescription>
            </Alert>
            */}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setProductToDelete(null)
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}
