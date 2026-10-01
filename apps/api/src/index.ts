import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { organizationRoutes } from './routes/organization-routes'
import { errorHandler } from './middleware/error-handler'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors({ origin: 'http://localhost:5173' }))
app.onError(errorHandler)
app.get('/api/health', (context) => context.json({ status: 'ok' }))
app.route('/api/organizations', organizationRoutes)

export default app
