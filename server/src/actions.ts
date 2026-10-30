import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { and, asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { requestedTaskCatalog } from "./taskCatalog";

const gearStatusShape = z.enum(["have_gear", "ordered", "need_gear"]);
const profileShape = z.object({
  id: z.number(), displayName: z.string(), email: z.string(), accountType: z.string(), country: z.string(), language: z.string(), gearStatus: gearStatusShape.nullable(), eligibilityConfirmed: z.boolean(), referralCode: z.string(),
});
const projectShape = z.object({
  id: z.number(), ownerName: z.string(), name: z.string(), description: z.string(), isTest: z.boolean(), budgetCents: z.number(), remainingBudgetCents: z.number(), rateCents: z.number(), maxMinutes: z.number(), currency: z.string(), status: z.string(), linkedTaskCount: z.number(),
});
const taskShape = z.object({
  id: z.number(), projectId: z.number().nullable(), projectName: z.string().nullable(), projectIsTest: z.boolean(), ownerName: z.string(), title: z.string(), category: z.string(), description: z.string(), instructions: z.string(), reviewCriteria: z.string(), compensationType: z.string(), rateCents: z.number(), maxMinutes: z.number(), budgetCents: z.number(), remainingBudgetCents: z.number(), expectedReviewDays: z.number(), evidenceType: z.string(), cameraRequirements: z.string(), safetyRequirements: z.string(), privacyRequirements: z.string(), privacyBlurDefault: z.boolean(), guardianConsentRequired: z.boolean(), humanReviewRequired: z.boolean(), publicSharingProhibited: z.boolean(), status: z.string(), createdAt: z.string(),
});
const assignmentShape = z.object({ id: z.number(), taskId: z.number(), title: z.string(), status: z.string(), claimedAt: z.string() });
const submissionShape = z.object({ id: z.number(), taskId: z.number(), taskTitle: z.string(), status: z.string(), notes: z.string(), submittedAt: z.string(), reviewFeedback: z.string().nullable(), approvedMinutes: z.number().nullable(), payableCents: z.number().nullable(), evidenceName: z.string().nullable(), recordingDurationSeconds: z.number().nullable(), privacyBlurEnabled: z.boolean(), privacyBlurApplied: z.boolean(), guardianConsentName: z.string().nullable(), guardianConsentConfirmed: z.boolean(), minorsPresent: z.boolean(), publicSharingProhibited: z.boolean() });
const supportMessageShape = z.object({ id: z.number(), authorRole: z.enum(["contributor", "staff"]), authorName: z.string(), message: z.string(), createdAt: z.string() });
const supportTicketShape = z.object({ id: z.number(), profileId: z.number(), profileName: z.string(), subject: z.string(), message: z.string(), status: z.enum(["open", "in_progress", "resolved"]), createdAt: z.string(), updatedAt: z.string(), messages: z.array(supportMessageShape) });
const ledgerShape = z.object({ id: z.number(), transactionId: z.string(), kind: z.string(), amountCents: z.number(), currency: z.string(), status: z.string(), calculation: z.string(), createdAt: z.string() });
const payoutMethodShape = z.object({ id: z.number(), provider: z.enum(["paypal", "venmo", "cash_app", "whop"]), accountLabel: z.string(), status: z.enum(["unverified", "test_verified"]), isSelected: z.boolean(), createdAt: z.string() });
const notificationShape = z.object({ id: z.number(), title: z.string(), body: z.string(), read: z.boolean(), createdAt: z.string() });
const trainingRecordShape = z.object({ id: z.number(), profileId: z.number().nullable(), teamMemberId: z.number().nullable(), assigneeName: z.string(), assigneeEmail: z.string(), status: z.enum(["not_started", "in_progress", "completed"]), currentStep: z.number(), quizPassed: z.boolean(), assignedAt: z.string(), completedAt: z.string().nullable(), updatedAt: z.string() });
const teamMemberShape = z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.enum(["member", "manager"]), status: z.enum(["invited", "active", "removed"]), approvedMinutes: z.number(), completedTasks: z.number(), earningsCents: z.number(), ledgerEntryCount: z.number(), training: trainingRecordShape.nullable() });
const partnershipRequestShape = z.object({ id: z.number(), requesterProfileId: z.number(), companyName: z.string(), industry: z.enum(["hotel", "healthcare", "childcare", "cleaning", "other"]), contactPerson: z.string(), workEmail: z.string(), approximateEmployees: z.number(), message: z.string(), status: z.enum(["pending", "approved", "declined"]), reviewNotes: z.string().nullable(), createdAt: z.string(), updatedAt: z.string() });
const businessSettingsShape = z.object({ id: z.number(), name: z.string(), status: z.enum(["pending", "verified", "suspended"]), businessRateCents: z.number(), partnerShareBps: z.number() });
const commercialInquiryShape = z.object({ id: z.number(), requesterProfileId: z.number(), kind: z.enum(["partnership", "investor"]), name: z.string(), organization: z.string(), email: z.string(), tier: z.string().nullable(), budget: z.string().nullable(), message: z.string(), status: z.enum(["pending", "contacted", "closed"]), createdAt: z.string(), updatedAt: z.string() });
const launchItemShape = z.object({ id: z.number(), itemKey: z.string(), phase: z.number(), title: z.string(), detail: z.string(), owner: z.enum(["manny", "build", "both"]), status: z.enum(["not_started", "in_progress", "done"]), note: z.string().nullable(), sortOrder: z.number(), updatedAt: z.string() });
const metaIntegrationShape = z.object({ configured: z.boolean(), keyHint: z.string().nullable(), lastTestStatus: z.string().nullable(), lastTestMessage: z.string().nullable(), lastTestedAt: z.string().nullable() });
const samRegionShape = z.object({ label: z.string(), x: z.number(), y: z.number(), width: z.number(), height: z.number(), confidence: z.number().nullable() });
const samJobShape = z.object({ id: z.number(), concept: z.string(), mediaKind: z.string(), mediaName: z.string(), status: z.enum(["completed", "failed", "no_key", "model_not_found", "unreachable"]), regionCount: z.number().nullable(), regions: z.array(samRegionShape), summary: z.string(), errorMessage: z.string().nullable(), createdAt: z.string() });
const metaBuildItemShape = z.object({ id: z.number(), itemKey: z.string(), title: z.string(), detail: z.string(), status: z.enum(["not_started", "in_progress", "done"]), note: z.string().nullable(), sortOrder: z.number(), updatedAt: z.string() });

