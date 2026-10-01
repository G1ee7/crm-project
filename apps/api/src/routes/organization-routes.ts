import { Hono } from 'hono'
import { getDemoOrganization } from '../services/organization-service'
import type { Bindings } from '../types'

export const organizationRoutes = new Hono<{ Bindings: Bindings }>()

organizationRoutes.get('/demo', async (context) => {
  const organization = await getDemoOrganization(context.env)
  return organization ? context.json(organization) : context.json({ error: 'Организация не найдена' }, 404)
})
