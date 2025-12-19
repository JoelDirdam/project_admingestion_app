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
import { AlertCircle, Plus, Users, Edit } from "lucide-react"
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
  const [branches, setBranches] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "WAREHOUSE" as "WAREHOUSE" | "ADMIN" | "USER" | "SELLER",
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
    loadBranches()
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

  const loadBranches = async () => {
    try {
      const data = await apiClient.get<Location[]>("/branches")
      setBranches(data)
    } catch (err: any) {
      console.error("Error al cargar sucursales:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validar que si es SELLER, tenga location_id
    if (formData.role === "SELLER" && !formData.location_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Los vendedores deben estar asociados a una sucursal",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const payload: any = {
        username: formData.username.trim(),
        role: formData.role,
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
        email: formData.email.trim() || undefined,
        location_id: formData.location_id && formData.location_id !== "none" ? formData.location_id : undefined,
      }

      // Solo incluir password si se está creando o si se cambió
      if (!editingUser || formData.password) {
        payload.password = formData.password
      }

      if (editingUser) {
        await apiClient.patch(`/users/${editingUser.id}`, payload)
        toast({
          title: "Usuario actualizado",
          description: `El usuario ${formData.username} ha sido actualizado exitosamente.`,
        })
      } else {
        await apiClient.post("/users", payload)
        toast({
          title: "Usuario creado",
          description: `El usuario ${formData.username} ha sido creado exitosamente.`,
        })
      }

      setShowDialog(false)
      resetForm()
      loadUsers()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || (editingUser ? "Error al actualizar usuario" : "Error al crear usuario"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "", // No pre-llenar contraseña por seguridad
      role: user.role as "WAREHOUSE" | "ADMIN" | "USER" | "SELLER",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      location_id: user.location_id || "",
    })
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingUser(null)
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      WAREHOUSE: "Almacén",
      USER: "Usuario",
      SELLER: "Vendedor",
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-purple-100 text-purple-800",
      WAREHOUSE: "bg-blue-100 text-blue-800",
      USER: "bg-gray-100 text-gray-800",
      SELLER: "bg-blue-100 text-blue-800",
    }
    return colors[role] || "bg-gray-100 text-gray-800"
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios del Sistema
          </CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>{user.location ? user.location.name : "-"}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza los datos del usuario. Deja la contraseña en blanco para mantener la actual."
                : "Completa el formulario para crear un nuevo usuario. Los campos marcados con * son obligatorios."}
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
                    disabled={!!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-muted-foreground">
                      El nombre de usuario no se puede modificar
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña {!editingUser && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={editingUser ? "Dejar en blanco para mantener la actual" : "Mínimo 6 caracteres"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!editingUser}
                    minLength={editingUser ? 0 : 6}
                  />
                  {editingUser && (
                    <p className="text-xs text-muted-foreground">
                      Solo completa si deseas cambiar la contraseña
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "WAREHOUSE" | "ADMIN" | "USER" | "SELLER") => {
                    setFormData({ ...formData, role: value, location_id: "" })
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="SELLER">Vendedor</SelectItem>
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

              {formData.role === "SELLER" && (
                <div className="space-y-2">
                  <Label htmlFor="branch_id">
                    Sucursal <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.location_id || undefined}
                    onValueChange={(value) =>
                      setFormData({ ...formData, location_id: value === "none" ? "" : value })
                    }
                    required
                  >
                    <SelectTrigger id="branch_id">
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No hay sucursales disponibles
                        </SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El vendedor debe estar asociado a una sucursal
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
                {isSubmitting ? (editingUser ? "Actualizando..." : "Creando...") : (editingUser ? "Actualizar" : "Crear Usuario")}
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
