import { demoOrganizationSchema } from '@warehouse/shared'
import { findOrganization } from '../repositories/organization-repository'
import type { Bindings } from '../types'

export async function getDemoOrganization(env: Bindings) {
  const organization = await findOrganization(env, 'demo')
  return organization ? demoOrganizationSchema.parse(organization) : null
}
