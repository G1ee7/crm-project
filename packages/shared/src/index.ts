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

const label = z.string().trim().min(1).max(160)
export const categoryInputSchema = z.object({ name: label, description: z.string().trim().max(1000).nullable().optional() }).strict()
export const warehouseInputSchema = z.object({ name: label, code: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/), address: z.string().trim().max(500).nullable().optional(), isActive: z.boolean().optional() }).strict()
export const productInputSchema = z.object({
  name: label,
  sku: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  purchasePrice: z.number().int().nonnegative().safe(),
  salePrice: z.number().int().nonnegative().safe(),
  unit: z.string().trim().min(1).max(30),
  minimumStock: z.number().int().nonnegative().safe(),
  barcodes: z.array(z.string().trim().min(1).max(80)).max(20).refine(values => new Set(values).size === values.length, 'Штрихкоды не должны повторяться'),
}).strict()
export type ProductInput = z.infer<typeof productInputSchema>
