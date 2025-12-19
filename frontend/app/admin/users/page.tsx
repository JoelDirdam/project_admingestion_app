"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Plus, Users, CheckCircle2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Location {
  id: string
  name: string
  type: string
}

interface User {
  id: string
  username: string
  role: string
  first_name: string | null
  last_name: string | null
  email: string | null
  location_id: string | null
  is_active: boolean
  created_at: string
  location: {
    id: string
    name: string
    type: string
  } | null
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "WAREHOUSE" as "WAREHOUSE" | "ADMIN" | "USER",
    first_name: "",
    last_name: "",
    email: "",
    location_id: "",
  })
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false)
  const [newLocationData, setNewLocationData] = useState({
    name: "",
    address: "",
    contact_name: "",
    contact_phone: "",
  })
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)

  useEffect(() => {
    loadUsers()
    loadLocations()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError("")
      const data = await apiClient.get<User[]>("/users")
      setUsers(data)
    } catch (err: any) {
      setError(err.message || "Error al cargar usuarios")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
        email: formData.email.trim() || undefined,
        location_id: formData.location_id && formData.location_id !== "none" ? formData.location_id : undefined,
      }

      await apiClient.post("/users", payload)
      toast({
        title: "Usuario creado",
        description: `El usuario ${formData.username} ha sido creado exitosamente.`,
      })

      setShowDialog(false)
      resetForm()
      loadUsers()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al crear usuario",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "WAREHOUSE",
      first_name: "",
      last_name: "",
      email: "",
      location_id: "",
    })
  }

  const handleNew = () => {
    resetForm()
    setShowDialog(true)
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

      // Agregar la nueva ubicación a la lista
      await loadLocations()
      
      // Seleccionar la nueva ubicación en el formulario
      setFormData({ ...formData, location_id: location.id })
      
      // Cerrar el diálogo y limpiar el formulario
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

  const formatDate = (dateString: string) => {
    // Parsear la fecha como fecha local para evitar problemas de zona horaria
    // Si viene como ISO string, extraer solo la parte de fecha
    const dateOnly = dateString.split('T')[0]
    const [year, month, day] = dateOnly.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      WAREHOUSE: "Almacén",
      USER: "Usuario",
    }
    return labels[role] || role
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="mt-2 text-muted-foreground">
            Crear y administrar usuarios del sistema
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Usuario
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.first_name || user.last_name
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {getRoleLabel(user.role)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.location ? user.location.name : "-"}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Activo
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Inactivo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear usuario */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear un nuevo usuario. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Nombre de Usuario <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="ej: bodega_centro"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "WAREHOUSE" | "ADMIN" | "USER") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "WAREHOUSE" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="location_id">Ubicación (Almacén)</Label>
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
                    value={formData.location_id || undefined}
                    onValueChange={(value) =>
                      setFormData({ ...formData, location_id: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger id="location_id">
                      <SelectValue placeholder="Selecciona una ubicación (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin ubicación</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Asocia el usuario a un almacén específico (opcional)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="Nombre"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Apellido"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear nueva ubicación */}
      <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Ubicación</DialogTitle>
            <DialogDescription>
              Crea una nueva ubicación de tipo Almacén para asociar usuarios
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

