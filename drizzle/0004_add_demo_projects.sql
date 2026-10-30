CREATE TABLE `projects` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_name` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `is_test` integer DEFAULT false NOT NULL,
  `budget_cents` integer NOT NULL,
  `remaining_budget_cents` integer NOT NULL,
  `rate_cents` integer NOT NULL,
  `max_minutes` integer NOT NULL,
  `currency` text DEFAULT 'USD' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` integer;