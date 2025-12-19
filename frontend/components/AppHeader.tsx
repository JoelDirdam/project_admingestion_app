"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, Bell, X } from "lucide-react"
import { auth } from "@/lib/auth"
import { apiClient } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"

interface AppHeaderProps {
  onMenuClick: () => void
}

interface Notification {
  id: string
  type: string
  payload: string | object
  read: boolean
  created_at: string
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const user = auth.getUser()
  const isAdmin = auth.isAdmin()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadNotifications()
      // Recargar notificaciones cada 30 segundos
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin])

  const loadNotifications = async () => {
    try {
      const data = await apiClient.get<Notification[]>("/notifications?unreadOnly=true")
      setNotifications(data)
      setUnreadCount(data.length)
    } catch (err: any) {
      console.error("Error al cargar notificaciones:", err)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`)
      await loadNotifications()
      toast({
        title: "Notificación marcada como leída",
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al marcar la notificación como leída",
      })
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    try {
      const payload = typeof notification.payload === 'string' 
        ? JSON.parse(notification.payload) 
        : notification.payload
      if (notification.type === "WAREHOUSE_RECEIPT_CONFIRMED") {
        return `Recepción de almacén confirmada para ${payload.date} en ${payload.location} por ${payload.confirmedByName}`
      }
      return "Nueva notificación"
    } catch {
      return "Nueva notificación"
    }
  }

  const handleLogout = () => {
    auth.logout()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-lg font-semibold">Panadería La Paz</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notificaciones - Solo para ADMIN */}
          {isAdmin && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <Card className="absolute right-0 mt-2 w-80 z-50 max-h-96 overflow-y-auto">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Notificaciones</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowNotifications(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay notificaciones nuevas
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <Alert key={notification.id} className="cursor-pointer hover:bg-muted/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="flex-1">
                            <p className="text-sm">{getNotificationMessage(notification)}</p>
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-2 h-auto p-0 text-xs"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Marcar como leída
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Dropdown de Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">{user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
