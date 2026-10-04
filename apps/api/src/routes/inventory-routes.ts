import { Hono } from 'hono'
import { ApiError, currentOrganizationId, listParams, status, validId } from '../catalog/common'
import type { Bindings } from '../types'

export const inventoryRoutes = new Hono<{ Bindings: Bindings }>()

const base = `WITH rows AS (
 SELECT p.id productId, p.name, p.sku, p.category_id categoryId, c.name category,
 w.id warehouseId, w.name warehouseName, b.quantity, b.reserved,
 b.quantity - b.reserved available, p.minimum_stock minimumStock, p.is_active isActive
 FROM stock_balances b JOIN products p ON p.organization_id = b.organization_id AND p.id = b.product_id
 JOIN warehouses w ON w.organization_id = b.organization_id AND w.id = b.warehouse_id
 LEFT JOIN categories c ON c.organization_id = p.organization_id AND c.id = p.category_id
 WHERE b.organization_id = ? AND (? = 'all' OR w.id = ?)
), filtered AS (SELECT * FROM rows WHERE (? = '' OR name LIKE ? OR sku LIKE ?)
 AND (? = 'all' OR categoryId = ?) AND (? = 'all' OR (available <= minimumStock AND isActive = 1)))`

inventoryRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const { page, pageSize, search, category, warehouse, status: onlyLow } = listParams(c.req.url)
  if (category !== 'all') validId(category)
  if (onlyLow !== 'all' && onlyLow !== 'low') throw new ApiError('INVALID_STATUS', 'Некорректный фильтр')
  if (warehouse !== 'all') {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(warehouse)) throw new ApiError('INVALID_ID', 'Некорректный склад')
    const exists = await c.env.DB.prepare('SELECT 1 FROM warehouses WHERE organization_id = ? AND id = ?').bind(org, warehouse).first()
    if (!exists) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден', 400)
  }
  const like = `%${search}%`
  const args = [org, warehouse, warehouse, search, like, like, category, category, onlyLow]
  const summary = await c.env.DB.prepare(`${base} SELECT count(*) total, coalesce(sum(quantity), 0) quantity, coalesce(sum(reserved), 0) reserved FROM filtered`).bind(...args).first<{total: number; quantity: number; reserved: number}>()
  const result = await c.env.DB.prepare(`${base} SELECT * FROM filtered ORDER BY name, warehouseName LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all()
  const items = result.results.map(row => ({ ...row, quantity: Number(row.quantity), reserved: Number(row.reserved), available: Number(row.available), minimumStock: Number(row.minimumStock), status: status(!!row.isActive, Number(row.available), Number(row.minimumStock)), isActive: undefined }))
  return c.json({ items, total: summary?.total ?? 0, page, pageSize, summary: { quantity: summary?.quantity ?? 0, reserved: summary?.reserved ?? 0, available: (summary?.quantity ?? 0) - (summary?.reserved ?? 0) } })
})
