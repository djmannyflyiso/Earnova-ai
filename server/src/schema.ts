import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
};

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  accountType: text("account_type", { enum: ["contributor", "business"] }).notNull().default("contributor"),
  country: text("country").notNull(),
  language: text("language").notNull().default("English"),
  gearStatus: text("gear_status", { enum: ["have_gear", "ordered", "need_gear"] }),
  birthYear: integer("birth_year"),
  eligibilityConfirmed: integer("eligibility_confirmed", { mode: "boolean" }).notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const consents = sqliteTable("consents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  consentType: text("consent_type").notNull(),
  version: text("version").notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
});

export const businesses = sqliteTable("businesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  status: text("status", { enum: ["pending", "verified", "suspended"] }).notNull().default("pending"),
  ownerProfileId: integer("owner_profile_id").notNull(),
  // A value of 0 means unlimited. The field remains for forward-compatible admin caps.
  teamLimit: integer("team_limit").notNull().default(0),
  businessRateCents: integer("business_rate_cents").notNull().default(2000),
  partnerShareBps: integer("partner_share_bps").notNull().default(1000),
  ...timestamps,
});

export const partnershipRequests = sqliteTable("partnership_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterProfileId: integer("requester_profile_id").notNull(),
  companyName: text("company_name").notNull(),
  industry: text("industry", { enum: ["hotel", "healthcare", "childcare", "cleaning", "other"] }).notNull(),
  contactPerson: text("contact_person").notNull(),
  workEmail: text("work_email").notNull(),
  approximateEmployees: integer("approximate_employees").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "approved", "declined"] }).notNull().default("pending"),
  reviewNotes: text("review_notes"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["member", "manager"] }).notNull().default("member"),
  status: text("status", { enum: ["invited", "active", "removed"] }).notNull().default("invited"),
  ...timestamps,
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerName: text("owner_name").notNull(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  isTest: integer("is_test", { mode: "boolean" }).notNull().default(false),
  budgetCents: integer("budget_cents").notNull(),
  remainingBudgetCents: integer("remaining_budget_cents").notNull(),
  rateCents: integer("rate_cents").notNull(),
  maxMinutes: integer("max_minutes").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ["active", "paused", "closed"] }).notNull().default("active"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id"),
  ownerName: text("owner_name").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  reviewCriteria: text("review_criteria").notNull().default("Work is complete, clearly shown, follows the task instructions, and meets the safety and privacy rules."),
  compensationType: text("compensation_type", { enum: ["hourly", "fixed"] }).notNull(),
  rateCents: integer("rate_cents").notNull(),
  maxMinutes: integer("max_minutes").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  remainingBudgetCents: integer("remaining_budget_cents").notNull(),
  expectedReviewDays: integer("expected_review_days").notNull().default(5),
  evidenceType: text("evidence_type", { enum: ["video", "audio", "photo", "text"] }).notNull().default("video"),
  cameraRequirements: text("camera_requirements").notNull().default(""),
  safetyRequirements: text("safety_requirements").notNull().default(""),
  privacyRequirements: text("privacy_requirements").notNull().default(""),
  privacyBlurDefault: integer("privacy_blur_default", { mode: "boolean" }).notNull().default(false),
  guardianConsentRequired: integer("guardian_consent_required", { mode: "boolean" }).notNull().default(false),
  humanReviewRequired: integer("human_review_required", { mode: "boolean" }).notNull().default(false),
  publicSharingProhibited: integer("public_sharing_prohibited", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["draft", "published", "paused", "closed"] }).notNull().default("draft"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  profileId: integer("profile_id").notNull(),
  status: text("status", { enum: ["active", "submitted", "completed", "cancelled"] }).notNull().default("active"),
  claimedAt: integer("claimed_at", { mode: "timestamp_ms" }).notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull().unique(),
  profileId: integer("profile_id").notNull(),
  taskId: integer("task_id").notNull(),
  notes: text("notes").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  evidenceBlobKey: text("evidence_blob_key"),
  evidenceName: text("evidence_name"),
  evidenceMime: text("evidence_mime"),
  evidenceBytes: integer("evidence_bytes"),
  checksum: text("checksum"),
  recordingDurationSeconds: integer("recording_duration_seconds"),
  privacyBlurEnabled: integer("privacy_blur_enabled", { mode: "boolean" }).notNull().default(false),
  privacyBlurApplied: integer("privacy_blur_applied", { mode: "boolean" }).notNull().default(false),
  guardianConsentBlobKey: text("guardian_consent_blob_key"),
  guardianConsentName: text("guardian_consent_name"),
  guardianConsentMime: text("guardian_consent_mime"),
  guardianConsentConfirmed: integer("guardian_consent_confirmed", { mode: "boolean" }).notNull().default(false),
  minorsPresent: integer("minors_present", { mode: "boolean" }).notNull().default(false),
  publicSharingProhibited: integer("public_sharing_prohibited", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["awaiting_review", "approved", "rejected", "flagged"] }).notNull().default("awaiting_review"),
  reviewFeedback: text("review_feedback"),
  approvedMinutes: integer("approved_minutes"),
  payableCents: integer("payable_cents"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
}, (table) => [uniqueIndex("submissions_checksum_unique").on(table.checksum)]);

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: text("transaction_id").notNull().unique(),
  profileId: integer("profile_id").notNull(),
  taskId: integer("task_id"),
  kind: text("kind", { enum: ["task_credit", "referral_credit", "partner_share", "adjustment", "withdrawal", "reversal"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ["pending", "available", "processing", "completed", "reversed"] }).notNull(),
  calculation: text("calculation").notNull(),
  ...timestamps,
});

