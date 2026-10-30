ALTER TABLE `businesses` ADD `business_rate_cents` integer DEFAULT 2000 NOT NULL;
--> statement-breakpoint
ALTER TABLE `businesses` ADD `partner_share_bps` integer DEFAULT 1000 NOT NULL;
