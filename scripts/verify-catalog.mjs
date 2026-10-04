import assert from 'node:assert/strict'
import process from 'node:process'
import crypto from 'node:crypto'
import console from 'node:console'

const base = process.env.API_URL || 'http://127.0.0.1:8787/api'
async function call(path, method = 'GET', body) {
  const response = await globalThis.fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, data: response.status === 204 ? null : await response.json() }
}
const suffix = crypto.randomUUID().slice(0, 8)
const category = await call('/categories', 'POST', { name: `Тест ${suffix}` })
assert.equal(category.status, 201)
const categoryId = category.data.id
const sku = `TEST-${suffix}`
const barcode = `BAR-${suffix}`
const input = { name: `Тестовый товар ${suffix}`, sku, categoryId, description: null, purchasePrice: 12345, salePrice: 23456, unit: 'шт.', minimumStock: 3, barcodes: [barcode] }
const created = await call('/products', 'POST', input)
assert.equal(created.status, 201)
const id = created.data.id
assert.equal((await call('/products', 'POST', input)).data.error.code, 'SKU_ALREADY_EXISTS')
assert.equal((await call('/products', 'POST', { ...input, sku: `${sku}-2` })).data.error.code, 'BARCODE_ALREADY_EXISTS')
const detail = await call(`/products/${id}`)
assert.equal(detail.data.salePrice, 23456)
assert.deepEqual(detail.data.barcodes, [barcode])
assert.equal(detail.data.quantity, 0)
for (const term of [input.name, sku, barcode]) {
  const found = await call(`/products?search=${encodeURIComponent(term)}`)
  assert.ok(found.data.items.some(item => item.id === id), `Search failed: ${term}`)
}
assert.ok((await call(`/products?category=${categoryId}`)).data.items.some(item => item.id === id))
assert.ok((await call('/products?warehouse=almaty')).data.items.every(item => item.quantity >= 0))
assert.equal((await call(`/categories/${categoryId}`, 'DELETE')).data.error.code, 'CATEGORY_IN_USE')
assert.equal((await call('/warehouses/almaty', 'PATCH', { isActive: false })).data.error.code, 'WAREHOUSE_HAS_STOCK')
assert.equal((await call('/products', 'POST', { ...input, sku: `${sku}-3`, organizationId: 'other' })).data.error.code, 'VALIDATION_ERROR')
assert.equal((await call('/products', 'POST', { ...input, sku: `${sku}-4`, salePrice: -1 })).data.error.code, 'VALIDATION_ERROR')
assert.equal((await call('/products', 'POST', { ...input, sku: `${sku}-5`, categoryId: crypto.randomUUID() })).data.error.code, 'CATEGORY_NOT_FOUND')
assert.equal((await call(`/products/${id}`, 'PATCH', { name: `Обновлённый ${suffix}`, barcodes: [`NEW-${suffix}`] })).status, 200)
assert.equal((await call(`/products/${id}`)).data.name, `Обновлённый ${suffix}`)
assert.equal((await call(`/products/${id}`, 'DELETE')).status, 200)
assert.equal((await call(`/products/${id}`)).data.status, 'archived')
assert.equal((await call(`/products?status=archived&search=${sku}`)).data.items[0].id, id)
assert.ok((await call('/inventory?warehouse=almaty')).data.items.length > 0)
const warehouse = await call('/warehouses', 'POST', { name: `Тестовый склад ${suffix}`, code: `T${suffix}`, address: 'Алматы' })
assert.equal(warehouse.status, 201)
assert.equal((await call(`/warehouses/${warehouse.data.id}`, 'PATCH', { isActive: false })).status, 200)
console.log('Catalog API scenario passed')
