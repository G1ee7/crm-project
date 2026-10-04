export type StockMovementType =
  | 'RECEIPT'
  | 'ISSUE'
  | 'SALE'
  | 'RETURN'
  | 'WRITEOFF'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'

export interface DemoOrganization {
  id: string
  name: string
  currency: 'KZT'
}

export type CatalogStatus = 'ok' | 'low' | 'out' | 'archived'
export interface Category { id: string; name: string; description: string | null; productCount: number }
export interface WarehouseRecord { id: string; name: string; code: string; address: string | null; isActive: boolean; quantity?: number }
export interface SupplierRecord { id: string; name: string; bin: string | null; phone: string | null }
export interface CatalogProduct {
  id: string; name: string; sku: string; categoryId: string | null; category: string | null
  description: string | null; purchasePrice: number; salePrice: number; unit: string
  minimumStock: number; isActive: boolean; quantity: number; reserved: number; available: number
  status: CatalogStatus; barcodes: string[]
}
export interface ProductDetail extends CatalogProduct { balances: { warehouseId: string; warehouseName: string; quantity: number; reserved: number; available: number }[] }
export interface InventoryRow { productId: string; name: string; sku: string; categoryId: string | null; category: string | null; warehouseId: string; warehouseName: string; quantity: number; reserved: number; available: number; minimumStock: number; status: CatalogStatus }
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number }

export type DocumentKind = 'receipts' | 'issues' | 'writeoffs' | 'transfers'
export type DocumentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED'
export interface DocumentItem { id: string; productId: string; productName: string; sku: string; quantity: number; unitCostMinor?: number }
export interface WarehouseDocument {
  id: string; number: string; status: DocumentStatus; comment: string | null
  warehouseId?: string; fromWarehouseId?: string; toWarehouseId?: string
  supplierId?: string | null; reason?: string; revision: number; createdBy: string
  createdAt: number; postedAt: number | null; items: DocumentItem[]
  positions?: number; totalQuantity?: number; totalCostMinor?: number; authorName?: string; supplierName?: string | null
}
export type DocumentInput = {
  warehouseId?: string; fromWarehouseId?: string; toWarehouseId?: string
  supplierId?: string | null; reason?: string; comment?: string | null
  items: { productId: string; quantity: number; unitCostMinor?: number }[]
}
export interface StockMovement {
  id: string; documentType: DocumentKind; documentId: string; documentNumber: string | null
  productId: string; productName: string; sku: string; warehouseId: string; warehouseName: string
  type: StockMovementType; quantityDelta: number; unitCostMinor: number | null; note: string | null; createdAt: number
  createdBy?: string; actorName?: string
}
