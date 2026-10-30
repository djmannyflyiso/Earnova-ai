ALTER TABLE `tasks` ADD `privacy_blur_default` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `guardian_consent_required` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `human_review_required` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `public_sharing_prohibited` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `privacy_blur_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `privacy_blur_applied` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `guardian_consent_blob_key` text;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `guardian_consent_name` text;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `guardian_consent_mime` text;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `guardian_consent_confirmed` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `minors_present` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `submissions` ADD `public_sharing_prohibited` integer DEFAULT 0 NOT NULL;
