CREATE TABLE `partnership_requests` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `requester_profile_id` integer NOT NULL,
  `company_name` text NOT NULL,
  `industry` text NOT NULL,
  `contact_person` text NOT NULL,
  `work_email` text NOT NULL,
  `approximate_employees` integer NOT NULL,
  `message` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `review_notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
