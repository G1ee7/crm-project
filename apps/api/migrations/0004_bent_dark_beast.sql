CREATE UNIQUE INDEX IF NOT EXISTS `users_org_id_uq` ON `users` (`organization_id`,`id`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_receipt_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'receipts' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM receipts d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_issue_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'issues' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM issues d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_writeoff_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'writeoffs' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM writeoffs d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_transfer_edit_guard BEFORE INSERT ON audit_log WHEN NEW.document_type = 'transfers' AND NEW.action = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM transfers d WHERE d.organization_id = NEW.organization_id AND d.id = NEW.document_id AND d.status = 'DRAFT' AND d.revision = CAST(NEW.details AS INTEGER)) BEGIN SELECT RAISE(ABORT, 'DOCUMENT_CHANGED'); END;
