CREATE TABLE `payout_methods` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `profile_id` integer NOT NULL,
  `provider` text NOT NULL,
  `account_label` text NOT NULL,
  `status` text DEFAULT 'unverified' NOT NULL,
  `is_selected` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_methods_profile_provider_unique` ON `payout_methods` (`profile_id`,`provider`);
