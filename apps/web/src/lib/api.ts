import type { CatalogProduct, Category, CustomerRecord, DashboardChart, DashboardSummary, DocumentInput, DocumentKind, InventoryRow, PageResult, ProductDetail, SaleInput, SaleRecord, SaleReturnInput, SaleReturnRecord, StockMovement, SupplierRecord, WarehouseDocument, WarehouseRecord } from '@warehouse/types'
import type { ProductInput } from '@warehouse/shared'

export class ApiClientError extends Error { constructor(public code: string, message: string) { super(message) } }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }) }
  catch { throw new ApiClientError('NETWORK_ERROR', 'Нет соединения с сервером') }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null
    throw new ApiClientError(body?.error?.code ?? 'REQUEST_FAILED', body?.error?.message ?? 'Не удалось выполнить запрос')
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export type ProductFilters = { search?: string; category?: string; warehouse?: string; status?: string; page?: number; pageSize?: number }
function query(filters: ProductFilters) { return new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== 'all').map(([key, value]) => [key, String(value)])).toString() }
export const api = {
  categories: () => request<Category[]>('/categories'),
  createCategory: (body: { name: string; description?: string | null }) => request<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: { name?: string; description?: string | null }) => request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  warehouses: () => request<WarehouseRecord[]>('/warehouses'),
  suppliers: () => request<SupplierRecord[]>('/suppliers'),
  createSupplier: (body: { name: string }) => request<SupplierRecord>('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  createWarehouse: (body: { name: string; code: string; address?: string | null }) => request<WarehouseRecord>('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
  updateWarehouse: (id: string, body: { name?: string; code?: string; address?: string | null; isActive?: boolean }) => request<WarehouseRecord>(`/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  products: (filters: ProductFilters) => request<PageResult<CatalogProduct>>(`/products?${query(filters)}`),
  product: (id: string) => request<ProductDetail>(`/products/${id}`),
  createProduct: (body: ProductInput) => request<{ id: string }>('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Partial<ProductInput>) => request<{ id: string }>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archiveProduct: (id: string) => request<{ id: string; isActive: false }>(`/products/${id}`, { method: 'DELETE' }),
  inventory: (filters: ProductFilters) => request<PageResult<InventoryRow> & { summary: { quantity: number; reserved: number; available: number; inventoryValueMinor: number } }>(`/inventory?${query(filters)}`),
  documents: (kind: DocumentKind, filters: { status?: string; search?: string; warehouse?: string; supplier?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) => request<PageResult<WarehouseDocument>>(`/${kind}?${query(filters)}`),
  document: (kind: DocumentKind, id: string) => request<WarehouseDocument>(`/${kind}/${id}`),
  createDocument: (kind: DocumentKind, body: DocumentInput) => request<WarehouseDocument>(`/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
  updateDocument: (kind: DocumentKind, id: string, body: DocumentInput) => request<WarehouseDocument>(`/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  postDocument: (kind: DocumentKind, id: string) => request<WarehouseDocument>(`/${kind}/${id}/post`, { method: 'POST' }),
  cancelDocument: (kind: DocumentKind, id: string) => request<WarehouseDocument>(`/${kind}/${id}/cancel`, { method: 'POST' }),
  movements: (filters: { productId?: string; warehouseId?: string; documentType?: string; documentId?: string; search?: string; type?: string; actor?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) => request<PageResult<StockMovement>>(`/stock-movements?${query(filters)}`),
  customers: (filters: { search?: string; page?: number; pageSize?: number } = {}) => request<PageResult<CustomerRecord>>(`/customers?${query(filters)}`),
  customer: (id: string) => request<CustomerRecord>(`/customers/${id}`),
  createCustomer: (body: Omit<CustomerRecord, 'id' | 'salesCount' | 'sales'>) => request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: string, body: Omit<CustomerRecord, 'id' | 'salesCount' | 'sales'>) => request<CustomerRecord>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  sales: (filters: { status?: string; search?: string; warehouse?: string; customer?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}) => request<PageResult<SaleRecord>>(`/sales?${query(filters)}`),
  sale: (id: string) => request<SaleRecord>(`/sales/${id}`),
  createSale: (body: SaleInput) => request<SaleRecord>('/sales', { method: 'POST', body: JSON.stringify(body) }),
  updateSale: (id: string, body: SaleInput) => request<SaleRecord>(`/sales/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  postSale: (id: string) => request<SaleRecord>(`/sales/${id}/post`, { method: 'POST' }),
  cancelSale: (id: string) => request<SaleRecord>(`/sales/${id}/cancel`, { method: 'POST' }),
  saleReturns: (filters: { status?: string; search?: string; saleId?: string; page?: number; pageSize?: number } = {}) => request<PageResult<SaleReturnRecord>>(`/sale-returns?${query(filters)}`),
  saleReturn: (id: string) => request<SaleReturnRecord>(`/sale-returns/${id}`),
  createSaleReturn: (body: SaleReturnInput) => request<SaleReturnRecord>('/sale-returns', { method: 'POST', body: JSON.stringify(body) }),
  updateSaleReturn: (id: string, body: SaleReturnInput) => request<SaleReturnRecord>(`/sale-returns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  postSaleReturn: (id: string) => request<SaleReturnRecord>(`/sale-returns/${id}/post`, { method: 'POST' }),
  cancelSaleReturn: (id: string) => request<SaleReturnRecord>(`/sale-returns/${id}/cancel`, { method: 'POST' }),
  dashboardSummary: (days: number) => request<DashboardSummary>(`/dashboard/summary?days=${days}`),
  dashboardChart: (days: number) => request<DashboardChart>(`/dashboard/chart?days=${days}`),
}
