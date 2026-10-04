import { z, ZodError } from 'zod'
import type { Bindings } from '../types'

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message) }
}

export const demoOrganizationId = 'demo'
export async function currentOrganizationId(env: Bindings) {
  const row = await env.DB.prepare('SELECT id FROM organizations WHERE id = ?').bind(demoOrganizationId).first()
  if (!row) throw new ApiError('ORGANIZATION_NOT_FOUND', 'Организация не найдена', 404)
  return demoOrganizationId
}

export function validId(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new ApiError('INVALID_ID', 'Некорректный идентификатор')
  return id
}

export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown
  try { body = await request.json() } catch { throw new ApiError('INVALID_JSON', 'Некорректный JSON') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', parsed.error.issues.map(issue => issue.message).join('; '))
  return parsed.data
}

export function listParams(url: string) {
  const params = new URL(url).searchParams
  const page = Number(params.get('page') || 1)
  const pageSize = Number(params.get('pageSize') || 20)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new ApiError('INVALID_PAGINATION', 'Некорректная страница или размер страницы')
  return { page, pageSize, search: (params.get('search') || '').trim().slice(0, 160), category: params.get('category') || 'all', warehouse: params.get('warehouse') || 'all', status: params.get('status') || 'all' }
}

export function databaseError(error: unknown): never {
  if (error instanceof ApiError || error instanceof ZodError) throw error
  const message = String(error)
  if (message.includes('products_org_sku_uq') || message.includes('products.organization_id, products.sku')) throw new ApiError('SKU_ALREADY_EXISTS', 'Товар с таким артикулом уже существует', 409)
  if (message.includes('barcodes_org_barcode_uq') || message.includes('product_barcodes.organization_id, product_barcodes.barcode')) throw new ApiError('BARCODE_ALREADY_EXISTS', 'Штрихкод уже используется', 409)
  if (message.includes('warehouses_org_code_uq') || message.includes('warehouses.organization_id, warehouses.code')) throw new ApiError('WAREHOUSE_CODE_EXISTS', 'Код склада уже используется', 409)
  throw error
}

export function status(active: boolean, available: number, minimum: number) {
  return !active ? 'archived' : available <= 0 ? 'out' : available <= minimum ? 'low' : 'ok'
}
