import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, currentOrganizationId, jsonBody, listParams, validId } from '../catalog/common'
import type { Bindings } from '../types'

const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const saleInput = z.object({ warehouseId: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/), customerId: z.string().uuid().nullable().optional(), comment: z.string().trim().max(1000).nullable().optional(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(1_000_000_000), unitPriceMinor: money, discountMinor: money.default(0) }).strict()).min(1).max(100) }).strict()
type SaleInput = z.infer<typeof saleInput>
const returnInput = z.object({ saleId: z.string().uuid(), comment: z.string().trim().max(1000).nullable().optional(), items: z.array(z.object({ saleItemId: z.string().uuid(), quantity: z.number().int().positive().max(1_000_000_000) }).strict()).min(1).max(100) }).strict()
type ReturnInput = z.infer<typeof returnInput>
const maxMoney = BigInt(Number.MAX_SAFE_INTEGER)
const uuid = () => crypto.randomUUID()
type SaleHeader = { id: string; number: string; status: string; warehouseId: string; customerId: string | null; customerName: string | null; comment: string | null; subtotalMinor: number; discountMinor: number; totalMinor: number; costTotalMinor: number; grossProfitMinor: number; revision: number; createdAt: number; postedAt: number | null }
type ReturnHeader = { id: string; number: string; saleId: string; saleNumber: string; status: string; comment: string | null; totalMinor: number; costTotalMinor: number; grossProfitMinor: number; revision: number; createdAt: number; postedAt: number | null }

function translate(error: unknown): never {
  if (error instanceof ApiError) throw error
  const message = String(error)
  if (message.includes('INSUFFICIENT_STOCK')) throw new ApiError('INSUFFICIENT_STOCK', 'Недостаточно доступного остатка на складе', 409)
  if (message.includes('RETURN_EXCEEDS_SALE')) throw new ApiError('RETURN_EXCEEDS_SALE', 'Количество возвратов превышает количество в продаже', 409)
  if (message.includes('DOCUMENT_CHANGED') || message.includes('document_finalizations_org_doc_uq')) throw new ApiError('DOCUMENT_CHANGED', 'Документ уже изменён или проведён', 409)
  if (message.includes('REFERENCE_CHANGED')) throw new ApiError('REFERENCE_CHANGED', 'Склад или товар изменился после создания черновика', 409)
  if (message.includes('INVALID_STOCK_VALUE')) throw new ApiError('INVALID_STOCK_VALUE', 'Превышен допустимый предел стоимости остатка', 409)
  if (message.includes('FOREIGN KEY constraint failed')) throw new ApiError('REFERENCE_CHANGED', 'Связанные данные изменились', 409)
  throw error
}

function saleTotals(input: SaleInput) {
  if (new Set(input.items.map(item => item.productId)).size !== input.items.length) throw new ApiError('DUPLICATE_PRODUCT', 'Товар повторяется в продаже')
  let subtotal = 0n, discount = 0n
  const items = input.items.map(item => {
    const gross = BigInt(item.quantity) * BigInt(item.unitPriceMinor)
    const deduction = BigInt(item.discountMinor)
    if (gross > maxMoney) throw new ApiError('AMOUNT_TOO_LARGE', 'Сумма строки превышает допустимый предел')
    if (deduction > gross) throw new ApiError('INVALID_DISCOUNT', 'Скидка превышает сумму строки')
    subtotal += gross; discount += deduction
    if (subtotal > maxMoney || discount > maxMoney) throw new ApiError('AMOUNT_TOO_LARGE', 'Сумма продажи превышает допустимый предел')
    return { ...item, lineTotalMinor: Number(gross - deduction) }
  })
  return { items, subtotalMinor: Number(subtotal), discountMinor: Number(discount), totalMinor: Number(subtotal - discount) }
}

