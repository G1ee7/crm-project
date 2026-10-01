export type StockMovementType =
  | 'RECEIPT'
  | 'SALE'
  | 'RETURN'
  | 'WRITEOFF'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'

export type StockStatus = 'ok' | 'low' | 'out'

export interface DemoOrganization {
  id: string
  name: string
  currency: 'KZT'
}

export interface ProductSummary {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  minimum: number
  retailPrice: number
  status: StockStatus
  image?: string
}
