import { sql } from 'drizzle-orm'
import { check, foreignKey, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
}, (table) => [uniqueIndex('users_org_email_uq').on(table.organizationId, table.email), uniqueIndex('users_org_id_uq').on(table.organizationId, table.id)])

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  code: text('code').notNull().default(''),
  address: text('address'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  city: text('city'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex('warehouses_org_id_uq').on(table.organizationId, table.id), uniqueIndex('warehouses_org_code_uq').on(table.organizationId, table.code)])

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
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
  purchasePrice: integer('purchase_price').notNull().default(0),
  salePrice: integer('sale_price').notNull().default(0),
  unit: text('unit').notNull().default('шт.'),
  minimumStock: integer('minimum_stock').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex('products_org_sku_uq').on(table.organizationId, table.sku),
  index('products_org_category_idx').on(table.organizationId, table.categoryId),
  index('products_org_name_idx').on(table.organizationId, table.name),
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
  index('barcodes_org_product_idx').on(table.organizationId, table.productId),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  bin: text('bin'),
  phone: text('phone'),
  ...timestamps,
}, (table) => [index('suppliers_org_idx').on(table.organizationId), uniqueIndex('suppliers_org_id_uq').on(table.organizationId, table.id)])

export const stockBalances = sqliteTable('stock_balances', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
    inventoryValueMinor: integer('inventory_value_minor').notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex('balances_org_product_warehouse_uq').on(table.organizationId, table.productId, table.warehouseId),
  index('balances_org_warehouse_idx').on(table.organizationId, table.warehouseId),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
])

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
    type: text('type', { enum: ['RECEIPT', 'ISSUE', 'WRITEOFF', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'SALE_RETURN', 'ADJUSTMENT'] }).notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  unitCostMinor: integer('unit_cost_minor'),
    valueDeltaMinor: integer('value_delta_minor').notNull().default(0),
  documentType: text('document_type'),
  documentId: text('document_id'),
  documentItemId: text('document_item_id'),
  referenceId: text('reference_id'),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [
  index('movements_org_created_idx').on(table.organizationId, table.createdAt),
  index('movements_org_product_idx').on(table.organizationId, table.productId),
  index('movements_org_doc_idx').on(table.organizationId, table.documentType, table.documentId),
  uniqueIndex('movements_doc_item_type_uq').on(table.organizationId, table.documentType, table.documentId, table.documentItemId, table.type),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])

const documentFields = () => ({
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  number: text('number').notNull(),
  status: text('status', { enum: ['DRAFT', 'POSTED', 'CANCELLED'] }).notNull().default('DRAFT'),
  comment: text('comment'),
  createdBy: text('created_by').notNull(),
  revision: integer('revision').notNull().default(1),
  postedAt: integer('posted_at', { mode: 'timestamp_ms' }),
  ...timestamps,
})

export const receipts = sqliteTable('receipts', {
  ...documentFields(),
  warehouseId: text('warehouse_id').notNull(),
  supplierId: text('supplier_id'),
}, table => [
  uniqueIndex('receipts_org_number_uq').on(table.organizationId, table.number),
  uniqueIndex('receipts_org_id_uq').on(table.organizationId, table.id),
  index('receipts_org_created_idx').on(table.organizationId, table.createdAt),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.supplierId], foreignColumns: [suppliers.organizationId, suppliers.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])

export const issues = sqliteTable('issues', {
  ...documentFields(),
  warehouseId: text('warehouse_id').notNull(),
}, table => [
  uniqueIndex('issues_org_number_uq').on(table.organizationId, table.number),
  uniqueIndex('issues_org_id_uq').on(table.organizationId, table.id),
  index('issues_org_created_idx').on(table.organizationId, table.createdAt),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])

export const writeoffs = sqliteTable('writeoffs', {
  ...documentFields(),
  warehouseId: text('warehouse_id').notNull(),
  reason: text('reason').notNull(),
}, table => [
  uniqueIndex('writeoffs_org_number_uq').on(table.organizationId, table.number),
  uniqueIndex('writeoffs_org_id_uq').on(table.organizationId, table.id),
  index('writeoffs_org_created_idx').on(table.organizationId, table.createdAt),
  foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])

