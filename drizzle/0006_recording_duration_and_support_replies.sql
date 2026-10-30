ALTER TABLE `submissions` ADD `recording_duration_seconds` integer;
--> statement-breakpoint
CREATE TABLE `support_messages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ticket_id` integer NOT NULL,
  `author_role` text NOT NULL,
  `author_name` text NOT NULL,
  `message` text NOT NULL,
  `created_at` integer NOT NULL
);
