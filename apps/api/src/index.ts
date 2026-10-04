import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { organizationRoutes } from './routes/organization-routes'
import { categoryRoutes } from './routes/category-routes'
import { warehouseRoutes } from './routes/warehouse-routes'
import { productRoutes } from './routes/product-routes'
import { inventoryRoutes } from './routes/inventory-routes'
import { createDocumentRoutes } from './routes/document-routes'
import { movementRoutes } from './routes/movement-routes'
import { supplierRoutes } from './routes/supplier-routes'
import { errorHandler } from './middleware/error-handler'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors({ origin: 'http://localhost:5173' }))
app.onError(errorHandler)
app.get('/api/health', (context) => context.json({ status: 'ok' }))
app.route('/api/organizations', organizationRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/warehouses', warehouseRoutes)
app.route('/api/products', productRoutes)
app.route('/api/inventory', inventoryRoutes)
app.route('/api/receipts', createDocumentRoutes('receipts'))
app.route('/api/issues', createDocumentRoutes('issues'))
app.route('/api/writeoffs', createDocumentRoutes('writeoffs'))
app.route('/api/transfers', createDocumentRoutes('transfers'))
app.route('/api/stock-movements', movementRoutes)
app.route('/api/suppliers', supplierRoutes)

export default app