export const transfers = sqliteTable('transfers', {
  ...documentFields(),
  fromWarehouseId: text('from_warehouse_id').notNull(),
  toWarehouseId: text('to_warehouse_id').notNull(),
}, table => [
  uniqueIndex('transfers_org_number_uq').on(table.organizationId, table.number),
  uniqueIndex('transfers_org_id_uq').on(table.organizationId, table.id),
  index('transfers_org_created_idx').on(table.organizationId, table.createdAt),
  check('transfers_distinct_warehouses_ck', sql`${table.fromWarehouseId} <> ${table.toWarehouseId}`),
  foreignKey({ columns: [table.organizationId, table.fromWarehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.toWarehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }),
  foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] }),
])

const itemFields = () => ({
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
})

export const receiptItems = sqliteTable('receipt_items', {
  ...itemFields(), receiptId: text('receipt_id').notNull(), unitCostMinor: integer('unit_cost_minor').notNull(),
}, table => [
  uniqueIndex('receipt_items_org_doc_product_uq').on(table.organizationId, table.receiptId, table.productId),
  check('receipt_items_quantity_ck', sql`${table.quantity} > 0`),
  check('receipt_items_cost_ck', sql`${table.unitCostMinor} >= 0`),
  foreignKey({ columns: [table.organizationId, table.receiptId], foreignColumns: [receipts.organizationId, receipts.id] }),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const issueItems = sqliteTable('issue_items', {
  ...itemFields(), issueId: text('issue_id').notNull(),
}, table => [
  uniqueIndex('issue_items_org_doc_product_uq').on(table.organizationId, table.issueId, table.productId),
  check('issue_items_quantity_ck', sql`${table.quantity} > 0`),
  foreignKey({ columns: [table.organizationId, table.issueId], foreignColumns: [issues.organizationId, issues.id] }),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const writeoffItems = sqliteTable('writeoff_items', {
  ...itemFields(), writeoffId: text('writeoff_id').notNull(),
}, table => [
  uniqueIndex('writeoff_items_org_doc_product_uq').on(table.organizationId, table.writeoffId, table.productId),
  check('writeoff_items_quantity_ck', sql`${table.quantity} > 0`),
  foreignKey({ columns: [table.organizationId, table.writeoffId], foreignColumns: [writeoffs.organizationId, writeoffs.id] }),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const transferItems = sqliteTable('transfer_items', {
  ...itemFields(), transferId: text('transfer_id').notNull(),
}, table => [
  uniqueIndex('transfer_items_org_doc_product_uq').on(table.organizationId, table.transferId, table.productId),
  check('transfer_items_quantity_ck', sql`${table.quantity} > 0`),
  foreignKey({ columns: [table.organizationId, table.transferId], foreignColumns: [transfers.organizationId, transfers.id] }),
  foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] }),
])

export const documentCounters = sqliteTable('document_counters', {
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  documentType: text('document_type').notNull(),
  lastNumber: integer('last_number').notNull().default(0),
}, table => [uniqueIndex('document_counters_org_type_uq').on(table.organizationId, table.documentType)])

export const documentFinalizations = sqliteTable('document_finalizations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  documentType: text('document_type').notNull(),
  documentId: text('document_id').notNull(),
  action: text('action', { enum: ['POST', 'CANCEL'] }).notNull(),
  expectedRevision: integer('expected_revision').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, table => [uniqueIndex('document_finalizations_org_doc_uq').on(table.organizationId, table.documentType, table.documentId)])

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  documentType: text('document_type').notNull(),
  documentId: text('document_id').notNull(),
  action: text('action').notNull(),
  actorId: text('actor_id').notNull(),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, table => [
  index('audit_org_created_idx').on(table.organizationId, table.createdAt),
  index('audit_org_doc_idx').on(table.organizationId, table.documentType, table.documentId),
  foreignKey({ columns: [table.organizationId, table.actorId], foreignColumns: [users.organizationId, users.id] }),
])

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(), organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(), phone: text('phone'), email: text('email'), bin: text('bin'), comment: text('comment'), ...timestamps,
}, table => [uniqueIndex('customers_org_id_uq').on(table.organizationId, table.id), index('customers_org_name_idx').on(table.organizationId, table.name)])

