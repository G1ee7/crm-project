CREATE UNIQUE INDEX `users_org_id_uq` ON `users` (`organization_id`,`id`);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`actor_id`) REFERENCES `users`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_org_created_idx` ON `audit_log` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_org_doc_idx` ON `audit_log` (`organization_id`,`document_type`,`document_id`);--> statement-breakpoint
CREATE TABLE `document_counters` (
	`organization_id` text NOT NULL,
	`document_type` text NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_counters_org_type_uq` ON `document_counters` (`organization_id`,`document_type`);--> statement-breakpoint
CREATE TABLE `document_finalizations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`action` text NOT NULL,
	`expected_revision` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_finalizations_org_doc_uq` ON `document_finalizations` (`organization_id`,`document_type`,`document_id`);--> statement-breakpoint
CREATE TABLE `issue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`issue_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`issue_id`) REFERENCES `issues`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`product_id`) REFERENCES `products`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "issue_items_quantity_ck" CHECK("issue_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issue_items_org_doc_product_uq` ON `issue_items` (`organization_id`,`issue_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`comment` text,
	`created_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`posted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`warehouse_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`warehouse_id`) REFERENCES `warehouses`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`created_by`) REFERENCES `users`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issues_org_number_uq` ON `issues` (`organization_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `issues_org_id_uq` ON `issues` (`organization_id`,`id`);--> statement-breakpoint
CREATE INDEX `issues_org_created_idx` ON `issues` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `receipt_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`receipt_id` text NOT NULL,
	`unit_cost_minor` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`receipt_id`) REFERENCES `receipts`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`product_id`) REFERENCES `products`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "receipt_items_quantity_ck" CHECK("receipt_items"."quantity" > 0),
	CONSTRAINT "receipt_items_cost_ck" CHECK("receipt_items"."unit_cost_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipt_items_org_doc_product_uq` ON `receipt_items` (`organization_id`,`receipt_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`comment` text,
	`created_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`posted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`warehouse_id` text NOT NULL,
	`supplier_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`warehouse_id`) REFERENCES `warehouses`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`supplier_id`) REFERENCES `suppliers`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`created_by`) REFERENCES `users`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_org_number_uq` ON `receipts` (`organization_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_org_id_uq` ON `receipts` (`organization_id`,`id`);--> statement-breakpoint
CREATE INDEX `receipts_org_created_idx` ON `receipts` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `transfer_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`transfer_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`transfer_id`) REFERENCES `transfers`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`product_id`) REFERENCES `products`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transfer_items_quantity_ck" CHECK("transfer_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfer_items_org_doc_product_uq` ON `transfer_items` (`organization_id`,`transfer_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`comment` text,
	`created_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`posted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`from_warehouse_id` text NOT NULL,
	`to_warehouse_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`from_warehouse_id`) REFERENCES `warehouses`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`to_warehouse_id`) REFERENCES `warehouses`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`created_by`) REFERENCES `users`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transfers_distinct_warehouses_ck" CHECK("transfers"."from_warehouse_id" <> "transfers"."to_warehouse_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_org_number_uq` ON `transfers` (`organization_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_org_id_uq` ON `transfers` (`organization_id`,`id`);--> statement-breakpoint
CREATE INDEX `transfers_org_created_idx` ON `transfers` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `writeoff_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`writeoff_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`writeoff_id`) REFERENCES `writeoffs`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`product_id`) REFERENCES `products`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "writeoff_items_quantity_ck" CHECK("writeoff_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writeoff_items_org_doc_product_uq` ON `writeoff_items` (`organization_id`,`writeoff_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `writeoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`comment` text,
	`created_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`posted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`warehouse_id` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`warehouse_id`) REFERENCES `warehouses`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`,`created_by`) REFERENCES `users`(`organization_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writeoffs_org_number_uq` ON `writeoffs` (`organization_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `writeoffs_org_id_uq` ON `writeoffs` (`organization_id`,`id`);--> statement-breakpoint
