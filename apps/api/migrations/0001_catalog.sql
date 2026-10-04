ALTER TABLE `warehouses` ADD COLUMN `code` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `warehouses` ADD COLUMN `address` text;
--> statement-breakpoint
ALTER TABLE `warehouses` ADD COLUMN `is_active` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
UPDATE `warehouses` SET `code` = CASE `id` WHEN 'almaty' THEN 'ALA' WHEN 'astana' THEN 'AST' WHEN 'shymkent' THEN 'CIT' ELSE upper(substr(`id`, 1, 12)) END;
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_org_code_uq` ON `warehouses` (`organization_id`, `code`);
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `description` text;
--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `retail_price` TO `sale_price`;
--> statement-breakpoint
UPDATE `products` SET `sale_price` = `sale_price` * 100;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `purchase_price` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `unit` text NOT NULL DEFAULT 'шт.';
--> statement-breakpoint
CREATE INDEX `products_org_category_idx` ON `products` (`organization_id`, `category_id`);
--> statement-breakpoint
CREATE INDEX `products_org_name_idx` ON `products` (`organization_id`, `name`);
--> statement-breakpoint
CREATE INDEX `barcodes_org_product_idx` ON `product_barcodes` (`organization_id`, `product_id`);
--> statement-breakpoint
CREATE INDEX `balances_org_warehouse_idx` ON `stock_balances` (`organization_id`, `warehouse_id`);
