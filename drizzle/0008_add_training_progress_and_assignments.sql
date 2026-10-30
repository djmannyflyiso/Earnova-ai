CREATE TABLE `training_records` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `profile_id` integer,
  `team_member_id` integer,
  `assignee_name` text NOT NULL,
  `assignee_email` text NOT NULL,
  `assigned_by_profile_id` integer,
  `status` text DEFAULT 'not_started' NOT NULL,
  `current_step` integer DEFAULT 1 NOT NULL,
  `quiz_passed` integer DEFAULT false NOT NULL,
  `assigned_at` integer NOT NULL,
  `completed_at` integer,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_records_profile_unique` ON `training_records` (`profile_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_records_team_member_unique` ON `training_records` (`team_member_id`);