async function validateSaleReferences(db: D1Database, org: string, input: SaleInput) {
  const warehouse = await db.prepare('SELECT is_active active FROM warehouses WHERE organization_id=? AND id=?').bind(org, input.warehouseId).first<{ active: number }>()
  if (!warehouse?.active) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден или архивирован')
  if (input.customerId && !await db.prepare('SELECT 1 FROM customers WHERE organization_id=? AND id=?').bind(org, input.customerId).first()) throw new ApiError('CUSTOMER_NOT_FOUND', 'Клиент не найден')
  const ids=input.items.map(item=>item.productId)
  const products=await db.prepare(`SELECT id FROM products WHERE organization_id=? AND is_active=1 AND id IN (${ids.map(()=>'?').join(',')})`).bind(org,...ids).all<{id:string}>()
  if(products.results.length!==ids.length) throw new ApiError('PRODUCT_NOT_FOUND','Товар не найден или архивирован')
}

async function getSale(db: D1Database, org: string, id: string) {
  const sale = await db.prepare('SELECT s.id,s.number,s.status,s.warehouse_id warehouseId,s.customer_id customerId,c.name customerName,s.comment,s.subtotal_minor subtotalMinor,s.discount_minor discountMinor,s.total_minor totalMinor,s.cost_total_minor costTotalMinor,s.gross_profit_minor grossProfitMinor,s.revision,s.created_at createdAt,s.posted_at postedAt FROM sales s LEFT JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.customer_id WHERE s.organization_id=? AND s.id=?').bind(org, id).first<SaleHeader>()
  if (!sale) throw new ApiError('DOCUMENT_NOT_FOUND', 'Продажа не найдена', 404)
  const items = await db.prepare('SELECT i.id,i.product_id productId,p.name productName,p.sku,i.quantity,i.unit_price_minor unitPriceMinor,i.discount_minor discountMinor,i.line_total_minor lineTotalMinor,i.unit_cost_snapshot_minor unitCostSnapshotMinor,i.cost_total_minor costTotalMinor,i.gross_profit_minor grossProfitMinor,COALESCE((SELECT SUM(ri.quantity) FROM sale_return_items ri JOIN sale_returns r ON r.organization_id=ri.organization_id AND r.id=ri.sale_return_id WHERE ri.organization_id=i.organization_id AND ri.sale_item_id=i.id AND r.status=\'POSTED\'),0) returnedQuantity FROM sale_items i JOIN products p ON p.organization_id=i.organization_id AND p.id=i.product_id WHERE i.organization_id=? AND i.sale_id=? ORDER BY p.name').bind(org, id).all()
  return { ...sale, items: items.results }
}

async function getReturn(db: D1Database, org: string, id: string) {
  const row = await db.prepare('SELECT r.id,r.number,r.sale_id saleId,s.number saleNumber,r.status,r.comment,r.total_minor totalMinor,r.cost_total_minor costTotalMinor,r.gross_profit_minor grossProfitMinor,r.revision,r.created_at createdAt,r.posted_at postedAt FROM sale_returns r JOIN sales s ON s.organization_id=r.organization_id AND s.id=r.sale_id WHERE r.organization_id=? AND r.id=?').bind(org, id).first<ReturnHeader>()
  if (!row) throw new ApiError('DOCUMENT_NOT_FOUND', 'Возврат не найден', 404)
  const items = await db.prepare('SELECT ri.id,ri.sale_item_id saleItemId,si.product_id productId,p.name productName,p.sku,ri.quantity,ri.amount_minor amountMinor,ri.cost_total_minor costTotalMinor,ri.gross_profit_minor grossProfitMinor FROM sale_return_items ri JOIN sale_items si ON si.organization_id=ri.organization_id AND si.id=ri.sale_item_id JOIN products p ON p.organization_id=si.organization_id AND p.id=si.product_id WHERE ri.organization_id=? AND ri.sale_return_id=? ORDER BY p.name').bind(org, id).all()
  return { ...row, items: items.results }
}

function itemInserts(db: D1Database, org: string, saleId: string, input: SaleInput) {
  return saleTotals(input).items.map(item => db.prepare('INSERT INTO sale_items(id,organization_id,sale_id,product_id,quantity,unit_price_minor,discount_minor,line_total_minor) VALUES(?,?,?,?,?,?,?,?)').bind(uuid(), org, saleId, item.productId, item.quantity, item.unitPriceMinor, item.discountMinor, item.lineTotalMinor))
}

