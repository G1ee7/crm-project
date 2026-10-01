import { drizzle } from 'drizzle-orm/d1'
import type { Bindings } from '../types'

export function createDb(env: Bindings) {
  return drizzle(env.DB)
}