export const payoutMethods = sqliteTable("payout_methods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  provider: text("provider", { enum: ["paypal", "venmo", "cash_app", "whop"] }).notNull(),
  accountLabel: text("account_label").notNull(),
  status: text("status", { enum: ["unverified", "test_verified"] }).notNull().default("unverified"),
  isSelected: integer("is_selected", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("payout_methods_profile_provider_unique").on(table.profileId, table.provider)]);

export const withdrawals = sqliteTable("withdrawals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  withdrawalId: text("withdrawal_id").notNull().unique(),
  profileId: integer("profile_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  method: text("method").notNull(),
  status: text("status", { enum: ["requested", "processing", "completed", "failed"] }).notNull().default("requested"),
  providerReference: text("provider_reference"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export const supportTickets = sqliteTable("support_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved"] }).notNull().default("open"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const supportMessages = sqliteTable("support_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  authorRole: text("author_role", { enum: ["contributor", "staff"] }).notNull(),
  authorName: text("author_name").notNull(),
  message: text("message").notNull(),
  ...timestamps,
});

export const trainingRecords = sqliteTable("training_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id"),
  teamMemberId: integer("team_member_id"),
  assigneeName: text("assignee_name").notNull(),
  assigneeEmail: text("assignee_email").notNull(),
  assignedByProfileId: integer("assigned_by_profile_id"),
  status: text("status", { enum: ["not_started", "in_progress", "completed"] }).notNull().default("not_started"),
  currentStep: integer("current_step").notNull().default(1),
  quizPassed: integer("quiz_passed", { mode: "boolean" }).notNull().default(false),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("training_records_profile_unique").on(table.profileId),
  uniqueIndex("training_records_team_member_unique").on(table.teamMemberId),
]);

export const businessTerms = sqliteTable("business_terms", {
  id: integer("id").primaryKey(),
  mission: text("mission").notNull(),
  pilotName: text("pilot_name").notNull(),
  pilotPriceCents: integer("pilot_price_cents").notNull(),
  pilotDuration: text("pilot_duration").notNull(),
  pilotAudience: text("pilot_audience").notNull(),
  pilotIncludes: text("pilot_includes").notNull(),
  growthName: text("growth_name").notNull(),
  growthPriceCents: integer("growth_price_cents").notNull(),
  growthDuration: text("growth_duration").notNull(),
  growthAudience: text("growth_audience").notNull(),
  growthIncludes: text("growth_includes").notNull(),
  enterpriseName: text("enterprise_name").notNull(),
  enterprisePriceCents: integer("enterprise_price_cents").notNull(),
  enterpriseDuration: text("enterprise_duration").notNull(),
  enterpriseAudience: text("enterprise_audience").notNull(),
  enterpriseIncludes: text("enterprise_includes").notNull(),
  pricingNote: text("pricing_note").notNull(),
  seedTargetCents: integer("seed_target_cents").notNull(),
  equityMinPercent: integer("equity_min_percent").notNull(),
  equityMaxPercent: integer("equity_max_percent").notNull(),
  investmentSummary: text("investment_summary").notNull(),
  investmentTermsNote: text("investment_terms_note").notNull(),
  fundsAppCents: integer("funds_app_cents").notNull(),
  fundsDataCents: integer("funds_data_cents").notNull(),
  fundsGrowthCents: integer("funds_growth_cents").notNull(),
  fundsSalesCents: integer("funds_sales_cents").notNull(),
  fundsLegalCents: integer("funds_legal_cents").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const commercialInquiries = sqliteTable("commercial_inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterProfileId: integer("requester_profile_id").notNull(),
  kind: text("kind", { enum: ["partnership", "investor"] }).notNull(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  email: text("email").notNull(),
  tier: text("tier"),
  budget: text("budget"),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "contacted", "closed"] }).notNull().default("pending"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const launchItems = sqliteTable("launch_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemKey: text("item_key").notNull().unique(),
  phase: integer("phase").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  owner: text("owner", { enum: ["manny", "build", "both"] }).notNull().default("manny"),
  status: text("status", { enum: ["not_started", "in_progress", "done"] }).notNull().default("not_started"),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const metaSettings = sqliteTable("meta_settings", {
  id: integer("id").primaryKey(),
  // Founder-supplied Meta Model API key. Stored only so server actions can call
  // api.meta.ai; never returned to the client in full (status exposes a hint only).
  apiKey: text("api_key"),
  lastTestStatus: text("last_test_status"),
  lastTestMessage: text("last_test_message"),
  lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const samJobs = sqliteTable("sam_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  concept: text("concept").notNull(),
  mediaKind: text("media_kind", { enum: ["image", "video"] }).notNull().default("image"),
  mediaName: text("media_name").notNull().default(""),
  status: text("status", { enum: ["completed", "failed", "no_key", "model_not_found", "unreachable"] }).notNull(),
  regionCount: integer("region_count"),
  regionsJson: text("regions_json"),
  summary: text("summary").notNull().default(""),
  errorMessage: text("error_message"),
  ...timestamps,
});

export const metaBuildItems = sqliteTable("meta_build_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemKey: text("item_key").notNull().unique(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status", { enum: ["not_started", "in_progress", "done"] }).notNull().default("not_started"),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail").notNull(),
  ...timestamps,
});
