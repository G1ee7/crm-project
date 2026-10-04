CREATE TRIGGER sales_posted_immutable BEFORE UPDATE ON sales WHEN OLD.status='POSTED' BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_items_posted_immutable_update BEFORE UPDATE ON sale_items WHEN EXISTS(SELECT 1 FROM sales WHERE organization_id=OLD.organization_id AND id=OLD.sale_id AND status='POSTED') BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_items_posted_immutable_delete BEFORE DELETE ON sale_items WHEN EXISTS(SELECT 1 FROM sales WHERE organization_id=OLD.organization_id AND id=OLD.sale_id AND status='POSTED') BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_returns_posted_immutable BEFORE UPDATE ON sale_returns WHEN OLD.status='POSTED' BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_return_items_posted_immutable_update BEFORE UPDATE ON sale_return_items WHEN EXISTS(SELECT 1 FROM sale_returns WHERE organization_id=OLD.organization_id AND id=OLD.sale_return_id AND status='POSTED') BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER sale_return_items_posted_immutable_delete BEFORE DELETE ON sale_return_items WHEN EXISTS(SELECT 1 FROM sale_returns WHERE organization_id=OLD.organization_id AND id=OLD.sale_return_id AND status='POSTED') BEGIN SELECT RAISE(ABORT,'POSTED_IMMUTABLE'); END;
