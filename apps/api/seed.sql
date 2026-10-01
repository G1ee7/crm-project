INSERT OR IGNORE INTO organizations (id, name, currency) VALUES ('demo', 'Demo Company', 'KZT');
INSERT OR IGNORE INTO users (id, organization_id, name, email, role) VALUES ('demo-admin', 'demo', 'Айдос Б.', 'demo@example.kz', 'admin');
INSERT OR IGNORE INTO warehouses (id, organization_id, name, city, is_default) VALUES ('almaty', 'demo', 'Алматы (Главный)', 'Алматы', 1);
INSERT OR IGNORE INTO warehouses (id, organization_id, name, city, is_default) VALUES ('astana', 'demo', 'Астана', 'Астана', 0);
INSERT OR IGNORE INTO warehouses (id, organization_id, name, city, is_default) VALUES ('shymkent', 'demo', 'Шымкент', 'Шымкент', 0);