function token(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeBase64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function taskSafeguards(title: string, category: string) {
  const protectedCare = category === "Childcare" || category === "Caregiving";
  const minorsExpected = title === "Babysitting" || title === "Childcare";
  return {
    privacyBlurDefault: protectedCare,
    guardianConsentRequired: minorsExpected,
    humanReviewRequired: protectedCare,
    publicSharingProhibited: protectedCare,
  };
}

function catalogDetails(title: string, description: string, category = "") {
  const isDriving = title === "Rideshare / Taxi Driving Shift";
  const isDelivery = /Delivery|Pickup|Errand Run/.test(title);
  const isPharmacy = title === "Pharmacy Pickup";
  const isChildcare = category === "Childcare";
  const isCaregiving = category === "Caregiving";
  const higherRisk = /tire|engine oil|gutter|grill|pressure|snow|hedges|branches|drill|furniture|showerhead|gas|firewood/i.test(title);
  if (isChildcare) {
    return {
      instructions: `1. Upload verifiable parent or legal guardian consent before recording. 2. Turn on Privacy Blur and confirm it is applied to the stored copy. 3. ${description} 4. Keep the child supervised and never stage unsafe behavior. 5. Submit privately for human review only.`,
      reviewCriteria: "A reviewer must verify guardian consent, continuous safe supervision, completion of the stated routine, active privacy blur, and the absence of public sharing or unrelated private information.",
      cameraRequirements: "Use a stationary or securely mounted camera. Privacy Blur defaults ON and processes the stored copy. Frame only the approved activity; never place a camera in a bathroom, changing area, bedroom during private routines, or any place where a child expects privacy.",
      safetyRequirements: "A responsible adult must remain in control of the child's safety. Do not film bathing, changing, toileting, discipline, distress, medical care, sleep areas, or dangerous activities. Stop immediately if the child is uncomfortable.",
      privacyRequirements: "REQUIRED: upload verifiable parent or legal guardian consent before submission. Never submit a recording of a minor without documented consent. Privacy Blur reduces identifiability but is not a guarantee. No public sharing, reposting, or personal reuse is permitted; every submission receives human review.",
    };
  }
  if (isCaregiving) {
    const adultCare = title === "Adult Care";
    return {
      instructions: `1. Obtain informed consent from every identifiable participant before recording. 2. Keep Privacy Blur ON while processing the stored copy. 3. ${description} 4. Avoid private, medical, financial, or intimate details. 5. Submit privately for human review only.`,
      reviewCriteria: "A reviewer must verify consent, respectful and safe conduct, completion of the stated routine, privacy protection, and the absence of public sharing or unrelated sensitive information.",
      cameraRequirements: "Use a stationary or securely mounted camera. Privacy Blur defaults ON and processes the stored copy. Keep non-participants, addresses, records, screens, and private rooms out of frame.",
      safetyRequirements: adultCare ? "Non-medical routine only. Do not record intimate care, medication administration, transfers beyond your training, emergencies, distress, or any activity the care recipient cannot freely stop." : "Follow the animal guardian's instructions, use humane handling only, and stop if an animal shows fear, aggression, pain, or distress. Do not stage risky interactions.",
      privacyRequirements: "Obtain consent from every identifiable person. If any minor appears, verifiable parent or legal guardian consent is required before submission. Privacy Blur reduces identifiability but is not a guarantee. No public sharing, reposting, or personal reuse is permitted; every submission receives human review.",
    };
  }
  if (isDriving) {
    return {
      instructions: `1. Park safely before setup. 2. Mount the camera securely in dashcam style and begin recording before the vehicle moves. 3. ${description} 4. Do not touch or operate the phone while driving. 5. End the recording only after parking safely.`,
      reviewCriteria: "The camera remains hands-free and mounted; the shift is shown without unsafe phone handling; traffic laws are followed; passenger consent is respected; and no declined or non-consenting passenger remains identifiable.",
      cameraRequirements: "STRICT: Mount the camera before the vehicle moves. The camera must remain hands-free and secure for the entire shift. Never hold, adjust, or operate the phone while driving.",
      safetyRequirements: "STRICT DRIVING SAFETY: Set up while parked, never touch the phone while driving, obey every traffic law, do not obstruct the driver's view, and stop recording or pull over safely if attention is required.",
      privacyRequirements: "Obtain passenger consent before recording any identifiable passenger; stop recording passengers who decline. Avoid addresses, payment details, messages, screens, and private conversations. Follow all local recording, privacy, taxi, and rideshare regulations.",
    };
  }
  if (isDelivery) {
    return {
      instructions: `1. Review the route and recording requirements while safely stopped. 2. Record collection without exposing private details. 3. ${description} 4. Record only the permitted handoff or drop-off evidence, then stop recording.`,
      reviewCriteria: "Pickup and delivery steps are sufficiently shown; required handoff or drop-off evidence is visible; no unsafe recording occurs in motion; and privacy, consent, and location rules are followed.",
      cameraRequirements: "Record only while safely stopped or on foot. Never hold or operate a phone while driving. Keep labels, addresses, payment screens, access codes, and unrelated people out of frame.",
      safetyRequirements: "Plan the route before moving, follow traffic and parking laws, remain aware of surroundings, never record while operating a moving vehicle, and do not enter unsafe or restricted areas.",
      privacyRequirements: isPharmacy ? "Never record prescription labels, medication details, receipts, medical information, patient names, addresses, or anyone else's health information. Obtain consent before recording an identifiable handoff." : "Avoid names, addresses, labels, receipts, payment details, access codes, and unrelated people. Obtain consent before recording an identifiable customer or handoff.",
    };
  }
  return {
    instructions: `1. Review the workspace and gather the supplies needed. 2. Record a clear before view. 3. ${description} 4. Record the completed result and leave the area safe and orderly.`,
    reviewCriteria: "The full activity and finished result are visible; the listed task is completed; the recording is continuous enough to verify the work; and all safety, consent, and privacy requirements are followed.",
    cameraRequirements: "Record the workspace before starting, keep the main activity visible, and show the finished result. Pause only when the task instructions allow it.",
    safetyRequirements: higherRisk ? "Use appropriate protective equipment and tools, follow manufacturer guidance, and do not continue if the task cannot be completed safely. Never record while driving." : "Use appropriate tools and supplies, keep walkways clear, and stop if the task cannot be completed safely.",
    privacyRequirements: "Avoid faces of non-participants, addresses, mail, screens, passwords, financial records, and private conversations. Get consent from every identifiable person recorded.",
  };
}

// The real-launch roadmap Manny approved on Oct 13 and kicked off on Oct 22, 2026
// (source: earnova-launch-roadmap.md). Seeded once into launch_items; afterwards the
// founder's saved statuses and notes are the record and are never rewritten from code.
const launchRoadmapCatalog: Array<{ itemKey: string; phase: number; title: string; detail: string; owner: "manny" | "build" | "both"; status: "not_started" | "in_progress" | "done"; note: string | null }> = [
  { itemKey: "kickoff-attorney-packet", phase: 1, title: "Attorney packet assembled", detail: "Invention disclosure (5 candidate areas) plus a one-page attorney brief, ready to hand over.", owner: "build", status: "done", note: "Assembled Oct 22, 2026 in earnova-launch/attorney-packet/." },
  { itemKey: "kickoff-payout-comparison", phase: 1, title: "Payout-provider comparison started", detail: "Shortlist research for a real payout provider (e.g., Stripe Connect or equivalent).", owner: "build", status: "in_progress", note: "Research delegated at kickoff, Oct 22, 2026." },
  { itemKey: "kickoff-domain-email", phase: 1, title: "Business domain & email verification started", detail: "Verify royaltyradiomedia.com so a business-domain email can be set up.", owner: "both", status: "in_progress", note: "Verification delegated at kickoff, Oct 22, 2026." },
  { itemKey: "phase1-attorney-review", phase: 1, title: "Attorney review of legal documents", detail: "Terms of Service, Privacy Policy, contributor/worker agreement, and payout terms need professional review or drafting before any real user earns a dollar.", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase1-patent-decision", phase: 1, title: "Provisional patent decision — before Nov 4", detail: "The hackathon demo goes public by Nov 4, which counts as public disclosure. Decide with the attorney whether a provisional filing is warranted, ideally before then.", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase1-payout-provider", phase: 1, title: "Real payout provider onboarded & verified", detail: "Identity checks, tax forms (W-9 / W-8BEN), payout thresholds, and fee schedule. Sandbox gets fully replaced — no mixed modes.", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase1-business-email", phase: 1, title: "Business-domain email set up", detail: "An address at royaltyradiomedia.com / earnova.ai. Also unblocks the 5 Gmail-rejected outreach forms (TELUS Digital, micro1, Scale AI, Boston Dynamics, Encord).", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase1-remove-test-funds", phase: 1, title: "Remove all test funds", detail: "Every $1,000 test balance, every “TEST FUNDS — not real money” label, and every sandbox banner comes out. The compensation ledger becomes the real ledger, reconciled to actual deposits.", owner: "build", status: "not_started", note: null },
  { itemKey: "phase2-identity-verification", phase: 2, title: "Identity verification for workers", detail: "Government ID plus liveness check via a vendor such as Persona, Veriff, or Stripe Identity.", owner: "both", status: "not_started", note: null },
  { itemKey: "phase2-care-protections", phase: 2, title: "Keep care-task protections hard-coded", detail: "Already designed in: blur locked on for children, guardian consent, mandatory human review, no public sharing of care footage. Keep them non-negotiable in the launch build.", owner: "build", status: "in_progress", note: "Designed into the current build; must be preserved at launch." },
  { itemKey: "phase2-fraud-review", phase: 2, title: "Content & fraud review pipeline", detail: "Who reviews flagged tasks, the payout dispute process, and chargeback handling.", owner: "both", status: "not_started", note: null },
  { itemKey: "phase3-accounts-persistence", phase: 3, title: "Accounts + persistence", detail: "Sign-up/login (email + social) and projects and earnings that survive reloads, on a real database.", owner: "build", status: "not_started", note: null },
  { itemKey: "phase3-nova-voice-licensing", phase: 3, title: "Nova's voice licensing confirmed for commercial use", detail: "The current TTS integration is fine for the demo; confirm the commercial terms before launch.", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase3-branding-pass", phase: 3, title: "Branding pass — logo across the app", detail: "Logo into the app shell header (previously generic), consistent across onboarding, app, and socials.", owner: "build", status: "in_progress", note: "Logo mark added to the app shell header in this kickoff build; onboarding already carried the logo." },
  { itemKey: "phase3-media-analysis", phase: 3, title: "Media-analysis jobs — build or scope out of v1", detail: "The real version of the training-data pipeline, or honestly scope it out of v1.", owner: "build", status: "not_started", note: null },
  { itemKey: "phase4-web-launch", phase: 4, title: "Web launch at a real domain", detail: "Public site plus the app at a real domain. This private artifact can't get a public link as-is — real hosting is required.", owner: "both", status: "not_started", note: null },
  { itemKey: "phase4-app-stores", phase: 4, title: "App Store / Google Play (if native)", detail: "Developer accounts ($99/yr Apple, $25 one-time Google), review guidelines, privacy nutrition labels.", owner: "manny", status: "not_started", note: null },
  { itemKey: "phase4-launch-content", phase: 4, title: "Re-cut launch content with real-money language", detail: "The promo package is already built (carousels, 48s promo, 51s commercial). Re-cut only after Phase 1 is done — never ship the test-funds versions publicly.", owner: "build", status: "not_started", note: null },
  { itemKey: "phase5-paid-pilot", phase: 5, title: "Convert outreach into a paid pilot", detail: "10 companies contacted; follow-up drafts prepared Oct 21 (target send Oct 28, awaiting approval). One paying data customer is the real launch milestone.", owner: "both", status: "not_started", note: null },
  { itemKey: "phase5-pricing", phase: 5, title: "Finalize real pricing", detail: "The $10/hr, 60-minute payable cap was the test configuration. Set real rates with the first pilot.", owner: "manny", status: "not_started", note: null },
];

// Meta-model build tracker (SAM 3.1 first), started Oct 29, 2026 at the founder's
// direction after hackathon approval. Seeded once into meta_build_items; afterwards
// the founder's saved statuses are the record and are never rewritten from code.
// Statuses below describe build state only — a "done" integration step never means
// SAM output was produced without a configured, verified Meta Model API key.
const metaBuildCatalog: Array<{ itemKey: string; title: string; detail: string; status: "not_started" | "in_progress" | "done"; note: string | null }> = [
  { itemKey: "sam31-key-vault", title: "Founder API key vault & status", detail: "Founder-only settings field for the Meta Model API key (dev.meta.ai). The key is stored server-side, never hard-coded, and only a masked hint is ever shown. Until a key is saved, Privacy Blur keeps running on the built-in engine and says so.", status: "done", note: "Built Oct 29, 2026. Next step is Manny's: create the key at dev.meta.ai and paste it in Meta AI → SAM 3.1 Lab." },
  { itemKey: "sam31-connection-test", title: "Live connection test against api.meta.ai", detail: "Server-side check of the saved key against the Meta Model API model list, with honest outcomes: connected, invalid key, model_not_found (key valid but no SAM 3.1 access), or unreachable.", status: "in_progress", note: "Built Oct 29, 2026. Becomes done after the first successful test with a real key." },
  { itemKey: "sam31-image-lab", title: "SAM 3.1 image segmentation lab", detail: "Upload a still image, send ONE concept phrase per request (person, face, dog, document…), and receive segmentation regions back from model sam-3.1. Every attempt — including no-key and model_not_found — is recorded in the job history.", status: "in_progress", note: "Built Oct 29, 2026. Needs a configured key with SAM 3.1 access to produce its first real masks." },
  { itemKey: "sam31-mask-renderer", title: "Mask-accurate blur renderer (built-in interim)", detail: "The on-device video processor now composites blur through feathered alpha masks shaped to each tracked subject (ellipse for faces, soft blob for bodies/pets) instead of hard rectangles. This is SAM-style mask rendering with built-in detection — it is not SAM 3.1 output and is never labeled as such.", status: "done", note: "Shipped Oct 29, 2026 in privacyProcessor.ts; whole-frame and box fallbacks retained." },
  { itemKey: "sam31-video-pipeline", title: "SAM 3.1 video mask pipeline", detail: "Send recorded clips (MP4/MOV H.264 — WebM/VP9 is not accepted by the API) for per-concept video segmentation, decode the returned masks, track them across frames, and burn mask blur into the stored copy. Limits: 15,000 frames, 16 tracked objects per frame.", status: "not_started", note: "Starts after the image lab verifies end-to-end with a real key." },
  { itemKey: "sam31-submit-integration", title: "Wire SAM masks into task submissions", detail: "Protected care tasks use SAM-processed copies when the video pipeline is verified; built-in blur remains the automatic fallback and Privacy Blur stays locked on for childcare/caregiving either way.", status: "not_started", note: null },
  { itemKey: "muse-nova-brain", title: "Muse Spark for Nova's brain (next Meta model)", detail: "Nova's answers are currently a curated in-app knowledge base with recorded voice. The conversational upgrade routes Nova's questions through a Meta Muse model after SAM 3.1 lands.", status: "not_started", note: "Queued behind SAM 3.1 per the founder's build order." },
  { itemKey: "muse-image-art", title: "Muse Image for character art (later)", detail: "Future character and training art generation with Meta's Muse Image, after SAM 3.1 and Nova's brain.", status: "not_started", note: null },
];

async function ensureMetaBuildItems(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const existing = await db.select().from(schema.metaBuildItems);
  if (existing.length > 0) return;
  const now = new Date();
  for (const [index, item] of metaBuildCatalog.entries()) {
    await db.insert(schema.metaBuildItems).values({ itemKey: item.itemKey, title: item.title, detail: item.detail, status: item.status, note: item.note, sortOrder: index, createdAt: now, updatedAt: now });
  }
}

const META_API_BASE = "https://api.meta.ai/v1";
const SAM_MODEL_ID = "sam-3.1";

async function getMetaSettings(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const row = (await db.select().from(schema.metaSettings).where(eq(schema.metaSettings.id, 1)))[0];
  return row ?? null;
}

function metaIntegrationView(row: Awaited<ReturnType<typeof getMetaSettings>>) {
  const key = row?.apiKey?.trim() ?? "";
  return {
    configured: key.length > 0,
    keyHint: key.length >= 4 ? `•••• ${key.slice(-4)}` : null,
    lastTestStatus: row?.lastTestStatus ?? null,
    lastTestMessage: row?.lastTestMessage ?? null,
    lastTestedAt: row?.lastTestedAt ? row.lastTestedAt.toISOString() : null,
  };
}

async function requireFounder(ctx: Ctx, profileId: number) {
  const db = ctx.db<typeof schema>();
  const allProfiles = await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id));
  const founder = allProfiles[0];
  if (!founder || founder.id !== profileId) throw new Error("Founder access required for Meta model settings.");
  return founder;
}

type SamRegion = z.infer<typeof samRegionShape>;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Best-effort extraction of bounding regions from a SAM chat-completion payload.
 * The API returns masks as structured text; anything we cannot parse is kept as a
 * raw summary on the job instead of being presented as decoded masks. */
function extractSamRegions(payload: unknown): { regions: SamRegion[]; text: string } {
  let text = "";
  try {
    const root = payload as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = root?.choices?.[0]?.message?.content;
    if (typeof content === "string") text = content;
    else if (Array.isArray(content)) text = content.map((part) => (typeof part === "object" && part !== null && "text" in part ? String((part as { text?: unknown }).text ?? "") : "")).join("\n");
  } catch { text = ""; }
  const regions: SamRegion[] = [];
  if (text) {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed: unknown = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          for (const entry of parsed.slice(0, 32)) {
            if (typeof entry !== "object" || entry === null) continue;
            const record = entry as Record<string, unknown>;
            const box = (typeof record.box === "object" && record.box !== null ? record.box : record) as Record<string, unknown>;
            const x = Number(box.x ?? box.x_min ?? box.left);
            const y = Number(box.y ?? box.y_min ?? box.top);
            const width = Number(box.width ?? (Number(box.x_max ?? box.right) - x));
            const height = Number(box.height ?? (Number(box.y_max ?? box.bottom) - y));
            if (![x, y, width, height].every((n) => Number.isFinite(n))) continue;
            // Coordinates may arrive normalized (0–1) or in pixels (0–1000 scale is common for SAM text output).
            const scale = Math.max(x, y, width, height) > 1.5 ? 1000 : 1;
            regions.push({
              label: String(record.label ?? record.concept ?? "segment"),
              x: clamp01(x / scale),
              y: clamp01(y / scale),
              width: clamp01(width / scale),
              height: clamp01(height / scale),
              confidence: typeof record.score === "number" ? clamp01(record.score) : typeof record.confidence === "number" ? clamp01(record.confidence) : null,
            });
          }
        }
      } catch { /* Unparseable structured text stays a raw summary, never fake regions. */ }
    }
  }
  return { regions, text };
}

async function ensureLaunchItems(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const existing = await db.select().from(schema.launchItems);
  if (existing.length > 0) return;
  const now = new Date();
  for (const [index, item] of launchRoadmapCatalog.entries()) {
    await db.insert(schema.launchItems).values({ itemKey: item.itemKey, phase: item.phase, title: item.title, detail: item.detail, owner: item.owner, status: item.status, note: item.note, sortOrder: index, createdAt: now, updatedAt: now });
  }
}

