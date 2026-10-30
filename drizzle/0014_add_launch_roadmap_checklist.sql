CREATE TABLE `launch_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_key` text NOT NULL,
	`phase` integer NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`owner` text DEFAULT 'manny' NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `launch_items_item_key_unique` ON `launch_items` (`item_key`);