export const salesRoutes = new Hono<{ Bindings: Bindings }>()
salesRoutes.get('/', async c => {
  const org = await currentOrganizationId(c.env)
  const { page, pageSize, status, search } = listParams(c.req.url)
  if (!['all','DRAFT','POSTED','CANCELLED'].includes(status)) throw new ApiError('INVALID_STATUS','Некорректный статус')
  const url = new URL(c.req.url), customer = url.searchParams.get('customer_id') || url.searchParams.get('customer') || '', warehouse = url.searchParams.get('warehouse_id') || url.searchParams.get('warehouse') || '', createdBy = url.searchParams.get('created_by') || ''
  if (customer) validId(customer)
  if (warehouse && !/^[a-zA-Z0-9-]{1,80}$/.test(warehouse)) throw new ApiError('INVALID_ID','Некорректный склад')
  if (createdBy && !/^[a-zA-Z0-9-]{1,80}$/.test(createdBy)) throw new ApiError('INVALID_ID','Некорректный сотрудник')
  const where = ['s.organization_id=?'], args: (string | number)[] = [org]
  if (status !== 'all') { where.push('s.status=?'); args.push(status) }
  if (customer) { where.push('s.customer_id=?'); args.push(customer) }
  if (warehouse) { where.push('s.warehouse_id=?'); args.push(warehouse) }
  if (createdBy) { where.push('s.created_by=?'); args.push(createdBy) }
  if (search) { where.push('(s.number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)'); args.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  for (const [key, op] of [['from','>='],['to','<']] as const) { const date = url.searchParams.get(key === 'from' ? 'date_from' : 'date_to') || url.searchParams.get(key); if (date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError('INVALID_PERIOD','Некорректный период'); const time = Date.parse(`${date}T00:00:00Z`); if (!Number.isFinite(time)) throw new ApiError('INVALID_PERIOD','Некорректный период'); where.push(`s.created_at ${op} ?`); args.push(time + (key === 'to' ? 86400000 : 0)) } }
  const join = 'LEFT JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.customer_id', filter = where.join(' AND ')
  const total = await c.env.DB.prepare(`SELECT COUNT(*) n FROM sales s ${join} WHERE ${filter}`).bind(...args).first<{ n: number }>()
  const rows = await c.env.DB.prepare(`SELECT s.id,s.number,s.status,s.warehouse_id warehouseId,s.customer_id customerId,c.name customerName,s.subtotal_minor subtotalMinor,s.discount_minor discountMinor,s.total_minor totalMinor,s.cost_total_minor costTotalMinor,s.gross_profit_minor grossProfitMinor,s.created_at createdAt,s.posted_at postedAt FROM sales s ${join} WHERE ${filter} ORDER BY s.created_at DESC,s.number DESC LIMIT ? OFFSET ?`).bind(...args,pageSize,(page-1)*pageSize).all()
  return c.json({ items: rows.results, total: total?.n ?? 0, page, pageSize })
})
salesRoutes.get('/:id', async c => c.json(await getSale(c.env.DB, await currentOrganizationId(c.env), validId(c.req.param('id')))))
salesRoutes.post('/', async c => {
  const org = await currentOrganizationId(c.env), input = await jsonBody(c.req.raw, saleInput), totals = saleTotals(input), db = c.env.DB
  await validateSaleReferences(db,org,input)
  const id = uuid()
  try { await db.batch([
    db.prepare("INSERT OR IGNORE INTO document_counters(organization_id,document_type,last_number) VALUES(?,'sales',0)").bind(org),
    db.prepare("UPDATE document_counters SET last_number=last_number+1 WHERE organization_id=? AND document_type='sales'").bind(org),
    db.prepare("INSERT INTO sales(id,organization_id,number,warehouse_id,customer_id,comment,subtotal_minor,discount_minor,total_minor,created_by) SELECT ?,?,'SA-'||printf('%06d',last_number),?,?,?,?,?,?,'demo-admin' FROM document_counters WHERE organization_id=? AND document_type='sales'").bind(id,org,input.warehouseId,input.customerId??null,input.comment??null,totals.subtotalMinor,totals.discountMinor,totals.totalMinor,org),
    ...itemInserts(db,org,id,input),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sales',?,'CREATE','demo-admin')").bind(uuid(),org,id),
  ]) } catch(error) { translate(error) }
  return c.json(await getSale(db,org,id),201)
})
salesRoutes.patch('/:id', async c => {
  const org = await currentOrganizationId(c.env), id = validId(c.req.param('id')), db = c.env.DB
  const current = await getSale(db,org,id)
  if (current.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED','Редактировать можно только черновик',409)
  const input = await jsonBody(c.req.raw,saleInput), totals = saleTotals(input)
  await validateSaleReferences(db,org,input)
  try { await db.batch([
    db.prepare("UPDATE sales SET warehouse_id=?,customer_id=?,comment=?,subtotal_minor=?,discount_minor=?,total_minor=?,revision=revision+1,updated_at=unixepoch()*1000 WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(input.warehouseId,input.customerId??null,input.comment??null,totals.subtotalMinor,totals.discountMinor,totals.totalMinor,org,id,Number(current.revision)),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id,details) VALUES(?,?,'sales',?,'UPDATE','demo-admin',?)").bind(uuid(),org,id,String(Number(current.revision)+1)),
    db.prepare('DELETE FROM sale_items WHERE organization_id=? AND sale_id=?').bind(org,id),
    ...itemInserts(db,org,id,input),
  ]) } catch(error) { translate(error) }
  return c.json(await getSale(db,org,id))
})
salesRoutes.post('/:id/post', async c => {
  const org = await currentOrganizationId(c.env), id = validId(c.req.param('id')), db = c.env.DB, sale = await getSale(db,org,id)
  if (sale.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED','Провести можно только черновик',409)
  await validateSaleReferences(db,org,{warehouseId:sale.warehouseId,customerId:sale.customerId,comment:sale.comment,items:(sale.items as {productId:string;quantity:number;unitPriceMinor:number;discountMinor:number}[]).map(item=>({productId:item.productId,quantity:item.quantity,unitPriceMinor:item.unitPriceMinor,discountMinor:item.discountMinor}))})
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO document_finalizations(id,organization_id,document_type,document_id,action,expected_revision) VALUES(?,?,'sales',?,'POST',?)").bind(uuid(),org,id,Number(sale.revision))]
  for (const item of sale.items as { id: string; productId: string; quantity: number }[]) {
    const quantity = Number(item.quantity), movementId = uuid()
    const allocation = `(inventory_value_minor / quantity) * CAST(? AS INTEGER) + ((inventory_value_minor % quantity) * CAST(? AS INTEGER) + quantity / 2) / quantity`
    statements.push(db.prepare(`INSERT INTO stock_movements(id,organization_id,product_id,warehouse_id,type,quantity_delta,unit_cost_minor,value_delta_minor,document_type,document_id,document_item_id,reference_id,created_by) VALUES(?,?,?,?,'SALE',-?,NULL,-COALESCE((SELECT CASE WHEN quantity>=? AND quantity>0 THEN ${allocation} ELSE 0 END FROM stock_balances WHERE organization_id=? AND product_id=? AND warehouse_id=?),0),'sales',?,?,?,'demo-admin')`).bind(movementId,org,item.productId,String(sale.warehouseId),quantity,quantity,quantity,quantity,org,item.productId,String(sale.warehouseId),id,item.id,String(sale.number)))
    statements.push(db.prepare('UPDATE sale_items SET cost_total_minor=-(SELECT value_delta_minor FROM stock_movements WHERE id=?),unit_cost_snapshot_minor=(-(SELECT value_delta_minor FROM stock_movements WHERE id=?)+quantity/2)/quantity,gross_profit_minor=line_total_minor+(SELECT value_delta_minor FROM stock_movements WHERE id=?) WHERE organization_id=? AND id=?').bind(movementId,movementId,movementId,org,item.id))
  }
  statements.push(db.prepare("UPDATE sales SET status='POSTED',posted_at=unixepoch()*1000,updated_at=unixepoch()*1000,cost_total_minor=(SELECT SUM(cost_total_minor) FROM sale_items WHERE organization_id=? AND sale_id=?),gross_profit_minor=total_minor-(SELECT SUM(cost_total_minor) FROM sale_items WHERE organization_id=? AND sale_id=?) WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(org,id,org,id,org,id,Number(sale.revision)))
  statements.push(db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sales',?,'POST','demo-admin')").bind(uuid(),org,id))
  try { await db.batch(statements) } catch(error) { translate(error) }
  return c.json(await getSale(db,org,id))
})
salesRoutes.post('/:id/cancel', async c => {
  const org = await currentOrganizationId(c.env), id = validId(c.req.param('id')), db = c.env.DB, sale = await getSale(db,org,id)
  if (sale.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED','Отменить можно только черновик',409)
  try { await db.batch([
    db.prepare("INSERT INTO document_finalizations(id,organization_id,document_type,document_id,action,expected_revision) VALUES(?,?,'sales',?,'CANCEL',?)").bind(uuid(),org,id,Number(sale.revision)),
    db.prepare("UPDATE sales SET status='CANCELLED',updated_at=unixepoch()*1000 WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(org,id,Number(sale.revision)),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sales',?,'CANCEL','demo-admin')").bind(uuid(),org,id),
  ]) } catch(error) { translate(error) }
  return c.json(await getSale(db,org,id))
})

export const saleReturnRoutes = new Hono<{ Bindings: Bindings }>()
saleReturnRoutes.get('/', async c => {
  const org=await currentOrganizationId(c.env), {page,pageSize,status,search}=listParams(c.req.url), saleId=new URL(c.req.url).searchParams.get('saleId')||''
  if (saleId) validId(saleId)
  if (!['all','DRAFT','POSTED','CANCELLED'].includes(status)) throw new ApiError('INVALID_STATUS','Некорректный статус')
  const where=['r.organization_id=?'], args:(string|number)[]=[org]
  if(status!=='all'){where.push('r.status=?');args.push(status)}
  if(saleId){where.push('r.sale_id=?');args.push(saleId)}
  if(search){where.push('(r.number LIKE ? OR s.number LIKE ?)');args.push(`%${search}%`,`%${search}%`)}
  const join='JOIN sales s ON s.organization_id=r.organization_id AND s.id=r.sale_id',filter=where.join(' AND ')
  const count=await c.env.DB.prepare(`SELECT COUNT(*) n FROM sale_returns r ${join} WHERE ${filter}`).bind(...args).first<{n:number}>()
  const rows=await c.env.DB.prepare(`SELECT r.id,r.number,r.sale_id saleId,s.number saleNumber,r.status,r.total_minor totalMinor,r.cost_total_minor costTotalMinor,r.gross_profit_minor grossProfitMinor,r.created_at createdAt,r.posted_at postedAt FROM sale_returns r ${join} WHERE ${filter} ORDER BY r.created_at DESC,r.number DESC LIMIT ? OFFSET ?`).bind(...args,pageSize,(page-1)*pageSize).all()
  return c.json({items:rows.results,total:count?.n??0,page,pageSize})
})
saleReturnRoutes.get('/:id', async c=>c.json(await getReturn(c.env.DB,await currentOrganizationId(c.env),validId(c.req.param('id')))))
async function validateReturn(db:D1Database,org:string,input:ReturnInput){
  const sale=await getSale(db,org,input.saleId)
  if(sale.status!=='POSTED') throw new ApiError('SALE_NOT_POSTED','Возврат возможен только по проведённой продаже',409)
  if(new Set(input.items.map(row=>row.saleItemId)).size!==input.items.length) throw new ApiError('DUPLICATE_ITEM','Строка продажи повторяется')
  const original=new Map((sale.items as {id:string;quantity:number;returnedQuantity:number}[]).map(row=>[row.id,row]))
  for(const row of input.items){const source=original.get(row.saleItemId);if(!source)throw new ApiError('INVALID_SALE_ITEM','Строка не принадлежит продаже');if(row.quantity>source.quantity-source.returnedQuantity)throw new ApiError('RETURN_EXCEEDS_SALE','Количество возвратов превышает количество в продаже',409)}
  return sale
}
function returnItemInserts(db:D1Database,org:string,id:string,input:ReturnInput){return input.items.map(row=>db.prepare('INSERT INTO sale_return_items(id,organization_id,sale_return_id,sale_item_id,quantity) VALUES(?,?,?,?,?)').bind(uuid(),org,id,row.saleItemId,row.quantity))}
saleReturnRoutes.post('/', async c=>{
  const org=await currentOrganizationId(c.env),input=await jsonBody(c.req.raw,returnInput),db=c.env.DB,id=uuid()
  await validateReturn(db,org,input)
  try{await db.batch([
    db.prepare("INSERT OR IGNORE INTO document_counters(organization_id,document_type,last_number) VALUES(?,'sale_returns',0)").bind(org),
    db.prepare("UPDATE document_counters SET last_number=last_number+1 WHERE organization_id=? AND document_type='sale_returns'").bind(org),
    db.prepare("INSERT INTO sale_returns(id,organization_id,number,sale_id,comment,created_by) SELECT ?,?,'SR-'||printf('%06d',last_number),?,?,'demo-admin' FROM document_counters WHERE organization_id=? AND document_type='sale_returns'").bind(id,org,input.saleId,input.comment??null,org),
    ...returnItemInserts(db,org,id,input),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sale_returns',?,'CREATE','demo-admin')").bind(uuid(),org,id),
  ])}catch(error){translate(error)}
  return c.json(await getReturn(db,org,id),201)
})
saleReturnRoutes.patch('/:id', async c=>{
  const org=await currentOrganizationId(c.env),id=validId(c.req.param('id')),db=c.env.DB,current=await getReturn(db,org,id)
  if(current.status!=='DRAFT')throw new ApiError('DOCUMENT_CHANGED','Редактировать можно только черновик',409)
  const input=await jsonBody(c.req.raw,returnInput)
  if(input.saleId!==current.saleId)throw new ApiError('SALE_IMMUTABLE','Исходную продажу нельзя менять')
  await validateReturn(db,org,input)
  try{await db.batch([
    db.prepare("UPDATE sale_returns SET comment=?,revision=revision+1,updated_at=unixepoch()*1000 WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(input.comment??null,org,id,Number(current.revision)),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id,details) VALUES(?,?,'sale_returns',?,'UPDATE','demo-admin',?)").bind(uuid(),org,id,String(Number(current.revision)+1)),
    db.prepare('DELETE FROM sale_return_items WHERE organization_id=? AND sale_return_id=?').bind(org,id),
    ...returnItemInserts(db,org,id,input),
  ])}catch(error){translate(error)}
  return c.json(await getReturn(db,org,id))
})

// All allocations are integer quotients plus remainders. The cumulative difference
// assigns the final cent to the final returned unit, regardless of return grouping.
function cumulative(column:string, units:string){return `((si.${column}/si.quantity)*(${units})+((si.${column}%si.quantity)*(${units}))/si.quantity)`}
saleReturnRoutes.post('/:id/post',async c=>{
  const org=await currentOrganizationId(c.env),id=validId(c.req.param('id')),db=c.env.DB,doc=await getReturn(db,org,id)
  if(doc.status!=='DRAFT')throw new ApiError('DOCUMENT_CHANGED','Провести можно только черновик',409)
  const sale=await getSale(db,org,String(doc.saleId))
  if(sale.status!=='POSTED')throw new ApiError('SALE_NOT_POSTED','Исходная продажа не проведена',409)
  const statements:D1PreparedStatement[]=[db.prepare("INSERT INTO document_finalizations(id,organization_id,document_type,document_id,action,expected_revision) VALUES(?,?,'sale_returns',?,'POST',?)").bind(uuid(),org,id,Number(doc.revision))]
  for(const item of doc.items as {id:string;saleItemId:string;productId:string;quantity:number}[]){
    const returned=`COALESCE((SELECT SUM(prev.quantity) FROM sale_return_items prev JOIN sale_returns pr ON pr.organization_id=prev.organization_id AND pr.id=prev.sale_return_id WHERE prev.organization_id=ri.organization_id AND prev.sale_item_id=ri.sale_item_id AND pr.status='POSTED'),0)`
    const before=cumulative('line_total_minor',returned),after=cumulative('line_total_minor',`${returned}+ri.quantity`)
    const costBefore=cumulative('cost_total_minor',returned),costAfter=cumulative('cost_total_minor',`${returned}+ri.quantity`)
    statements.push(db.prepare(`UPDATE sale_return_items AS ri SET amount_minor=(SELECT ${after}-${before} FROM sale_items si WHERE si.organization_id=ri.organization_id AND si.id=ri.sale_item_id),cost_total_minor=(SELECT ${costAfter}-${costBefore} FROM sale_items si WHERE si.organization_id=ri.organization_id AND si.id=ri.sale_item_id) WHERE ri.organization_id=? AND ri.id=?`).bind(org,item.id))
    statements.push(db.prepare('UPDATE sale_return_items SET gross_profit_minor=amount_minor-cost_total_minor WHERE organization_id=? AND id=?').bind(org,item.id))
    statements.push(db.prepare("INSERT INTO stock_movements(id,organization_id,product_id,warehouse_id,type,quantity_delta,unit_cost_minor,value_delta_minor,document_type,document_id,document_item_id,reference_id,created_by) SELECT ?,ri.organization_id,si.product_id,s.warehouse_id,'SALE_RETURN',ri.quantity,si.unit_cost_snapshot_minor,ri.cost_total_minor,'sale_returns',ri.sale_return_id,ri.id,?,'demo-admin' FROM sale_return_items ri JOIN sale_items si ON si.organization_id=ri.organization_id AND si.id=ri.sale_item_id JOIN sales s ON s.organization_id=si.organization_id AND s.id=si.sale_id WHERE ri.organization_id=? AND ri.id=?").bind(uuid(),String(doc.number),org,item.id))
  }
  statements.push(db.prepare("UPDATE sale_returns SET status='POSTED',posted_at=unixepoch()*1000,updated_at=unixepoch()*1000,total_minor=(SELECT SUM(amount_minor) FROM sale_return_items WHERE organization_id=? AND sale_return_id=?),cost_total_minor=(SELECT SUM(cost_total_minor) FROM sale_return_items WHERE organization_id=? AND sale_return_id=?),gross_profit_minor=(SELECT SUM(gross_profit_minor) FROM sale_return_items WHERE organization_id=? AND sale_return_id=?) WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(org,id,org,id,org,id,org,id,Number(doc.revision)))
  statements.push(db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sale_returns',?,'POST','demo-admin')").bind(uuid(),org,id))
  try{await db.batch(statements)}catch(error){translate(error)}
  return c.json(await getReturn(db,org,id))
})
saleReturnRoutes.post('/:id/cancel',async c=>{
  const org=await currentOrganizationId(c.env),id=validId(c.req.param('id')),db=c.env.DB,doc=await getReturn(db,org,id)
  if(doc.status!=='DRAFT')throw new ApiError('DOCUMENT_CHANGED','Отменить можно только черновик',409)
  try{await db.batch([
    db.prepare("INSERT INTO document_finalizations(id,organization_id,document_type,document_id,action,expected_revision) VALUES(?,?,'sale_returns',?,'CANCEL',?)").bind(uuid(),org,id,Number(doc.revision)),
    db.prepare("UPDATE sale_returns SET status='CANCELLED',updated_at=unixepoch()*1000 WHERE organization_id=? AND id=? AND status='DRAFT' AND revision=?").bind(org,id,Number(doc.revision)),
    db.prepare("INSERT INTO audit_log(id,organization_id,document_type,document_id,action,actor_id) VALUES(?,?,'sale_returns',?,'CANCEL','demo-admin')").bind(uuid(),org,id),
  ])}catch(error){translate(error)}
  return c.json(await getReturn(db,org,id))
})