export const Actions = {
  getAppState: defineAction({
    request: z.object({ profileId: z.number().int().positive().nullable().default(null) }),
    response: z.object({
      profile: profileShape.nullable(), business: businessSettingsShape.nullable(), viewerCompensation: z.object({ isBusinessTeamMember: z.boolean(), rateCents: z.number(), rateLabel: z.string() }), project: projectShape.nullable(), tasks: z.array(taskShape), assignments: z.array(assignmentShape), submissions: z.array(submissionShape), ledger: z.array(ledgerShape), payoutMethods: z.array(payoutMethodShape), notifications: z.array(notificationShape), supportTickets: z.array(supportTicketShape), training: trainingRecordShape.nullable(), teamMembers: z.array(teamMemberShape), partnershipRequests: z.array(partnershipRequestShape), commercialInquiries: z.array(commercialInquiryShape), launchItems: z.array(launchItemShape), metaIntegration: metaIntegrationShape, samJobs: z.array(samJobShape), metaBuildItems: z.array(metaBuildItemShape),
      metrics: z.object({ availableCents: z.number(), pendingCents: z.number(), approvedCents: z.number(), referralCents: z.number(), approvedMinutes: z.number(), completedTasks: z.number(), availableTasks: z.number(), unreadNotifications: z.number() }),
      viewerAccess: z.object({ isFounder: z.boolean(), canManageTeamTraining: z.boolean() }),
      admin: z.object({ totalProfiles: z.number(), publishedTasks: z.number(), reviewQueue: z.number(), totalLiabilityCents: z.number(), openTickets: z.number(), pendingCommercialInquiries: z.number() }),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await ensureLaunchItems(ctx);
      await ensureMetaBuildItems(ctx);
      const launchRows = await db.select().from(schema.launchItems).orderBy(asc(schema.launchItems.sortOrder));
      const metaSettingsRow = await getMetaSettings(ctx);
      const samJobRows = await db.select().from(schema.samJobs).orderBy(desc(schema.samJobs.id));
      const metaBuildRows = await db.select().from(schema.metaBuildItems).orderBy(asc(schema.metaBuildItems.sortOrder));
      const allProfiles = await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id));
      const founderProfile = allProfiles[0] ?? null;
      const chosen = args.profileId ? allProfiles.find((p) => p.id === args.profileId) ?? null : founderProfile;
      const isFounder = Boolean(chosen && founderProfile && chosen.id === founderProfile.id);
      const allProjects = await db.select().from(schema.projects).orderBy(desc(schema.projects.id));
      const allTasks = await db.select().from(schema.tasks).orderBy(desc(schema.tasks.id));
      const projectMap = new Map(allProjects.map((project) => [project.id, project]));
      const demoProject = allProjects.find((project) => project.isTest && project.status === "active") ?? null;
      const demoTasks = demoProject ? allTasks.filter((task) => task.projectId === demoProject.id) : [];
      const demoBudgetCents = demoTasks.reduce((sum, task) => sum + task.budgetCents, 0);
      const demoRemainingBudgetCents = demoTasks.reduce((sum, task) => sum + task.remainingBudgetCents, 0);
      const allSubmissions = await db.select().from(schema.submissions).orderBy(desc(schema.submissions.id));
      const allLedger = await db.select().from(schema.ledgerEntries).orderBy(desc(schema.ledgerEntries.id));
      const allPayoutMethods = await db.select().from(schema.payoutMethods).orderBy(asc(schema.payoutMethods.id));
      const allAssignments = await db.select().from(schema.assignments).orderBy(desc(schema.assignments.id));
      const allNotifications = await db.select().from(schema.notifications).orderBy(desc(schema.notifications.id));
      const tickets = await db.select().from(schema.supportTickets).orderBy(desc(schema.supportTickets.updatedAt));
      const supportMessages = await db.select().from(schema.supportMessages).orderBy(asc(schema.supportMessages.createdAt));
      const trainingRecords = await db.select().from(schema.trainingRecords).orderBy(desc(schema.trainingRecords.updatedAt));
      const partnershipRequests = await db.select().from(schema.partnershipRequests).orderBy(desc(schema.partnershipRequests.updatedAt));
      const commercialInquiries = await db.select().from(schema.commercialInquiries).orderBy(desc(schema.commercialInquiries.updatedAt));
      const allBusinesses = await db.select().from(schema.businesses).orderBy(asc(schema.businesses.id));
      const ownedBusinesses = chosen ? allBusinesses.filter((business) => business.ownerProfileId === chosen.id) : [];
      const allTeamMembers = await db.select().from(schema.teamMembers).orderBy(asc(schema.teamMembers.id));
      const viewerMembership = chosen ? allTeamMembers.find((member) => member.email.toLowerCase() === chosen.email.toLowerCase() && member.status !== "removed") : undefined;
      const canManageTeamTraining = Boolean(isFounder || chosen?.accountType === "business" || viewerMembership?.role === "manager");
      const manageableBusinessIds = new Set(chosen?.accountType === "business" ? ownedBusinesses.map((business) => business.id) : []);
      if (viewerMembership?.role === "manager") manageableBusinessIds.add(viewerMembership.businessId);
      if (isFounder) allBusinesses.forEach((business) => manageableBusinessIds.add(business.id));
      const myTeamMembers = canManageTeamTraining ? allTeamMembers.filter((member) => manageableBusinessIds.has(member.businessId) && member.status !== "removed") : [];
      const viewerBusiness = viewerMembership ? allBusinesses.find((business) => business.id === viewerMembership.businessId) : undefined;
      const viewerRateCents = viewerBusiness?.businessRateCents ?? 1000;
      const profileTraining = chosen ? trainingRecords.find((record) => record.profileId === chosen.id) ?? null : null;
      const profileMap = new Map(allProfiles.map((profile) => [profile.id, profile]));
      const pid = chosen?.id;
      const mineAssignments = pid ? allAssignments.filter((row) => row.profileId === pid) : [];
      const mineSubmissions = pid ? allSubmissions.filter((row) => row.profileId === pid) : [];
      const mineLedger = pid ? allLedger.filter((row) => row.profileId === pid) : [];
      const minePayoutMethods = pid ? allPayoutMethods.filter((row) => row.profileId === pid) : [];
      const mineNotifications = pid ? allNotifications.filter((row) => row.profileId === pid) : [];
      const taskMap = new Map(allTasks.map((task) => [task.id, task]));
      const availableCents = mineLedger.filter((e) => e.status === "available").reduce((sum, e) => sum + e.amountCents, 0) - (await db.select().from(schema.withdrawals)).filter((w) => w.profileId === pid && ["requested", "processing", "completed"].includes(w.status)).reduce((sum, w) => sum + w.amountCents, 0);
      const pendingCents = mineLedger.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amountCents, 0);
      const approved = mineSubmissions.filter((s) => s.status === "approved");
      return {
        profile: chosen ? { id: chosen.id, displayName: chosen.displayName, email: chosen.email, accountType: chosen.accountType, country: chosen.country, language: chosen.language, gearStatus: chosen.gearStatus, eligibilityConfirmed: chosen.eligibilityConfirmed, referralCode: chosen.referralCode } : null,
        business: ownedBusinesses[0] ? { id: ownedBusinesses[0].id, name: ownedBusinesses[0].name, status: ownedBusinesses[0].status, businessRateCents: ownedBusinesses[0].businessRateCents, partnerShareBps: ownedBusinesses[0].partnerShareBps } : null,
        viewerCompensation: { isBusinessTeamMember: Boolean(viewerBusiness), rateCents: viewerRateCents, rateLabel: viewerBusiness ? "Business team rate" : "Individual rate" },
        project: demoProject ? { id: demoProject.id, ownerName: demoProject.ownerName, name: demoProject.name, description: demoProject.description, isTest: demoProject.isTest, budgetCents: demoBudgetCents, remainingBudgetCents: demoRemainingBudgetCents, rateCents: demoProject.rateCents, maxMinutes: demoProject.maxMinutes, currency: demoProject.currency, status: demoProject.status, linkedTaskCount: demoTasks.length } : null,
        tasks: allTasks.map((t) => { const project = t.projectId ? projectMap.get(t.projectId) : undefined; return { id: t.id, projectId: t.projectId, projectName: project?.name ?? null, projectIsTest: project?.isTest ?? false, ownerName: t.ownerName, title: t.title, category: t.category, description: t.description, instructions: t.instructions, reviewCriteria: t.reviewCriteria, compensationType: t.compensationType, rateCents: t.compensationType === "hourly" ? viewerRateCents : project?.rateCents ?? t.rateCents, maxMinutes: project?.maxMinutes ?? t.maxMinutes, budgetCents: t.budgetCents, remainingBudgetCents: t.remainingBudgetCents, expectedReviewDays: t.expectedReviewDays, evidenceType: t.evidenceType, cameraRequirements: t.cameraRequirements, safetyRequirements: t.safetyRequirements, privacyRequirements: t.privacyRequirements, privacyBlurDefault: t.privacyBlurDefault, guardianConsentRequired: t.guardianConsentRequired, humanReviewRequired: t.humanReviewRequired, publicSharingProhibited: t.publicSharingProhibited, status: t.status, createdAt: t.createdAt.toISOString() }; }),
        assignments: mineAssignments.map((a) => ({ id: a.id, taskId: a.taskId, title: taskMap.get(a.taskId)?.title ?? "Task", status: a.status, claimedAt: a.claimedAt.toISOString() })),
        submissions: mineSubmissions.map((s) => ({ id: s.id, taskId: s.taskId, taskTitle: taskMap.get(s.taskId)?.title ?? "Task", status: s.status, notes: s.notes, submittedAt: s.submittedAt.toISOString(), reviewFeedback: s.reviewFeedback, approvedMinutes: s.approvedMinutes, payableCents: s.payableCents, evidenceName: s.evidenceName, recordingDurationSeconds: s.recordingDurationSeconds, privacyBlurEnabled: s.privacyBlurEnabled, privacyBlurApplied: s.privacyBlurApplied, guardianConsentName: s.guardianConsentName, guardianConsentConfirmed: s.guardianConsentConfirmed, minorsPresent: s.minorsPresent, publicSharingProhibited: s.publicSharingProhibited })),
        supportTickets: tickets.map((ticket) => ({ id: ticket.id, profileId: ticket.profileId, profileName: profileMap.get(ticket.profileId)?.displayName ?? `Profile ${ticket.profileId}`, subject: ticket.subject, message: ticket.message, status: ticket.status, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString(), messages: supportMessages.filter((message) => message.ticketId === ticket.id).map((message) => ({ id: message.id, authorRole: message.authorRole, authorName: message.authorName, message: message.message, createdAt: message.createdAt.toISOString() })) })),
        training: profileTraining ? { id: profileTraining.id, profileId: profileTraining.profileId, teamMemberId: profileTraining.teamMemberId, assigneeName: profileTraining.assigneeName, assigneeEmail: profileTraining.assigneeEmail, status: profileTraining.status, currentStep: profileTraining.currentStep, quizPassed: profileTraining.quizPassed, assignedAt: profileTraining.assignedAt.toISOString(), completedAt: profileTraining.completedAt?.toISOString() ?? null, updatedAt: profileTraining.updatedAt.toISOString() } : null,
        teamMembers: myTeamMembers.map((member) => {
          const training = trainingRecords.find((record) => record.teamMemberId === member.id) ?? null;
          const linkedProfile = allProfiles.find((profile) => profile.email.toLowerCase() === member.email.toLowerCase());
          const linkedSubmissions = linkedProfile ? allSubmissions.filter((submission) => submission.profileId === linkedProfile.id && submission.status === "approved") : [];
          const linkedLedger = linkedProfile ? allLedger.filter((entry) => entry.profileId === linkedProfile.id && entry.status !== "reversed") : [];
          return {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            status: member.status,
            approvedMinutes: linkedSubmissions.reduce((sum, submission) => sum + (submission.approvedMinutes ?? 0), 0),
            completedTasks: linkedSubmissions.length,
            earningsCents: linkedLedger.reduce((sum, entry) => sum + entry.amountCents, 0),
            ledgerEntryCount: linkedLedger.length,
            training: training ? { id: training.id, profileId: training.profileId, teamMemberId: training.teamMemberId, assigneeName: training.assigneeName, assigneeEmail: training.assigneeEmail, status: training.status, currentStep: training.currentStep, quizPassed: training.quizPassed, assignedAt: training.assignedAt.toISOString(), completedAt: training.completedAt?.toISOString() ?? null, updatedAt: training.updatedAt.toISOString() } : null,
          };
        }),
        ledger: mineLedger.map((e) => ({ id: e.id, transactionId: e.transactionId, kind: e.kind, amountCents: e.amountCents, currency: e.currency, status: e.status, calculation: e.calculation, createdAt: e.createdAt.toISOString() })),
        payoutMethods: minePayoutMethods.map((method) => ({ id: method.id, provider: method.provider, accountLabel: method.accountLabel, status: method.status, isSelected: method.isSelected, createdAt: method.createdAt.toISOString() })),
        notifications: mineNotifications.map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt.toISOString() })),
        partnershipRequests: partnershipRequests.map((request) => ({ id: request.id, requesterProfileId: request.requesterProfileId, companyName: request.companyName, industry: request.industry, contactPerson: request.contactPerson, workEmail: request.workEmail, approximateEmployees: request.approximateEmployees, message: request.message, status: request.status, reviewNotes: request.reviewNotes, createdAt: request.createdAt.toISOString(), updatedAt: request.updatedAt.toISOString() })),
        commercialInquiries: (isFounder ? commercialInquiries : []).map((inquiry) => ({ id: inquiry.id, requesterProfileId: inquiry.requesterProfileId, kind: inquiry.kind, name: inquiry.name, organization: inquiry.organization, email: inquiry.email, tier: inquiry.tier, budget: inquiry.budget, message: inquiry.message, status: inquiry.status, createdAt: inquiry.createdAt.toISOString(), updatedAt: inquiry.updatedAt.toISOString() })),
        launchItems: (isFounder ? launchRows : []).map((item) => ({ id: item.id, itemKey: item.itemKey, phase: item.phase, title: item.title, detail: item.detail, owner: item.owner, status: item.status, note: item.note, sortOrder: item.sortOrder, updatedAt: item.updatedAt.toISOString() })),
        metaIntegration: isFounder ? metaIntegrationView(metaSettingsRow) : { configured: false, keyHint: null, lastTestStatus: null, lastTestMessage: null, lastTestedAt: null },
        samJobs: (isFounder ? samJobRows.slice(0, 20) : []).map((job) => { let regions: SamRegion[] = []; if (job.regionsJson) { try { const parsed: unknown = JSON.parse(job.regionsJson); if (Array.isArray(parsed)) regions = parsed as SamRegion[]; } catch { regions = []; } } return { id: job.id, concept: job.concept, mediaKind: job.mediaKind, mediaName: job.mediaName, status: job.status, regionCount: job.regionCount, regions, summary: job.summary, errorMessage: job.errorMessage, createdAt: job.createdAt.toISOString() }; }),
        metaBuildItems: (isFounder ? metaBuildRows : []).map((item) => ({ id: item.id, itemKey: item.itemKey, title: item.title, detail: item.detail, status: item.status, note: item.note, sortOrder: item.sortOrder, updatedAt: item.updatedAt.toISOString() })),
        metrics: { availableCents: Math.max(0, availableCents), pendingCents, approvedCents: approved.reduce((sum, s) => sum + (s.payableCents ?? 0), 0), referralCents: mineLedger.filter((e) => e.kind === "referral_credit" && e.status !== "reversed").reduce((sum, e) => sum + e.amountCents, 0), approvedMinutes: approved.reduce((sum, s) => sum + (s.approvedMinutes ?? 0), 0), completedTasks: approved.length, availableTasks: allTasks.filter((t) => t.status === "published" && t.remainingBudgetCents > 0).length, unreadNotifications: mineNotifications.filter((n) => !n.read).length },
        viewerAccess: { isFounder, canManageTeamTraining },
        admin: { totalProfiles: allProfiles.length, publishedTasks: allTasks.filter((t) => t.status === "published").length, reviewQueue: allSubmissions.filter((s) => ["awaiting_review", "flagged"].includes(s.status)).length, totalLiabilityCents: allLedger.filter((e) => ["pending", "available"].includes(e.status)).reduce((sum, e) => sum + e.amountCents, 0), openTickets: tickets.filter((t) => t.status !== "resolved").length, pendingCommercialInquiries: commercialInquiries.filter((inquiry) => inquiry.status === "pending").length },
      };
    },
  }),

  createProfile: defineAction({
    request: z.object({ displayName: z.string().min(2).max(60), email: z.string().email(), accountType: z.enum(["contributor", "business"]), country: z.string().min(2).max(80), language: z.string().min(2).max(40), gearStatus: gearStatusShape, birthYear: z.number().int().min(1900).max(2010), acceptTerms: z.literal(true), acceptDataUse: z.literal(true) }),
    response: z.object({ id: z.number(), referralCode: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const referralCode = token("EARN");
      const inserted = await db.insert(schema.profiles).values({ displayName: args.displayName, email: args.email.toLowerCase(), accountType: args.accountType, country: args.country, language: args.language, gearStatus: args.gearStatus, birthYear: args.birthYear, eligibilityConfirmed: true, referralCode, updatedAt: now }).returning({ id: schema.profiles.id });
      const row = inserted[0];
      if (!row) throw new Error("Profile could not be created");
      const pendingTraining = (await db.select().from(schema.trainingRecords).where(eq(schema.trainingRecords.assigneeEmail, args.email.toLowerCase())))[0];
      if (pendingTraining && pendingTraining.profileId == null) await db.update(schema.trainingRecords).set({ profileId: row.id, updatedAt: now }).where(eq(schema.trainingRecords.id, pendingTraining.id));
      await db.batch([
        db.insert(schema.consents).values({ profileId: row.id, consentType: "terms_privacy", version: "2026-10-draft", acceptedAt: now }),
        db.insert(schema.consents).values({ profileId: row.id, consentType: "video_data_use", version: "2026-10-draft", acceptedAt: now }),
        db.insert(schema.notifications).values({ profileId: row.id, title: "Welcome to Earnova", body: "Your eligibility profile is ready. Browse funded tasks or complete the practice checklist." }),
        db.insert(schema.auditLogs).values({ actor: args.email.toLowerCase(), action: "profile.created", entityType: "profile", entityId: String(row.id), detail: `Account type: ${args.accountType}` }),
      ]);
      ctx.invalidateQueries();
      return { id: row.id, referralCode };
    },
  }),

  saveGearStatus: defineAction({
    request: z.object({ profileId: z.number().int().positive(), gearStatus: gearStatusShape }),
    response: z.object({ ok: z.literal(true), gearStatus: gearStatusShape }),
    async handler(ctx, args): Promise<{ ok: true; gearStatus: z.infer<typeof gearStatusShape> }> {
      const db = ctx.db<typeof schema>();
      const now = new Date();
      const profile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, args.profileId)))[0];
      if (!profile) throw new Error("Profile not found");
      await db.batch([
        db.update(schema.profiles).set({ gearStatus: args.gearStatus, updatedAt: now }).where(eq(schema.profiles.id, args.profileId)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "profile.gear_status_updated", entityType: "profile", entityId: String(args.profileId), detail: `Recording gear status: ${args.gearStatus}` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, gearStatus: args.gearStatus };
    },
  }),

  syncTaskCatalog: defineAction({
    request: z.object({}),
    response: z.object({ added: z.number(), updated: z.number(), total: z.number() }),
    async handler(ctx): Promise<{ added: number; updated: number; total: number }> {
      const db = ctx.db<typeof schema>();
      const existing = await db.select().from(schema.tasks);
      const byTitle = new Map(existing.map((task) => [task.title.trim().toLowerCase(), task]));
      let added = 0;
      let updated = 0;
      for (const item of requestedTaskCatalog) {
        const details = catalogDetails(item.title, item.description, item.category);
        const safeguards = taskSafeguards(item.title, item.category);
        const found = byTitle.get(item.title.trim().toLowerCase());
        if (found) {
          await db.update(schema.tasks).set({
            title: item.title,
            category: item.category,
            description: item.description,
            instructions: details.instructions,
            reviewCriteria: details.reviewCriteria,
            cameraRequirements: details.cameraRequirements,
            safetyRequirements: details.safetyRequirements,
            privacyRequirements: details.privacyRequirements,
            ...safeguards,
            updatedAt: new Date(),
          }).where(eq(schema.tasks.id, found.id));
          updated += 1;
          continue;
        }
        await db.insert(schema.tasks).values({
          ownerName: "Royalty Radio Media LLC",
          title: item.title,
          category: item.category,
          description: item.description,
          instructions: details.instructions,
          reviewCriteria: details.reviewCriteria,
          compensationType: "hourly",
          rateCents: 1000,
          maxMinutes: 60,
          budgetCents: 0,
          remainingBudgetCents: 0,
          expectedReviewDays: 5,
          evidenceType: "video",
          cameraRequirements: details.cameraRequirements,
          safetyRequirements: details.safetyRequirements,
          privacyRequirements: details.privacyRequirements,
          ...safeguards,
          status: "published",
          updatedAt: new Date(),
        });
        added += 1;
      }
      await db.insert(schema.auditLogs).values({ actor: "founder", action: "task_catalog.synced", entityType: "task_catalog", entityId: "earnova-minute-style-v1", detail: `${added} added; ${updated} updated; ${requestedTaskCatalog.length} unique titles` });
      ctx.invalidateQueries();
      return { added, updated, total: requestedTaskCatalog.length };
    },
  }),

  setupDemoProject: defineAction({
    request: z.object({}),
    response: z.object({ projectId: z.number(), linkedTasks: z.number(), budgetCents: z.number(), remainingBudgetCents: z.number() }),
    async handler(ctx): Promise<{ projectId: number; linkedTasks: number; budgetCents: number; remainingBudgetCents: number }> {
      const db = ctx.db<typeof schema>();
      const name = "Demo Launch Project (TEST FUNDS — not real money)";
      const perTaskBudgetCents = 100000;
      const totalBudgetCents = requestedTaskCatalog.length * perTaskBudgetCents;
      const now = new Date();
      let project = (await db.select().from(schema.projects).where(eq(schema.projects.name, name)))[0];
      if (!project) {
        project = (await db.insert(schema.projects).values({
          ownerName: "Royalty Radio Media LLC",
          name,
          description: "Founder-only end-to-end testing project. Every catalog task has its own $1,000 sandbox allocation with no real monetary value.",
          isTest: true,
          budgetCents: totalBudgetCents,
          remainingBudgetCents: totalBudgetCents,
          rateCents: 1000,
          maxMinutes: 60,
          currency: "USD",
          status: "active",
          updatedAt: now,
        }).returning())[0];
      } else {
        await db.update(schema.projects).set({ ownerName: "Royalty Radio Media LLC", description: "Founder-only end-to-end testing project. Every catalog task has its own $1,000 sandbox allocation with no real monetary value.", isTest: true, budgetCents: totalBudgetCents, remainingBudgetCents: totalBudgetCents, rateCents: 1000, maxMinutes: 60, currency: "USD", status: "active", updatedAt: now }).where(eq(schema.projects.id, project.id));
        project = { ...project, ownerName: "Royalty Radio Media LLC", description: "Founder-only end-to-end testing project. Every catalog task has its own $1,000 sandbox allocation with no real monetary value.", isTest: true, budgetCents: totalBudgetCents, remainingBudgetCents: totalBudgetCents, rateCents: 1000, maxMinutes: 60, currency: "USD", status: "active", updatedAt: now };
      }
      if (!project) throw new Error("Demo project could not be created");
      const existing = await db.select().from(schema.tasks);
      const taskCredits = await db.select().from(schema.ledgerEntries);
      const creditedByTask = new Map<number, number>();
      for (const credit of taskCredits) {
        if (credit.kind !== "task_credit" || credit.status === "reversed" || credit.taskId == null) continue;
        creditedByTask.set(credit.taskId, (creditedByTask.get(credit.taskId) ?? 0) + credit.amountCents);
      }
      const byTitle = new Map(existing.map((task) => [task.title.trim().toLowerCase(), task]));
      let totalRemainingBudgetCents = 0;
      for (const item of requestedTaskCatalog) {
        const details = catalogDetails(item.title, item.description, item.category);
        const safeguards = taskSafeguards(item.title, item.category);
        const found = byTitle.get(item.title.trim().toLowerCase());
        if (found) {
          const remainingBudgetCents = Math.max(0, perTaskBudgetCents - (creditedByTask.get(found.id) ?? 0));
          totalRemainingBudgetCents += remainingBudgetCents;
          await db.update(schema.tasks).set({ projectId: project.id, ownerName: "Royalty Radio Media LLC", title: item.title, category: item.category, description: item.description, instructions: details.instructions, reviewCriteria: details.reviewCriteria, compensationType: "hourly", rateCents: 1000, maxMinutes: 60, budgetCents: perTaskBudgetCents, remainingBudgetCents, expectedReviewDays: 5, evidenceType: "video", cameraRequirements: details.cameraRequirements, safetyRequirements: details.safetyRequirements, privacyRequirements: details.privacyRequirements, ...safeguards, status: "published", updatedAt: now }).where(eq(schema.tasks.id, found.id));
        } else {
          totalRemainingBudgetCents += perTaskBudgetCents;
          await db.insert(schema.tasks).values({ projectId: project.id, ownerName: "Royalty Radio Media LLC", title: item.title, category: item.category, description: item.description, instructions: details.instructions, reviewCriteria: details.reviewCriteria, compensationType: "hourly", rateCents: 1000, maxMinutes: 60, budgetCents: perTaskBudgetCents, remainingBudgetCents: perTaskBudgetCents, expectedReviewDays: 5, evidenceType: "video", cameraRequirements: details.cameraRequirements, safetyRequirements: details.safetyRequirements, privacyRequirements: details.privacyRequirements, ...safeguards, status: "published", updatedAt: now });
        }
      }
      await db.batch([
        db.update(schema.projects).set({ budgetCents: totalBudgetCents, remainingBudgetCents: totalRemainingBudgetCents, updatedAt: now }).where(eq(schema.projects.id, project.id)),
        db.insert(schema.auditLogs).values({ actor: "founder", action: "demo_project.configured", entityType: "project", entityId: String(project.id), detail: `${requestedTaskCatalog.length} catalog tasks linked; $1,000 TEST FUNDS allocated to each task; $10/hour; 60-minute limit; no real monetary value` }),
      ]);
      ctx.invalidateQueries();
      return { projectId: project.id, linkedTasks: requestedTaskCatalog.length, budgetCents: totalBudgetCents, remainingBudgetCents: totalRemainingBudgetCents };
    },
  }),

  createTask: defineAction({
    request: z.object({ ownerName: z.string().min(2), title: z.string().min(4), category: z.string().min(2), description: z.string().min(10), instructions: z.string().min(10), reviewCriteria: z.string().min(10), compensationType: z.enum(["hourly", "fixed"]), rateCents: z.number().int().min(100), maxMinutes: z.number().int().min(1).max(60), budgetCents: z.number().int().min(100), expectedReviewDays: z.number().int().min(1).max(30), evidenceType: z.enum(["video", "audio", "photo", "text"]), cameraRequirements: z.string(), safetyRequirements: z.string().min(5), privacyRequirements: z.string().min(5) }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.insert(schema.tasks).values({ ...args, remainingBudgetCents: args.budgetCents, status: "draft", updatedAt: new Date() }).returning({ id: schema.tasks.id });
      const row = rows[0]; if (!row) throw new Error("Task could not be created");
      await db.insert(schema.auditLogs).values({ actor: "founder", action: "task.created", entityType: "task", entityId: String(row.id), detail: `${args.ownerName}; budget ${args.budgetCents} cents` });
      ctx.invalidateQueries(); return { id: row.id };
    },
  }),

  setTaskStatus: defineAction({
    request: z.object({ taskId: z.number().int().positive(), status: z.enum(["draft", "published", "paused", "closed"]) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.tasks).where(eq(schema.tasks.id, args.taskId));
      const task = rows[0]; if (!task) throw new Error("Task not found");
      if (args.status === "published" && (task.budgetCents <= 0 || task.ownerName.trim().length < 2)) throw new Error("A funded project owner is required before publishing");
      await db.batch([db.update(schema.tasks).set({ status: args.status, updatedAt: new Date() }).where(eq(schema.tasks.id, args.taskId)), db.insert(schema.auditLogs).values({ actor: "founder", action: `task.${args.status}`, entityType: "task", entityId: String(args.taskId), detail: "Status changed through admin control" })]);
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  claimTask: defineAction({
    request: z.object({ profileId: z.number().int().positive(), taskId: z.number().int().positive() }),
    response: z.object({ assignmentId: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const found = await db.select().from(schema.tasks).where(eq(schema.tasks.id, args.taskId));
      const task = found[0];
      const project = task?.projectId ? (await db.select().from(schema.projects).where(eq(schema.projects.id, task.projectId)))[0] : undefined;
      const remaining = task?.remainingBudgetCents ?? 0;
      if (!task || task.status !== "published" || remaining <= 0 || (project && project.status !== "active")) throw new Error("This task is not available");
      const existing = await db.select().from(schema.assignments).where(and(eq(schema.assignments.taskId, args.taskId), eq(schema.assignments.profileId, args.profileId)));
      if (existing[0]) return { assignmentId: existing[0].id };
      const rows = await db.insert(schema.assignments).values({ taskId: args.taskId, profileId: args.profileId, status: "active", claimedAt: new Date() }).returning({ id: schema.assignments.id });
      const row = rows[0]; if (!row) throw new Error("Assignment could not be created");
      await db.insert(schema.notifications).values({ profileId: args.profileId, title: "Task accepted", body: `${task.title} is now in your active tasks.` });
      ctx.invalidateQueries(); return { assignmentId: row.id };
    },
  }),

  submitAssignment: defineAction({
    request: z.object({ profileId: z.number().int().positive(), assignmentId: z.number().int().positive(), notes: z.string().min(5).max(2000), startedAt: z.string().min(1), endedAt: z.string().min(1), evidenceName: z.string().max(160).nullable(), evidenceMime: z.string().max(100).nullable(), evidenceBase64: z.string().nullable(), recordingDurationSeconds: z.number().int().positive().nullable(), privacyBlurEnabled: z.boolean(), privacyBlurApplied: z.boolean(), minorsPresent: z.boolean(), guardianConsentConfirmed: z.boolean(), guardianConsentName: z.string().max(160).nullable(), guardianConsentMime: z.string().max(100).nullable(), guardianConsentBase64: z.string().nullable() }),
    response: z.object({ submissionId: z.number(), status: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const found = await db.select().from(schema.assignments).where(and(eq(schema.assignments.id, args.assignmentId), eq(schema.assignments.profileId, args.profileId)));
      const assignment = found[0]; if (!assignment || assignment.status !== "active") throw new Error("Active assignment not found");
      const taskRows = await db.select().from(schema.tasks).where(eq(schema.tasks.id, assignment.taskId));
      const task = taskRows[0]; if (!task) throw new Error("Task not found");
      if (task.privacyBlurDefault && (!args.privacyBlurEnabled || !args.privacyBlurApplied)) throw new Error("Privacy Blur must stay on and finish processing before this care task can be submitted.");
      if (args.privacyBlurEnabled && !args.privacyBlurApplied) throw new Error("Privacy Blur is enabled, but the protected copy has not finished processing.");
      const consentNeeded = task.guardianConsentRequired || args.minorsPresent;
      if (consentNeeded && (!args.guardianConsentConfirmed || !args.guardianConsentBase64 || !args.guardianConsentName || !args.guardianConsentMime)) throw new Error("A verifiable parent or legal guardian consent record is required before any recording involving a minor can be submitted.");
      let blobKey: string | null = null; let checksum: string | null = null; let byteLength: number | null = null;
      let guardianConsentBlobKey: string | null = null;
      if (args.guardianConsentBase64 && args.guardianConsentName && args.guardianConsentMime) {
        const consentBytes = decodeBase64(args.guardianConsentBase64);
        if (consentBytes.byteLength > 10 * 1024 * 1024) throw new Error("Guardian consent files are limited to 10 MB.");
        if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(args.guardianConsentMime)) throw new Error("Guardian consent must be a PDF, JPEG, PNG, or WebP file.");
        guardianConsentBlobKey = `consent/${args.profileId}/${crypto.randomUUID()}`;
        await ctx.blobs.put(guardianConsentBlobKey, consentBytes, { contentType: args.guardianConsentMime });
      }
      if (args.evidenceBase64) {
        const bytes = decodeBase64(args.evidenceBase64);
        if (bytes.byteLength > 100 * 1024 * 1024) throw new Error("Evidence files are limited to 100 MB in this testing build");
        checksum = await sha256(bytes);
        const dup = await db.select().from(schema.submissions).where(eq(schema.submissions.checksum, checksum));
        if (dup[0]) throw new Error("This exact evidence file was already submitted");
        blobKey = `evidence/${args.profileId}/${crypto.randomUUID()}`;
        await ctx.blobs.put(blobKey, bytes, { contentType: args.evidenceMime ?? "application/octet-stream" });
        byteLength = bytes.byteLength;
      }
      if (!blobKey || !args.evidenceMime || !/^(video|audio)\//.test(args.evidenceMime)) throw new Error("Every task requires a video or audio recording between 1 and 60 minutes. Photos, text, and other files may only be supplementary evidence.");
      if (task.privacyBlurDefault && !args.evidenceMime.startsWith("video/")) throw new Error("Protected childcare and caregiving tasks require video so Privacy Blur can protect the stored copy.");
      const startedAtMs = Date.parse(args.startedAt);
      const endedAtMs = Date.parse(args.endedAt);
      if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs <= startedAtMs) throw new Error("Task end time must be after the start time.");
      if (args.recordingDurationSeconds == null) throw new Error("Please wait for the recording duration to load before submitting.");
      if (args.recordingDurationSeconds < 60) throw new Error("This recording is under 1 minute. Please record at least 1 minute and no more than 60 minutes, then try again.");
      if (args.recordingDurationSeconds > 3600) throw new Error("This recording is over 60 minutes. Please trim or record a version between 1 and 60 minutes, then try again.");
      const rows = await db.insert(schema.submissions).values({ assignmentId: assignment.id, profileId: args.profileId, taskId: task.id, notes: args.notes, startedAt: args.startedAt, endedAt: args.endedAt, evidenceBlobKey: blobKey, evidenceName: args.evidenceName, evidenceMime: args.evidenceMime, evidenceBytes: byteLength, checksum, recordingDurationSeconds: args.recordingDurationSeconds, privacyBlurEnabled: args.privacyBlurEnabled, privacyBlurApplied: args.privacyBlurApplied, guardianConsentBlobKey, guardianConsentName: guardianConsentBlobKey ? args.guardianConsentName : null, guardianConsentMime: guardianConsentBlobKey ? args.guardianConsentMime : null, guardianConsentConfirmed: consentNeeded && args.guardianConsentConfirmed, minorsPresent: args.minorsPresent || task.guardianConsentRequired, publicSharingProhibited: task.publicSharingProhibited, status: "awaiting_review", submittedAt: new Date() }).returning({ id: schema.submissions.id });
      const row = rows[0]; if (!row) throw new Error("Submission could not be created");
      await db.batch([db.update(schema.assignments).set({ status: "submitted" }).where(eq(schema.assignments.id, assignment.id)), db.insert(schema.notifications).values({ profileId: args.profileId, title: "Submission received", body: `${task.title} is awaiting human review. No earnings are available until approval.` }), db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "submission.created", entityType: "submission", entityId: String(row.id), detail: checksum ? `Evidence stored; automated duplicate check passed; recording duration ${args.recordingDurationSeconds ?? "n/a"} seconds` : "Text evidence submitted" })]);
      ctx.invalidateQueries(); return { submissionId: row.id, status: "awaiting_review" };
    },
  }),

  reviewSubmission: defineAction({
    request: z.object({ submissionId: z.number().int().positive(), decision: z.enum(["approved", "rejected", "flagged"]), approvedMinutes: z.number().int().min(0).max(480), feedback: z.string().min(3).max(1000) }),
    response: z.object({ status: z.string(), payableCents: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.submissions).where(eq(schema.submissions.id, args.submissionId));
      const submission = rows[0]; if (!submission || submission.status !== "awaiting_review") throw new Error("Submission is no longer awaiting review");
      const taskRows = await db.select().from(schema.tasks).where(eq(schema.tasks.id, submission.taskId)); const task = taskRows[0]; if (!task) throw new Error("Task not found");
      const project = task.projectId ? (await db.select().from(schema.projects).where(eq(schema.projects.id, task.projectId)))[0] : undefined;
      const submitterProfile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, submission.profileId)))[0];
      const submitterMembership = submitterProfile ? (await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.email, submitterProfile.email.toLowerCase()))).find((member) => member.status !== "removed") : undefined;
      const submitterBusiness = submitterMembership ? (await db.select().from(schema.businesses).where(eq(schema.businesses.id, submitterMembership.businessId)))[0] : undefined;
      const effectiveRate = task.compensationType === "hourly" && submitterBusiness ? submitterBusiness.businessRateCents : project?.rateCents ?? task.rateCents;
      const effectiveMaxMinutes = Math.min(project?.maxMinutes ?? task.maxMinutes, 60);
      const effectiveRemaining = task.remainingBudgetCents;
      const recordedSeconds = submission.recordingDurationSeconds;
      if (args.decision === "approved" && task.privacyBlurDefault && (!submission.privacyBlurEnabled || !submission.privacyBlurApplied)) {
        throw new Error("This protected care recording does not have a completed privacy-blur copy and cannot be approved.");
      }
      if (args.decision === "approved" && (task.guardianConsentRequired || submission.minorsPresent) && (!submission.guardianConsentConfirmed || !submission.guardianConsentBlobKey)) {
        throw new Error("Verifiable parent or legal guardian consent is missing. Do not approve a recording involving a minor.");
      }
      if (args.decision === "approved" && (recordedSeconds == null || recordedSeconds < 60 || recordedSeconds > 3600)) {
        throw new Error("This recording is outside the 1–60 minute requirement and cannot receive payable time. Flag or reject it with a friendly explanation.");
      }
      if (args.decision === "approved" && (args.approvedMinutes < 1 || args.approvedMinutes > effectiveMaxMinutes)) {
        throw new Error(`Approved payable time must be between 1 and ${effectiveMaxMinutes} minutes.`);
      }
      const minutes = args.decision === "approved" ? args.approvedMinutes : 0;
      const partnerShareRate = args.decision === "approved" && submitterBusiness?.status === "verified" ? submitterBusiness.partnerShareBps / 10000 : 0;
      const rawPayableCents = args.decision === "approved" ? (task.compensationType === "hourly" ? Math.round(effectiveRate * minutes / 60) : effectiveRate) : 0;
      const payableCents = Math.min(rawPayableCents, Math.floor(effectiveRemaining / (1 + partnerShareRate)));
      const partnerShareCents = Math.round(payableCents * partnerShareRate);
      const totalBudgetDebitCents = payableCents + partnerShareCents;
      const updateSubmission = db.update(schema.submissions).set({ status: args.decision, reviewFeedback: args.feedback, approvedMinutes: args.decision === "approved" ? minutes : 0, payableCents, reviewedAt: new Date() }).where(eq(schema.submissions.id, args.submissionId));
      const updateAssignment = db.update(schema.assignments).set({ status: args.decision === "approved" ? "completed" : "submitted" }).where(eq(schema.assignments.id, submission.assignmentId));
      const notify = db.insert(schema.notifications).values({ profileId: submission.profileId, title: args.decision === "approved" ? "Submission approved" : args.decision === "flagged" ? "Submission needs human review" : "Submission not approved", body: args.decision === "approved" ? `${task.title}: ${minutes} approved minute${minutes === 1 ? "" : "s"} added to available earnings.` : args.feedback });
      const audit = db.insert(schema.auditLogs).values({ actor: "reviewer", action: `submission.${args.decision}`, entityType: "submission", entityId: String(args.submissionId), detail: `${minutes} minutes; ${payableCents} cents; ${args.feedback}` });
      if (args.decision === "approved") {
        const taskBudgetUpdate = db.update(schema.tasks).set({ remainingBudgetCents: Math.max(0, task.remainingBudgetCents - totalBudgetDebitCents), updatedAt: new Date() }).where(eq(schema.tasks.id, task.id));
        const ledgerEntry = db.insert(schema.ledgerEntries).values({ transactionId: token("TXN"), profileId: submission.profileId, taskId: task.id, kind: "task_credit", amountCents: payableCents, currency: "USD", status: "available", calculation: task.compensationType === "hourly" ? `${minutes} approved min × $${(effectiveRate / 100).toFixed(2)}/hr · ${submitterBusiness ? "business team rate" : "individual rate"}${project?.isTest ? " · debited from this task's $1,000 TEST FUNDS allocation · no real monetary value" : ""}` : "Approved fixed deliverable" });
        const partnerShareEntry = submitterBusiness && partnerShareCents > 0 ? db.insert(schema.ledgerEntries).values({ transactionId: token("PARTNER"), profileId: submitterBusiness.ownerProfileId, taskId: task.id, kind: "partner_share", amountCents: partnerShareCents, currency: "USD", status: "available", calculation: `${(submitterBusiness.partnerShareBps / 100).toFixed(2)}% partner share of ${payableCents} cents employee earnings${project?.isTest ? " · TEST FUNDS ONLY · no real monetary value" : ""}` }) : null;
        const partnerNotification = submitterBusiness && partnerShareCents > 0 ? db.insert(schema.notifications).values({ profileId: submitterBusiness.ownerProfileId, title: "Partner revenue share added", body: `${task.title}: ${partnerShareCents} cents in test partner share was added after employee approval. No real money has moved.` }) : null;
        await db.batch([updateSubmission, updateAssignment, notify, audit, taskBudgetUpdate, ledgerEntry]);
        if (partnerShareEntry && partnerNotification) await db.batch([partnerShareEntry, partnerNotification]);
        if (project) await db.update(schema.projects).set({ remainingBudgetCents: Math.max(0, project.remainingBudgetCents - totalBudgetDebitCents), updatedAt: new Date() }).where(eq(schema.projects.id, project.id));
      } else {
        await db.batch([updateSubmission, updateAssignment, notify, audit]);
      }
      ctx.invalidateQueries(); return { status: args.decision, payableCents };
    },
  }),

  getSubmissionEvidenceUrl: defineAction({
    request: z.object({ submissionId: z.number().int().positive() }),
    response: z.object({ url: z.string(), name: z.string(), mime: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const submission = (await db.select().from(schema.submissions).where(eq(schema.submissions.id, args.submissionId)))[0];
      if (!submission?.evidenceBlobKey || !submission.evidenceName || !submission.evidenceMime) throw new Error("No media evidence is attached to this submission");
      const url = await ctx.blobs.getUrl(submission.evidenceBlobKey);
      return { url, name: submission.evidenceName, mime: submission.evidenceMime };
    },
  }),

  getGuardianConsentUrl: defineAction({
    request: z.object({ submissionId: z.number().int().positive() }),
    response: z.object({ url: z.string(), name: z.string(), mime: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const submission = (await db.select().from(schema.submissions).where(eq(schema.submissions.id, args.submissionId)))[0];
      if (!submission?.guardianConsentBlobKey || !submission.guardianConsentName || !submission.guardianConsentMime) throw new Error("No guardian consent record is attached to this submission");
      const url = await ctx.blobs.getUrl(submission.guardianConsentBlobKey);
      return { url, name: submission.guardianConsentName, mime: submission.guardianConsentMime };
    },
  }),

  addPayoutMethod: defineAction({
    request: z.object({ profileId: z.number().int().positive(), provider: z.enum(["paypal", "venmo", "cash_app", "whop"]), accountLabel: z.string().trim().min(2).max(80) }),
    response: z.object({ id: z.number(), status: z.literal("unverified") }),
    async handler(ctx, args): Promise<{ id: number; status: "unverified" }> {
      const db = ctx.db<typeof schema>();
      const existing = (await db.select().from(schema.payoutMethods).where(and(eq(schema.payoutMethods.profileId, args.profileId), eq(schema.payoutMethods.provider, args.provider))))[0];
      const now = new Date();
      if (existing) {
        await db.update(schema.payoutMethods).set({ accountLabel: args.accountLabel, status: "unverified", isSelected: false, updatedAt: now }).where(eq(schema.payoutMethods.id, existing.id));
        await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "payout_method.updated", entityType: "payout_method", entityId: String(existing.id), detail: `${args.provider}; SANDBOX / TEST MODE; verification reset` });
        ctx.invalidateQueries();
        return { id: existing.id, status: "unverified" };
      }
      const row = (await db.insert(schema.payoutMethods).values({ profileId: args.profileId, provider: args.provider, accountLabel: args.accountLabel, status: "unverified", isSelected: false, updatedAt: now }).returning({ id: schema.payoutMethods.id }))[0];
      if (!row) throw new Error("Sandbox payout method could not be added");
      await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "payout_method.added", entityType: "payout_method", entityId: String(row.id), detail: `${args.provider}; SANDBOX / TEST MODE; no credentials collected` });
      ctx.invalidateQueries();
      return { id: row.id, status: "unverified" };
    },
  }),

  verifyPayoutMethod: defineAction({
    request: z.object({ profileId: z.number().int().positive(), payoutMethodId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true), status: z.literal("test_verified") }),
    async handler(ctx, args): Promise<{ ok: true; status: "test_verified" }> {
      const db = ctx.db<typeof schema>();
      const method = (await db.select().from(schema.payoutMethods).where(and(eq(schema.payoutMethods.id, args.payoutMethodId), eq(schema.payoutMethods.profileId, args.profileId))))[0];
      if (!method) throw new Error("Sandbox payout method not found");
      await db.update(schema.payoutMethods).set({ status: "test_verified", updatedAt: new Date() }).where(eq(schema.payoutMethods.id, method.id));
      await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "payout_method.test_verified", entityType: "payout_method", entityId: String(method.id), detail: `${method.provider}; simulated verification for SANDBOX / TEST MODE only; no production provider connected` });
      ctx.invalidateQueries();
      return { ok: true, status: "test_verified" };
    },
  }),

  selectPayoutMethod: defineAction({
    request: z.object({ profileId: z.number().int().positive(), payoutMethodId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const method = (await db.select().from(schema.payoutMethods).where(and(eq(schema.payoutMethods.id, args.payoutMethodId), eq(schema.payoutMethods.profileId, args.profileId))))[0];
      if (!method || method.status !== "test_verified") throw new Error("Verify this payout method in test mode before selecting it");
      await db.batch([
        db.update(schema.payoutMethods).set({ isSelected: false, updatedAt: new Date() }).where(eq(schema.payoutMethods.profileId, args.profileId)),
        db.update(schema.payoutMethods).set({ isSelected: true, updatedAt: new Date() }).where(eq(schema.payoutMethods.id, method.id)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "payout_method.selected", entityType: "payout_method", entityId: String(method.id), detail: `${method.provider}; SANDBOX / TEST MODE route` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  removePayoutMethod: defineAction({
    request: z.object({ profileId: z.number().int().positive(), payoutMethodId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const method = (await db.select().from(schema.payoutMethods).where(and(eq(schema.payoutMethods.id, args.payoutMethodId), eq(schema.payoutMethods.profileId, args.profileId))))[0];
      if (!method) throw new Error("Sandbox payout method not found");
      await db.batch([
        db.delete(schema.payoutMethods).where(eq(schema.payoutMethods.id, method.id)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "payout_method.removed", entityType: "payout_method", entityId: String(method.id), detail: `${method.provider}; SANDBOX / TEST MODE route removed` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  requestWithdrawal: defineAction({
    request: z.object({ profileId: z.number().int().positive(), amountCents: z.number().int().min(1000), payoutMethodId: z.number().int().positive() }),
    response: z.object({ withdrawalId: z.string(), status: z.literal("requested") }),
    async handler(ctx, args): Promise<{ withdrawalId: string; status: "requested" }> {
      const db = ctx.db<typeof schema>();
      const method = (await db.select().from(schema.payoutMethods).where(and(eq(schema.payoutMethods.id, args.payoutMethodId), eq(schema.payoutMethods.profileId, args.profileId))))[0];
      if (!method || method.status !== "test_verified") throw new Error("Choose a payout method verified in SANDBOX / TEST MODE");
      const activeTestProject = (await db.select().from(schema.projects).where(and(eq(schema.projects.isTest, true), eq(schema.projects.status, "active"))))[0];
      if (!activeTestProject) throw new Error("Sandbox withdrawals are available only while the test project is active");
      const ledger = await db.select().from(schema.ledgerEntries).where(eq(schema.ledgerEntries.profileId, args.profileId));
      const withdrawals = await db.select().from(schema.withdrawals).where(eq(schema.withdrawals.profileId, args.profileId));
      const available = ledger.filter((e) => e.status === "available").reduce((s, e) => s + e.amountCents, 0) - withdrawals.filter((w) => ["requested", "processing", "completed"].includes(w.status)).reduce((s, w) => s + w.amountCents, 0);
      if (args.amountCents > available) throw new Error("Requested amount exceeds the available sandbox balance");
      const withdrawalId = token("WD"); const now = new Date();
      await db.batch([db.insert(schema.withdrawals).values({ withdrawalId, profileId: args.profileId, amountCents: args.amountCents, currency: "USD", method: `${method.provider}_sandbox`, status: "requested", updatedAt: now }), db.insert(schema.notifications).values({ profileId: args.profileId, title: "Sandbox withdrawal requested", body: `${withdrawalId} is queued for test review through ${method.provider}. No real money has moved.` }), db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "withdrawal.requested", entityType: "withdrawal", entityId: withdrawalId, detail: `${args.amountCents} cents via ${method.provider}; SANDBOX / TEST MODE; no real money` })]);
      ctx.invalidateQueries(); return { withdrawalId, status: "requested" };
    },
  }),

  createPartnershipRequest: defineAction({
    request: z.object({ profileId: z.number().int().positive(), companyName: z.string().min(2).max(120), industry: z.enum(["hotel", "healthcare", "childcare", "cleaning", "other"]), contactPerson: z.string().min(2).max(100), workEmail: z.string().email(), approximateEmployees: z.number().int().min(1).max(1000000), message: z.string().min(10).max(3000) }),
    response: z.object({ requestId: z.number(), status: z.literal("pending") }),
    async handler(ctx, args): Promise<{ requestId: number; status: "pending" }> {
      const db = ctx.db<typeof schema>();
      const profile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, args.profileId)))[0];
      if (!profile) throw new Error("Profile not found");
      const now = new Date();
      const row = (await db.insert(schema.partnershipRequests).values({ requesterProfileId: profile.id, companyName: args.companyName, industry: args.industry, contactPerson: args.contactPerson, workEmail: args.workEmail.toLowerCase(), approximateEmployees: args.approximateEmployees, message: args.message, status: "pending", reviewNotes: null, updatedAt: now }).returning({ id: schema.partnershipRequests.id }))[0];
      if (!row) throw new Error("Partnership request could not be created");
      await db.insert(schema.auditLogs).values({ actor: `profile:${profile.id}`, action: "partnership.requested", entityType: "partnership_request", entityId: String(row.id), detail: `${args.companyName}; ${args.industry}; ${args.approximateEmployees} employees` });
      ctx.invalidateQueries();
      return { requestId: row.id, status: "pending" };
    },
  }),

  reviewPartnershipRequest: defineAction({
    request: z.object({ requestId: z.number().int().positive(), decision: z.enum(["approved", "declined"]), notes: z.string().min(3).max(2000) }),
    response: z.object({ status: z.enum(["approved", "declined"]) }),
    async handler(ctx, args): Promise<{ status: "approved" | "declined" }> {
      const db = ctx.db<typeof schema>();
      const request = (await db.select().from(schema.partnershipRequests).where(eq(schema.partnershipRequests.id, args.requestId)))[0];
      if (!request) throw new Error("Partnership request not found");
      const now = new Date();
      await db.batch([
        db.update(schema.partnershipRequests).set({ status: args.decision, reviewNotes: args.notes, updatedAt: now }).where(eq(schema.partnershipRequests.id, request.id)),
        db.insert(schema.notifications).values({ profileId: request.requesterProfileId, title: `Partnership request ${args.decision}`, body: args.decision === "approved" ? "Your business workspace is ready for unlimited employee invitations, approved task assignments, and team earnings tracking." : "Open Partner With Us to review the founder's notes." }),
        db.insert(schema.auditLogs).values({ actor: "founder-console", action: `partnership.${args.decision}`, entityType: "partnership_request", entityId: String(request.id), detail: args.notes }),
      ]);
      if (args.decision === "approved") {
        const existingBusiness = (await db.select().from(schema.businesses).where(eq(schema.businesses.ownerProfileId, request.requesterProfileId)))[0];
        if (existingBusiness) await db.update(schema.businesses).set({ status: "verified", teamLimit: 0 }).where(eq(schema.businesses.id, existingBusiness.id));
        else await db.insert(schema.businesses).values({ name: request.companyName, ownerProfileId: request.requesterProfileId, status: "verified", teamLimit: 0 });
      }
      ctx.invalidateQueries();
      return { status: args.decision };
    },
  }),

  createCommercialInquiry: defineAction({
    request: z.object({ profileId: z.number().int().positive(), kind: z.enum(["partnership", "investor"]), name: z.string().min(2).max(100), organization: z.string().min(2).max(160), email: z.string().email(), tier: z.string().max(80).nullable(), budget: z.string().max(120).nullable(), message: z.string().min(10).max(4000) }),
    response: z.object({ inquiryId: z.number(), status: z.literal("pending") }),
    async handler(ctx, args): Promise<{ inquiryId: number; status: "pending" }> {
      const db = ctx.db<typeof schema>();
      const profile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, args.profileId)))[0];
      if (!profile) throw new Error("Profile not found");
      const founderProfile = (await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id)))[0];
      const now = new Date();
      const row = (await db.insert(schema.commercialInquiries).values({ requesterProfileId: profile.id, kind: args.kind, name: args.name, organization: args.organization, email: args.email.toLowerCase(), tier: null, budget: null, message: args.message, status: "pending", updatedAt: now }).returning({ id: schema.commercialInquiries.id }))[0];
      if (!row) throw new Error("Inquiry could not be saved");
      const notificationRows = [{ profileId: profile.id, title: `${args.kind === "partnership" ? "Partnership" : "Investment"} inquiry saved`, body: `Inquiry #${row.id} is in the founder dashboard for review.` }];
      if (founderProfile && founderProfile.id !== profile.id) notificationRows.push({ profileId: founderProfile.id, title: "New partner or investor inquiry", body: `${args.organization} submitted inquiry #${row.id}. Open the founder dashboard to review it.` });
      await db.batch([
        db.insert(schema.notifications).values(notificationRows),
        db.insert(schema.auditLogs).values({ actor: `profile:${profile.id}`, action: `commercial_inquiry.${args.kind}_created`, entityType: "commercial_inquiry", entityId: String(row.id), detail: `${args.organization}; saved to founder dashboard` }),
      ]);
      ctx.invalidateQueries();
      return { inquiryId: row.id, status: "pending" };
    },
  }),

  updateCommercialInquiryStatus: defineAction({
    request: z.object({ profileId: z.number().int().positive(), inquiryId: z.number().int().positive(), status: z.enum(["pending", "contacted", "closed"]) }),
    response: z.object({ ok: z.literal(true), status: z.enum(["pending", "contacted", "closed"]) }),
    async handler(ctx, args): Promise<{ ok: true; status: "pending" | "contacted" | "closed" }> {
      const db = ctx.db<typeof schema>();
      const founderProfile = (await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id)))[0];
      if (!founderProfile || founderProfile.id !== args.profileId) throw new Error("Founder access required");
      const inquiry = (await db.select().from(schema.commercialInquiries).where(eq(schema.commercialInquiries.id, args.inquiryId)))[0];
      if (!inquiry) throw new Error("Inquiry not found");
      const now = new Date();
      await db.batch([
        db.update(schema.commercialInquiries).set({ status: args.status, updatedAt: now }).where(eq(schema.commercialInquiries.id, inquiry.id)),
        db.insert(schema.notifications).values({ profileId: inquiry.requesterProfileId, title: `Inquiry #${inquiry.id} updated`, body: `Its status is now ${args.status}.` }),
        db.insert(schema.auditLogs).values({ actor: "founder-console", action: `commercial_inquiry.${args.status}`, entityType: "commercial_inquiry", entityId: String(inquiry.id), detail: `${inquiry.kind}; ${inquiry.organization}` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, status: args.status };
    },
  }),

  addTeamMember: defineAction({
    request: z.object({ profileId: z.number().int().positive(), businessName: z.string().min(2), memberName: z.string().min(2), memberEmail: z.string().email(), role: z.enum(["member", "manager"]) }),
    response: z.object({ memberId: z.number(), status: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      let business = (await db.select().from(schema.businesses).where(eq(schema.businesses.ownerProfileId, args.profileId)))[0];
      if (!business) business = (await db.insert(schema.businesses).values({ name: args.businessName, ownerProfileId: args.profileId, status: "pending", teamLimit: 0 }).returning())[0];
      if (!business) throw new Error("Business could not be created");
      const row = (await db.insert(schema.teamMembers).values({ businessId: business.id, name: args.memberName, email: args.memberEmail.toLowerCase(), role: args.role, status: "invited" }).returning({ id: schema.teamMembers.id }))[0];
      if (!row) throw new Error("Team invitation could not be created");
      ctx.invalidateQueries(); return { memberId: row.id, status: "invited" };
    },
  }),

  updateBusinessCompensation: defineAction({
    request: z.object({ profileId: z.number().int().positive(), businessRateCents: z.number().int().min(100).max(100000), partnerShareBps: z.number().int().min(0).max(5000) }),
    response: z.object({ businessRateCents: z.number(), partnerShareBps: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const business = (await db.select().from(schema.businesses).where(eq(schema.businesses.ownerProfileId, args.profileId)))[0];
      if (!business) throw new Error("Create or approve this business workspace before changing compensation settings");
      await db.batch([
        db.update(schema.businesses).set({ businessRateCents: args.businessRateCents, partnerShareBps: args.partnerShareBps }).where(eq(schema.businesses.id, business.id)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "business.compensation_updated", entityType: "business", entityId: String(business.id), detail: `${args.businessRateCents} cents/hour; ${args.partnerShareBps} basis points partner share` }),
      ]);
      ctx.invalidateQueries();
      return { businessRateCents: args.businessRateCents, partnerShareBps: args.partnerShareBps };
    },
  }),

  assignTaskToTeamMember: defineAction({
    request: z.object({ profileId: z.number().int().positive(), teamMemberId: z.number().int().positive(), taskId: z.number().int().positive() }),
    response: z.object({ assignmentId: z.number(), assigneeEmail: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const business = (await db.select().from(schema.businesses).where(eq(schema.businesses.ownerProfileId, args.profileId)))[0];
      if (!business) throw new Error("Business workspace not found");
      const member = (await db.select().from(schema.teamMembers).where(and(eq(schema.teamMembers.id, args.teamMemberId), eq(schema.teamMembers.businessId, business.id))))[0];
      if (!member || member.status === "removed") throw new Error("Team member not found in this business workspace");
      const assignee = (await db.select().from(schema.profiles).where(eq(schema.profiles.email, member.email.toLowerCase())))[0];
      if (!assignee) throw new Error("This employee must create an Earnova profile with the invited email before a task can be assigned");
      const task = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, args.taskId)))[0];
      if (!task || task.status !== "published" || task.remainingBudgetCents <= 0) throw new Error("This task is not available for assignment");
      const existing = (await db.select().from(schema.assignments).where(and(eq(schema.assignments.taskId, task.id), eq(schema.assignments.profileId, assignee.id))))[0];
      if (existing) return { assignmentId: existing.id, assigneeEmail: member.email };
      const row = (await db.insert(schema.assignments).values({ taskId: task.id, profileId: assignee.id, status: "active", claimedAt: new Date() }).returning({ id: schema.assignments.id }))[0];
      if (!row) throw new Error("Assignment could not be created");
      await db.batch([
        db.insert(schema.notifications).values({ profileId: assignee.id, title: "Employer-approved task assigned", body: `${task.title} is now in your active tasks. Record only during employer-approved times and locations.` }),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "business.task_assigned", entityType: "assignment", entityId: String(row.id), detail: `${task.title} assigned to ${member.email}` }),
      ]);
      ctx.invalidateQueries();
      return { assignmentId: row.id, assigneeEmail: member.email };
    },
  }),

  saveTrainingProgress: defineAction({
    request: z.object({ profileId: z.number().int().positive(), currentStep: z.number().int().min(1).max(10), complete: z.boolean().default(false), quizAnswer: z.enum(["1-60 minutes", "under 1 minute", "any length"]).nullable().default(null) }),
    response: z.object({ status: z.enum(["in_progress", "completed"]), currentStep: z.number(), quizPassed: z.boolean(), badgeAwarded: z.boolean() }),
    async handler(ctx, args): Promise<{ status: "in_progress" | "completed"; currentStep: number; quizPassed: boolean; badgeAwarded: boolean }> {
      const db = ctx.db<typeof schema>();
      const profile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, args.profileId)))[0];
      if (!profile) throw new Error("Profile not found");
      const existing = (await db.select().from(schema.trainingRecords).where(eq(schema.trainingRecords.profileId, args.profileId)))[0];
      const quizPassed = args.quizAnswer === "1-60 minutes" || existing?.quizPassed === true;
      if (args.complete && args.currentStep !== 10) throw new Error("Finish all ten training steps before completing the quiz.");
      if (args.complete && !quizPassed) throw new Error("Choose the correct recording time rule before completing training.");
      const now = new Date();
      const completed = existing?.status === "completed" || (args.complete && quizPassed);
      const status: "in_progress" | "completed" = completed ? "completed" : "in_progress";
      if (existing) {
        await db.update(schema.trainingRecords).set({ currentStep: args.currentStep, status, quizPassed, completedAt: completed ? existing.completedAt ?? now : null, updatedAt: now }).where(eq(schema.trainingRecords.id, existing.id));
      } else {
        await db.insert(schema.trainingRecords).values({ profileId: profile.id, teamMemberId: null, assigneeName: profile.displayName, assigneeEmail: profile.email, assignedByProfileId: profile.id, status, currentStep: args.currentStep, quizPassed, assignedAt: now, completedAt: completed ? now : null, updatedAt: now });
      }
      if (completed && existing?.status !== "completed") {
        await db.batch([
          db.insert(schema.notifications).values({ profileId: profile.id, title: "Training complete", body: "You earned the Training Complete badge. You can replay any lesson at any time." }),
          db.insert(schema.auditLogs).values({ actor: `profile:${profile.id}`, action: "training.completed", entityType: "profile", entityId: String(profile.id), detail: "Nova ten-step guide completed; recording-rule quiz passed" }),
        ]);
      }
      ctx.invalidateQueries();
      return { status, currentStep: args.currentStep, quizPassed, badgeAwarded: completed };
    },
  }),

  assignTraining: defineAction({
    request: z.object({ profileId: z.number().int().positive(), teamMemberId: z.number().int().positive() }),
    response: z.object({ recordId: z.number(), status: z.enum(["not_started", "in_progress", "completed"]) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const profile = (await db.select().from(schema.profiles).where(eq(schema.profiles.id, args.profileId)))[0];
      if (!profile) throw new Error("Profile not found.");
      const allProfiles = await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id));
      const isFounder = allProfiles[0]?.id === profile.id;
      const allBusinesses = await db.select().from(schema.businesses);
      const allTeamMembers = await db.select().from(schema.teamMembers);
      const managerMemberships = allTeamMembers.filter((candidate) => candidate.email.toLowerCase() === profile.email.toLowerCase() && candidate.role === "manager" && candidate.status !== "removed");
      const manageableBusinessIds = new Set(profile.accountType === "business" ? allBusinesses.filter((business) => business.ownerProfileId === profile.id).map((business) => business.id) : []);
      managerMemberships.forEach((membership) => manageableBusinessIds.add(membership.businessId));
      if (isFounder) allBusinesses.forEach((business) => manageableBusinessIds.add(business.id));
      const member = allTeamMembers.find((candidate) => candidate.id === args.teamMemberId);
      if (!member || !manageableBusinessIds.has(member.businessId) || member.status === "removed") throw new Error("You are not authorized to manage training for this business workspace.");
      const existing = (await db.select().from(schema.trainingRecords).where(eq(schema.trainingRecords.teamMemberId, member.id)))[0];
      if (existing) return { recordId: existing.id, status: existing.status };
      const linkedProfile = (await db.select().from(schema.profiles).where(eq(schema.profiles.email, member.email.toLowerCase())))[0];
      const linkedTraining = linkedProfile ? (await db.select().from(schema.trainingRecords).where(eq(schema.trainingRecords.profileId, linkedProfile.id)))[0] : undefined;
      const now = new Date();
      if (linkedTraining) {
        await db.update(schema.trainingRecords).set({ teamMemberId: member.id, assignedByProfileId: profile.id, updatedAt: now }).where(eq(schema.trainingRecords.id, linkedTraining.id));
        ctx.invalidateQueries();
        return { recordId: linkedTraining.id, status: linkedTraining.status };
      }
      const row = (await db.insert(schema.trainingRecords).values({ profileId: linkedProfile?.id ?? null, teamMemberId: member.id, assigneeName: member.name, assigneeEmail: member.email, assignedByProfileId: profile.id, status: "not_started", currentStep: 1, quizPassed: false, assignedAt: now, completedAt: null, updatedAt: now }).returning({ id: schema.trainingRecords.id }))[0];
      if (!row) throw new Error("Training assignment could not be created");
      await db.insert(schema.auditLogs).values({ actor: `profile:${profile.id}`, action: "training.assigned", entityType: "team_member", entityId: String(member.id), detail: `Assigned to ${member.email}` });
      ctx.invalidateQueries();
      return { recordId: row.id, status: "not_started" as const };
    },
  }),

  createSupportTicket: defineAction({
    request: z.object({ profileId: z.number().int().positive(), subject: z.string().min(4).max(120), message: z.string().min(10).max(3000) }),
    response: z.object({ ticketId: z.number(), expectedResponse: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const now = new Date();
      const row = (await db.insert(schema.supportTickets).values({ ...args, status: "open", updatedAt: now }).returning({ id: schema.supportTickets.id }))[0];
      if (!row) throw new Error("Ticket could not be created");
      await db.batch([
        db.insert(schema.notifications).values({ profileId: args.profileId, title: `Support ticket #${row.id} received`, body: "The Earnova staff queue has your request. A staff member is expected to respond within 1–2 business days; Nova is not a live human agent." }),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "support_ticket.created", entityType: "support_ticket", entityId: String(row.id), detail: "Routed to Earnova staff support queue" }),
      ]);
      ctx.invalidateQueries(); return { ticketId: row.id, expectedResponse: "within 1–2 business days" };
    },
  }),

  respondSupportTicket: defineAction({
    request: z.object({ ticketId: z.number().int().positive(), authorRole: z.enum(["contributor", "staff"]), authorName: z.string().min(2).max(80), message: z.string().min(2).max(3000), status: z.enum(["open", "in_progress", "resolved"]) }),
    response: z.object({ messageId: z.number(), status: z.enum(["open", "in_progress", "resolved"]) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const ticket = (await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, args.ticketId)))[0];
      if (!ticket) throw new Error("Support ticket not found");
      const now = new Date();
      const row = (await db.insert(schema.supportMessages).values({ ticketId: args.ticketId, authorRole: args.authorRole, authorName: args.authorName, message: args.message }).returning({ id: schema.supportMessages.id }))[0];
      if (!row) throw new Error("Support reply could not be saved");
      await db.batch([
        db.update(schema.supportTickets).set({ status: args.status, updatedAt: now }).where(eq(schema.supportTickets.id, args.ticketId)),
        db.insert(schema.notifications).values({ profileId: ticket.profileId, title: args.authorRole === "staff" ? `Staff replied to ticket #${ticket.id}` : `Reply added to ticket #${ticket.id}`, body: args.authorRole === "staff" ? "Open Help & Support to read the staff response." : "Your reply is in the staff queue." }),
        db.insert(schema.auditLogs).values({ actor: args.authorRole === "staff" ? args.authorName : `profile:${ticket.profileId}`, action: "support_ticket.replied", entityType: "support_ticket", entityId: String(ticket.id), detail: `Role: ${args.authorRole}; status: ${args.status}` }),
      ]);
      ctx.invalidateQueries();
      return { messageId: row.id, status: args.status };
    },
  }),

  markNotificationsRead: defineAction({
    request: z.object({ profileId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> { const db = ctx.db<typeof schema>(); await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.profileId, args.profileId)); ctx.invalidateQueries(); return { ok: true }; },
  }),

  updateLaunchItem: defineAction({
    request: z.object({ profileId: z.number().int().positive(), itemId: z.number().int().positive(), status: z.enum(["not_started", "in_progress", "done"]).optional(), note: z.string().max(500).nullable().optional() }),
    response: z.object({ ok: z.literal(true), status: z.enum(["not_started", "in_progress", "done"]) }),
    async handler(ctx, args): Promise<{ ok: true; status: "not_started" | "in_progress" | "done" }> {
      const db = ctx.db<typeof schema>();
      const allProfiles = await db.select().from(schema.profiles).orderBy(asc(schema.profiles.id));
      const founder = allProfiles[0];
      if (!founder || founder.id !== args.profileId) throw new Error("Only the founder can update the launch roadmap.");
      const item = (await db.select().from(schema.launchItems).where(eq(schema.launchItems.id, args.itemId)))[0];
      if (!item) throw new Error("Launch item not found");
      const now = new Date();
      const nextStatus = args.status ?? item.status;
      const nextNote = args.note === undefined ? item.note : (args.note?.trim() ? args.note.trim() : null);
      await db.batch([
        db.update(schema.launchItems).set({ status: nextStatus, note: nextNote, updatedAt: now }).where(eq(schema.launchItems.id, args.itemId)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "launch_item.updated", entityType: "launch_item", entityId: String(args.itemId), detail: `${item.itemKey}: status ${item.status} → ${nextStatus}` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, status: nextStatus };
    },
  }),

  saveMetaApiKey: defineAction({
    request: z.object({ profileId: z.number().int().positive(), apiKey: z.string().trim().min(8).max(512) }),
    response: z.object({ ok: z.literal(true), configured: z.literal(true), keyHint: z.string() }),
    async handler(ctx, args): Promise<{ ok: true; configured: true; keyHint: string }> {
      const db = ctx.db<typeof schema>();
      await requireFounder(ctx, args.profileId);
      const now = new Date();
      const existing = await getMetaSettings(ctx);
      if (existing) {
        await db.update(schema.metaSettings).set({ apiKey: args.apiKey, lastTestStatus: null, lastTestMessage: "Key saved — run the connection test to verify SAM 3.1 access.", lastTestedAt: null, updatedAt: now }).where(eq(schema.metaSettings.id, 1));
      } else {
        await db.insert(schema.metaSettings).values({ id: 1, apiKey: args.apiKey, lastTestStatus: null, lastTestMessage: "Key saved — run the connection test to verify SAM 3.1 access.", lastTestedAt: null, createdAt: now, updatedAt: now });
      }
      // The audit log records that a key changed — never the key itself or any part of it.
      await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "meta_api_key.saved", entityType: "meta_settings", entityId: "1", detail: "Meta Model API key saved by the founder (value not logged)" });
      ctx.invalidateQueries();
      return { ok: true, configured: true, keyHint: `•••• ${args.apiKey.slice(-4)}` };
    },
  }),

  clearMetaApiKey: defineAction({
    request: z.object({ profileId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true), configured: z.literal(false) }),
    async handler(ctx, args): Promise<{ ok: true; configured: false }> {
      const db = ctx.db<typeof schema>();
      await requireFounder(ctx, args.profileId);
      const existing = await getMetaSettings(ctx);
      if (existing) await db.update(schema.metaSettings).set({ apiKey: null, lastTestStatus: null, lastTestMessage: null, lastTestedAt: null, updatedAt: new Date() }).where(eq(schema.metaSettings.id, 1));
      await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "meta_api_key.cleared", entityType: "meta_settings", entityId: "1", detail: "Meta Model API key removed by the founder" });
      ctx.invalidateQueries();
      return { ok: true, configured: false };
    },
  }),

  testMetaConnection: defineAction({
    request: z.object({ profileId: z.number().int().positive() }),
    response: z.object({ status: z.enum(["connected", "invalid_key", "model_not_found", "no_key", "unreachable", "error"]), message: z.string(), samAvailable: z.boolean() }),
    async handler(ctx, args): Promise<{ status: "connected" | "invalid_key" | "model_not_found" | "no_key" | "unreachable" | "error"; message: string; samAvailable: boolean }> {
      const db = ctx.db<typeof schema>();
      await requireFounder(ctx, args.profileId);
      const settings = await getMetaSettings(ctx);
      const apiKey = settings?.apiKey?.trim() ?? "";
      const persist = async (status: string, message: string) => {
        const now = new Date();
        if (settings) await db.update(schema.metaSettings).set({ lastTestStatus: status, lastTestMessage: message, lastTestedAt: now, updatedAt: now }).where(eq(schema.metaSettings.id, 1));
        else await db.insert(schema.metaSettings).values({ id: 1, apiKey: null, lastTestStatus: status, lastTestMessage: message, lastTestedAt: now, createdAt: now, updatedAt: now });
      };
      if (!apiKey) {
        const message = "No Meta Model API key is saved yet. Create one at dev.meta.ai, paste it above, then test again. Privacy Blur is running on the built-in engine meanwhile.";
        await persist("no_key", message);
        ctx.invalidateQueries();
        return { status: "no_key", message, samAvailable: false };
      }
      let status: "connected" | "invalid_key" | "model_not_found" | "unreachable" | "error" = "error";
      let message = "";
      let samAvailable = false;
      try {
        const response = await fetch(`${META_API_BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (response.status === 401 || response.status === 403) {
          status = "invalid_key";
          message = "The Meta Model API rejected this key (unauthorized). Check that the key was copied in full from dev.meta.ai and that billing is configured.";
        } else if (!response.ok) {
          status = "error";
          message = `The Meta Model API answered with HTTP ${response.status}. Try the test again in a few minutes.`;
        } else {
          const payload: unknown = await response.json().catch(() => null);
          const ids: string[] = [];
          if (typeof payload === "object" && payload !== null && Array.isArray((payload as { data?: unknown }).data)) {
            for (const entry of (payload as { data: unknown[] }).data) {
              if (typeof entry === "object" && entry !== null && typeof (entry as { id?: unknown }).id === "string") ids.push((entry as { id: string }).id);
            }
          }
          samAvailable = ids.some((id) => id === SAM_MODEL_ID || id.startsWith("sam-3"));
          if (samAvailable) {
            status = "connected";
            message = `Connected. Model ${SAM_MODEL_ID} is available to this key — the segmentation lab can send its first real request.`;
          } else if (ids.length > 0) {
            status = "model_not_found";
            message = `The key works, but ${SAM_MODEL_ID} is not in this account's model list (${ids.slice(0, 6).join(", ")}${ids.length > 6 ? "…" : ""}). A key alone does not guarantee model access — SAM 3.1 access must be granted on the Meta developer account.`;
          } else {
            status = "model_not_found";
            message = `The key was accepted but the model list came back empty, so ${SAM_MODEL_ID} access is not confirmed. Check the Meta developer account's model access.`;
          }
        }
      } catch {
        status = "unreachable";
        message = "The Meta Model API could not be reached from the app server. Check network access and try again — no SAM request was sent.";
      }
      await persist(status, message);
      await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "meta_connection.tested", entityType: "meta_settings", entityId: "1", detail: `Result: ${status}` });
      ctx.invalidateQueries();
      return { status, message, samAvailable };
    },
  }),

  analyzePrivacyImage: defineAction({
    request: z.object({ profileId: z.number().int().positive(), concept: z.string().trim().min(2).max(40), imageName: z.string().max(160), imageMime: z.enum(["image/jpeg", "image/png"]), imageBase64: z.string().min(100) }),
    response: z.object({ jobId: z.number(), status: z.enum(["completed", "failed", "no_key", "model_not_found", "unreachable"]), regions: z.array(samRegionShape), summary: z.string(), errorMessage: z.string().nullable() }),
    async handler(ctx, args): Promise<{ jobId: number; status: "completed" | "failed" | "no_key" | "model_not_found" | "unreachable"; regions: SamRegion[]; summary: string; errorMessage: string | null }> {
      const db = ctx.db<typeof schema>();
      await requireFounder(ctx, args.profileId);
      if (/,/.test(args.concept)) throw new Error("Send one concept phrase per request (for example “person”). Commas are not a multi-label interface — run people and pets as separate requests.");
      const bytes = decodeBase64(args.imageBase64);
      if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Images for SAM analysis are limited to 8 MB in this build. Choose a smaller copy.");
      const settings = await getMetaSettings(ctx);
      const apiKey = settings?.apiKey?.trim() ?? "";
      const record = async (status: "completed" | "failed" | "no_key" | "model_not_found" | "unreachable", regions: SamRegion[], summary: string, errorMessage: string | null) => {
        const row = (await db.insert(schema.samJobs).values({ profileId: args.profileId, concept: args.concept, mediaKind: "image", mediaName: args.imageName, status, regionCount: status === "completed" ? regions.length : null, regionsJson: regions.length ? JSON.stringify(regions) : null, summary, errorMessage, createdAt: new Date() }).returning({ id: schema.samJobs.id }))[0];
        if (!row) throw new Error("SAM job could not be recorded");
        return row.id;
      };
      if (!apiKey) {
        const summary = "No Meta Model API key is configured, so no request left the app. Save a key in this lab and test the connection first — Privacy Blur keeps using the built-in engine.";
        const jobId = await record("no_key", [], summary, "Meta Model API key not configured");
        ctx.invalidateQueries();
        return { jobId, status: "no_key", regions: [], summary, errorMessage: "Meta Model API key not configured" };
      }
      try {
        const response = await fetch(`${META_API_BASE}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: SAM_MODEL_ID,
            messages: [{ role: "user", content: [{ type: "text", text: args.concept }, { type: "image_url", image_url: { url: `data:${args.imageMime};base64,${args.imageBase64}` } }] }],
          }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (response.status === 404) {
          const summary = `The API answered 404 model_not_found for ${SAM_MODEL_ID}. The key is saved, but this account does not have SAM 3.1 access yet — no masks were produced and nothing was blurred by SAM.`;
          const jobId = await record("model_not_found", [], summary, "404 model_not_found");
          ctx.invalidateQueries();
          return { jobId, status: "model_not_found", regions: [], summary, errorMessage: "404 model_not_found" };
        }
        if (!response.ok) {
          const summary = `The Meta Model API answered HTTP ${response.status}; no segmentation was produced.`;
          const jobId = await record("failed", [], summary, `HTTP ${response.status}`);
          ctx.invalidateQueries();
          return { jobId, status: "failed", regions: [], summary, errorMessage: `HTTP ${response.status}` };
        }
        const { regions, text } = extractSamRegions(payload);
        const summary = regions.length
          ? `SAM 3.1 returned ${regions.length} region${regions.length === 1 ? "" : "s"} for “${args.concept}”. Review them on the image — automated regions are estimates and human review still applies.`
          : "SAM 3.1 answered, but its response did not include regions this build could decode into boxes. The raw response start is kept here for inspection; no mask is claimed.";
        const jobId = await record("completed", regions, summary, null);
        await db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "sam.image_analyzed", entityType: "sam_job", entityId: String(jobId), detail: `Concept: ${args.concept}; decoded regions: ${regions.length}${text ? "" : "; empty response text"}` });
        ctx.invalidateQueries();
        return { jobId, status: "completed", regions, summary: regions.length ? summary : `${summary} Raw response start: ${text.slice(0, 280)}`, errorMessage: null };
      } catch {
        const summary = "The Meta Model API could not be reached from the app server, so no segmentation request completed.";
        const jobId = await record("unreachable", [], summary, "Network error reaching api.meta.ai");
        ctx.invalidateQueries();
        return { jobId, status: "unreachable", regions: [], summary, errorMessage: "Network error reaching api.meta.ai" };
      }
    },
  }),

  updateMetaBuildItem: defineAction({
    request: z.object({ profileId: z.number().int().positive(), itemId: z.number().int().positive(), status: z.enum(["not_started", "in_progress", "done"]) }),
    response: z.object({ ok: z.literal(true), status: z.enum(["not_started", "in_progress", "done"]) }),
    async handler(ctx, args): Promise<{ ok: true; status: "not_started" | "in_progress" | "done" }> {
      const db = ctx.db<typeof schema>();
      await requireFounder(ctx, args.profileId);
      const item = (await db.select().from(schema.metaBuildItems).where(eq(schema.metaBuildItems.id, args.itemId)))[0];
      if (!item) throw new Error("Meta build item not found");
      await db.batch([
        db.update(schema.metaBuildItems).set({ status: args.status, updatedAt: new Date() }).where(eq(schema.metaBuildItems.id, args.itemId)),
        db.insert(schema.auditLogs).values({ actor: `profile:${args.profileId}`, action: "meta_build_item.updated", entityType: "meta_build_item", entityId: String(args.itemId), detail: `${item.itemKey}: status ${item.status} → ${args.status}` }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, status: args.status };
    },
  }),
} satisfies ActionsModule;
