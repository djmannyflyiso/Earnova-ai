CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL DEFAULT 'contributor',
  country TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  birth_year INTEGER,
  eligibility_confirmed INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_profile_id INTEGER NOT NULL,
  team_limit INTEGER NOT NULL DEFAULT 10,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'invited',
  created_at INTEGER NOT NULL,
  UNIQUE (business_id, email),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
--> statement-breakpoint
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  compensation_type TEXT NOT NULL,
  rate_cents INTEGER NOT NULL,
  max_minutes INTEGER NOT NULL,
  budget_cents INTEGER NOT NULL,
  remaining_budget_cents INTEGER NOT NULL,
  expected_review_days INTEGER NOT NULL DEFAULT 5,
  evidence_type TEXT NOT NULL DEFAULT 'video',
  camera_requirements TEXT NOT NULL DEFAULT '',
  safety_requirements TEXT NOT NULL DEFAULT '',
  privacy_requirements TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  claimed_at INTEGER NOT NULL,
  UNIQUE (task_id, profile_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL UNIQUE,
  profile_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  notes TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  evidence_blob_key TEXT,
  evidence_name TEXT,
  evidence_mime TEXT,
  evidence_bytes INTEGER,
  checksum TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_review',
  review_feedback TEXT,
  approved_minutes INTEGER,
  payable_cents INTEGER,
  submitted_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX submissions_checksum_unique ON submissions(checksum) WHERE checksum IS NOT NULL;
--> statement-breakpoint
CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL UNIQUE,
  profile_id INTEGER NOT NULL,
  task_id INTEGER,
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  calculation TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
--> statement-breakpoint
CREATE TABLE withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  withdrawal_id TEXT NOT NULL UNIQUE,
  profile_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  provider_reference TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
--> statement-breakpoint
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
