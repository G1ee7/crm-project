import { Hono } from 'hono'
import { categoryInputSchema } from '@warehouse/shared'
import { ApiError, currentOrganizationId, databaseError, jsonBody, validId } from '../catalog/common'
import type { Bindings } from '../types'

export const categoryRoutes = new Hono<{ Bindings: Bindings }>()

categoryRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const result = await c.env.DB.prepare(`SELECT c.id, c.name, c.description, count(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.organization_id = c.organization_id AND p.category_id = c.id WHERE c.organization_id = ? GROUP BY c.id ORDER BY c.name`).bind(org).all()
  return c.json(result.results)
})

categoryRoutes.post('/', async c => {
  const org = await currentOrganizationId(c.env)
  const input = await jsonBody(c.req.raw, categoryInputSchema)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO categories (id, organization_id, name, description) VALUES (?, ?, ?, ?)').bind(id, org, input.name, input.description || null).run()
  return c.json({ id, ...input, description: input.description || null, productCount: 0 }, 201)
})

categoryRoutes.patch('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = validId(c.req.param('id'))
  const input = await jsonBody(c.req.raw, categoryInputSchema.partial())
  const current = await c.env.DB.prepare('SELECT * FROM categories WHERE organization_id = ? AND id = ?').bind(org, id).first()
  if (!current) throw new ApiError('CATEGORY_NOT_FOUND', 'Категория не найдена', 404)
  await c.env.DB.prepare('UPDATE categories SET name = ?, description = ?, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ?').bind(input.name ?? current.name, input.description === undefined ? current.description : input.description, org, id).run()
  return c.json({ id, name: input.name ?? current.name, description: input.description === undefined ? current.description : input.description })
})

categoryRoutes.delete('/:id', async c => {
  const org = await currentOrganizationId(c.env)
  const id = validId(c.req.param('id'))
  const exists = await c.env.DB.prepare('SELECT id FROM categories WHERE organization_id = ? AND id = ?').bind(org, id).first()
  if (!exists) throw new ApiError('CATEGORY_NOT_FOUND', 'Категория не найдена', 404)
  const used = await c.env.DB.prepare('SELECT id FROM products WHERE organization_id = ? AND category_id = ? LIMIT 1').bind(org, id).first()
  if (used) throw new ApiError('CATEGORY_IN_USE', 'Сначала уберите товары из категории', 409)
  try { await c.env.DB.prepare('DELETE FROM categories WHERE organization_id = ? AND id = ?').bind(org, id).run() } catch (error) { if (String(error).includes('FOREIGN KEY')) throw new ApiError('CATEGORY_IN_USE', 'Сначала уберите товары из категории', 409); databaseError(error) }
  return c.body(null, 204)
})
