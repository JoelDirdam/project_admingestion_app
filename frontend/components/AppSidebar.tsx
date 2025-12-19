"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Package, ClipboardList, Warehouse, UserPlus, Store, ShoppingBag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  {
    title: "Inicio",
    href: "/admin",
    icon: Home,
    adminOnly: false,
    warehouseAccess: true,
    sellerAccess: false,
    exactMatch: true,
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package,
    adminOnly: true,
    warehouseAccess: false,
    sellerAccess: false,
  },
  {
    title: "Producción",
    href: "/admin/production",
    icon: ClipboardList,
    adminOnly: true,
    warehouseAccess: false,
    sellerAccess: false,
  },
  {
    title: "Almacén",
    href: "/warehouse",
    icon: Warehouse,
    adminOnly: false,
    warehouseAccess: true,
    sellerAccess: false,
  },
  {
    title: "Sucursales",
    href: "/admin/branches",
    icon: Store,
    adminOnly: true,
    warehouseAccess: false,
    sellerAccess: false,
  },
  {
    title: "Ventas",
    href: "/admin/sales",
    icon: ShoppingBag,
    adminOnly: true,
    warehouseAccess: false,
    sellerAccess: false,
  },
]

const adminOnlyItems = [
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: UserPlus,
    adminOnly: true,
    warehouseAccess: false,
  },
]

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = auth.isAdmin()
  const isSeller = auth.isSeller()
  const hasWarehouseAccess = auth.hasWarehouseAccess()

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.warehouseAccess && !hasWarehouseAccess) return false
    if (item.sellerAccess && !isSeller) return false
    return true
  })

  const filteredAdminItems = adminOnlyItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.warehouseAccess && !hasWarehouseAccess) return false
    return true
  })

  // Items específicos para sellers
  const sellerItems = [
    {
      title: "Inicio",
      href: "/seller",
      icon: Home,
      exactMatch: true,
    },
    {
      title: "Ventas",
      href: "/seller/sales",
      icon: ShoppingBag,
    },
  ]

  const isItemActive = (item: { href: string; exactMatch?: boolean }) => {
    // Si tiene exactMatch, solo activo en la ruta exacta
    if (item.exactMatch) {
      return pathname === item.href
    }
    // Para otros items, activo si coincide o es subruta
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Mobile close button */}
          <div className="flex h-16 items-center justify-between border-b px-4 md:hidden">
            <span className="text-lg font-semibold">Menú</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}

            {/* Separador para opciones de administración */}
            {filteredAdminItems.length > 0 && (
              <>
                <div className="my-4 border-t" />
                {filteredAdminItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  )
                })}
              </>
            )}

            {/* Items para sellers */}
            {isSeller && !isAdmin && (
              <>
                <div className="my-4 border-t" />
                {sellerItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.exactMatch 
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/")

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">Admin Panel v1.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
