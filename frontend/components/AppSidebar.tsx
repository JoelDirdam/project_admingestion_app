"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Package, ClipboardList, X } from "lucide-react"
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
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package,
    adminOnly: true,
  },
  {
    title: "Producción",
    href: "/admin/production",
    icon: ClipboardList,
    adminOnly: true,
  },
]

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = auth.isAdmin()

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

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
              const isActive = pathname === item.href

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
