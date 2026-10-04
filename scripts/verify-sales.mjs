import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import process from 'node:process'
import console from 'node:console'

const base=process.env.API_URL||'http://127.0.0.1:8787/api'
async function call(path,method='GET',body){const response=await globalThis.fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()}}
async function create(path,body){const result=await call(path,'POST',body);assert.equal(result.status,201,JSON.stringify(result));return result.data}
async function post(path,id){return call(`${path}/${id}/post`,'POST')}
const suffix=crypto.randomUUID().slice(0,8)
const product=await create('/products',{name:`Продажи ${suffix}`,sku:`SALE-${suffix}`,categoryId:null,description:null,purchasePrice:101,salePrice:500,unit:'шт.',minimumStock:0,barcodes:[]})
const productId=product.id
async function receipt(quantity,unitCostMinor){const document=await create('/receipts',{warehouseId:'almaty',items:[{productId,quantity,unitCostMinor}]});assert.equal((await post('/receipts',document.id)).status,200)}
await receipt(3,101)
await receipt(2,100)
const inventory=await call('/inventory?warehouse=almaty&pageSize=100')
const balance=inventory.data.items.find(row=>row.productId===productId)
assert.equal(balance.quantity,5)
assert.equal(balance.inventoryValueMinor,503)
assert.equal(balance.averageCostMinor,101)
const customer=await create('/customers',{name:`Клиент ${suffix}`,phone:'12345'})
assert.equal((await call(`/customers/${customer.id}`)).data.name,`Клиент ${suffix}`)
const input={warehouseId:'almaty',customerId:customer.id,items:[{productId,quantity:2,unitPriceMinor:500,discountMinor:1}]}
const sale=await create('/sales',input)
assert.match(sale.number,/^SA-\d{6}$/)
const posted=await post('/sales',sale.id)
assert.equal(posted.status,200,JSON.stringify(posted))
assert.equal(posted.data.costTotalMinor,201)
assert.equal(posted.data.totalMinor,999)
assert.equal(posted.data.grossProfitMinor,798)
assert.equal((await post('/sales',sale.id)).data.error.code,'DOCUMENT_CHANGED')
assert.equal((await call(`/sales/${sale.id}`,'PATCH',input)).data.error.code,'DOCUMENT_CHANGED')
const afterSale=await call('/inventory?warehouse=almaty&pageSize=100')
assert.equal(afterSale.data.items.find(row=>row.productId===productId).inventoryValueMinor,302)
const returnInput={saleId:sale.id,items:[{saleItemId:posted.data.items[0].id,quantity:1}]}
const firstReturn=await create('/sale-returns',returnInput)
const firstPosted=await post('/sale-returns',firstReturn.id)
assert.equal(firstPosted.status,200,JSON.stringify(firstPosted))
assert.equal(firstPosted.data.totalMinor,499)
assert.equal(firstPosted.data.costTotalMinor,100)
const secondReturn=await create('/sale-returns',returnInput)
const secondPosted=await post('/sale-returns',secondReturn.id)
assert.equal(secondPosted.status,200,JSON.stringify(secondPosted))
assert.equal(secondPosted.data.totalMinor,500)
assert.equal(secondPosted.data.costTotalMinor,101)
assert.equal((await call('/sale-returns','POST',returnInput)).data.error.code,'RETURN_EXCEEDS_SALE')
assert.equal((await post('/sale-returns',firstReturn.id)).data.error.code,'DOCUMENT_CHANGED')
const afterReturns=await call('/inventory?warehouse=almaty&pageSize=100')
const restored=afterReturns.data.items.find(row=>row.productId===productId)
assert.equal(restored.quantity,5)
assert.equal(restored.inventoryValueMinor,503)
assert.equal((await call(`/sales/${sale.id}`)).data.items[0].returnedQuantity,2)
assert.equal((await call(`/sale-returns/${firstReturn.id}`)).data.status,'POSTED')
const tooLarge=await create('/sales',{warehouseId:'almaty',items:[{productId,quantity:6,unitPriceMinor:500,discountMinor:0}]})
assert.equal((await post('/sales',tooLarge.id)).data.error.code,'INSUFFICIENT_STOCK')
assert.equal((await call(`/sales/${tooLarge.id}`)).data.status,'DRAFT')
const concurrentA=await create('/sales',{warehouseId:'almaty',items:[{productId,quantity:4,unitPriceMinor:500,discountMinor:0}]})
const concurrentB=await create('/sales',{warehouseId:'almaty',items:[{productId,quantity:4,unitPriceMinor:500,discountMinor:0}]})
const outcomes=await Promise.all([post('/sales',concurrentA.id),post('/sales',concurrentB.id)])
assert.deepEqual(outcomes.map(row=>row.status).sort(),[200,409])
const oneLeft=await create('/sales',{warehouseId:'almaty',items:[{productId,quantity:1,unitPriceMinor:500,discountMinor:0}]})
const onePosted=await post('/sales',oneLeft.id)
assert.equal(onePosted.status,200)
const competingInput={saleId:oneLeft.id,items:[{saleItemId:onePosted.data.items[0].id,quantity:1}]}
const competingA=await create('/sale-returns',competingInput)
const competingB=await create('/sale-returns',competingInput)
const competingResults=await Promise.all([post('/sale-returns',competingA.id),post('/sale-returns',competingB.id)])
assert.deepEqual(competingResults.map(row=>row.status).sort(),[200,409])
assert.equal(competingResults.find(row=>row.status===409).data.error.code,'RETURN_EXCEEDS_SALE')
const movements=(await call(`/stock-movements?productId=${productId}&pageSize=100`)).data.items
assert.equal(movements.filter(row=>row.type==='SALE').length,3)
assert.equal(movements.filter(row=>row.type==='SALE_RETURN').length,3)
assert.ok(movements.every(row=>Number.isSafeInteger(row.valueDeltaMinor)))
const finalBalance=(await call('/inventory?warehouse=almaty&pageSize=100')).data.items.find(row=>row.productId===productId)
assert.equal(finalBalance.quantity,movements.reduce((sum,row)=>sum+row.quantityDelta,0))
const summary=(await call('/dashboard/summary?days=7')).data
const chart=(await call('/dashboard/chart?days=7')).data
assert.ok(summary.salesCount>=2)
assert.equal(chart.points.length,7)
console.log('Sales, weighted cost, partial returns, concurrency, rollback and dashboard passed')
