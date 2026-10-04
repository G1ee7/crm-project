import { Hono } from 'hono'
import { productInputSchema } from '@warehouse/shared'
import type { CatalogProduct, ProductDetail } from '@warehouse/types'
import { ApiError, currentOrganizationId, databaseError, jsonBody, listParams, status, validId } from '../catalog/common'
import type { Bindings } from '../types'

export const productRoutes = new Hono<{ Bindings: Bindings }>()

const catalogCte = `WITH stock AS (
  SELECT product_id, sum(quantity) quantity, sum(reserved) reserved FROM stock_balances
  WHERE organization_id = ? AND (? = 'all' OR warehouse_id = ?) GROUP BY product_id
), catalog AS (
  SELECT p.id, p.name, p.sku, p.category_id AS categoryId, c.name AS category,
    p.description, p.purchase_price AS purchasePrice, p.sale_price AS salePrice, p.unit,
    p.minimum_stock AS minimumStock, p.is_active AS isActive,
    coalesce(s.quantity, 0) quantity, coalesce(s.reserved, 0) reserved,
    coalesce(s.quantity, 0) - coalesce(s.reserved, 0) available,
    CASE WHEN p.is_active = 0 THEN 'archived'
      WHEN coalesce(s.quantity, 0) - coalesce(s.reserved, 0) <= 0 THEN 'out'
      WHEN coalesce(s.quantity, 0) - coalesce(s.reserved, 0) <= p.minimum_stock THEN 'low'
      ELSE 'ok' END status
  FROM products p LEFT JOIN categories c ON c.organization_id = p.organization_id AND c.id = p.category_id
  LEFT JOIN stock s ON s.product_id = p.id WHERE p.organization_id = ?
), filtered AS (
  SELECT * FROM catalog WHERE (? = '' OR name LIKE ? OR sku LIKE ? OR EXISTS (
    SELECT 1 FROM product_barcodes b WHERE b.organization_id = ? AND b.product_id = catalog.id AND b.barcode LIKE ?
  )) AND (? = 'all' OR categoryId = ?) AND (? = 'all' OR status = ?)
)`

function fromRow(row: Record<string, unknown>): CatalogProduct {
  const available = Number(row.available ?? 0)
  const minimumStock = Number(row.minimumStock)
  const isActive = !!row.isActive
  return { id: String(row.id), name: String(row.name), sku: String(row.sku), categoryId: row.categoryId as string | null, category: row.category as string | null, description: row.description as string | null, purchasePrice: Number(row.purchasePrice), salePrice: Number(row.salePrice), unit: String(row.unit), minimumStock, isActive, quantity: Number(row.quantity), reserved: Number(row.reserved), available, status: status(isActive, available, minimumStock), barcodes: [] }
}

async function assertCategory(env: Bindings, org: string, categoryId: string | null | undefined) {
  if (!categoryId) return
  validId(categoryId)
  const exists = await env.DB.prepare('SELECT id FROM categories WHERE organization_id = ? AND id = ?').bind(org, categoryId).first()
  if (!exists) throw new ApiError('CATEGORY_NOT_FOUND', 'Категория не найдена', 400)
}

productRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const { page, pageSize, search, category, warehouse, status: state } = listParams(c.req.url)
  if (category !== 'all') validId(category)
  if (warehouse !== 'all') {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(warehouse)) throw new ApiError('INVALID_ID', 'Некорректный склад')
    const exists = await c.env.DB.prepare('SELECT 1 FROM warehouses WHERE organization_id = ? AND id = ?').bind(org, warehouse).first()
    if (!exists) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден', 400)
  }
  if (!['all', 'ok', 'low', 'out', 'archived'].includes(state)) throw new ApiError('INVALID_STATUS', 'Некорректный статус')
  const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`
  const params = [org, warehouse, warehouse, org, search, like, like, org, like, category, category, state, state]
  const count = await c.env.DB.prepare(`${catalogCte} SELECT count(*) total FROM filtered`).bind(...params).first<{ total: number }>()
  const result = await c.env.DB.prepare(`${catalogCte} SELECT * FROM filtered ORDER BY name, id LIMIT ? OFFSET ?`).bind(...params, pageSize, (page - 1) * pageSize).all()
  return c.json({ items: result.results.map(row => fromRow(row as Record<string, unknown>)), total: count?.total ?? 0, page, pageSize })
})

productRoutes.get('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = validId(c.req.param('id'))
  const row = await c.env.DB.prepare(`SELECT p.id, p.name, p.sku, p.category_id AS categoryId, c.name AS category, p.description, p.purchase_price AS purchasePrice, p.sale_price AS salePrice, p.unit, p.minimum_stock AS minimumStock, p.is_active AS isActive FROM products p LEFT JOIN categories c ON c.organization_id = p.organization_id AND c.id = p.category_id WHERE p.organization_id = ? AND p.id = ?`).bind(org, id).first()
  if (!row) throw new ApiError('PRODUCT_NOT_FOUND', 'Товар не найден', 404)
  const [balances, barcodes] = await Promise.all([
    c.env.DB.prepare('SELECT w.id warehouseId, w.name warehouseName, b.quantity, b.reserved, b.quantity - b.reserved available FROM stock_balances b JOIN warehouses w ON w.organization_id = b.organization_id AND w.id = b.warehouse_id WHERE b.organization_id = ? AND b.product_id = ? ORDER BY w.name').bind(org, id).all(),
    c.env.DB.prepare('SELECT barcode FROM product_barcodes WHERE organization_id = ? AND product_id = ? ORDER BY created_at, id').bind(org, id).all(),
  ])
  const quantity = balances.results.reduce((sum, item) => sum + Number(item.quantity), 0)
  const reserved = balances.results.reduce((sum, item) => sum + Number(item.reserved), 0)
  const detail: ProductDetail = { ...fromRow({ ...row, quantity, reserved, available: quantity - reserved }), barcodes: barcodes.results.map(item => String(item.barcode)), balances: balances.results.map(item => ({ warehouseId: String(item.warehouseId), warehouseName: String(item.warehouseName), quantity: Number(item.quantity), reserved: Number(item.reserved), available: Number(item.available) })) }
  return c.json(detail)
})

productRoutes.post('/', async c => {
  const org = await currentOrganizationId(c.env)
  const input = await jsonBody(c.req.raw, productInputSchema)
  await assertCategory(c.env, org, input.categoryId)
  const id = crypto.randomUUID()
  const sku = input.sku.toUpperCase()
  const statements = [c.env.DB.prepare('INSERT INTO products (id, organization_id, category_id, name, sku, description, purchase_price, sale_price, unit, minimum_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, org, input.categoryId ?? null, input.name, sku, input.description ?? null, input.purchasePrice, input.salePrice, input.unit, input.minimumStock), ...input.barcodes.map(barcode => c.env.DB.prepare('INSERT INTO product_barcodes (id, organization_id, product_id, barcode) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), org, id, barcode))]
  try { await c.env.DB.batch(statements) } catch (error) { databaseError(error) }
  return c.json({ id }, 201)
})

productRoutes.patch('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = validId(c.req.param('id'))
  const input = await jsonBody(c.req.raw, productInputSchema.partial())
  const current = await c.env.DB.prepare('SELECT * FROM products WHERE organization_id = ? AND id = ?').bind(org, id).first<Record<string, unknown>>()
  if (!current) throw new ApiError('PRODUCT_NOT_FOUND', 'Товар не найден', 404)
  await assertCategory(c.env, org, input.categoryId)
  const statements = [c.env.DB.prepare('UPDATE products SET name = ?, sku = ?, category_id = ?, description = ?, purchase_price = ?, sale_price = ?, unit = ?, minimum_stock = ?, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ?').bind(input.name ?? current.name, input.sku?.toUpperCase() ?? current.sku, input.categoryId === undefined ? current.category_id : input.categoryId, input.description === undefined ? current.description : input.description, input.purchasePrice ?? current.purchase_price, input.salePrice ?? current.sale_price, input.unit ?? current.unit, input.minimumStock ?? current.minimum_stock, org, id)]
  if (input.barcodes) { statements.push(c.env.DB.prepare('DELETE FROM product_barcodes WHERE organization_id = ? AND product_id = ?').bind(org, id)); for (const barcode of input.barcodes) statements.push(c.env.DB.prepare('INSERT INTO product_barcodes (id, organization_id, product_id, barcode) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), org, id, barcode)) }
  try { await c.env.DB.batch(statements) } catch (error) { databaseError(error) }
  return c.json({ id })
})

productRoutes.delete('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = validId(c.req.param('id'))
  const result = await c.env.DB.prepare('UPDATE products SET is_active = 0, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ?').bind(org, id).run()
  if (!result.meta.changes) throw new ApiError('PRODUCT_NOT_FOUND', 'Товар не найден', 404)
  return c.json({ id, isActive: false })
})
