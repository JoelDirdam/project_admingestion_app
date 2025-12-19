'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { SalesList } from '@/components/sales/SalesList'

export default function AdminSalesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <SalesList adminMode={true} />
    </ProtectedRoute>
  )
}

