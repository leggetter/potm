-- Fixture lifecycle: scheduled (default), postponed, cancelled (same UI treatment)
ALTER TABLE `fixtures` ADD COLUMN `status` text DEFAULT 'scheduled' NOT NULL;