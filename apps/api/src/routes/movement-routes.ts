import { Hono } from 'hono'
import { ApiError, currentOrganizationId, listParams, validId } from '../catalog/common'
import type { Bindings } from '../types'

export const movementRoutes = new Hono<{ Bindings: Bindings }>()

movementRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const { page, pageSize, search } = listParams(c.req.url)
  const params = new URL(c.req.url).searchParams
  const product = params.get('productId') || ''
  const warehouse = params.get('warehouseId') || ''
  const documentType = params.get('documentType') || ''
  const documentId = params.get('documentId') || ''
  const type = params.get('type') || ''
  const actor = params.get('actor') || ''
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  if (product) validId(product)
  if (documentId) validId(documentId)
  if (warehouse && !/^[a-zA-Z0-9-]{1,80}$/.test(warehouse)) throw new ApiError('INVALID_ID', 'Некорректный склад')
  if (documentType && !['receipts', 'issues', 'writeoffs', 'transfers', 'sales', 'sale_returns'].includes(documentType)) throw new ApiError('INVALID_DOCUMENT_TYPE', 'Некорректный тип документа')
  if (type && !['RECEIPT', 'ISSUE', 'WRITEOFF', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE', 'SALE_RETURN'].includes(type)) throw new ApiError('INVALID_TYPE', 'Некорректный тип операции')
  if (actor && !/^[a-zA-Z0-9-]{1,80}$/.test(actor)) throw new ApiError('INVALID_ACTOR', 'Некорректный сотрудник')
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) throw new ApiError('INVALID_PERIOD', 'Некорректный период')
  const conditions = ['m.organization_id = ?']
  const args: (string | number)[] = [org]
  if (product) { conditions.push('m.product_id = ?'); args.push(product) }
  if (warehouse) { conditions.push('m.warehouse_id = ?'); args.push(warehouse) }
  if (documentType) { conditions.push('m.document_type = ?'); args.push(documentType) }
  if (documentId) { conditions.push('m.document_id = ?'); args.push(documentId) }
  if (type) { conditions.push('m.type = ?'); args.push(type) }
  if (actor) { conditions.push('m.created_by = ?'); args.push(actor) }
  if (from) { const value = Date.parse(`${from}T00:00:00Z`); if (!Number.isFinite(value)) throw new ApiError('INVALID_PERIOD', 'Некорректный период'); conditions.push('m.created_at >= ?'); args.push(value) }
  if (to) { const value = Date.parse(`${to}T00:00:00Z`); if (!Number.isFinite(value)) throw new ApiError('INVALID_PERIOD', 'Некорректный период'); conditions.push('m.created_at < ?'); args.push(value + 86400000) }
  if (search) { conditions.push(`(p.name LIKE ? OR p.sku LIKE ? OR m.reference_id LIKE ? OR EXISTS (SELECT 1 FROM product_barcodes b WHERE b.organization_id = m.organization_id AND b.product_id = m.product_id AND b.barcode LIKE ?))`); args.push(...Array(4).fill(`%${search}%`)) }
  const where = conditions.join(' AND ')
  const joins = 'JOIN products p ON p.organization_id = m.organization_id AND p.id = m.product_id JOIN warehouses w ON w.organization_id = m.organization_id AND w.id = m.warehouse_id LEFT JOIN users u ON u.organization_id = m.organization_id AND u.id = m.created_by'
  const count = await c.env.DB.prepare(`SELECT count(*) total FROM stock_movements m ${joins} WHERE ${where}`).bind(...args).first<{ total: number }>()
  const rows = await c.env.DB.prepare(`SELECT m.id, m.document_type documentType, m.document_id documentId, m.reference_id documentNumber, m.product_id productId, p.name productName, p.sku, m.warehouse_id warehouseId, w.name warehouseName, m.type, m.quantity_delta quantityDelta, m.unit_cost_minor unitCostMinor, m.value_delta_minor valueDeltaMinor, m.note, m.created_by createdBy, u.name actorName, m.created_at createdAt FROM stock_movements m ${joins} WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all()
  return c.json({ items: rows.results, total: count?.total ?? 0, page, pageSize })
})