CREATE INDEX `writeoffs_org_created_idx` ON `writeoffs` (`organization_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `unit_cost_minor` integer;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `document_type` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `document_id` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `document_item_id` text;--> statement-breakpoint
CREATE INDEX `movements_org_doc_idx` ON `stock_movements` (`organization_id`,`document_type`,`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `movements_doc_item_type_uq` ON `stock_movements` (`organization_id`,`document_type`,`document_id`,`document_item_id`,`type`);--> statement-breakpoint
ALTER TABLE `stock_movements` DROP COLUMN `unit_cost`;--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_org_id_uq` ON `suppliers` (`organization_id`,`id`);
--> statement-breakpoint
INSERT INTO receipts (id, organization_id, number, status, comment, created_by, revision, posted_at, warehouse_id)
SELECT CASE b.warehouse_id WHEN 'almaty' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1' WHEN 'astana' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' ELSE 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3' END,
       'demo', 'OPEN-' || upper(b.warehouse_id), 'POSTED', 'Начальный остаток до журнала движений', 'demo-admin', 1, unixepoch() * 1000, b.warehouse_id
FROM stock_balances b WHERE b.organization_id = 'demo' AND b.quantity > 0 AND b.warehouse_id IN ('almaty', 'astana', 'shymkent')
GROUP BY b.warehouse_id;
--> statement-breakpoint
INSERT INTO receipt_items (id, organization_id, product_id, quantity, receipt_id, unit_cost_minor)
SELECT b.id, b.organization_id, b.product_id, b.quantity,
       CASE b.warehouse_id WHEN 'almaty' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1' WHEN 'astana' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' ELSE 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3' END,
       p.purchase_price
FROM stock_balances b JOIN products p ON p.organization_id = b.organization_id AND p.id = b.product_id
WHERE b.organization_id = 'demo' AND b.quantity > 0 AND b.warehouse_id IN ('almaty', 'astana', 'shymkent');
--> statement-breakpoint
INSERT INTO stock_movements (id, organization_id, product_id, warehouse_id, type, quantity_delta, unit_cost_minor, document_type, document_id, document_item_id, created_by, note)
SELECT b.id, b.organization_id, b.product_id, b.warehouse_id, 'RECEIPT', b.quantity, p.purchase_price, 'receipts',
       CASE b.warehouse_id WHEN 'almaty' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1' WHEN 'astana' THEN 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' ELSE 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3' END,
       b.id, 'demo-admin', 'Начальный остаток'
FROM stock_balances b JOIN products p ON p.organization_id = b.organization_id AND p.id = b.product_id
WHERE b.organization_id = 'demo' AND b.quantity > 0 AND b.warehouse_id IN ('almaty', 'astana', 'shymkent');
--> statement-breakpoint
INSERT INTO document_counters (organization_id, document_type, last_number)
SELECT 'demo', 'receipts', 0 WHERE EXISTS (SELECT 1 FROM organizations WHERE id = 'demo');
--> statement-breakpoint
CREATE TRIGGER stock_balances_nonnegative_insert AFTER INSERT ON stock_balances
WHEN NEW.quantity < 0 OR NEW.reserved < 0 OR NEW.quantity < NEW.reserved
BEGIN SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK'); END;
--> statement-breakpoint
CREATE TRIGGER stock_balances_nonnegative_update AFTER UPDATE ON stock_balances
WHEN NEW.quantity < 0 OR NEW.reserved < 0 OR NEW.quantity < NEW.reserved
BEGIN SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movements_source_guard BEFORE INSERT ON stock_movements
WHEN NEW.document_type IS NULL OR NEW.document_id IS NULL OR NEW.document_item_id IS NULL OR
  NOT EXISTS (SELECT 1 FROM document_finalizations f WHERE f.organization_id = NEW.organization_id AND f.document_type = NEW.document_type AND f.document_id = NEW.document_id AND f.action = 'POST')
BEGIN SELECT RAISE(ABORT, 'MOVEMENT_REQUIRES_POST'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movements_apply AFTER INSERT ON stock_movements
BEGIN
  INSERT INTO stock_balances (id, organization_id, product_id, warehouse_id, quantity, reserved)
  VALUES (lower(hex(randomblob(16))), NEW.organization_id, NEW.product_id, NEW.warehouse_id, NEW.quantity_delta, 0)
  ON CONFLICT(organization_id, product_id, warehouse_id) DO UPDATE SET quantity = quantity + NEW.quantity_delta, updated_at = unixepoch() * 1000;
END;
--> statement-breakpoint
CREATE TRIGGER stock_movements_immutable_update BEFORE UPDATE ON stock_movements BEGIN SELECT RAISE(ABORT, 'MOVEMENTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movements_immutable_delete BEFORE DELETE ON stock_movements BEGIN SELECT RAISE(ABORT, 'MOVEMENTS_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER receipts_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type = 'receipts' AND NOT EXISTS (SELECT 1 FROM receipts d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.revision = NEW.expected_revision AND (d.status = 'DRAFT' OR (d.status = 'POSTED' AND d.number LIKE 'OPEN-%'))) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER issues_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type = 'issues' AND NOT EXISTS (SELECT 1 FROM issues d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = NEW.expected_revision) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER writeoffs_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type = 'writeoffs' AND NOT EXISTS (SELECT 1 FROM writeoffs d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = NEW.expected_revision) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER transfers_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type = 'transfers' AND NOT EXISTS (SELECT 1 FROM transfers d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = NEW.expected_revision) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER audit_receipt_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'receipts' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM receipts d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER audit_issue_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'issues' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM issues d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER audit_writeoff_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'writeoffs' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM writeoffs d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER audit_transfer_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'transfers' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM transfers d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
