import assert from 'node:assert/strict'
import process from 'node:process'
import console from 'node:console'

const base = process.env.API_URL || 'http://127.0.0.1:8787/api'
async function all(path) {
  const items = []
  for (let page = 1; ; page++) {
    const response = await globalThis.fetch(`${base}${path}?page=${page}&pageSize=100`)
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
    const data = await response.json()
    items.push(...data.items)
    if (items.length >= data.total) return items
  }
}
const [balances, movements] = await Promise.all([all('/inventory'), all('/stock-movements')])
const totals = new Map()
for (const row of movements) {
  const key = `${row.productId}:${row.warehouseId}`
  totals.set(key, (totals.get(key) ?? 0) + row.quantityDelta)
}
for (const row of balances) {
  const key = `${row.productId}:${row.warehouseId}`
  assert.equal(row.quantity, totals.get(key) ?? 0, `Остаток не совпадает с журналом: ${key}`)
  totals.delete(key)
}
for (const [key, amount] of totals) assert.equal(amount, 0, `Движения без строки остатка: ${key}`)
console.log(`Остатки сверены: ${balances.length} строк, ${movements.length} движений`)
