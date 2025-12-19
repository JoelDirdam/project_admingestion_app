export interface User {
  id: string
  username: string
  role: "ADMIN" | "USER" | "WAREHOUSE" | "SELLER"
  location_id?: string
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

// Branch (Sucursal) types
export interface Branch {
  id: string
  name: string
  type: string
  address?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBranchDto {
  name: string
  address?: string
  contact_name?: string
  contact_phone?: string
}

// Seller (Vendedor) types
export interface Seller {
  id: string
  username: string
  first_name?: string | null
  last_name?: string | null
  role: string
  location_id: string | null
  is_active: boolean
  created_at: string
}

export interface CreateSellerDto {
  username: string
  password: string
  first_name?: string
  last_name?: string
}

// Campaign types
export interface Campaign {
  id: string
  name: string
  description?: string | null
  start_date: string
  end_date: string
  status: string
  created_at: string
  updated_at: string
}

// Product Variant with Prices
export interface ProductVariantWithPrice {
  id: string
  name: string
  sku?: string | null
  product: {
    id: string
    name: string
    base_price: number | string
    price_1: number | string
    price_2: number | string
  }
  price_configs: Array<{
    id: string
    price: number | string
    cost?: number | string | null
  }>
}

// Sale types
export interface SaleItem {
  id: string
  product_variant_id: string
  quantity: number
  unit_price: number | string
  subtotal: number | string
  product_variant: {
    id: string
    name: string
    product: {
      id: string
      name: string
    }
  }
}

export interface Sale {
  id: string
  company_id: string
  campaign_id: string
  location_id: string
  user_id: string
  sale_number: string
  sale_date: string
  channel: string
  customer_name?: string | null
  total: number | string
  notes?: string | null
  created_at: string
  updated_at: string
  sale_items: SaleItem[]
  location: {
    id: string
    name: string
    type: string
  }
  user: {
    id: string
    username: string
    first_name?: string | null
    last_name?: string | null
  }
}

export interface CreateSaleItemDto {
  product_variant_id: string
  quantity: number
  unit_price: number
}

export interface CreateSaleDto {
  location_id?: string
  sale_date: string
  channel: string
  customer_name?: string
  notes?: string
  items: CreateSaleItemDto[]
}
