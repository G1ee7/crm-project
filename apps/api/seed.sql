INSERT OR IGNORE INTO organizations (id, name, currency) VALUES ('demo', 'Demo Company', 'KZT');
INSERT OR IGNORE INTO users (id, organization_id, name, email, role) VALUES ('demo-admin', 'demo', 'Айдос Б.', 'demo@example.kz', 'admin');
INSERT OR IGNORE INTO warehouses (id, organization_id, name, code, city, is_default) VALUES ('almaty', 'demo', 'Алматы — Главный', 'ALA', 'Алматы', 1);
INSERT OR IGNORE INTO warehouses (id, organization_id, name, code, city, is_default) VALUES ('astana', 'demo', 'Астана', 'AST', 'Астана', 0);
INSERT OR IGNORE INTO warehouses (id, organization_id, name, code, city, is_default) VALUES ('shymkent', 'demo', 'Шымкент', 'CIT', 'Шымкент', 0);
INSERT OR IGNORE INTO categories (id, organization_id, name) VALUES
('11111111-1111-4111-8111-111111111111', 'demo', 'Смартфоны'),
('22222222-2222-4222-8222-222222222222', 'demo', 'Комплектующие'),
('33333333-3333-4333-8333-333333333333', 'demo', 'Оптика'),
('44444444-4444-4444-8444-444444444444', 'demo', 'Автозапчасти');
INSERT OR IGNORE INTO products (id, organization_id, category_id, name, sku, purchase_price, sale_price, unit, minimum_stock) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'demo', '11111111-1111-4111-8111-111111111111', 'iPhone 15 128GB', 'APL-IP15-128', 34000000, 38999000, 'шт.', 10),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'demo', '22222222-2222-4222-8222-222222222222', 'SSD Samsung 1TB', 'SMS-980-1TB', 3700000, 4599000, 'шт.', 12),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'demo', '33333333-3333-4333-8333-333333333333', 'Ray-Ban RB3025', 'RBN-RB3025', 6400000, 8250000, 'шт.', 5),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'demo', '44444444-4444-4444-8444-444444444444', 'Масляный фильтр MANN', 'MNN-W9142', 350000, 590000, 'шт.', 8),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'demo', '44444444-4444-4444-8444-444444444444', 'Ремень ГРМ', 'GRT-BLT-102', 850000, 1290000, 'шт.', 6);
INSERT OR IGNORE INTO product_barcodes (id, organization_id, product_id, barcode) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '0195949038957'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '8806094782714'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '8053672495544');
INSERT OR IGNORE INTO receipts (id, organization_id, number, status, comment, created_by, warehouse_id, posted_at) VALUES
('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'demo', 'OPEN-ALMATY', 'POSTED', 'Начальный остаток', 'demo-admin', 'almaty', unixepoch() * 1000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'demo', 'OPEN-ASTANA', 'POSTED', 'Начальный остаток', 'demo-admin', 'astana', unixepoch() * 1000),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'demo', 'OPEN-SHYMKENT', 'POSTED', 'Начальный остаток', 'demo-admin', 'shymkent', unixepoch() * 1000);
INSERT OR IGNORE INTO document_counters (organization_id, document_type, last_number) VALUES ('demo', 'receipts', 0);
INSERT OR IGNORE INTO receipt_items (id, organization_id, product_id, quantity, receipt_id, unit_cost_minor) VALUES
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 12, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 34000000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 5, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 34000000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 3, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 34000000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 8, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 3700000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 18, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 6400000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 6, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 6400000),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 4, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 850000);
INSERT OR IGNORE INTO document_finalizations (id, organization_id, document_type, document_id, action, expected_revision) VALUES
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'demo', 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'POST', 1),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'demo', 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'POST', 1),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'demo', 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'POST', 1);
INSERT OR IGNORE INTO stock_movements (id, organization_id, product_id, warehouse_id, type, quantity_delta, unit_cost_minor, document_type, document_id, document_item_id, created_by, note) VALUES
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'almaty', 'RECEIPT', 12, 34000000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'astana', 'RECEIPT', 5, 34000000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'shymkent', 'RECEIPT', 3, 34000000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'almaty', 'RECEIPT', 8, 3700000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'almaty', 'RECEIPT', 18, 6400000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'shymkent', 'RECEIPT', 6, 6400000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6', 'demo-admin', 'Начальный остаток'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'demo', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'astana', 'RECEIPT', 4, 850000, 'receipts', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8', 'demo-admin', 'Начальный остаток');
UPDATE stock_balances SET reserved = CASE WHEN product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' THEN 1 WHEN product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' THEN 2 WHEN product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' THEN 2 ELSE reserved END
WHERE organization_id = 'demo' AND ((product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' AND warehouse_id IN ('almaty', 'astana')) OR (product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' AND warehouse_id = 'almaty') OR (product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' AND warehouse_id = 'almaty'));
