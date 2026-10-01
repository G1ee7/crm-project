import { sql } from 'drizzle-orm'
import { foreignKey, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('KZT'),
  ...timestamps,
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('admin'),
  ...timestamps,
}, (table) => [uniqueIndex('users_org_email_uq').on(table.organizationId, table.email)])

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  city: text('city'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex('warehouses_org_id_uq').on(table.organizationId, table.id)])

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  ...timestamps,
}, (table) => [uniqueIndex('categories_org_id_uq').on(table.organizationId, table.id)])

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  categoryId: text('category_id'),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  description: text('description'),
  imageKey: text('image_key'),
  retailPrice: integer('retail_price').notNull().default(0),
  minimumStock: integer('minimum_stock').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex('products_org_sku_uq').on(table.organizationId, table.sku),
  uniqueIndex('products_org_id_uq').on(table.organizationId, table.id),
  foreignKey({ columns: [table.organizationId, table.categoryId], foreignColumns: [categories.organizationId, categories.id] }),
])

export const productBarcodes = sqliteTable('product_barcodes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  barcode: text('barcode').notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('barcodes_org_barcode_uq').on(table.organizationId, table.barcode),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  bin: text('bin'),
  phone: text('phone'),
  ...timestamps,
}, (table) => [index('suppliers_org_idx').on(table.organizationId)])

export const stockBalances = sqliteTable('stock_balances', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex('balances_org_product_warehouse_uq').on(table.organizationId, table.productId, table.warehouseId),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
])

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  type: text('type', { enum: ['RECEIPT', 'SALE', 'RETURN', 'WRITEOFF', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'] }).notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  unitCost: real('unit_cost'),
  referenceId: text('reference_id'),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [
  index('movements_org_created_idx').on(table.organizationId, table.createdAt),
  index('movements_org_product_idx').on(table.organizationId, table.productId),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])
