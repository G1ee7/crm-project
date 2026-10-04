DROP TRIGGER stock_movements_immutable_update;
--> statement-breakpoint
UPDATE stock_balances SET inventory_value_minor=CAST(ROUND(inventory_value_minor) AS INTEGER) WHERE typeof(inventory_value_minor)<>'integer';
--> statement-breakpoint
UPDATE stock_movements SET value_delta_minor=CAST(ROUND(value_delta_minor) AS INTEGER) WHERE typeof(value_delta_minor)<>'integer';
--> statement-breakpoint
CREATE TRIGGER stock_movements_immutable_update BEFORE UPDATE ON stock_movements BEGIN SELECT RAISE(ABORT, 'MOVEMENTS_APPEND_ONLY'); END;
--> statement-breakpoint
UPDATE sale_items SET cost_total_minor=CAST(ROUND(cost_total_minor) AS INTEGER),unit_cost_snapshot_minor=CAST(ROUND(unit_cost_snapshot_minor) AS INTEGER),gross_profit_minor=CAST(ROUND(gross_profit_minor) AS INTEGER) WHERE typeof(cost_total_minor)<>'integer' OR typeof(unit_cost_snapshot_minor)<>'integer' OR typeof(gross_profit_minor)<>'integer';
--> statement-breakpoint
UPDATE sales SET cost_total_minor=(SELECT COALESCE(SUM(cost_total_minor),0) FROM sale_items WHERE organization_id=sales.organization_id AND sale_id=sales.id),gross_profit_minor=total_minor-(SELECT COALESCE(SUM(cost_total_minor),0) FROM sale_items WHERE organization_id=sales.organization_id AND sale_id=sales.id) WHERE status='POSTED';
--> statement-breakpoint
DROP TRIGGER stock_balance_value_guard;
--> statement-breakpoint
DROP TRIGGER stock_balance_value_insert_guard;
--> statement-breakpoint
CREATE TRIGGER stock_balance_value_guard AFTER UPDATE ON stock_balances WHEN typeof(NEW.inventory_value_minor) <> 'integer' OR NEW.inventory_value_minor < 0 OR NEW.inventory_value_minor > 9007199254740991 OR (NEW.quantity = 0 AND NEW.inventory_value_minor <> 0) BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_balance_value_insert_guard AFTER INSERT ON stock_balances WHEN typeof(NEW.inventory_value_minor) <> 'integer' OR NEW.inventory_value_minor < 0 OR NEW.inventory_value_minor > 9007199254740991 OR (NEW.quantity = 0 AND NEW.inventory_value_minor <> 0) BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS stock_movement_value_guard BEFORE INSERT ON stock_movements WHEN typeof(NEW.value_delta_minor) <> 'integer' OR NEW.value_delta_minor > 9007199254740991 OR NEW.value_delta_minor < -9007199254740991 BEGIN SELECT RAISE(ABORT, 'INVALID_STOCK_VALUE'); END;
