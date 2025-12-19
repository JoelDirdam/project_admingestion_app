export interface User {
  id: string
  username: string
  role: "ADMIN" | "USER" | "WAREHOUSE"
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Product {
  id: string
  name: string
  description?: string | null
  base_price: number | string
  price_1: number | string
  price_2: number | string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductFormData {
  name: string
  description?: string
  base_price: number
  price_1: number
  price_2: number
}

export interface ProductionBatchItem {
  productId: string
  quantityProduced: number
}

export interface ProductionBatchPayload {
  date: string
  items: ProductionBatchItem[]
}

export interface ProductionSummaryItem {
  date: string
  totalUnits: number
  batchCount: number
}

export interface ProductionByDateProduct {
  productId: string
  productName: string
  quantityProduced: number
}

export interface ProductionByDateResponse {
  date: string
  products: ProductionByDateProduct[]
}