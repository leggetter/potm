CREATE TABLE `fixture_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fixture_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squad_id` integer NOT NULL,
	`slug` text NOT NULL,
	`opponent` text NOT NULL,
	`deadline` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squad_id` integer NOT NULL,
	`name` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `squad_admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squad_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `squad_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`squad_id` integer NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`invited_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squad_invites_token_unique` ON `squad_invites` (`token`);--> statement-breakpoint
CREATE TABLE `squads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`header_image` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squads_slug_unique` ON `squads` (`slug`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fixture_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`voter_name` text NOT NULL,
	`voter_token` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
