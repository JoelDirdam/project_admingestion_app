'use client'

import { auth } from '@/lib/auth'
import { SalesList } from '@/components/sales/SalesList'

export default function SalesHistoryPage() {
  // Permite acceso a sellers (ven sus ventas) y admins (ven todas)
  const isSeller = auth.isSeller()
  const isAdmin = auth.isAdmin()

  if (!isSeller && !isAdmin) {
    return null // El layout o ProtectedRoute manejará la redirección
  }

  // Usa la misma vista compartida pero en modo seller (sin filtros de admin)
  return <SalesList adminMode={false} />
}

