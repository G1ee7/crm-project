import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import process from 'node:process'
import console from 'node:console'

const base = process.env.API_URL || 'http://127.0.0.1:8787/api'
async function call(path, method = 'GET', body) {
  const response = await globalThis.fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, data: await response.json() }
}
async function create(kind, input) { const result = await call(`/${kind}`, 'POST', input); assert.equal(result.status, 201, JSON.stringify(result)); return result.data }
async function post(kind, id) { return call(`/${kind}/${id}/post`, 'POST') }
const suffix = crypto.randomUUID().slice(0, 8)
const product = await call('/products', 'POST', { name: `Операции ${suffix}`, sku: `OPS-${suffix}`, categoryId: null, description: null, purchasePrice: 12345, salePrice: 23456, unit: 'шт.', minimumStock: 0, barcodes: [] })
assert.equal(product.status, 201)
const productId = product.data.id
const line = (quantity) => [{ productId, quantity }]
assert.equal((await call('/receipts', 'POST', { warehouseId: 'almaty', items: [] })).data.error.code, 'VALIDATION_ERROR')
assert.equal((await call('/issues', 'POST', { warehouseId: 'almaty', items: line(0) })).data.error.code, 'VALIDATION_ERROR')
assert.equal((await call('/issues', 'POST', { warehouseId: 'almaty', items: line(-1) })).data.error.code, 'VALIDATION_ERROR')
assert.equal((await call('/issues', 'POST', { warehouseId: 'missing', items: line(1) })).data.error.code, 'WAREHOUSE_NOT_FOUND')
assert.equal((await call('/issues', 'POST', { warehouseId: 'almaty', items: [{ productId: crypto.randomUUID(), quantity: 1 }] })).data.error.code, 'PRODUCT_NOT_FOUND')
assert.equal((await call('/transfers', 'POST', { fromWarehouseId: 'almaty', toWarehouseId: 'almaty', items: line(1) })).data.error.code, 'SAME_WAREHOUSE_TRANSFER')
assert.equal((await call('/issues', 'POST', { warehouseId: 'almaty', items: line(1), organizationId: 'other' })).data.error.code, 'VALIDATION_ERROR')
const receipt = await create('receipts', { warehouseId: 'almaty', items: [{ productId, quantity: 5, unitCostMinor: 12345 }] })
assert.match(receipt.number, /^PR-\d{6}$/)
assert.equal((await post('receipts', receipt.id)).status, 200)
assert.equal((await post('receipts', receipt.id)).data.error.code, 'DOCUMENT_CHANGED')
assert.equal((await call(`/receipts/${receipt.id}`, 'PATCH', { warehouseId: 'astana', items: [{ productId, quantity: 1, unitCostMinor: 12345 }] })).data.error.code, 'DOCUMENT_CHANGED')
assert.equal((await call(`/products/${productId}`)).data.quantity, 5)
const tooLarge = await create('issues', { warehouseId: 'almaty', items: line(6) })
assert.equal((await post('issues', tooLarge.id)).data.error.code, 'INSUFFICIENT_STOCK')
assert.equal((await call(`/issues/${tooLarge.id}`)).data.status, 'DRAFT')
const first = await create('issues', { warehouseId: 'almaty', items: line(4) })
const second = await create('issues', { warehouseId: 'almaty', items: line(4) })
const results = await Promise.all([post('issues', first.id), post('issues', second.id)])
assert.deepEqual(results.map(result => result.status).sort(), [200, 409])
assert.equal((await call(`/products/${productId}`)).data.quantity, 1)
const failedTransfer = await create('transfers', { fromWarehouseId: 'almaty', toWarehouseId: 'astana', items: line(2) })
assert.equal((await post('transfers', failedTransfer.id)).data.error.code, 'INSUFFICIENT_STOCK')
assert.equal((await call(`/transfers/${failedTransfer.id}`)).data.status, 'DRAFT')
assert.equal((await call(`/products/${productId}`)).data.quantity, 1)
const another = await create('receipts', { warehouseId: 'almaty', items: [{ productId, quantity: 3, unitCostMinor: 12500 }] })
assert.equal((await post('receipts', another.id)).status, 200)
assert.equal((await post('transfers', failedTransfer.id)).status, 200)
const writeoff = await create('writeoffs', { warehouseId: 'astana', reason: 'Брак', items: line(2) })
assert.equal((await post('writeoffs', writeoff.id)).status, 200)
const cancelled = await create('issues', { warehouseId: 'almaty', items: line(1) })
assert.equal((await call(`/issues/${cancelled.id}`, 'PATCH', { warehouseId: 'almaty', items: line(2) })).data.items[0].quantity, 2)
assert.equal((await call(`/issues/${cancelled.id}/cancel`, 'POST')).data.status, 'CANCELLED')
assert.equal((await post('issues', cancelled.id)).data.error.code, 'DOCUMENT_CHANGED')
const movements = await call(`/stock-movements?productId=${productId}&pageSize=100`)
assert.equal(movements.data.total, 6)
assert.equal(movements.data.items.filter(row => row.documentId === failedTransfer.id).length, 2)
const detail = await call(`/products/${productId}`)
for (const balance of detail.data.balances) {
  const calculated = movements.data.items.filter(row => row.warehouseId === balance.warehouseId).reduce((sum, row) => sum + row.quantityDelta, 0)
  assert.equal(balance.quantity, calculated, `Balance mismatch at ${balance.warehouseId}`)
}
async function all(path) {
  const items = []
  for (let page = 1; ; page++) {
    const response = await call(`${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=100`)
    assert.equal(response.status, 200)
    items.push(...response.data.items)
    if (items.length >= response.data.total) return items
  }
}
const balances = await all('/inventory')
const ledger = await all('/stock-movements')
const totals = new Map()
for (const row of ledger) {
  const key = `${row.productId}:${row.warehouseId}`
  totals.set(key, (totals.get(key) ?? 0) + row.quantityDelta)
}
for (const row of balances) assert.equal(row.quantity, totals.get(`${row.productId}:${row.warehouseId}`) ?? 0, `Global reconciliation mismatch: ${row.productId}/${row.warehouseId}`)
console.log('Document posting, concurrency, rollback and reconciliation passed')
