import { Hono } from 'hono'
import { z } from 'zod'
import { currentOrganizationId, jsonBody } from '../catalog/common'
import type { Bindings } from '../types'

export const supplierRoutes = new Hono<{ Bindings: Bindings }>()
supplierRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const rows = await c.env.DB.prepare('SELECT id, name, bin, phone FROM suppliers WHERE organization_id = ? ORDER BY name').bind(org).all()
  return c.json(rows.results)
})
supplierRoutes.post('/', async c => {
  const org = await currentOrganizationId(c.env)
  const input = await jsonBody(c.req.raw, z.object({ name: z.string().trim().min(1).max(160), bin: z.string().trim().max(20).nullable().optional(), phone: z.string().trim().max(40).nullable().optional() }).strict())
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO suppliers (id, organization_id, name, bin, phone) VALUES (?, ?, ?, ?, ?)').bind(id, org, input.name, input.bin ?? null, input.phone ?? null).run()
  return c.json({ id, ...input }, 201)
})
