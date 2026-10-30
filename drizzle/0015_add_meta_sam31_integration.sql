CREATE TABLE `meta_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`api_key` text,
	`last_test_status` text,
	`last_test_message` text,
	`last_tested_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sam_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`concept` text NOT NULL,
	`media_kind` text DEFAULT 'image' NOT NULL,
	`media_name` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`region_count` integer,
	`regions_json` text,
	`summary` text DEFAULT '' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta_build_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_key` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_build_items_item_key_unique` ON `meta_build_items` (`item_key`);
