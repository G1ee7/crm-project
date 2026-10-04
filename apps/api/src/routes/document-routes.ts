import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError, currentOrganizationId, jsonBody, listParams, validId } from '../catalog/common'
import type { Bindings } from '../types'

type Kind = 'receipts' | 'issues' | 'writeoffs' | 'transfers'
const kinds: Record<Kind, { prefix: string; itemTable: string; foreignKey: string }> = {
  receipts: { prefix: 'PR', itemTable: 'receipt_items', foreignKey: 'receipt_id' },
  issues: { prefix: 'IS', itemTable: 'issue_items', foreignKey: 'issue_id' },
  writeoffs: { prefix: 'WO', itemTable: 'writeoff_items', foreignKey: 'writeoff_id' },
  transfers: { prefix: 'TR', itemTable: 'transfer_items', foreignKey: 'transfer_id' },
}
const slug = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/, 'Некорректный склад')
const item = z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(1_000_000_000), unitCostMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional() }).strict()
const inputSchema = z.object({
  warehouseId: slug.optional(), fromWarehouseId: slug.optional(), toWarehouseId: slug.optional(),
  supplierId: z.string().uuid().nullable().optional(), reason: z.string().trim().min(1).max(300).optional(),
  comment: z.string().trim().max(1000).nullable().optional(), items: z.array(item).min(1).max(100),
}).strict()
type Input = z.infer<typeof inputSchema>

function validateInput(kind: Kind, input: Input) {
  if (kind === 'transfers') {
    if (!input.fromWarehouseId || !input.toWarehouseId || input.fromWarehouseId === input.toWarehouseId) throw new ApiError('SAME_WAREHOUSE_TRANSFER', 'Выберите разные склады отправления и получения')
  } else if (!input.warehouseId) throw new ApiError('WAREHOUSE_REQUIRED', 'Выберите склад')
  if (kind === 'writeoffs' && !input.reason) throw new ApiError('REASON_REQUIRED', 'Укажите причину списания')
  if (new Set(input.items.map(row => row.productId)).size !== input.items.length) throw new ApiError('DUPLICATE_PRODUCT', 'Товар повторяется в документе')
  if (kind === 'receipts' && input.items.some(row => row.unitCostMinor === undefined)) throw new ApiError('COST_REQUIRED', 'Укажите закупочную цену в тиынах для каждой строки')
  if (kind === 'receipts' && input.items.some(row => BigInt(row.quantity) * BigInt(row.unitCostMinor ?? 0) > BigInt(Number.MAX_SAFE_INTEGER))) throw new ApiError('COST_TOO_LARGE', 'Сумма строки превышает допустимый предел')
}

async function validateReferences(db: D1Database, org: string, kind: Kind, input: Input) {
  const warehouses = kind === 'transfers' ? [input.fromWarehouseId!, input.toWarehouseId!] : [input.warehouseId!]
  for (const id of warehouses) {
    const row = await db.prepare('SELECT is_active active FROM warehouses WHERE organization_id = ? AND id = ?').bind(org, id).first<{ active: number }>()
    if (!row?.active) throw new ApiError('WAREHOUSE_NOT_FOUND', 'Склад не найден или архивирован', 400)
  }
  if (kind === 'receipts' && input.supplierId) {
    const row = await db.prepare('SELECT 1 FROM suppliers WHERE organization_id = ? AND id = ?').bind(org, input.supplierId).first()
    if (!row) throw new ApiError('SUPPLIER_NOT_FOUND', 'Поставщик не найден', 400)
  }
  for (const row of input.items) {
    const product = await db.prepare('SELECT is_active active FROM products WHERE organization_id = ? AND id = ?').bind(org, row.productId).first<{ active: number }>()
    if (!product?.active) throw new ApiError('PRODUCT_NOT_FOUND', 'Товар не найден или архивирован', 400)
  }
}

