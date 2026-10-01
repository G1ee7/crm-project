import { eq } from 'drizzle-orm'
import { organizations } from '@warehouse/db'
import { createDb } from '../db/client'
import type { Bindings } from '../types'

export async function findOrganization(env: Bindings, id: string) {
  return createDb(env).select({ id: organizations.id, name: organizations.name, currency: organizations.currency })
    .from(organizations).where(eq(organizations.id, id)).get()
}
