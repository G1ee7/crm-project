ALTER TABLE stock_balances ADD COLUMN inventory_value_minor integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN value_delta_minor integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE stock_balances SET inventory_value_minor = quantity * (SELECT purchase_price FROM products WHERE products.organization_id = stock_balances.organization_id AND products.id = stock_balances.product_id);
--> statement-breakpoint
DROP TRIGGER stock_movements_apply;
--> statement-breakpoint
CREATE TRIGGER stock_movements_apply AFTER INSERT ON stock_movements BEGIN
  INSERT INTO stock_balances (id, organization_id, product_id, warehouse_id, quantity, reserved, inventory_value_minor)
  VALUES (lower(hex(randomblob(16))), NEW.organization_id, NEW.product_id, NEW.warehouse_id, NEW.quantity_delta, 0, NEW.value_delta_minor)
  ON CONFLICT(organization_id, product_id, warehouse_id) DO UPDATE SET quantity = quantity + NEW.quantity_delta, inventory_value_minor = inventory_value_minor + NEW.value_delta_minor, updated_at = unixepoch() * 1000;
END;
--> statement-breakpoint
CREATE TRIGGER stock_balance_value_guard AFTER UPDATE ON stock_balances WHEN typeof(NEW.inventory_value_minor) <> 'integer' OR NEW.inventory_value_minor < 0 OR NEW.inventory_value_minor > 9007199254740991 OR (NEW.quantity = 0 AND NEW.inventory_value_minor <> 0) BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_balance_value_insert_guard AFTER INSERT ON stock_balances WHEN typeof(NEW.inventory_value_minor) <> 'integer' OR NEW.inventory_value_minor < 0 OR NEW.inventory_value_minor > 9007199254740991 OR (NEW.quantity = 0 AND NEW.inventory_value_minor <> 0) BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movement_value_guard BEFORE INSERT ON stock_movements WHEN typeof(NEW.value_delta_minor) <> 'integer' OR NEW.value_delta_minor > 9007199254740991 OR NEW.value_delta_minor < -9007199254740991 BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
--> statement-breakpoint
CREATE TABLE customers (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL, name text NOT NULL, phone text, email text, bin text, comment text, created_at integer NOT NULL DEFAULT (unixepoch()*1000), updated_at integer NOT NULL DEFAULT (unixepoch()*1000), FOREIGN KEY (organization_id) REFERENCES organizations(id));
--> statement-breakpoint
CREATE UNIQUE INDEX customers_org_id_uq ON customers(organization_id,id);
--> statement-breakpoint
CREATE INDEX customers_org_name_idx ON customers(organization_id,name);
--> statement-breakpoint
CREATE TABLE sales (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL, number text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','CANCELLED')), warehouse_id text NOT NULL, customer_id text, comment text, subtotal_minor integer NOT NULL DEFAULT 0, discount_minor integer NOT NULL DEFAULT 0, total_minor integer NOT NULL DEFAULT 0, cost_total_minor integer NOT NULL DEFAULT 0, gross_profit_minor integer NOT NULL DEFAULT 0, created_by text NOT NULL, revision integer NOT NULL DEFAULT 1, posted_at integer, created_at integer NOT NULL DEFAULT (unixepoch()*1000), updated_at integer NOT NULL DEFAULT (unixepoch()*1000), FOREIGN KEY(organization_id) REFERENCES organizations(id), FOREIGN KEY(organization_id,warehouse_id) REFERENCES warehouses(organization_id,id), FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id), FOREIGN KEY(organization_id,created_by) REFERENCES users(organization_id,id));
--> statement-breakpoint
CREATE UNIQUE INDEX sales_org_id_uq ON sales(organization_id,id);
--> statement-breakpoint
CREATE UNIQUE INDEX sales_org_number_uq ON sales(organization_id,number);
--> statement-breakpoint
CREATE INDEX sales_org_created_idx ON sales(organization_id,created_at);
--> statement-breakpoint
CREATE INDEX sales_org_customer_idx ON sales(organization_id,customer_id,created_at);
--> statement-breakpoint
CREATE TABLE sale_items (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL, sale_id text NOT NULL, product_id text NOT NULL, quantity integer NOT NULL CHECK(quantity>0), unit_price_minor integer NOT NULL CHECK(unit_price_minor>=0), discount_minor integer NOT NULL DEFAULT 0 CHECK(discount_minor>=0), line_total_minor integer NOT NULL DEFAULT 0 CHECK(line_total_minor>=0), unit_cost_snapshot_minor integer NOT NULL DEFAULT 0, cost_total_minor integer NOT NULL DEFAULT 0, gross_profit_minor integer NOT NULL DEFAULT 0, FOREIGN KEY(organization_id,sale_id) REFERENCES sales(organization_id,id), FOREIGN KEY(organization_id,product_id) REFERENCES products(organization_id,id));
--> statement-breakpoint
CREATE UNIQUE INDEX sale_items_org_sale_product_uq ON sale_items(organization_id,sale_id,product_id);
--> statement-breakpoint
CREATE UNIQUE INDEX sale_items_org_id_uq ON sale_items(organization_id,id);
--> statement-breakpoint
CREATE TABLE sale_returns (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL, number text NOT NULL, sale_id text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','CANCELLED')), comment text, total_minor integer NOT NULL DEFAULT 0, cost_total_minor integer NOT NULL DEFAULT 0, gross_profit_minor integer NOT NULL DEFAULT 0, created_by text NOT NULL, revision integer NOT NULL DEFAULT 1, posted_at integer, created_at integer NOT NULL DEFAULT (unixepoch()*1000), updated_at integer NOT NULL DEFAULT (unixepoch()*1000), FOREIGN KEY(organization_id,sale_id) REFERENCES sales(organization_id,id), FOREIGN KEY(organization_id,created_by) REFERENCES users(organization_id,id));
--> statement-breakpoint
CREATE UNIQUE INDEX sale_returns_org_id_uq ON sale_returns(organization_id,id);
--> statement-breakpoint
CREATE UNIQUE INDEX sale_returns_org_number_uq ON sale_returns(organization_id,number);
--> statement-breakpoint
CREATE INDEX sale_returns_org_sale_idx ON sale_returns(organization_id,sale_id,created_at);
--> statement-breakpoint
CREATE TABLE sale_return_items (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL, sale_return_id text NOT NULL, sale_item_id text NOT NULL, quantity integer NOT NULL CHECK(quantity>0), amount_minor integer NOT NULL DEFAULT 0, cost_total_minor integer NOT NULL DEFAULT 0, gross_profit_minor integer NOT NULL DEFAULT 0, FOREIGN KEY(organization_id,sale_return_id) REFERENCES sale_returns(organization_id,id), FOREIGN KEY(organization_id,sale_item_id) REFERENCES sale_items(organization_id,id));
--> statement-breakpoint
CREATE UNIQUE INDEX sale_return_items_doc_item_uq ON sale_return_items(organization_id,sale_return_id,sale_item_id);
--> statement-breakpoint
CREATE INDEX sale_return_items_sale_item_idx ON sale_return_items(organization_id,sale_item_id);
--> statement-breakpoint
CREATE TRIGGER sales_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type='sales' AND NOT EXISTS(SELECT 1 FROM sales WHERE organization_id=NEW.organization_id AND id=NEW.document_id AND status='DRAFT' AND revision=NEW.expected_revision) BEGIN SELECT RAISE(ABORT,'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER sale_returns_finalization_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type='sale_returns' AND NOT EXISTS(SELECT 1 FROM sale_returns r JOIN sales s ON s.organization_id=r.organization_id AND s.id=r.sale_id WHERE r.organization_id=NEW.organization_id AND r.id=NEW.document_id AND r.status='DRAFT' AND r.revision=NEW.expected_revision AND s.status='POSTED') BEGIN SELECT RAISE(ABORT,'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER sale_return_quantity_guard BEFORE INSERT ON document_finalizations WHEN NEW.document_type='sale_returns' AND NEW.action='POST' AND EXISTS(SELECT 1 FROM sale_return_items ri JOIN sale_returns r ON r.organization_id=ri.organization_id AND r.id=ri.sale_return_id JOIN sale_items si ON si.organization_id=ri.organization_id AND si.id=ri.sale_item_id WHERE ri.organization_id=NEW.organization_id AND ri.sale_return_id=NEW.document_id AND (si.sale_id<>r.sale_id OR ri.quantity + COALESCE((SELECT SUM(ri2.quantity) FROM sale_return_items ri2 JOIN sale_returns r2 ON r2.organization_id=ri2.organization_id AND r2.id=ri2.sale_return_id WHERE ri2.organization_id=ri.organization_id AND ri2.sale_item_id=ri.sale_item_id AND r2.status='POSTED'),0)>si.quantity)) BEGIN SELECT RAISE(ABORT,'RETURN_EXCEEDS_SALE'); END;