async function getDocument(db: D1Database, org: string, kind: Kind, id: string) {
  const spec = kinds[kind]
  const row = await db.prepare(`SELECT * FROM ${kind} WHERE organization_id = ? AND id = ?`).bind(org, id).first<Record<string, unknown>>()
  if (!row) throw new ApiError('DOCUMENT_NOT_FOUND', 'Документ не найден', 404)
  const items = await db.prepare(`SELECT i.id, i.product_id productId, p.name productName, p.sku, i.quantity${kind === 'receipts' ? ', i.unit_cost_minor unitCostMinor' : ''} FROM ${spec.itemTable} i JOIN products p ON p.organization_id = i.organization_id AND p.id = i.product_id WHERE i.organization_id = ? AND i.${spec.foreignKey} = ? ORDER BY p.name`).bind(org, id).all()
  return {
    id: String(row.id), number: String(row.number), status: String(row.status), comment: row.comment as string | null,
    warehouseId: row.warehouse_id as string | undefined, fromWarehouseId: row.from_warehouse_id as string | undefined, toWarehouseId: row.to_warehouse_id as string | undefined,
    supplierId: row.supplier_id as string | null | undefined, reason: row.reason as string | undefined,
    revision: Number(row.revision), createdBy: String(row.created_by), createdAt: Number(row.created_at), postedAt: row.posted_at as number | null,
    items: items.results,
  }
}

function documentColumns(kind: Kind, input: Input) {
  if (kind === 'transfers') return { columns: 'from_warehouse_id, to_warehouse_id', values: [input.fromWarehouseId!, input.toWarehouseId!] }
  if (kind === 'receipts') return { columns: 'warehouse_id, supplier_id', values: [input.warehouseId!, input.supplierId ?? null] }
  if (kind === 'writeoffs') return { columns: 'warehouse_id, reason', values: [input.warehouseId!, input.reason!] }
  return { columns: 'warehouse_id', values: [input.warehouseId!] }
}

function itemStatements(db: D1Database, org: string, kind: Kind, id: string, input: Input) {
  const spec = kinds[kind]
  return input.items.map(row => kind === 'receipts'
    ? db.prepare(`INSERT INTO ${spec.itemTable} (id, organization_id, ${spec.foreignKey}, product_id, quantity, unit_cost_minor) VALUES (?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), org, id, row.productId, row.quantity, row.unitCostMinor!)
    : db.prepare(`INSERT INTO ${spec.itemTable} (id, organization_id, ${spec.foreignKey}, product_id, quantity) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), org, id, row.productId, row.quantity))
}

function translateFailure(error: unknown): never {
  if (error instanceof ApiError) throw error
  const message = String(error)
  if (message.includes('INSUFFICIENT_STOCK')) throw new ApiError('INSUFFICIENT_STOCK', 'Недостаточно доступного остатка на складе', 409)
  if (message.includes('DOCUMENT_CHANGED') || message.includes('document_finalizations_org_doc_uq') || message.includes('document_finalizations.organization_id')) throw new ApiError('DOCUMENT_CHANGED', 'Документ уже проведён, отменён или изменён другим запросом', 409)
  if (message.includes('MOVEMENT_REQUIRES_POST')) throw new ApiError('DOCUMENT_CHANGED', 'Проведение документа не подтверждено', 409)
  if (message.includes('FOREIGN KEY constraint failed')) throw new ApiError('REFERENCE_CHANGED', 'Связанный товар или склад изменился', 409)
  throw error
}

