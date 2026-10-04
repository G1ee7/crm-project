import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, currentOrganizationId, jsonBody, listParams, validId } from '../catalog/common'
import type { Bindings } from '../types'

const inputSchema = z.object({ name: z.string().trim().min(1).max(160), phone: z.string().trim().max(40).nullable().optional(), email: z.email().max(160).nullable().optional(), bin: z.string().trim().max(20).nullable().optional(), comment: z.string().trim().max(1000).nullable().optional() }).strict()
export const customerRoutes = new Hono<{ Bindings: Bindings }>()
customerRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env), { page, pageSize, search } = listParams(c.req.url)
  const term = `%${search}%`
  const count = await c.env.DB.prepare('SELECT COUNT(*) n FROM customers WHERE organization_id=? AND (name LIKE ? OR phone LIKE ? OR bin LIKE ?)').bind(org,term,term,term).first<{n:number}>()
  const rows = await c.env.DB.prepare('SELECT c.id,c.name,c.phone,c.email,c.bin,c.comment,c.created_at createdAt,COUNT(s.id) salesCount FROM customers c LEFT JOIN sales s ON s.organization_id=c.organization_id AND s.customer_id=c.id AND s.status=\'POSTED\' WHERE c.organization_id=? AND (c.name LIKE ? OR c.phone LIKE ? OR c.bin LIKE ?) GROUP BY c.id ORDER BY c.name LIMIT ? OFFSET ?').bind(org,term,term,term,pageSize,(page-1)*pageSize).all()
  return c.json({items:rows.results,total:count?.n??0,page,pageSize})
})
customerRoutes.get('/:id', async c => {
  const org=await currentOrganizationId(c.env),id=validId(c.req.param('id'))
  const row=await c.env.DB.prepare('SELECT id,name,phone,email,bin,comment,created_at createdAt,updated_at updatedAt FROM customers WHERE organization_id=? AND id=?').bind(org,id).first()
  if(!row)throw new ApiError('CUSTOMER_NOT_FOUND','Клиент не найден',404)
  const sales=await c.env.DB.prepare('SELECT id,number,status,total_minor totalMinor,gross_profit_minor grossProfitMinor,created_at createdAt,posted_at postedAt FROM sales WHERE organization_id=? AND customer_id=? ORDER BY created_at DESC LIMIT 50').bind(org,id).all()
  return c.json({...row,sales:sales.results})
})
customerRoutes.post('/', async c => {
  const org=await currentOrganizationId(c.env),input=await jsonBody(c.req.raw,inputSchema),id=crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO customers(id,organization_id,name,phone,email,bin,comment) VALUES(?,?,?,?,?,?,?)').bind(id,org,input.name,input.phone??null,input.email??null,input.bin??null,input.comment??null).run()
  return c.json({id,...input},201)
})
customerRoutes.patch('/:id', async c => {
  const org=await currentOrganizationId(c.env),id=validId(c.req.param('id')),input=await jsonBody(c.req.raw,inputSchema)
  const result=await c.env.DB.prepare('UPDATE customers SET name=?,phone=?,email=?,bin=?,comment=?,updated_at=unixepoch()*1000 WHERE organization_id=? AND id=?').bind(input.name,input.phone??null,input.email??null,input.bin??null,input.comment??null,org,id).run()
  if(!result.meta.changes)throw new ApiError('CUSTOMER_NOT_FOUND','Клиент не найден',404)
  return c.json(await c.env.DB.prepare('SELECT id,name,phone,email,bin,comment FROM customers WHERE organization_id=? AND id=?').bind(org,id).first())
})
