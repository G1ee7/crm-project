import { z } from 'zod'

export const demoOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.literal('KZT'),
})

export const movementTypeSchema = z.enum([
  'RECEIPT', 'SALE', 'RETURN', 'WRITEOFF',
  'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT',
])
