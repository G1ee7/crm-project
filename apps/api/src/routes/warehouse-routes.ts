import { Hono } from 'hono'
import { warehouseInputSchema } from '@warehouse/shared'
import { ApiError, currentOrganizationId, databaseError, jsonBody } from '../catalog/common'
import type { Bindings } from '../types'

export const warehouseRoutes = new Hono<{ Bindings: Bindings }>()
function warehouseId(id: string) { if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new ApiError('INVALID_ID', 'Некорректный идентификатор'); return id }

warehouseRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const result = await c.env.DB.prepare('SELECT w.id, w.name, w.code, w.address, w.is_active AS isActive, coalesce(sum(b.quantity), 0) quantity FROM warehouses w LEFT JOIN stock_balances b ON b.organization_id = w.organization_id AND b.warehouse_id = w.id WHERE w.organization_id = ? GROUP BY w.id ORDER BY w.is_active DESC, w.name').bind(org).all()
  return c.json(result.results.map(row => ({ ...row, isActive: !!row.isActive, quantity: Number(row.quantity) })))
})

warehouseRoutes.get('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const row = await c.env.DB.prepare('SELECT id, name, code, address, is_active AS isActive FROM warehouses WHERE organization_id = ? AND id = ?').bind(org, warehouseId(c.req.param('id'))).first()
  if (!row) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден', 404)
  return c.json({ ...row, isActive: !!row.isActive })
})

warehouseRoutes.post('/', async c => {
  const org = await currentOrganizationId(c.env)
  const input = await jsonBody(c.req.raw, warehouseInputSchema.omit({ isActive: true }))
  const id = crypto.randomUUID()
  try { await c.env.DB.prepare('INSERT INTO warehouses (id, organization_id, name, code, address, is_active) VALUES (?, ?, ?, ?, ?, 1)').bind(id, org, input.name, input.code.toUpperCase(), input.address || null).run() } catch (error) { databaseError(error) }
  return c.json({ id, name: input.name, code: input.code.toUpperCase(), address: input.address || null, isActive: true }, 201)
})

warehouseRoutes.patch('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = warehouseId(c.req.param('id'))
  const input = await jsonBody(c.req.raw, warehouseInputSchema.partial())
  const current = await c.env.DB.prepare('SELECT * FROM warehouses WHERE organization_id = ? AND id = ?').bind(org, id).first<Record<string, unknown>>()
  if (!current) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден', 404)
  if (input.isActive === false && current.is_active) {
    const balance = await c.env.DB.prepare('SELECT 1 FROM stock_balances WHERE organization_id = ? AND warehouse_id = ? AND (quantity <> 0 OR reserved <> 0) LIMIT 1').bind(org, id).first()
    if (balance) throw new ApiError('WAREHOUSE_HAS_STOCK', 'На складе есть остатки. Перед архивированием их нужно обработать складскими операциями.', 409)
  }
  const name = input.name ?? current.name
  const code = input.code?.toUpperCase() ?? current.code
  const address = input.address === undefined ? current.address : input.address
  const isActive = input.isActive === undefined ? !!current.is_active : input.isActive
  try { await c.env.DB.prepare('UPDATE warehouses SET name = ?, code = ?, address = ?, is_active = ?, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ?').bind(name, code, address, isActive ? 1 : 0, org, id).run() } catch (error) { databaseError(error) }
  return c.json({ id, name, code, address, isActive })
})
