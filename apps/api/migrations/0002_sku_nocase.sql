CREATE UNIQUE INDEX `products_org_sku_nocase_uq` ON `products` (`organization_id`, `sku` COLLATE NOCASE);