export function createDocumentRoutes(kind: Kind) {
  const routes = new Hono<{ Bindings: Bindings }>()
  const spec = kinds[kind]
  routes.get('/', async c => {
    const org = await currentOrganizationId(c.env)
    const { page, pageSize, status, search } = listParams(c.req.url)
    if (!['all', 'DRAFT', 'POSTED', 'CANCELLED'].includes(status)) throw new ApiError('INVALID_STATUS', 'Некорректный статус')
    const params = new URL(c.req.url).searchParams
    const warehouse = params.get('warehouse') || ''
    const supplier = params.get('supplier') || ''
    const from = params.get('from') || ''
    const to = params.get('to') || ''
    if (warehouse && !slug.safeParse(warehouse).success) throw new ApiError('INVALID_ID', 'Некорректный склад')
    if (supplier) validId(supplier)
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new ApiError('INVALID_PERIOD', 'Некорректная дата начала')
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new ApiError('INVALID_PERIOD', 'Некорректная дата окончания')
    const conditions = ['d.organization_id = ?']
    const args: (string | number)[] = [org]
    if (status !== 'all') { conditions.push('d.status = ?'); args.push(status) }
    if (search) { conditions.push('d.number LIKE ?'); args.push(`%${search}%`) }
    if (warehouse) { conditions.push(kind === 'transfers' ? '(d.from_warehouse_id = ? OR d.to_warehouse_id = ?)' : 'd.warehouse_id = ?'); args.push(warehouse); if (kind === 'transfers') args.push(warehouse) }
    if (kind === 'receipts' && supplier) { conditions.push('d.supplier_id = ?'); args.push(supplier) }
    if (from) { const value = Date.parse(`${from}T00:00:00Z`); if (!Number.isFinite(value)) throw new ApiError('INVALID_PERIOD', 'Некорректная дата начала'); conditions.push('d.created_at >= ?'); args.push(value) }
    if (to) { const value = Date.parse(`${to}T00:00:00Z`); if (!Number.isFinite(value)) throw new ApiError('INVALID_PERIOD', 'Некорректная дата окончания'); conditions.push('d.created_at < ?'); args.push(value + 86400000) }
    const where = conditions.join(' AND ')
    const count = await c.env.DB.prepare(`SELECT count(*) total FROM ${kind} d WHERE ${where}`).bind(...args).first<{ total: number }>()
    const summary = `LEFT JOIN (SELECT organization_id, ${spec.foreignKey} document_id, count(*) positions, sum(quantity) totalQuantity${kind === 'receipts' ? ', sum(quantity * unit_cost_minor) totalCostMinor' : ''} FROM ${spec.itemTable} GROUP BY organization_id, ${spec.foreignKey}) line ON line.organization_id = d.organization_id AND line.document_id = d.id`
    const rows = await c.env.DB.prepare(`SELECT d.id, d.number, d.status, d.comment, d.created_at createdAt, d.posted_at postedAt, d.created_by createdBy, u.name authorName, coalesce(line.positions, 0) positions, coalesce(line.totalQuantity, 0) totalQuantity, ${kind === 'receipts' ? 'coalesce(line.totalCostMinor, 0) totalCostMinor, s.name supplierName,' : ''} ${kind === 'transfers' ? 'd.from_warehouse_id fromWarehouseId, d.to_warehouse_id toWarehouseId' : 'd.warehouse_id warehouseId'} FROM ${kind} d ${summary} LEFT JOIN users u ON u.organization_id = d.organization_id AND u.id = d.created_by ${kind === 'receipts' ? 'LEFT JOIN suppliers s ON s.organization_id = d.organization_id AND s.id = d.supplier_id' : ''} WHERE ${where} ORDER BY d.created_at DESC, d.number DESC LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all()
    return c.json({ items: rows.results, total: count?.total ?? 0, page, pageSize })
  })
  routes.get('/:id', async c => c.json(await getDocument(c.env.DB, await currentOrganizationId(c.env), kind, validId(c.req.param('id')))))
  routes.post('/', async c => {
    const org = await currentOrganizationId(c.env)
    const input = await jsonBody(c.req.raw, inputSchema)
    validateInput(kind, input)
    await validateReferences(c.env.DB, org, kind, input)
    const id = crypto.randomUUID()
    const extra = documentColumns(kind, input)
    const db = c.env.DB
    const statements = [
      db.prepare('INSERT OR IGNORE INTO document_counters (organization_id, document_type, last_number) VALUES (?, ?, 0)').bind(org, kind),
      db.prepare('UPDATE document_counters SET last_number = last_number + 1 WHERE organization_id = ? AND document_type = ?').bind(org, kind),
      db.prepare(`INSERT INTO ${kind} (id, organization_id, number, comment, created_by, ${extra.columns}) SELECT ?, ?, ? || '-' || printf('%06d', last_number), ?, 'demo-admin', ${extra.values.map(() => '?').join(', ')} FROM document_counters WHERE organization_id = ? AND document_type = ?`).bind(id, org, spec.prefix, input.comment ?? null, ...extra.values, org, kind),
      ...itemStatements(db, org, kind, id, input),
      db.prepare('INSERT INTO audit_log (id, organization_id, document_type, document_id, action, actor_id) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'CREATE', 'demo-admin'),
    ]
    try { await db.batch(statements) } catch (error) { translateFailure(error) }
    return c.json(await getDocument(db, org, kind, id), 201)
  })
  routes.patch('/:id', async c => {
    const org = await currentOrganizationId(c.env)
    const id = validId(c.req.param('id'))
    const current = await getDocument(c.env.DB, org, kind, id)
    if (current.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED', 'Редактировать можно только черновик', 409)
    const input = await jsonBody(c.req.raw, inputSchema)
    validateInput(kind, input)
    await validateReferences(c.env.DB, org, kind, input)
    const extra = documentColumns(kind, input)
    const columns = extra.columns.split(', ')
    const db = c.env.DB
    const statements = [
      db.prepare(`UPDATE ${kind} SET comment = ?, ${columns.map(column => `${column} = ?`).join(', ')}, revision = revision + 1, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ? AND status = 'DRAFT' AND revision = ?`).bind(input.comment ?? null, ...extra.values, org, id, current.revision),
      db.prepare('INSERT INTO audit_log (id, organization_id, document_type, document_id, action, actor_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'UPDATE', 'demo-admin', String(current.revision + 1)),
      db.prepare(`DELETE FROM ${spec.itemTable} WHERE organization_id = ? AND ${spec.foreignKey} = ?`).bind(org, id),
      ...itemStatements(db, org, kind, id, input),
    ]
    try { await db.batch(statements) } catch (error) { translateFailure(error) }
    return c.json(await getDocument(db, org, kind, id))
  })
  routes.post('/:id/post', async c => {
    const org = await currentOrganizationId(c.env)
    const id = validId(c.req.param('id'))
    const doc = await getDocument(c.env.DB, org, kind, id)
    if (doc.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED', 'Провести можно только черновик', 409)
    if (!doc.items.length) throw new ApiError('EMPTY_DOCUMENT', 'Добавьте хотя бы один товар')
    const input: Input = { warehouseId: doc.warehouseId, fromWarehouseId: doc.fromWarehouseId, toWarehouseId: doc.toWarehouseId, supplierId: doc.supplierId, reason: doc.reason, comment: doc.comment, items: doc.items.map(row => ({ productId: String(row.productId), quantity: Number(row.quantity), unitCostMinor: row.unitCostMinor === undefined ? undefined : Number(row.unitCostMinor) })) }
    validateInput(kind, input)
    await validateReferences(c.env.DB, org, kind, input)
    const db = c.env.DB
    const statements: D1PreparedStatement[] = [db.prepare('INSERT INTO document_finalizations (id, organization_id, document_type, document_id, action, expected_revision) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'POST', doc.revision)]
    for (const row of doc.items) {
      const movements = kind === 'transfers'
        ? [{ type: 'TRANSFER_OUT', warehouse: doc.fromWarehouseId!, delta: -Number(row.quantity) }, { type: 'TRANSFER_IN', warehouse: doc.toWarehouseId!, delta: Number(row.quantity) }]
        : [{ type: kind === 'receipts' ? 'RECEIPT' : kind === 'issues' ? 'ISSUE' : 'WRITEOFF', warehouse: doc.warehouseId!, delta: kind === 'receipts' ? Number(row.quantity) : -Number(row.quantity) }]
      for (const movement of movements) {
        const qty = Math.abs(movement.delta)
        const averageCost = `COALESCE((SELECT CASE WHEN quantity >= ${qty} AND quantity > 0 THEN (inventory_value_minor / quantity) * ${qty} + ((inventory_value_minor % quantity) * ${qty} + quantity / 2) / quantity ELSE 0 END FROM stock_balances WHERE organization_id = ? AND product_id = ? AND warehouse_id = ?), 0)`
        const valueSql = movement.type === 'RECEIPT' ? '?' : movement.type === 'TRANSFER_IN'
          ? 'COALESCE((SELECT -value_delta_minor FROM stock_movements WHERE organization_id = ? AND document_type = ? AND document_id = ? AND document_item_id = ? AND type = ?), 0)'
          : `-${averageCost}`
        const valueArgs = movement.type === 'RECEIPT' ? [qty * Number(row.unitCostMinor)] : movement.type === 'TRANSFER_IN'
          ? [org, kind, id, row.id, 'TRANSFER_OUT'] : [org, row.productId, movement.warehouse]
        statements.push(db.prepare(`INSERT INTO stock_movements (id, organization_id, product_id, warehouse_id, type, quantity_delta, unit_cost_minor, value_delta_minor, document_type, document_id, document_item_id, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ${valueSql}, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), org, row.productId, movement.warehouse, movement.type, movement.delta, kind === 'receipts' ? row.unitCostMinor : null, ...valueArgs, kind, id, row.id, doc.number, 'demo-admin'))
      }
    }
    statements.push(db.prepare(`UPDATE ${kind} SET status = 'POSTED', posted_at = unixepoch() * 1000, updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ? AND status = 'DRAFT' AND revision = ?`).bind(org, id, doc.revision))
    statements.push(db.prepare('INSERT INTO audit_log (id, organization_id, document_type, document_id, action, actor_id) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'POST', 'demo-admin'))
    try { await db.batch(statements) } catch (error) {
      if (String(error).includes('INSUFFICIENT_STOCK')) {
        const warehouse = kind === 'transfers' ? doc.fromWarehouseId! : doc.warehouseId!
        const available = await db.prepare('SELECT product_id productId, quantity - reserved available FROM stock_balances WHERE organization_id = ? AND warehouse_id = ?').bind(org, warehouse).all<{ productId: string; available: number }>()
        const levels = new Map(available.results.map(row => [row.productId, row.available]))
        const short = doc.items.find(row => (levels.get(String(row.productId)) ?? 0) < Number(row.quantity))
        const count = short ? levels.get(String(short.productId)) ?? 0 : 0
        throw new ApiError('INSUFFICIENT_STOCK', `Недостаточно товара на складе. Доступно: ${count} шт.`, 409)
      }
      translateFailure(error)
    }
    return c.json(await getDocument(db, org, kind, id))
  })
  routes.post('/:id/cancel', async c => {
    const org = await currentOrganizationId(c.env)
    const id = validId(c.req.param('id'))
    const doc = await getDocument(c.env.DB, org, kind, id)
    if (doc.status !== 'DRAFT') throw new ApiError('DOCUMENT_CHANGED', 'Отменить можно только черновик', 409)
    const db = c.env.DB
    try { await db.batch([
      db.prepare('INSERT INTO document_finalizations (id, organization_id, document_type, document_id, action, expected_revision) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'CANCEL', doc.revision),
      db.prepare(`UPDATE ${kind} SET status = 'CANCELLED', updated_at = unixepoch() * 1000 WHERE organization_id = ? AND id = ? AND status = 'DRAFT' AND revision = ?`).bind(org, id, doc.revision),
      db.prepare('INSERT INTO audit_log (id, organization_id, document_type, document_id, action, actor_id) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), org, kind, id, 'CANCEL', 'demo-admin'),
    ]) } catch (error) { translateFailure(error) }
    return c.json(await getDocument(db, org, kind, id))
  })
  return routes
}
