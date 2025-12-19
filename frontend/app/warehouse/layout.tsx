"use client"

import type React from "react"

import { useState } from "react"
import { AppHeader } from "@/components/AppHeader"
import { AppSidebar } from "@/components/AppSidebar"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col">
          <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}