export const sales = sqliteTable('sales', {
  ...documentFields(), warehouseId: text('warehouse_id').notNull(), customerId: text('customer_id'),
  subtotalMinor: integer('subtotal_minor').notNull().default(0), discountMinor: integer('discount_minor').notNull().default(0),
  totalMinor: integer('total_minor').notNull().default(0), costTotalMinor: integer('cost_total_minor').notNull().default(0), grossProfitMinor: integer('gross_profit_minor').notNull().default(0),
}, table => [uniqueIndex('sales_org_id_uq').on(table.organizationId, table.id), uniqueIndex('sales_org_number_uq').on(table.organizationId, table.number), index('sales_org_created_idx').on(table.organizationId, table.createdAt), index('sales_org_customer_idx').on(table.organizationId, table.customerId, table.createdAt), index('sales_org_warehouse_created_idx').on(table.organizationId, table.warehouseId, table.createdAt), foreignKey({ columns: [table.organizationId, table.warehouseId], foreignColumns: [warehouses.organizationId, warehouses.id] }), foreignKey({ columns: [table.organizationId, table.customerId], foreignColumns: [customers.organizationId, customers.id] }), foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] })])

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(), organizationId: text('organization_id').notNull().references(() => organizations.id),
  saleId: text('sale_id').notNull(), productId: text('product_id').notNull(), quantity: integer('quantity').notNull(),
  unitPriceMinor: integer('unit_price_minor').notNull(), discountMinor: integer('discount_minor').notNull().default(0), lineTotalMinor: integer('line_total_minor').notNull().default(0),
  unitCostSnapshotMinor: integer('unit_cost_snapshot_minor').notNull().default(0), costTotalMinor: integer('cost_total_minor').notNull().default(0), grossProfitMinor: integer('gross_profit_minor').notNull().default(0),
}, table => [uniqueIndex('sale_items_org_sale_product_uq').on(table.organizationId, table.saleId, table.productId), uniqueIndex('sale_items_org_id_uq').on(table.organizationId, table.id), check('sale_items_quantity_ck',sql`${table.quantity}>0`), check('sale_items_price_ck',sql`${table.unitPriceMinor}>=0`), check('sale_items_discount_ck',sql`${table.discountMinor}>=0`), check('sale_items_total_ck',sql`${table.lineTotalMinor}>=0`), foreignKey({ columns: [table.organizationId, table.saleId], foreignColumns: [sales.organizationId, sales.id] }), foreignKey({ columns: [table.organizationId, table.productId], foreignColumns: [products.organizationId, products.id] })])

export const saleReturns = sqliteTable('sale_returns', {
  ...documentFields(), saleId: text('sale_id').notNull(), totalMinor: integer('total_minor').notNull().default(0), costTotalMinor: integer('cost_total_minor').notNull().default(0), grossProfitMinor: integer('gross_profit_minor').notNull().default(0),
}, table => [uniqueIndex('sale_returns_org_id_uq').on(table.organizationId, table.id), uniqueIndex('sale_returns_org_number_uq').on(table.organizationId, table.number), index('sale_returns_org_sale_idx').on(table.organizationId, table.saleId, table.createdAt), foreignKey({ columns: [table.organizationId, table.saleId], foreignColumns: [sales.organizationId, sales.id] }), foreignKey({ columns: [table.organizationId, table.createdBy], foreignColumns: [users.organizationId, users.id] })])

export const saleReturnItems = sqliteTable('sale_return_items', {
  id: text('id').primaryKey(), organizationId: text('organization_id').notNull().references(() => organizations.id), saleReturnId: text('sale_return_id').notNull(), saleItemId: text('sale_item_id').notNull(), quantity: integer('quantity').notNull(), amountMinor: integer('amount_minor').notNull().default(0), costTotalMinor: integer('cost_total_minor').notNull().default(0), grossProfitMinor: integer('gross_profit_minor').notNull().default(0),
}, table => [uniqueIndex('sale_return_items_doc_item_uq').on(table.organizationId, table.saleReturnId, table.saleItemId), index('sale_return_items_sale_item_idx').on(table.organizationId, table.saleItemId), check('sale_return_items_quantity_ck',sql`${table.quantity}>0`), foreignKey({ columns: [table.organizationId, table.saleReturnId], foreignColumns: [saleReturns.organizationId, saleReturns.id] }), foreignKey({ columns: [table.organizationId, table.saleItemId], foreignColumns: [saleItems.organizationId, saleItems.id] })])
