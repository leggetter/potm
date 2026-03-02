-- URL-only invites: allow email to be null (link invite = no email, single-use token)
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_squad_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squad_id` integer NOT NULL,
	`email` text,
	`token` text NOT NULL,
	`invited_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO `__new_squad_invites`("id", "squad_id", "email", "token", "invited_by", "expires_at", "accepted_at", "created_at") SELECT "id", "squad_id", "email", "token", "invited_by", "expires_at", "accepted_at", "created_at" FROM `squad_invites`;
DROP TABLE `squad_invites`;
ALTER TABLE `__new_squad_invites` RENAME TO `squad_invites`;
CREATE UNIQUE INDEX `squad_invites_token_unique` ON `squad_invites` (`token`);
PRAGMA foreign_keys=ON;
