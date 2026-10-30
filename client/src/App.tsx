import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { fileToBase64 } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";
import heroImage from "./assets-earnova-hero.jpg";
import logoImage from "./assets-earnova-logo.jpg";
import markImage from "./assets-earnova-mark.jpg";
import novaFullBodyImage from "./assets/nova-full-body.jpg";
import novaTabletImage from "./assets/nova-tablet.jpg";
import trainingAudio1 from "./assets/training-audio/step-1.m4a";
import trainingAudio2 from "./assets/training-audio/step-2.m4a";
import trainingAudio3 from "./assets/training-audio/step-3.m4a";
import trainingAudio4 from "./assets/training-audio/step-4.m4a";
import trainingAudio5 from "./assets/training-audio/step-5.m4a";
import trainingAudio6 from "./assets/training-audio/step-6.m4a";
import trainingAudio7 from "./assets/training-audio/step-7.m4a";
import trainingAudio8 from "./assets/training-audio/step-8.m4a";
import trainingAudio9 from "./assets/training-audio/step-9.m4a";
import trainingAudio10 from "./assets/training-audio/step-10.m4a";
import novaGreetingAudio from "./assets/nova-voice/greeting.m4a";
import novaTasksAudio from "./assets/nova-voice/tasks.m4a";
import novaRecordingAudio from "./assets/nova-voice/recording.m4a";
import novaEarningsAudio from "./assets/nova-voice/earnings.m4a";
import novaWithdrawalsAudio from "./assets/nova-voice/withdrawals.m4a";
import novaReferralsAudio from "./assets/nova-voice/referrals.m4a";
import novaSafetyAudio from "./assets/nova-voice/safety.m4a";
import novaPrivacyAudio from "./assets/nova-voice/privacy.m4a";
import novaStaffAudio from "./assets/nova-voice/staff.m4a";
import novaHandoffAudio from "./assets/nova-voice/handoff.m4a";
import novaTicketConfirmedAudio from "./assets/nova-voice/ticket-confirmed.m4a";
import novaQuizCorrectAudio from "./assets/nova-voice/quiz-correct.m4a";
import novaQuizIncorrectAudio from "./assets/nova-voice/quiz-incorrect.m4a";
import novaChecklistMissingAudio from "./assets/nova-voice/checklist-missing.m4a";
import novaTrainingCompleteAudio from "./assets/nova-voice/training-complete.m4a";
import novaNotificationAudio from "./assets/nova-voice/notification.m4a";
import { createProcessedVideo, PROCESSING_QUALITY, type ProcessingQuality } from "./privacyProcessor";
import { deleteGalleryVideo, listGalleryVideos, markGalleryVideoExported, renameGalleryVideo, replaceGalleryVideoCopy, saveGalleryVideo, type GalleryVideo } from "./videoGallery";

type AppState = ApiResponse<typeof api, "getAppState">;
type Task = AppState["tasks"][number];
type GearStatus = NonNullable<NonNullable<AppState["profile"]>["gearStatus"]>;
type Screen = "home" | "tasks" | "training" | "work" | "money" | "more" | "recording-gear" | "task" | "submit" | "admin-create" | "admin-review" | "admin-support" | "business" | "partner" | "commercial-inquiry" | "admin-commercial" | "support" | "tester-feedback" | "legal" | "launch" | "meta-ai";

const AMAZON_GEAR_URL = "https://www.amazon.com/clp/B0D3LQJ95R";
const gearOptions: Array<{ value: GearStatus; label: string; short: string }> = [
  { value: "have_gear", label: "I already have a head strap & phone mount — start ASAP", short: "Ready to start ASAP" },
  { value: "ordered", label: "I've ordered one — I'll start when it arrives", short: "Ordered — waiting for delivery" },
  { value: "need_gear", label: "I need to get one", short: "Needs recording gear" },
];
const gearLabel = (value: GearStatus | null) => gearOptions.find((option) => option.value === value)?.label ?? "Not selected yet";

const categories = ["Home Maintenance & Projects", "Pets & Animals", "Childcare", "Caregiving", "Organization & Storage", "Tidying & Cleaning", "Kitchen, Cooking & Dishes", "Personal Vehicle Care", "Interactions", "Laundry & Clothing", "Outdoor & Yard", "Personal Assistant", "Social Media and Digital Work", "Deliveries & Errands", "Driving / Rideshare"];
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const durationLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
type CameraFacing = "user" | "environment";

function FlipCameraIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-4l-2-2H9L7 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M9 11a4 4 0 0 1 6.7-1.9L17 10" /><path d="M17 7v3h-3" /><path d="M15 15a4 4 0 0 1-6.7 1.9L7 16" /><path d="M7 19v-3h3" /></svg>;
}

function ShellIcon({ name }: { name: string }) {
  const glyphs: Record<string, string> = { home: "⌂", tasks: "≡", training: "10", work: "✓", money: "$", more: "•••", back: "‹", bell: "●" };
  return <span aria-hidden="true" className="glyph">{glyphs[name] ?? "•"}</span>;
}

function Status({ value }: { value: string }) { return <span className={`status status-${value.replaceAll("_", "-")}`}>{value.replaceAll("_", " ")}</span>; }

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty"><div className="empty-mark">E</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Loading() { return <div className="loading"><span /><span /><span /><p>Opening your workspace</p></div>; }

const NOVA_MUTED_KEY = "earnova-nova-muted";
const NOVA_UNLOCKED_KEY = "earnova-nova-audio-unlocked";
const NOVA_AUDIO_STARTED = "earnova:nova-audio-started";
const NOVA_MUTE_CHANGED = "earnova:nova-mute-changed";

function storedNovaMuted() {
  try { return window.sessionStorage.getItem(NOVA_MUTED_KEY) === "true"; } catch { return false; }
}

function broadcastNovaMute(muted: boolean) {
  try { window.sessionStorage.setItem(NOVA_MUTED_KEY, String(muted)); } catch { /* Keep the in-memory setting when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent<boolean>(NOVA_MUTE_CHANGED, { detail: muted }));
}

function usePreparedAudioSource(src: string) {
  const [preparedSrc, setPreparedSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setPreparedSrc(null);
    void fetch(src, { credentials: "same-origin", cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error("Nova audio asset could not be loaded.");
      const bytes = await response.arrayBuffer();
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/mp4" }));
      if (cancelled) URL.revokeObjectURL(objectUrl);
      else setPreparedSrc(objectUrl);
    }).catch(() => {
      if (!cancelled) setPreparedSrc(src);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return preparedSrc;
}

function NovaVoice({ src, label, autoPlay = false, compact = false }: { src: string; label: string; autoPlay?: boolean; compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preparedSrc = usePreparedAudioSource(src);
  const [muted, setMuted] = useState(storedNovaMuted);
  const [playing, setPlaying] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    const onOtherAudio = (event: Event) => {
      const active = (event as CustomEvent<HTMLAudioElement>).detail;
      const audio = audioRef.current;
      if (audio && active !== audio) { audio.pause(); audio.currentTime = 0; }
    };
    const onMute = (event: Event) => setMuted((event as CustomEvent<boolean>).detail);
    window.addEventListener(NOVA_AUDIO_STARTED, onOtherAudio);
    window.addEventListener(NOVA_MUTE_CHANGED, onMute);
    return () => { window.removeEventListener(NOVA_AUDIO_STARTED, onOtherAudio); window.removeEventListener(NOVA_MUTE_CHANGED, onMute); };
  }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !preparedSrc) return;
    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setPlaying(false);
    setLoadFailed(false);
    if (autoPlay) void audio.play().catch(() => { /* The visible Play button is the mobile-safe fallback. */ });
    return () => { audio.pause(); audio.currentTime = 0; };
  }, [preparedSrc, autoPlay]);
  const replay = () => {
    const audio = audioRef.current;
    if (!audio || !preparedSrc) return;
    setLoadFailed(false);
    audio.muted = false;
    audio.volume = 1;
    broadcastNovaMute(false);
    audio.currentTime = 0;
    void audio.play().catch(() => setLoadFailed(true));
  };
  const changeMuted = () => broadcastNovaMute(!muted);
  return <div className={`nova-voice${compact ? " compact" : ""}${loadFailed ? " audio-error" : ""}`}>
    <audio ref={audioRef} src={preparedSrc ?? undefined} preload="auto" playsInline muted={muted} onPlay={(event) => { setPlaying(true); setLoadFailed(false); window.dispatchEvent(new CustomEvent<HTMLAudioElement>(NOVA_AUDIO_STARTED, { detail: event.currentTarget })); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setLoadFailed(true); }} />
    <span className="nova-voice-label"><b>Nova&apos;s voice</b><small>{loadFailed ? "Audio did not start — tap Play / replay to try again" : preparedSrc ? label : "Preparing audio…"}</small></span>
    <span className="nova-voice-actions"><button type="button" aria-label={muted ? "Unmute Nova" : "Mute Nova"} aria-pressed={muted} onClick={changeMuted}>{muted ? "Unmute" : "Mute"}</button><button type="button" aria-label={`Replay Nova: ${label}`} disabled={!preparedSrc} onClick={replay}>{playing ? "Replay" : preparedSrc ? "Play / replay" : "Loading…"}</button></span>
  </div>;
}

function NovaWelcomePrompt() {
  const [open, setOpen] = useState(() => {
    try { return window.sessionStorage.getItem(NOVA_UNLOCKED_KEY) !== "true"; } catch { return true; }
  });
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preparedGreeting = usePreparedAudioSource(novaGreetingAudio);
  if (!open) return null;
  const start = () => {
    const audio = audioRef.current;
    if (!audio || !preparedGreeting) return;
    setStarting(true); setFailed(false);
    broadcastNovaMute(false);
    audio.muted = false;
    audio.volume = 1;
    audio.currentTime = 0;
    void audio.play().then(() => {
      try { window.sessionStorage.setItem(NOVA_UNLOCKED_KEY, "true"); } catch { /* The greeting still works for this visit. */ }
      window.dispatchEvent(new CustomEvent<HTMLAudioElement>(NOVA_AUDIO_STARTED, { detail: audio }));
    }).catch(() => { setStarting(false); setFailed(true); });
  };
  return <div className="nova-welcome-backdrop" role="dialog" aria-modal="true" aria-labelledby="nova-welcome-title">
    <section className="nova-welcome-card"><img src={novaTabletImage} alt="Nova, Earnova AI’s illustrated AI helper and trainer character" /><div><span className="eyebrow">Your guided start</span><h2 id="nova-welcome-title">Tap to meet Nova</h2><p>Turn up your device volume, then tap below. Nova will greet you and narrate each training step.</p></div><audio ref={audioRef} src={preparedGreeting ?? undefined} preload="auto" playsInline onEnded={() => { setStarting(false); setOpen(false); }} onError={() => { setStarting(false); setFailed(true); }} /><button className="primary nova-welcome-start" type="button" onClick={start} disabled={starting || !preparedGreeting}>{starting ? "Nova is speaking…" : preparedGreeting ? "Tap to meet Nova" : "Preparing Nova…"}</button>{failed && <div className="nova-welcome-fallback" role="alert"><strong>Nova&apos;s audio did not start.</strong><span>Tap the button above to try again. You can also continue and use Play / replay beside any Nova lesson.</span><button className="secondary" type="button" onClick={() => setOpen(false)}>Continue with written guidance</button></div>}</section>
  </div>;
}

function TestFundsLabel({ compact = false }: { compact?: boolean }) {
  return <span className={compact ? "test-funds-label compact" : "test-funds-label"}>TEST FUNDS — not real money</span>;
}

export function App() {
  const queryClient = useQueryClient();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [novaOpen, setNovaOpen] = useState(false);
  const stateQuery = useQuery({ queryKey: ["app-state", profileId], queryFn: () => api.getAppState({ profileId }) });
  const data = stateQuery.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["app-state"] });
  const profile = data?.profile ?? null;
  const selectedTask = data?.tasks.find((task) => task.id === selectedTaskId) ?? null;

  if (stateQuery.isPending) return <Loading />;
  if (stateQuery.error) return <main className="fatal"><h2>Earnova could not open</h2><p>{String(stateQuery.error)}</p><button onClick={() => void stateQuery.refetch()}>Try again</button></main>;
  if (!data) return null;
  if (!profile) return <Onboarding onCreated={(id) => { setProfileId(id); setScreen("home"); void refresh(); }} />;

  const goTask = (id: number) => { setSelectedTaskId(id); setScreen("task"); };
  const goSubmit = (id: number) => { setSelectedTaskId(id); setScreen("submit"); };
  const back = () => setScreen("home");

  return <div className="app" data-theme={theme}>
    <NovaWelcomePrompt />
    <header className="topbar">
      <div className="brand-lockup">
        {!["home", "tasks", "training", "work", "money", "more"].includes(screen) && <button className="icon-button" aria-label="Go back" onClick={back}><ShellIcon name="back" /></button>}
        <img className="brand-mark" src={markImage} alt="Earnova AI logo" />
        <span className="brand-words"><strong>Earnova AI</strong><small>Royalty Radio Media LLC</small></span>
      </div>
      <div className="topbar-actions"><span className="identity-chip" title={profile.displayName}><span className="avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span><span className="identity-name">{profile.displayName}</span></span><button className="nova-header-button" aria-label="Ask Nova for help" aria-expanded={novaOpen} onClick={() => setNovaOpen((open) => !open)}><img src={novaTabletImage} alt="" /><b>Nova</b></button><button className="icon-button notification-button" aria-label="Open notifications" onClick={() => setScreen("more")}><ShellIcon name="bell" />{data.metrics.unreadNotifications > 0 && <b>{data.metrics.unreadNotifications}</b>}</button></div>
    </header>
    {data.project?.isTest && <div className="test-funds-banner" role="status"><TestFundsLabel /><span>No monetary value · founder sandbox</span></div>}

    <main className="main">
      {screen === "home" && <Home data={data} onBrowse={() => setScreen("tasks")} onTraining={() => setScreen("training")} onTask={goTask} onMoney={() => setScreen("money")} onFeedback={() => setScreen("tester-feedback")} onGear={() => setScreen("recording-gear")} onOpenNova={() => setNovaOpen(true)} onLaunch={() => setScreen("launch")} onMeta={() => setScreen("meta-ai")} />}
      {screen === "tasks" && <Marketplace data={data} onTask={goTask} />}
      {screen === "training" && <EarnovaTraining data={data} onChanged={refresh} onGear={() => setScreen("recording-gear")} />}
      {screen === "recording-gear" && <RecordingGear profile={profile} onChanged={refresh} />}
      {screen === "work" && <Work data={data} onSubmit={goSubmit} onTask={goTask} />}
      {screen === "money" && <Money data={data} onChanged={refresh} />}
      {screen === "more" && <More data={data} theme={theme} setTheme={setTheme} navigate={setScreen} onChanged={refresh} />}
      {screen === "task" && selectedTask && <TaskDetail task={selectedTask} rateLabel={data.viewerCompensation.rateLabel} profileId={profile.id} assignments={data.assignments} onChanged={refresh} onSubmit={() => goSubmit(selectedTask.id)} />}
      {screen === "submit" && selectedTask && <Submit task={selectedTask} profileId={profile.id} assignments={data.assignments} onDone={() => { void refresh(); setScreen("work"); }} />}
      {screen === "admin-create" && <AdminCreate onDone={() => { void refresh(); setScreen("more"); }} />}
      {screen === "admin-review" && <AdminReview data={data} onChanged={refresh} />}
      {screen === "admin-support" && <AdminSupport data={data} onChanged={refresh} />}
      {screen === "business" && <Business profileId={profile.id} data={data} onChanged={refresh} />}
      {screen === "partner" && <Partnerships data={data} onChanged={refresh} onOpenBusiness={() => setScreen("business")} />}
      {screen === "commercial-inquiry" && <CommercialInquiryPage data={data} onChanged={refresh} />}
      {screen === "admin-commercial" && data.viewerAccess.isFounder && <CommercialInquiryAdmin data={data} onChanged={refresh} />}
      {screen === "support" && <Support data={data} onChanged={refresh} onOpenNova={() => setNovaOpen(true)} onFeedback={() => setScreen("tester-feedback")} />}
      {screen === "tester-feedback" && <TesterFeedback profileName={profile.displayName} profileEmail={profile.email} />}
      {screen === "legal" && <Legal />}
      {screen === "launch" && <LaunchRoadmap data={data} onChanged={refresh} />}
      {screen === "meta-ai" && <MetaAiLab data={data} onChanged={refresh} />}
    </main>

    {novaOpen && <NovaAssistant profileId={profile.id} onClose={() => setNovaOpen(false)} onTicketCreated={refresh} />}

    {["home", "tasks", "training", "work", "money", "more"].includes(screen) && <nav className="bottom-nav" aria-label="Primary navigation">
      {([['home','Home'],['tasks','Tasks'],['training','Earnova Training'],['work','My work'],['money','Earnings'],['more','More']] as const).map(([id, label]) => <button key={id} className={screen === id ? "active" : ""} aria-current={screen === id ? "page" : undefined} onClick={() => setScreen(id)}><ShellIcon name={id} /><span>{label}</span></button>)}
    </nav>}
    <footer><span className="footer-brand"><img src={markImage} alt="" />Earnova AI · Powered by Royalty Radio Media LLC</span><button className="footer-link" onClick={() => setScreen("commercial-inquiry")}>For Partners &amp; Investors</button></footer>
  </div>;
}

function Onboarding({ onCreated }: { onCreated: (id: number) => void }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const create = useMutation({ mutationFn: api.createProfile, onSuccess: (result) => onCreated(result.id), onError: (e) => setError(String(e)) });
  const [form, setForm] = useState({ displayName: "", email: "", accountType: "contributor" as "contributor" | "business", country: "", language: "English", gearStatus: "need_gear" as GearStatus, birthYear: 1990, acceptTerms: false, acceptDataUse: false });
  const patch = (key: keyof typeof form, value: string | number | boolean) => setForm((v) => ({ ...v, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); setError(""); if (!form.acceptTerms || !form.acceptDataUse) { setError("Accept both agreements to continue."); return; } create.mutate({ ...form, acceptTerms: true, acceptDataUse: true }); };
  return <div className="onboarding">
    <NovaWelcomePrompt />
    <div className="onboard-visual"><img src={step === 0 ? heroImage : logoImage} alt="Earnova AI branding with the Earn Rewards mission" /><div className="visual-copy"><span className="trust-line">Your talent / our technology / real opportunity</span><h1>{step === 0 ? "Complete tasks. Earn rewards. Worldwide." : "Set up your eligibility profile"}</h1><p>{step === 0 ? "Record everyday activities, complete digital work, and help approved AI projects learn from real human skill." : "A few details help us show the right work and consent requirements."}</p></div></div>
    {step === 0 ? <section className="welcome-actions"><div className="onboarding-nova-voice"><img src={novaTabletImage} alt="Nova, Earnova AI’s helper and trainer" /><div><strong>Meet Nova</strong><p>Hear your helper&apos;s signature welcome before you begin.</p></div></div><NovaVoice src={novaGreetingAudio} label="Signature welcome" compact /><button className="primary" onClick={() => { patch("accountType", "contributor"); setStep(1); }}>Join as an individual</button><button className="secondary" onClick={() => { patch("accountType", "business"); setStep(1); }}>Set up a business account</button><p className="business-onboarding-note"><strong>Building a team?</strong> Business accounts can invite and manage unlimited employees.</p><p className="fine">This private testing build uses local artifact access. Production email verification, social sign-in, identity checks, and two-factor authentication require approved providers.</p></section> : <form className="onboard-form" onSubmit={submit}>
      <div className="form-grid"><label>Full or display name<input value={form.displayName} onChange={(e) => patch("displayName", e.target.value)} required minLength={2} /></label><label>Email address<input type="email" value={form.email} onChange={(e) => patch("email", e.target.value)} required /></label><label>Country<input value={form.country} onChange={(e) => patch("country", e.target.value)} required /></label><label>Preferred language<input value={form.language} onChange={(e) => patch("language", e.target.value)} required /></label><label>Birth year<input type="number" min="1900" max="2010" value={form.birthYear} onChange={(e) => patch("birthYear", Number(e.target.value))} required /></label><label>Account type<select value={form.accountType} onChange={(e) => patch("accountType", e.target.value)}><option value="contributor">Individual contributor</option><option value="business">Business account</option></select></label></div>
      {form.accountType === "business" && <p className="business-onboarding-note"><strong>Unlimited employees included.</strong> Invite as many staff members as your organization needs after setup.</p>}
      <fieldset className="onboarding-gear"><legend>Recording gear setup</legend><p>A head strap & phone mount keeps recording hands-free. It is required for driving tasks and recommended for every video task.</p>{gearOptions.map((option) => <label key={option.value}><input type="radio" name="onboardingGearStatus" value={option.value} checked={form.gearStatus === option.value} onChange={() => patch("gearStatus", option.value)} /><span>{option.label}</span></label>)}</fieldset>
      <label className="check"><input type="checkbox" checked={form.acceptTerms} onChange={(e) => patch("acceptTerms", e.target.checked)} /><span>I accept the draft Terms, Privacy Policy, and contributor eligibility statements.</span></label>
      <label className="check"><input type="checkbox" checked={form.acceptDataUse} onChange={(e) => patch("acceptDataUse", e.target.checked)} /><span>I understand task recordings may be reviewed and used for AI training only under each funded project's stated license and retention terms.</span></label>
      {error && <p className="form-error">{error}</p>}<div className="button-row"><button type="button" className="text-button" onClick={() => setStep(0)}>Back</button><button className="primary" disabled={create.isPending}>{create.isPending ? "Creating profile…" : "Create my profile"}</button></div>
    </form>}
  </div>;
}

const trainingSteps = [
  { title: "Create your account", audio: trainingAudio1, summary: "Welcome! Step one is to create the account that fits your role: individual contributor, business, or administrator. Choose carefully, because your workspace and responsibilities follow that role.", points: ["Contributors claim and complete tasks", "Business accounts manage teams", "Administrator access is assigned to authorized staff"] },
  { title: "Verify your eligibility", audio: trainingAudio2, summary: "Step two is verification. Confirm your email and finish the eligibility checks shown in your profile. These checks help Earnova match work responsibly and keep the marketplace trustworthy.", points: ["Confirm the email you control", "Complete every eligibility prompt", "Production verification needs approved providers"] },
  { title: "Set up your profile", audio: trainingAudio3, summary: "Step three is your profile. Add a clear photo, your country, and your preferred language. Accurate details help staff support you and show the right instructions.", points: ["Use an accurate profile photo", "Choose your country", "Set the language you prefer"] },
  { title: "Understand consent and terms", audio: trainingAudio4, summary: "Step four covers consent and trust. Read the consent, privacy, and terms carefully, then accept only when you understand how recordings are reviewed, used, and protected.", points: ["Read before accepting", "Know who can review your media", "Use support for access, correction, or deletion requests"] },
  { title: "Meet Nova", audio: trainingAudio5, summary: "Step five is where we meet. I’m Nova, your automated in-app helper. Ask me about tasks, recording, earnings, safety, privacy, or support anytime. If you need a person, I can help you create a staff ticket.", points: ["Nova is an automated helper, not a human", "Ask from the Nova button on any main screen", "Create a tracked ticket when you need staff"] },
  { title: "Claim your first task", audio: trainingAudio6, summary: "Step six is your first task. Browse the marketplace, open a funded task, read every instruction and review rule, then claim it when you’re ready. Test funds in this build are not real money.", points: ["Open Tasks and review the full brief", "Check safety, privacy, camera, and review rules", "Accept only work you can complete safely"] },
  { title: "Record safely", audio: trainingAudio7, summary: "Step seven is recording. Every task recording must be at least one minute and no more than sixty minutes. Set up camera angles before starting, keep private details out, and use Privacy Blur when required. For driving tasks, mount the phone while parked and never touch it while the vehicle is moving.", points: ["Recording rule: 1–60 minutes", "Keep private details and non-consenting people out", "Driving is strictly hands-free; set up while parked"] },
  { title: "Submit and track review", audio: trainingAudio8, summary: "Step eight is submission and review. Watch your recording, complete the checklist, submit it, and track the status in My Work. Awaiting review does not mean approved.", points: ["Review the entire recording", "Complete every submission checkpoint", "Track awaiting review, approved, rejected, or flagged status"] },
  { title: "Understand approval and earnings", audio: trainingAudio9, summary: "Step nine is approval and earnings. A human reviewer approves payable minutes, which enter the ledger at ten dollars per approved hour in this sandbox. Referral rewards follow separate eligibility and review rules; signups alone do not create earnings.", points: ["Only approved payable minutes become earnings", "$10 per approved hour · TEST FUNDS — not real money", "Referral rewards require verified qualifying work"] },
  { title: "Set up a payout method", audio: trainingAudio10, summary: "Step ten is payout setup. Add PayPal, Venmo, Cash App, or Whop in the payout center, verify the method in sandbox mode, and request a withdrawal only when eligible. No provider is connected and no real money moves in this test build.", points: ["Choose PayPal, Venmo, Cash App, or Whop", "Verify and select a sandbox method", "Withdraw only from available—not pending—balance"] },
] as const;

type QuizAnswer = "1-60 minutes" | "under 1 minute" | "any length";

function EarnovaTraining({ data, onChanged, onGear }: { data: AppState; onChanged: () => void; onGear: () => void }) {
  const profile = data.profile;
  const [stepIndex, setStepIndex] = useState(() => Math.min(9, Math.max(0, (data.training?.currentStep ?? 1) - 1)));
  const [quizAnswer, setQuizAnswer] = useState<QuizAnswer | "">(data.training?.quizPassed ? "1-60 minutes" : "");
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [celebrating, setCelebrating] = useState(data.training?.status === "completed");
  const save = useMutation({ mutationFn: api.saveTrainingProgress, onSuccess: (result) => { setMessage(result.status === "completed" ? "Training complete. Your badge is now on your profile." : "Progress saved."); setCelebrating(result.status === "completed"); onChanged(); }, onError: (error) => setMessage(String(error)) });
  const assign = useMutation({ mutationFn: api.assignTraining, onSuccess: () => { setMessage("Training assigned. The team tracker has been updated."); onChanged(); }, onError: (error) => setMessage(String(error)) });
  if (!profile) return null;
  const step = trainingSteps[stepIndex] ?? trainingSteps[0];
  const progress = ((stepIndex + 1) / trainingSteps.length) * 100;
  const moveTo = (next: number) => {
    const bounded = Math.min(9, Math.max(0, next));
    setStepIndex(bounded);
    setCelebrating(false);
    setMessage("");
    save.mutate({ profileId: profile.id, currentStep: bounded + 1, complete: false, quizAnswer: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const finish = () => {
    if (!quizAnswer || !safetyChecked || !approvalChecked) { setMessage("Answer the quiz and confirm both checklist items before completing training."); return; }
    save.mutate({ profileId: profile.id, currentStep: 10, complete: true, quizAnswer });
  };
  return <div className="page training-page">
    <div className="training-intro"><img className="training-nova-art" src={novaFullBodyImage} alt="Nova, Earnova AI’s illustrated helper and trainer character" /><div><span className="eyebrow">Earnova Training · led by Nova</span><h1>Learn the app and earn in 10 easy steps.</h1><p>Nova is Earnova AI&apos;s friendly helper and trainer character. Take one step at a time, listen to her narrated guidance, and replay any lesson whenever you need it.</p><NovaVoice src={novaGreetingAudio} label="Training welcome" compact /></div></div>
    <section className="training-gear-check"><div><span className="eyebrow">Onboarding checklist · recording gear</span><h2>Hands-free setup</h2><p><strong>Saved choice:</strong> {gearLabel(profile.gearStatus)}</p><small>A head strap & phone mount is required for driving tasks and recommended for all video tasks.</small></div><button className="secondary" onClick={onGear}>{profile.gearStatus ? "Update gear status" : "Choose gear status"}</button></section>
    {celebrating ? <section className="training-celebration" aria-live="polite"><span className="celebration-mark">✓</span><span className="eyebrow">All ten steps complete</span><h2>You earned the Training Complete badge</h2><p>Your profile now shows the badge. Keep using the same 1–60 minute recording rule, safety checks, privacy controls, and human-review process on every task.</p><strong className="training-badge large">Training Complete</strong><NovaVoice src={novaTrainingCompleteAudio} label="Training complete" autoPlay /><button className="primary" onClick={() => { setCelebrating(false); setStepIndex(0); }}>Replay from step 1</button></section> : <section className="training-player">
      <div className="training-progress-head"><span>Step {stepIndex + 1} of 10</span><strong>{Math.round(progress)}% complete</strong></div><div className="training-progress" role="progressbar" aria-label="Training progress" aria-valuemin={1} aria-valuemax={10} aria-valuenow={stepIndex + 1}><span style={{ width: `${progress}%` }} /></div>
      <div className="training-step"><div className="training-step-number">{String(stepIndex + 1).padStart(2, "0")}</div><div><span className="eyebrow">Nova’s lesson</span><h2>{step.title}</h2></div></div>
      <div className="nova-script"><div className="nova-avatar">N</div><p>{step.summary}</p></div>
      <NovaVoice key={stepIndex} src={step.audio} label={`Step ${stepIndex + 1}: ${step.title}`} autoPlay />
      <ul className="training-points">{step.points.map((point) => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul>
      {stepIndex === 9 && <section className="training-quiz"><span className="eyebrow">Final knowledge check</span><h3>What is the recording time rule for every task?</h3><div role="radiogroup" aria-label="Recording time rule">{(["1-60 minutes", "under 1 minute", "any length"] as QuizAnswer[]).map((answer) => <label key={answer} className={quizAnswer === answer ? "selected" : ""}><input type="radio" name="trainingQuiz" value={answer} checked={quizAnswer === answer} onChange={() => setQuizAnswer(answer)} /><span>{answer === "1-60 minutes" ? "At least 1 minute and no more than 60 minutes" : answer === "under 1 minute" ? "Any recording under 1 minute" : "Any length as long as the task is finished"}</span></label>)}</div>{quizAnswer && <div className={`nova-quiz-feedback ${quizAnswer === "1-60 minutes" ? "correct" : "incorrect"}`}><strong>{quizAnswer === "1-60 minutes" ? "That’s right!" : "Almost—try again."}</strong><p>{quizAnswer === "1-60 minutes" ? "Every recording is 1–60 minutes." : "Choose at least 1 minute and no more than 60 minutes."}</p><NovaVoice src={quizAnswer === "1-60 minutes" ? novaQuizCorrectAudio : novaQuizIncorrectAudio} label="Quiz feedback" autoPlay compact /></div>}<div className="gear-checklist-row"><span aria-hidden="true">{profile.gearStatus ? "✓" : "○"}</span><div><strong>Recording gear</strong><small>{gearLabel(profile.gearStatus)}</small></div><button type="button" className="text-button" onClick={onGear}>Review</button></div><label className="check"><input type="checkbox" checked={safetyChecked} onChange={(event) => setSafetyChecked(event.target.checked)} /><span>I will follow the task&apos;s safety, consent, camera, and privacy rules.</span></label><label className="check"><input type="checkbox" checked={approvalChecked} onChange={(event) => setApprovalChecked(event.target.checked)} /><span>I understand that only human-approved payable time becomes earnings.</span></label></section>}
      <div className="training-nav"><button className="secondary" disabled={stepIndex === 0 || save.isPending} onClick={() => moveTo(stepIndex - 1)}>Back</button>{stepIndex < 9 ? <button className="primary" disabled={save.isPending} onClick={() => moveTo(stepIndex + 1)}>Next step</button> : <button className="primary" disabled={save.isPending} onClick={finish}>{save.isPending ? "Checking…" : "Complete training"}</button>}</div>
    </section>}
    {message && <div><p className={message.includes("correct") || message.includes("Answer") ? "form-error" : "notice"}>{message}</p>{message.includes("Answer the quiz") && <NovaVoice src={novaChecklistMissingAudio} label="Training checklist reminder" autoPlay compact />}</div>}
    <section className="training-replay"><div className="section-title"><div><span className="eyebrow">Replay any lesson</span><h2>All 10 steps</h2></div>{data.training && <Status value={data.training.status} />}</div><div className="step-picker">{trainingSteps.map((item, index) => <button key={item.title} className={index === stepIndex && !celebrating ? "active" : ""} aria-label={`Replay step ${index + 1}: ${item.title}`} onClick={() => moveTo(index)}><b>{index + 1}</b><span>{item.title}</span></button>)}</div></section>
    {data.viewerAccess.canManageTeamTraining && <section className="training-team"><div className="section-title"><div><span className="eyebrow">Staff & manager controls</span><h2>Assign & track team training</h2></div></div><p>Authorized staff and business managers can assign Nova&apos;s ten-step guide to people recorded in their Business team workspace. Invitation email delivery still requires a configured provider.</p>{data.teamMembers.length ? <div className="training-team-list">{data.teamMembers.map((member) => <article key={member.id}><div><strong>{member.name}</strong><small>{member.email} · {member.role}</small></div>{member.training ? <Status value={member.training.status} /> : <button className="secondary" disabled={assign.isPending} onClick={() => assign.mutate({ profileId: profile.id, teamMemberId: member.id })}>Assign training</button>} {member.training && <span className="team-training-meta">Step {member.training.currentStep} of 10{member.training.completedAt ? ` · Completed ${when(member.training.completedAt)}` : ""}</span>}</article>)}</div> : <Empty title="No team members yet" text="Add team members in More → Business team, then return here to assign training." />}</section>}
  </div>;
}

function RecordingGear({ profile, onChanged }: { profile: NonNullable<AppState["profile"]>; onChanged: () => void }) {
  const [choice, setChoice] = useState<GearStatus | "">(profile.gearStatus ?? "");
  const [message, setMessage] = useState("");
  useEffect(() => { setChoice(profile.gearStatus ?? ""); }, [profile.gearStatus]);
  const save = useMutation({
    mutationFn: (gearStatus: GearStatus) => api.saveGearStatus({ profileId: profile.id, gearStatus }),
    onSuccess: () => { setMessage("Your recording gear choice is saved to your profile."); onChanged(); },
    onError: (error) => setMessage(String(error)),
  });
  return <div className="page recording-gear-page">
    <section className="gear-hero"><div className="gear-symbol" aria-hidden="true"><span>▣</span><i /></div><div><span className="eyebrow">Recording Gear</span><h1>Keep your hands free and your recording steady.</h1><p>A head strap & phone mount holds your phone securely while you work. It is <strong>required for driving tasks</strong> and recommended for every video task.</p></div></section>
    <section className="gear-safety"><strong>Driving tasks are hands-free only</strong><p>Park safely before setup. Secure the phone in the mount before the vehicle moves, keep your view clear, and never touch or adjust the phone while driving.</p></section>
    <section className="gear-purchase"><div><span className="eyebrow">Need the gear?</span><h2>Head Strap & Phone Mount</h2><p>Use the Amazon listing below, or use a compatible head strap and phone mount you already have at home.</p></div><a className="amazon-button" href={AMAZON_GEAR_URL} target="_blank" rel="noopener noreferrer">Buy on Amazon <span aria-hidden="true">↗</span></a><small>Amazon is an external store. Prices, availability, and delivery are handled by Amazon, not Earnova AI.</small></section>
    <section className="gear-status-panel"><div className="section-title"><div><span className="eyebrow">Your profile</span><h2>What is your gear status?</h2></div>{profile.gearStatus && <Status value="saved" />}</div><p className="saved-gear"><strong>Saved choice:</strong> {gearLabel(profile.gearStatus)}</p><div className="gear-options" role="radiogroup" aria-label="Recording gear status">{gearOptions.map((option) => <label key={option.value} className={choice === option.value ? "selected" : ""}><input type="radio" name="gearStatus" value={option.value} checked={choice === option.value} onChange={() => { setChoice(option.value); setMessage(""); }} /><span><strong>{option.label}</strong><small>{option.value === "have_gear" ? "You can prepare for approved video tasks now." : option.value === "ordered" ? "Save this status now and update it when your gear arrives." : "Use the Amazon button above or get a compatible setup elsewhere."}</small></span></label>)}</div><button className="primary" disabled={!choice || save.isPending || choice === profile.gearStatus} onClick={() => { if (choice) save.mutate(choice); }}>{save.isPending ? "Saving…" : choice === profile.gearStatus ? "Choice saved" : "Save to my profile"}</button>{message && <p className="notice" aria-live="polite">{message}</p>}</section>
    <section className="gear-checklist"><span className="eyebrow">Before you record</span><h2>Hands-free checklist</h2><ul><li><span aria-hidden="true">✓</span><div><strong>Gear status</strong><small>{gearLabel(profile.gearStatus)}</small></div></li><li><span aria-hidden="true">✓</span><div><strong>Phone is secure</strong><small>Fit the phone firmly and test the angle while stopped.</small></div></li><li><span aria-hidden="true">✓</span><div><strong>View and movement are clear</strong><small>The mount must not block your vision or create a safety hazard.</small></div></li></ul></section>
  </div>;
}

function Home({ data, onBrowse, onTraining, onTask, onMoney, onFeedback, onGear, onOpenNova, onLaunch, onMeta }: { data: AppState; onBrowse: () => void; onTraining: () => void; onTask: (id: number) => void; onMoney: () => void; onFeedback: () => void; onGear: () => void; onOpenNova: () => void; onLaunch: () => void; onMeta: () => void }) {
  const live = data.tasks.filter((t) => t.status === "published" && t.remainingBudgetCents > 0).slice(0, 3);
  const launchDone = data.launchItems.filter((item) => item.status === "done").length;
  const launchActive = data.launchItems.filter((item) => item.status === "in_progress").length;
  const samDone = data.metaBuildItems.filter((item) => item.status === "done").length;
  return <div className="page home-page">
    {data.viewerAccess.isFounder && data.launchItems.length > 0 && <section className="launch-kickoff-card"><img src={markImage} alt="Earnova AI logo" /><div><span className="eyebrow">Real-launch roadmap · Kickoff started Oct 22</span><h2>Launch is in motion — carefully</h2><p>{launchDone} of {data.launchItems.length} roadmap items done · {launchActive} in progress. Next gate: the provisional-patent decision lands <strong>before Nov 4</strong>, and there&apos;s no public launch until after the hackathon ends.</p></div><button className="primary" onClick={onLaunch}>Open launch roadmap</button></section>}
    {data.viewerAccess.isFounder && <section className="sam-home-card"><div><span className="eyebrow">Meta-model build · Started Oct 29</span><h2>SAM 3.1 privacy segmentation — Stage 1 is built</h2><p>{data.metaIntegration.configured ? <>API key saved ({data.metaIntegration.keyHint ?? "masked"}) · Last test: <strong>{data.metaIntegration.lastTestStatus ?? "not tested yet"}</strong>. </> : <>No Meta Model API key saved yet — Privacy Blur is still running on the built-in engine, and the app says so wherever it matters. </>}{samDone} of {data.metaBuildItems.length} build steps done. Add your dev.meta.ai key, run the live connection test, and send the lab its first image.</p></div><button className="primary" onClick={onMeta}>Open SAM 3.1 Lab</button></section>}
    {data.project?.isTest && <section className="demo-project-panel"><div><TestFundsLabel compact /><h2>{data.project.name}</h2><p>{data.project.linkedTaskCount} catalog tasks are linked and claimable for founder testing. Each task has its own allocation.</p></div><dl><div><dt>Per-task allocation</dt><dd>$1,000 test funds</dd></div><div><dt>Catalog remaining</dt><dd>{money(data.project.remainingBudgetCents)} test funds</dd></div><div><dt>{data.viewerCompensation.rateLabel}</dt><dd>{money(data.viewerCompensation.rateCents)}/approved hr</dd></div><div><dt>Limit</dt><dd>{data.project.maxMinutes} min/task</dd></div></dl><strong className="no-value">Every $1,000 task allocation is sandbox-only and has no real monetary value.</strong></section>}
    <section className="meet-nova-card"><img src={novaTabletImage} alt="Nova, Earnova AI’s illustrated AI helper and trainer character, holding a tablet" /><div><span className="eyebrow">Your AI helper &amp; trainer</span><h2>Meet Nova</h2><p>Nova is Earnova AI&apos;s friendly character for learning the app, understanding tasks, and getting clear guidance before you record.</p><NovaVoice src={novaGreetingAudio} label="Signature greeting" compact /><button className="primary" onClick={onOpenNova}>Ask Nova</button></div></section>
    {data.training?.status !== "completed" && <section className="first-step-card"><div><span className="eyebrow">Your first step</span><h2>Start Earnova Training</h2><p>Complete Nova&apos;s 10 narrated lessons, pass the quick recording-rule check, and earn your Training Complete badge before your first submission.</p></div><button className="primary" onClick={onTraining}>{data.training ? `Continue at step ${data.training.currentStep}` : "Start step 1"}</button></section>}
    <section className="balance-hero"><div>{data.project?.isTest ? <TestFundsLabel compact /> : <span className="eyebrow">Available to withdraw</span>}<strong>{money(data.metrics.availableCents)}</strong><button onClick={onMoney}>{data.project?.isTest ? "Open test earnings" : "View earnings"}</button></div><div className="balance-split"><span><small>Pending</small><b>{money(data.metrics.pendingCents)}</b></span><span><small>Approved total</small><b>{money(data.metrics.approvedCents)}</b></span></div></section>
    <section className="quick-stats" aria-label="Account overview"><div><strong>{data.metrics.availableTasks}</strong><span>funded tasks</span></div><div><strong>{data.metrics.completedTasks}</strong><span>approved</span></div><div><strong>{Math.round(data.metrics.approvedMinutes / 60 * 10) / 10}</strong><span>approved hours</span></div></section>
    <section className="practice"><div className="practice-copy"><span className="eyebrow">Start safely</span><h2>Before your first recording</h2><p>Check the room, remove private documents, avoid bystanders, and confirm everyone captured has consented.</p></div><div className="progress-ring"><span>1</span><small>guide</small></div></section>
    <section className="gear-dashboard"><div className="gear-dashboard-mark" aria-hidden="true">▣</div><div><span className="eyebrow">Recording Gear</span><h2>Set up hands-free</h2><p>{data.profile?.gearStatus ? <><strong>Saved:</strong> {gearOptions.find((option) => option.value === data.profile?.gearStatus)?.short}</> : "Choose your gear status before recording video tasks."}</p></div><button className="secondary" onClick={onGear}>Open Recording Gear</button></section>
    <section className="tester-invite"><div><span className="eyebrow">Official Testers</span><h2>Help shape Earnova</h2><p>Try the founder test flow, then tell us what worked, what felt confusing, or where you found a bug.</p></div><button className="secondary" onClick={onFeedback}>Send tester feedback</button></section>
    <div className="section-title"><div><span className="eyebrow">Marketplace</span><h2>Funded work</h2></div><button onClick={onBrowse}>See all</button></div>
    {live.length ? <div className="task-list">{live.map((task) => <TaskCard key={task.id} task={task} rateLabel={data.viewerCompensation.rateLabel} onClick={() => onTask(task.id)} />)}</div> : <Empty title="No funded tasks yet" text="Published opportunities will appear after a verified project owner adds a budget and clear compensation terms." action={<button className="secondary" onClick={onBrowse}>Browse marketplace</button>} />}
  </div>;
}

function TaskCard({ task, rateLabel, onClick }: { task: Task; rateLabel: string; onClick: () => void }) {
  const funded = task.remainingBudgetCents > 0;
  return <button className={`task-card${task.projectIsTest ? " test-task" : ""}`} onClick={onClick}>{task.projectIsTest && <TestFundsLabel compact />}{rateLabel === "Business team rate" && <span className="business-rate-ribbon">BUSINESS TEAM · {money(task.rateCents)}/HR</span>}{task.privacyBlurDefault && <span className="privacy-ribbon">PRIVACY BLUR ON · HUMAN REVIEW</span>}<div className="task-top"><span className="category-dot" /><span>{task.category}</span><Status value={funded ? task.status : "catalog"} /></div><h3>{task.title}</h3><p>{task.description}</p>{task.projectIsTest && <div className="task-allocation"><small>Allocated test funding</small><strong>{money(task.budgetCents)}</strong><span>No real monetary value</span></div>}<div className="task-meta"><span><small>{task.compensationType === "hourly" ? rateLabel : "Fixed"}</small><b>{task.compensationType === "hourly" ? `${money(task.rateCents)}/hr` : money(task.rateCents)}</b></span><span><small>Recording</small><b>1–60 min</b></span><span><small>Remaining</small><b>{funded ? `${money(task.remainingBudgetCents)}${task.projectIsTest ? " test" : " left"}` : "Awaiting funding"}</b></span></div></button>;
}

function Marketplace({ data, onTask }: { data: AppState; onTask: (id: number) => void }) {
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("All");
  const categoryOptions = useMemo(() => Array.from(new Set(data.tasks.filter((t) => t.status === "published").map((t) => t.category))).sort(), [data.tasks]);
  const list = useMemo(() => data.tasks.filter((t) => t.status === "published" && (category === "All" || t.category === category) && `${t.title} ${t.description} ${t.ownerName} ${t.category}`.toLowerCase().includes(search.toLowerCase())), [data.tasks, search, category]);
  return <div className="page"><div className="page-heading"><span className="eyebrow">Task catalog</span><h1>Find your next task</h1><p>Browse by category, review your clearly labeled individual or business-team rate and payable limit, then open a task for instructions and review criteria. Only funded tasks can be accepted.</p></div><label className="search"><span>⌕</span><input aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks or categories" /></label><label className="select-label">Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{categoryOptions.map((c) => <option key={c}>{c}</option>)}</select></label><div className="market-count"><strong>{list.length}</strong><span>matching task{list.length === 1 ? "" : "s"}</span></div>{list.length ? <div className="task-list">{list.map((task) => <TaskCard key={task.id} task={task} rateLabel={data.viewerCompensation.rateLabel} onClick={() => onTask(task.id)} />)}</div> : <Empty title="No matching tasks" text={data.tasks.some((t) => t.status === "published") ? "Try a different search or category." : "Tasks will appear after the catalog is published."} />}</div>;
}

function TaskDetail({ task, rateLabel, profileId, assignments, onChanged, onSubmit }: { task: Task; rateLabel: string; profileId: number; assignments: AppState["assignments"]; onChanged: () => void; onSubmit: () => void }) {
  const [message, setMessage] = useState(""); const assignment = assignments.find((a) => a.taskId === task.id);
  const claim = useMutation({ mutationFn: () => api.claimTask({ profileId, taskId: task.id }), onSuccess: () => { setMessage("Task added to My work."); void onChanged(); }, onError: (e) => setMessage(String(e)) });
  const funded = task.remainingBudgetCents > 0;
  return <div className="page detail-page">{task.projectIsTest && <div className="task-test-warning"><TestFundsLabel /><span>This task uses sandbox values with no monetary value.</span></div>}<div className="detail-head"><Status value={funded ? task.status : "catalog"} /><span>{task.category}</span><h1>{task.title}</h1><p>{task.description}</p><div className="owner-line"><span className="owner-seal">✓</span><span><small>Catalog owner</small><strong>{task.ownerName}</strong></span></div></div><section className="duration-rule" aria-label="Recording duration requirement"><span>Recording requirement</span><strong>Record 1–60 minutes</strong><p>At least 1 minute and no more than 60 minutes. Recordings outside this range cannot be submitted or counted as payable time.</p></section>{task.privacyBlurDefault && <section className="care-safeguards"><span className="eyebrow">Protected care recording</span><h2>Privacy Blur starts ON</h2><p>On-device detection tracks faces, people, and common pets across frames and composites blur through feathered masks shaped to each subject. When detection is unavailable or confidence is low, the whole frame is blurred automatically. It is automated and best-effort, not a guarantee; consent and human review still apply. Meta SAM 3.1 segmentation is in integration (Meta AI lab) and is not the engine producing this copy until it is verified.</p><ul>{task.guardianConsentRequired && <li>Verifiable parent or legal guardian consent must be uploaded before submission.</li>}<li>Every submission is routed to a human reviewer.</li><li>The recording may not be shared publicly, reposted, or reused personally.</li></ul></section>}<section className="pay-banner">{task.projectIsTest && <div><small>Allocated test funding</small><strong>{money(task.budgetCents)} · no real value</strong></div>}<div><small>{task.compensationType === "hourly" ? `${rateLabel}${task.projectIsTest ? " · test funds" : ""}` : (task.projectIsTest ? "Sandbox fixed amount" : "Fixed compensation")}</small><strong>{task.compensationType === "hourly" ? `${money(task.rateCents)} / approved hour${task.projectIsTest ? " in test funds" : ""}` : `${money(task.rateCents)} fixed${task.projectIsTest ? " test funds" : ""}`}</strong></div><div><small>Maximum payable time</small><strong>{task.maxMinutes} minutes</strong></div><p>{funded ? (task.projectIsTest ? "Sandbox earnings are calculated from human-approved work for flow testing only. No real payment is created." : "Payment is based on human-approved payable work, not raw recording length.") : "This task is browsable now, but cannot be accepted until an approved project budget is attached."}</p></section>{(["Deliveries & Errands", "Driving / Rideshare"].includes(task.category)) && <section className="safety-alert"><strong>{task.category === "Driving / Rideshare" ? "STRICT HANDS-FREE DRIVING & CONSENT RULES" : "DELIVERY SAFETY & PRIVACY RULES"}</strong><p>{task.safetyRequirements}</p><p>{task.privacyRequirements}</p></section>}<section className="requirements"><h2>What to do</h2><p>{task.instructions}</p><dl><div><dt>Review criteria</dt><dd>{task.reviewCriteria}</dd></div><div><dt>Required recording</dt><dd>Video or audio · 1–60 minutes</dd></div><div><dt>Additional evidence</dt><dd>{task.evidenceType === "video" || task.evidenceType === "audio" ? "Follow the task instructions" : task.evidenceType}</dd></div><div><dt>Camera / capture</dt><dd>{task.cameraRequirements || "Follow the written project instructions."}</dd></div><div><dt>Safety</dt><dd>{task.safetyRequirements}</dd></div><div><dt>Privacy</dt><dd>{task.privacyRequirements}</dd></div><div><dt>Expected review</dt><dd>Within {task.expectedReviewDays} day{task.expectedReviewDays === 1 ? "" : "s"}</dd></div><div><dt>Funded capacity</dt><dd>{funded ? `${money(task.remainingBudgetCents)} remaining${task.projectIsTest ? " in test funds — no real monetary value" : ""}` : "Not funded yet"}</dd></div></dl></section>{message && <p className="notice">{message}</p>}{assignment ? <button className="primary sticky-action" onClick={onSubmit}>{assignment.status === "active" ? "Record or upload evidence" : "View in My work"}</button> : <button className="primary sticky-action" disabled={claim.isPending || task.status !== "published" || !funded} onClick={() => claim.mutate()}>{claim.isPending ? "Accepting…" : funded ? (task.projectIsTest ? "Accept sandbox test task" : "Accept funded task") : "Waiting for project funding"}</button>}</div>;
}

const videoSizeLabel = (bytes: number) => bytes === 0 ? "0 KB" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function GalleryPreview({ video }: { video: GalleryVideo }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(video.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [video.blob]);
  return url ? <video className="gallery-preview" controls playsInline preload="metadata" src={url} /> : <div className="gallery-preview-loading">Preparing preview…</div>;
}

function EvidencePreview({ file, onDuration }: { file: File; onDuration: (element: HTMLMediaElement) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return <div className="gallery-preview-loading">Preparing preview…</div>;
  return file.type.startsWith("video/")
    ? <video className="preview" controls playsInline preload="metadata" src={url} onLoadedMetadata={(event) => onDuration(event.currentTarget)} />
    : <audio className="audio-preview" controls preload="metadata" src={url} onLoadedMetadata={(event) => onDuration(event.currentTarget)} />;
}

function MyVideos({ profileId }: { profileId: number }) {
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAfterExportId, setDeleteAfterExportId] = useState<string | null>(null);
  const refreshVideos = async () => {
    try { setVideos(await listGalleryVideos(profileId)); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "The local gallery could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refreshVideos(); }, [profileId]);
  const saveRename = async (video: GalleryVideo) => {
    const name = renameValue.trim();
    if (!name) { setMessage("Enter a name for this video."); return; }
    try { await renameGalleryVideo(video.id, name); setEditingId(null); setMessage("Video renamed."); await refreshVideos(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "The video could not be renamed."); }
  };
  const removeVideo = async (id: string) => {
    try { await deleteGalleryVideo(id); setDeleteId(null); setDeleteAfterExportId(null); setMessage("Local copy removed. Any copy you exported remains in the destination you chose."); await refreshVideos(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "The local copy could not be removed."); }
  };
  const markExported = async (video: GalleryVideo, successMessage: string) => {
    try { await markGalleryVideoExported(video.id); setDeleteAfterExportId(video.id); setMessage(successMessage); await refreshVideos(); }
    catch { setDeleteAfterExportId(video.id); setMessage(successMessage); }
  };
  const downloadVideo = async (video: GalleryVideo) => {
    const url = URL.createObjectURL(video.blob);
    const anchor = document.createElement("a");
    const extension = video.mime.includes("mp4") ? "mp4" : "webm";
    anchor.href = url; anchor.download = `${video.name.replace(/[^a-z0-9 _-]/gi, "").trim() || "earnova-video"}.${extension}`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    await markExported(video, "Download started. Confirm the file is safely in Photos or Files, then you can remove the local copy below.");
  };
  const shareVideo = async (video: GalleryVideo) => {
    const extension = video.mime.includes("mp4") ? "mp4" : "webm";
    const file = new File([video.blob], `${video.name}.${extension}`, { type: video.mime });
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) { setMessage("File sharing is not available in this browser. Use Save to device, then move the saved file to your cloud app."); return; }
    try {
      await navigator.share({ files: [file], title: video.name, text: video.publicSharingProhibited ? "Private Earnova task recording — do not post publicly." : "Earnova task recording" });
      await markExported(video, "Share sheet completed. Confirm your cloud, email, or private destination received the file, then you can remove the local copy below.");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setMessage("The share sheet could not send this video. Try Save to device instead.");
    }
  };
  const grouped = useMemo(() => {
    const groups = new Map<string, GalleryVideo[]>();
    for (const video of videos) groups.set(video.taskTitle, [...(groups.get(video.taskTitle) ?? []), video]);
    return Array.from(groups.entries());
  }, [videos]);
  const totalBytes = videos.reduce((sum, video) => sum + video.size, 0);
  if (loading) return <div className="gallery-loading" role="status">Loading local videos…</div>;
  return <section className="video-gallery" aria-labelledby="my-videos-title">
    <div className="gallery-intro"><div><span className="eyebrow">Local video manager</span><h2 id="my-videos-title">My Videos</h2><p>Recordings stay on this device until you export or delete them. Submitted evidence remains in its separate private review record.</p></div><div className="gallery-storage"><strong>{videos.length}</strong><span>video{videos.length === 1 ? "" : "s"} · {videoSizeLabel(totalBytes)}</span></div></div>
    <div className="gallery-export-guide"><strong>Free up space safely</strong><ol><li>Save to your device or use Share to send the file to Drive, iCloud, email, or another private destination.</li><li>Check that the exported copy opens.</li><li>Remove the local copy from Earnova.</li></ol><p>On iPhone or iPad, Share → Save Video places a compatible video in Photos. Browser downloads may go to Files or Downloads.</p></div>
    {message && <p className="notice" role="status">{message}</p>}
    {videos.length === 0 ? <Empty title="No local videos yet" text="Videos recorded inside Earnova will appear here automatically, grouped by task and recording date." /> : <div className="gallery-groups">{grouped.map(([taskTitle, taskVideos]) => <section className="gallery-task-group" key={taskTitle}><div className="gallery-task-heading"><h3>{taskTitle}</h3><span>{taskVideos.length} recording{taskVideos.length === 1 ? "" : "s"}</span></div><div className="gallery-list">{taskVideos.map((video) => <article className="gallery-video-card" key={video.id}>
      <GalleryPreview video={video} />
      <div className="gallery-video-info">{editingId === video.id ? <div className="gallery-rename"><label htmlFor={`rename-${video.id}`}>Video name</label><input id={`rename-${video.id}`} value={renameValue} maxLength={80} onChange={(event) => setRenameValue(event.target.value)} /><div><button className="secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button><button className="primary" type="button" onClick={() => void saveRename(video)}>Save name</button></div></div> : <><div className="gallery-video-title"><div><strong>{video.name}</strong><small>Recorded {when(video.createdAt)} · {durationLabel(video.durationSeconds)} · {videoSizeLabel(video.size)}</small></div><button className="text-button" type="button" onClick={() => { setEditingId(video.id); setRenameValue(video.name); }}>Rename</button></div><div className="gallery-badges"><span>{video.privacyProtected ? "Privacy Blur copy" : "Original local recording"}</span>{video.publicSharingProhibited && <span className="restricted">Private use only · no public posting</span>}{video.exportedAt && <span className="exported">Exported {when(video.exportedAt)}</span>}</div><div className="gallery-actions"><button className="secondary" type="button" onClick={() => void downloadVideo(video)}>Save to device / Photos</button><button className="primary" type="button" onClick={() => void shareVideo(video)}>Share to cloud or email</button><button className="text-button danger-text" type="button" onClick={() => setDeleteId(video.id)}>Delete local copy</button></div></>}
      {(deleteAfterExportId === video.id || deleteId === video.id) && <div className="gallery-delete-confirm" role="alert"><strong>{deleteAfterExportId === video.id ? "Export finished? Free this space now?" : "Delete this local video?"}</strong><p>{deleteAfterExportId === video.id ? "First open the exported copy in its destination. Removing this local copy cannot be undone." : "This removes the video from My Videos on this device. It does not delete a submitted review copy or any exported copy."}</p><div><button className="secondary" type="button" onClick={() => { setDeleteId(null); setDeleteAfterExportId(null); }}>Keep local copy</button><button className="danger" type="button" onClick={() => void removeVideo(video.id)}>Remove local copy</button></div></div>}
      </div>
    </article>)}</div></section>)}</div>}
  </section>;
}

function Work({ data, onSubmit, onTask }: { data: AppState; onSubmit: (id: number) => void; onTask: (id: number) => void }) {
  const active = data.assignments.filter((a) => a.status === "active");
  const [view, setView] = useState<"work" | "videos">("work");
  return <div className="page"><div className="page-heading"><span className="eyebrow">Staff workspace</span><h1>{view === "work" ? "My work" : "My Videos"}</h1><p>{view === "work" ? "Active assignments and review outcomes stay separate from available earnings." : "Preview, rename, export, and clear recordings stored on this device."}</p></div><div className="workspace-tabs" role="tablist" aria-label="My work sections"><button type="button" role="tab" aria-selected={view === "work"} className={view === "work" ? "active" : ""} onClick={() => setView("work")}>Assignments</button><button type="button" role="tab" aria-selected={view === "videos"} className={view === "videos" ? "active" : ""} onClick={() => setView("videos")}>My Videos</button></div>{view === "videos" ? <MyVideos profileId={data.profile?.id ?? 0} /> : <><div className="segmented-summary"><span><b>{active.length}</b> Active</span><span><b>{data.submissions.filter((s) => s.status === "awaiting_review").length}</b> In review</span><span><b>{data.submissions.filter((s) => s.status === "approved").length}</b> Approved</span></div>{active.length > 0 && <section><h2>Active tasks</h2><div className="work-list">{active.map((a) => <article key={a.id}><div><Status value={a.status} /><h3>{a.title}</h3><small>Accepted {when(a.claimedAt)}</small></div><button onClick={() => onSubmit(a.taskId)}>Submit evidence</button></article>)}</div></section>}<section><h2>Submission history</h2>{data.submissions.length ? <div className="submission-list">{data.submissions.map((s) => <button key={s.id} onClick={() => onTask(s.taskId)}><div><Status value={s.status} /><h3>{s.taskTitle}</h3><small>Submitted {when(s.submittedAt)}</small></div><div className="submission-pay"><strong>{s.payableCents == null ? "—" : money(s.payableCents)}</strong><small>{s.approvedMinutes == null ? "Awaiting review" : `${s.approvedMinutes} approved min`}</small></div>{s.reviewFeedback && <p>{s.reviewFeedback}</p>}</button>)}</div> : <Empty title="No submissions yet" text="Accept a funded task and send the required evidence. Uploads are private by default." />}</section></>}</div>;
}

function Submit({ task, profileId, assignments, onDone }: { task: Task; profileId: number; assignments: AppState["assignments"]; onDone: () => void }) {
  const assignment = assignments.find((a) => a.taskId === task.id && a.status === "active");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [privacyBlurEnabled, setPrivacyBlurEnabled] = useState(task.privacyBlurDefault);
  const [privacyBlurApplied, setPrivacyBlurApplied] = useState(false);
  const [privacyProgress, setPrivacyProgress] = useState(0);
  const [processingPrivacy, setProcessingPrivacy] = useState(false);
  const [processingQuality, setProcessingQuality] = useState<ProcessingQuality>(task.privacyBlurDefault ? "compact" : "balanced");
  const [processingMessage, setProcessingMessage] = useState("");
  const [minorsPresent, setMinorsPresent] = useState(task.guardianConsentRequired);
  const [guardianConsentConfirmed, setGuardianConsentConfirmed] = useState(false);
  const [guardianConsentFile, setGuardianConsentFile] = useState<File | null>(null);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [checklistDuration, setChecklistDuration] = useState(false);
  const [checklistReviewed, setChecklistReviewed] = useState(false);
  const [checklistOwnership, setChecklistOwnership] = useState(false);
  const [checklistNoShare, setChecklistNoShare] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recorderState, setRecorderState] = useState<"idle" | "recording" | "paused">("idle");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [cameraDeviceCount, setCameraDeviceCount] = useState(0);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [galleryVideoId, setGalleryVideoId] = useState<string | null>(null);
  const [gallerySaveMessage, setGallerySaveMessage] = useState("");
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const submit = useMutation({ mutationFn: api.submitAssignment, onSuccess: onDone, onError: (e) => setError(String(e)) });
  const stopTimer = () => { if (timerRef.current != null) window.clearInterval(timerRef.current); timerRef.current = null; };
  const stopDrawing = () => { if (drawFrameRef.current != null) window.cancelAnimationFrame(drawFrameRef.current); drawFrameRef.current = null; };
  const closeCamera = () => {
    stopDrawing();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recordingStreamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    setCameraReady(false);
  };
  const stopRecorder = () => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    closeCamera();
    setRecorderState("idle");
  };
  useEffect(() => () => {
    stopTimer();
    stopDrawing();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => { if (liveVideoRef.current && streamRef.current) liveVideoRef.current.srcObject = streamRef.current; }, [cameraReady, cameraFacing]);
  const refreshCameraCount = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) { setCameraDeviceCount(0); return; }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraDeviceCount(devices.filter((device) => device.kind === "videoinput").length);
    } catch { setCameraDeviceCount(0); }
  };
  const openCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("In-app recording is not available on this device. You can still choose an authorized recording below."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cameraFacing } }, audio: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      const reportedFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
      if (reportedFacing === "user" || reportedFacing === "environment") setCameraFacing(reportedFacing);
      setCameraReady(true);
      if (liveVideoRef.current) { liveVideoRef.current.srcObject = stream; await liveVideoRef.current.play(); }
      await refreshCameraCount();
    } catch { setError("Camera or microphone access was not available. Check device permission, or choose an existing authorized recording."); }
  };
  const flipCamera = async () => {
    const current = streamRef.current;
    if (!current || cameraDeviceCount < 2 || switchingCamera || !navigator.mediaDevices?.getUserMedia) return;
    setSwitchingCamera(true);
    setError("");
    const nextFacing: CameraFacing = cameraFacing === "user" ? "environment" : "user";
    const currentVideoTrack = current.getVideoTracks()[0];
    try {
      const currentDeviceId = currentVideoTrack?.getSettings().deviceId;
      let nextVideoStream: MediaStream;
      try {
        nextVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: nextFacing } }, audio: false });
      } catch {
        if (!navigator.mediaDevices.enumerateDevices) throw new Error("No alternate camera was available.");
        const alternatives = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput" && device.deviceId !== currentDeviceId);
        const alternative = alternatives[0];
        if (!alternative) throw new Error("No alternate camera was available.");
        nextVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: alternative.deviceId } }, audio: false });
      }
      let nextVideoTrack = nextVideoStream.getVideoTracks()[0];
      if (currentDeviceId && nextVideoTrack?.getSettings().deviceId === currentDeviceId && navigator.mediaDevices.enumerateDevices) {
        const alternatives = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput" && device.deviceId !== currentDeviceId);
        const alternative = alternatives[0];
        if (alternative) {
          nextVideoStream.getTracks().forEach((track) => track.stop());
          nextVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: alternative.deviceId } }, audio: false });
          nextVideoTrack = nextVideoStream.getVideoTracks()[0];
        }
      }
      if (!nextVideoTrack) throw new Error("No alternate camera was available.");
      const audioTracks = current.getAudioTracks();
      const replacement = new MediaStream([nextVideoTrack, ...audioTracks]);
      streamRef.current = replacement;
      if (liveVideoRef.current) { liveVideoRef.current.srcObject = replacement; await liveVideoRef.current.play(); }
      currentVideoTrack?.stop();
      const reportedFacing = nextVideoTrack.getSettings().facingMode;
      setCameraFacing(reportedFacing === "user" || reportedFacing === "environment" ? reportedFacing : nextFacing);
      await refreshCameraCount();
    } catch {
      setError("The other camera could not be opened. Recording is still running with the current camera.");
    } finally { setSwitchingCamera(false); }
  };
  const startRecorder = async () => {
    setError("");
    const cameraStream = streamRef.current;
    const liveVideo = liveVideoRef.current;
    const canvas = recordingCanvasRef.current;
    if (!cameraStream || !liveVideo || !canvas || typeof MediaRecorder === "undefined") { setError("Open the camera preview before starting the recording."); return; }
    try {
      if (liveVideo.readyState < HTMLMediaElement.HAVE_METADATA) await new Promise<void>((resolve) => liveVideo.addEventListener("loadedmetadata", () => resolve(), { once: true }));
      canvas.width = Math.max(2, liveVideo.videoWidth || 1280);
      canvas.height = Math.max(2, liveVideo.videoHeight || 720);
      const context = canvas.getContext("2d");
      if (!context || typeof canvas.captureStream !== "function") { setError("Continuous camera switching is not supported on this device. You can still choose an authorized recording below."); return; }
      const drawFrame = () => {
        const source = liveVideoRef.current;
        if (source && source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) context.drawImage(source, 0, 0, canvas.width, canvas.height);
        drawFrameRef.current = window.requestAnimationFrame(drawFrame);
      };
      drawFrame();
      const canvasStream = canvas.captureStream(24);
      const recordingStream = new MediaStream([...canvasStream.getVideoTracks(), ...cameraStream.getAudioTracks()]);
      recordingStreamRef.current = recordingStream;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsedSeconds(0); setRecordingDurationSeconds(null); setFile(null); setGalleryVideoId(null); setGallerySaveMessage("");
      const recorder = new MediaRecorder(recordingStream, { videoBitsPerSecond: 160000, audioBitsPerSecond: 32000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const duration = Math.max(0, elapsedRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const recordedFile = new File([blob], `earnova-${Date.now()}.webm`, { type: blob.type });
        setFile(recordedFile);
        setSourceFile(recordedFile);
        setPrivacyBlurApplied(false);
        setPrivacyProgress(0);
        setProcessingMessage("");
        setRecordingDurationSeconds(duration);
        setGallerySaveMessage("Saving this recording to My Videos…");
        void saveGalleryVideo({ profileId, taskId: task.id, taskTitle: task.title, name: `${task.title} — ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date())}`, durationSeconds: duration, mime: recordedFile.type, size: recordedFile.size, blob: recordedFile, privacyProtected: false, publicSharingProhibited: task.publicSharingProhibited }).then((saved) => {
          setGalleryVideoId(saved.id);
          setGallerySaveMessage("Saved in My Videos. Export it from My work when you are ready to free local space.");
        }).catch((cause) => setGallerySaveMessage(cause instanceof Error ? cause.message : "The recording is ready for submission, but could not be added to My Videos."));
      };
      recorder.start(1000);
      timerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        const next = elapsedRef.current + 1;
        elapsedRef.current = next;
        setElapsedSeconds(next);
        if (next >= 3600) stopRecorder();
      }, 1000);
      setRecorderState("recording");
    } catch { stopDrawing(); setError("Recording could not start on this device. You can still choose an authorized recording below."); }
  };
  const togglePause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") { recorder.pause(); setRecorderState("paused"); }
    else if (recorder.state === "paused") { recorder.resume(); setRecorderState("recording"); }
  };
  const readDuration = (element: HTMLMediaElement) => {
    if (Number.isFinite(element.duration)) setRecordingDurationSeconds(element.duration);
  };
  const processVideoCopy = async (selectivePrivacy: boolean) => {
    const input = sourceFile ?? file;
    if (!input || !input.type.startsWith("video/")) { setError("Choose or record a video before processing it."); return; }
    setError(""); setProcessingMessage(""); setProcessingPrivacy(true); setPrivacyProgress(0);
    try {
      const result = await createProcessedVideo(input, { selectivePrivacy, quality: processingQuality, onProgress: setPrivacyProgress });
      setFile(result.file);
      setPrivacyBlurApplied(selectivePrivacy);
      setPrivacyProgress(100);
      if (selectivePrivacy) {
        const subjects = result.detectedKinds.length ? result.detectedKinds.join(", ") : "no high-confidence subjects";
        const engineNote = result.engine === "mask" ? `Blur was composited through feathered subject masks on ${result.maskFrames} frames (built-in mask engine)` : "Blur used the built-in region engine";
        setProcessingMessage(result.usedDetection
          ? `Protected copy ready. ${engineNote}. Selective detection tracked ${subjects}; whole-frame fallback protected ${result.fallbackFrames} frames when confidence was low. This copy was made on-device — SAM 3.1 masks apply only after the Meta AI lab verifies them. Review the full copy before submitting.`
          : "Protected copy ready using whole-frame fallback because on-device detection was unavailable. Review the full copy before submitting.");
      } else {
        setProcessingMessage(`Compressed ${PROCESSING_QUALITY[processingQuality].label.toLowerCase()} copy ready. Review it before submitting.`);
      }
      if (galleryVideoId) {
        try {
          await replaceGalleryVideoCopy(galleryVideoId, result.file, selectivePrivacy);
          setGallerySaveMessage(selectivePrivacy ? "My Videos now holds the protected Privacy Blur copy." : "My Videos now holds the compressed copy.");
        } catch { setGallerySaveMessage("The processed copy is ready to submit, but My Videos could not replace its original local copy."); }
      }
    } catch (cause) {
      setPrivacyBlurApplied(false);
      setError(cause instanceof Error ? cause.message : "Video processing could not finish on this device.");
    } finally { setProcessingPrivacy(false); }
  };
  const handle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); if (!assignment) return;
    if (!file) { setError("Attach a video first — record it above or choose a file in the upload area. Nothing is attached yet in this form."); return; }
    if (recordingDurationSeconds == null) { setError("Please wait for the recording duration to load before submitting."); return; }
    if (recordingDurationSeconds < 60) { setError("This recording is under 1 minute. Please record at least 1 minute and no more than 60 minutes."); return; }
    if (recordingDurationSeconds > 3600) { setError("This recording is over 60 minutes. Please trim or record a version between 1 and 60 minutes."); return; }
    if (privacyBlurEnabled && !privacyBlurApplied) { setError("Apply Privacy Blur and review the protected copy before submitting."); return; }
    if ((task.guardianConsentRequired || minorsPresent) && (!guardianConsentConfirmed || !guardianConsentFile)) { setError("Upload a verifiable parent or legal guardian consent record and confirm it before submitting any recording involving a minor."); return; }
    if (!checklistDuration || !checklistReviewed || !checklistOwnership || (task.publicSharingProhibited && !checklistNoShare)) { setError("Tick every box in the submission checklist before submitting."); return; }
    const fd = new FormData(event.currentTarget);
    const startedAtValue = String(fd.get("startedAt") ?? ""); const endedAtValue = String(fd.get("endedAt") ?? "");
    const notesValue = String(fd.get("notes") ?? "");
    if (notesValue.trim().length < 5) { setError("Add notes (at least 5 characters) describing what you completed."); return; }
    const startedAtMs = Date.parse(startedAtValue); const endedAtMs = Date.parse(endedAtValue);
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs <= startedAtMs) { setError("Task end time must be after the start time."); return; }
    let evidenceBase64: string | null = null; let guardianConsentBase64: string | null = null;
    if (file) { if (file.size > 100 * 1024 * 1024) { setError("This file is still over the 100 MB upload limit. Nothing was dropped or truncated. Choose Compact processing, create a shorter complete 1–60 minute recording, or contact staff for a secure large-file option."); return; } const encoded = await fileToBase64(file); evidenceBase64 = encoded.dataBase64; }
    if (guardianConsentFile) { if (guardianConsentFile.size > 10 * 1024 * 1024) { setError("Guardian consent files are limited to 10 MB."); return; } const encoded = await fileToBase64(guardianConsentFile); guardianConsentBase64 = encoded.dataBase64; }
    submit.mutate({ profileId, assignmentId: assignment.id, notes: String(fd.get("notes") ?? ""), startedAt: String(fd.get("startedAt") ?? ""), endedAt: String(fd.get("endedAt") ?? ""), evidenceName: file?.name ?? null, evidenceMime: file?.type ?? null, evidenceBase64, recordingDurationSeconds: Math.floor(recordingDurationSeconds), privacyBlurEnabled, privacyBlurApplied, minorsPresent: minorsPresent || task.guardianConsentRequired, guardianConsentConfirmed, guardianConsentName: guardianConsentFile?.name ?? null, guardianConsentMime: guardianConsentFile?.type ?? null, guardianConsentBase64 });
  };
  if (!assignment) return <Empty title="No active assignment" text="This task has already been submitted or is not assigned to this profile." />;
  const accept = task.privacyBlurDefault ? "video/*" : "video/*,audio/*";
  const needsGuardianConsent = task.guardianConsentRequired || minorsPresent;
  const missingItems: string[] = [];
  if (!file) missingItems.push("Attach a video — record it above or choose a file in the upload area. Nothing is attached yet in this form.");
  else if (recordingDurationSeconds == null) missingItems.push("Wait for the video length to be measured — the preview is still loading its duration.");
  else if (recordingDurationSeconds < 60) missingItems.push(`Video is too short (${durationLabel(recordingDurationSeconds)} measured) — it must be at least 1 minute. Record or choose a longer video.`);
  else if (recordingDurationSeconds > 3600) missingItems.push(`Video is too long (${durationLabel(recordingDurationSeconds)} measured) — it must be no more than 60 minutes.`);
  if (processingPrivacy) missingItems.push(`Wait for video processing to finish (${privacyProgress}% done).`);
  else if (privacyBlurEnabled && !privacyBlurApplied) missingItems.push(file ? "Apply Privacy Blur — tap 'Apply Privacy Blur to this video' in the Privacy Blur section above and wait for 'Protected copy ready.'" : "Apply Privacy Blur after attaching a video — tap 'Apply Privacy Blur to this video' and wait for 'Protected copy ready.' Typing the start/end times or ticking the 1–60 minute checklist box does not replace this step.");
  if (needsGuardianConsent && !guardianConsentFile) missingItems.push("Upload the guardian consent record in the Consent checkpoint section.");
  if (needsGuardianConsent && guardianConsentFile && !guardianConsentConfirmed) missingItems.push("Tick the guardian consent confirmation box under the uploaded consent record.");
  if (!startedAt) missingItems.push("Enter the 'Task started' date and time.");
  if (!endedAt) missingItems.push("Enter the 'Task ended' date and time.");
  if (startedAt && endedAt && Date.parse(endedAt) <= Date.parse(startedAt)) missingItems.push("Fix the times — 'Task ended' must be after 'Task started.'");
  if (notes.trim().length < 5) missingItems.push("Add notes in 'Notes and required annotations' (at least 5 characters) describing what you completed.");
  if (!checklistDuration) missingItems.push("Tick the checklist box: 'Record 1–60 minutes — I checked that this recording is at least 1 minute and no more than 60 minutes.'");
  if (!checklistReviewed) missingItems.push("Tick the checklist box: 'I reviewed the full recording and the required work is visible.'");
  if (!checklistOwnership) missingItems.push("Tick the checklist box: 'I confirm I own or am authorized to submit this evidence, and I followed the task's consent, safety, and privacy requirements.'");
  if (task.publicSharingProhibited && !checklistNoShare) missingItems.push("Tick the checklist box: 'I will not publicly share, repost, or personally reuse this recording or any exported copy.'");
  const isReadyToSubmit = missingItems.length === 0;
  return <div className="page">{task.projectIsTest && <div className="task-test-warning"><TestFundsLabel /><span>Founder test flow · approval creates sandbox ledger credit with no monetary value.</span></div>}<div className="page-heading"><span className="eyebrow">Private evidence</span><h1>{task.title}</h1><p>Review your recording before sending it. Flagged files go to a human reviewer; they are not treated as fraud automatically.</p></div><section className="duration-rule recording-rule"><span>Required for every task</span><strong>Record 1–60 minutes</strong><div className="duration-track" aria-hidden="true"><i /><b>1 min minimum</b><b>60 min maximum</b></div><p>Recordings shorter than 1 minute or longer than 60 minutes cannot be submitted and never count as payable time.</p></section><form className="submission-form" onSubmit={(e) => void handle(e)}><section className="recorder-panel"><div className="recorder-head"><div><span className="eyebrow">In-app recorder</span><h2>Recording clock</h2></div><strong className={elapsedSeconds >= 60 && elapsedSeconds <= 3600 ? "valid-time" : ""}>{durationLabel(elapsedSeconds)}</strong></div><div className="timer-scale"><span>00:00</span><span className={elapsedSeconds >= 60 ? "reached" : ""}>01:00 minimum</span><span>60:00 maximum</span></div>{cameraReady && <div className="camera-preview-wrap"><video ref={liveVideoRef} className={`preview live-preview ${cameraFacing === "user" ? "selfie-preview" : ""}`} autoPlay muted playsInline />{cameraDeviceCount > 1 && <button type="button" className="flip-camera-button" aria-label={`Switch to ${cameraFacing === "user" ? "rear" : "front"} camera`} disabled={switchingCamera} onClick={() => void flipCamera()}><FlipCameraIcon /><span>{switchingCamera ? "Switching…" : "Flip camera"}</span></button>}<span className="camera-facing-label">{cameraFacing === "user" ? "Front camera" : "Rear camera"}</span></div>}<canvas ref={recordingCanvasRef} className="recording-canvas" aria-hidden="true" /><div className="recorder-actions">{recorderState === "idle" ? cameraReady ? <><button type="button" className="secondary" onClick={closeCamera}>Close preview</button><button type="button" className="primary" onClick={() => void startRecorder()}>Start recording</button></> : <button type="button" className="primary" onClick={() => void openCamera()}>Open camera preview</button> : <><button type="button" className="secondary" onClick={togglePause}>{recorderState === "paused" ? "Resume" : "Pause"}</button><button type="button" className="primary" onClick={stopRecorder}>Stop & use recording</button></>}</div><p>{cameraReady && cameraDeviceCount < 2 ? "Only one camera is available on this device. " : ""}Set up safely before recording. You can flip cameras without stopping the session, and the clock stops automatically at 60 minutes.</p></section>{gallerySaveMessage && <p className="notice" role="status">{gallerySaveMessage}</p>}<div className="privacy-callout"><strong>Before recording</strong><ul><li>Keep bystanders and children out unless the task explicitly allows them and consent is documented.</li><li>Remove passwords, financial records, addresses, and private conversations from view.</li><li>Submit only media you have the right to record and license.</li></ul></div><section className="compression-panel"><div><span className="eyebrow">Upload size & quality</span><h2>Processing quality</h2><p>Choose a smaller copy for long recordings. Earnova never silently cuts or drops any part of your recording.</p></div><div className="quality-options" role="radiogroup" aria-label="Video processing quality">{(Object.keys(PROCESSING_QUALITY) as ProcessingQuality[]).map((quality) => <label key={quality} className={processingQuality === quality ? "selected" : ""}><input type="radio" name="processingQuality" value={quality} checked={processingQuality === quality} onChange={() => { setProcessingQuality(quality); setPrivacyBlurApplied(false); setProcessingMessage(""); }} /><strong>{PROCESSING_QUALITY[quality].label}</strong><span>{PROCESSING_QUALITY[quality].detail}</span></label>)}</div>{file && !privacyBlurEnabled && file.type.startsWith("video/") && <button type="button" className="secondary" disabled={processingPrivacy} onClick={() => void processVideoCopy(false)}>{processingPrivacy ? `Compressing complete recording… ${privacyProgress}%` : "Create compressed upload copy"}</button>}<p className="fine">Size estimates vary by motion, browser, and device. If the finished file is still over 100 MB, choose Compact, make a shorter complete 1–60 minute recording, or contact staff for a secure large-file option. Your file is never truncated automatically.</p></section><section className="privacy-blur-panel"><div className="privacy-blur-head"><div><span className="eyebrow">Automated privacy processing</span><h2>Privacy Blur</h2></div><label className="privacy-toggle"><input type="checkbox" checked={privacyBlurEnabled} disabled={task.privacyBlurDefault} onChange={(event) => { setPrivacyBlurEnabled(event.target.checked); setPrivacyBlurApplied(false); setPrivacyProgress(0); }} /><span>{privacyBlurEnabled ? "On" : "Off"}</span></label></div><p>When enabled, on-device detection tracks faces, people, and common pets across frames and composites blur through feathered masks shaped to each subject. If detection is unavailable or confidence drops, the whole frame is blurred automatically. This built-in mask engine is best-effort, not a guarantee; consent, safe recording, and human review still apply. <strong>SAM 3.1 status:</strong> Meta&apos;s segmentation model is being integrated in the Meta AI lab (founder key + live verification first) — video submissions keep using this built-in engine until SAM masks are verified end-to-end, and the app will never label built-in output as SAM output.</p>{task.privacyBlurDefault && <div className="blur-required"><strong>Required for this task</strong><span>Privacy Blur starts ON and cannot be turned off for protected childcare or caregiving submissions. The protected processed copy—not the original—is submitted.</span></div>}{file && privacyBlurEnabled && <button type="button" className="secondary" disabled={processingPrivacy || privacyBlurApplied || !file.type.startsWith("video/")} onClick={() => void processVideoCopy(true)}>{processingPrivacy ? `Processing protected copy… ${privacyProgress}%` : privacyBlurApplied ? "Protected copy ready" : "Apply Privacy Blur to this video"}</button>}{processingMessage && <p className="blur-complete" role="status"><strong>{privacyBlurApplied ? "Protected copy ready." : "Processed copy ready."}</strong> {processingMessage}</p>}</section>{(task.guardianConsentRequired || task.category === "Caregiving") && <section className="consent-panel"><span className="eyebrow">Consent checkpoint</span><h2>People in this recording</h2>{!task.guardianConsentRequired && <label className="check"><input type="checkbox" checked={minorsPresent} onChange={(event) => { setMinorsPresent(event.target.checked); if (!event.target.checked) { setGuardianConsentFile(null); setGuardianConsentConfirmed(false); } }} /><span>A minor appears or may be identifiable in this recording.</span></label>}{(task.guardianConsentRequired || minorsPresent) && <><p>Never submit a recording of a child without verifiable consent from a parent or legal guardian. Upload the signed or otherwise verifiable consent record before submission.</p><label className="consent-upload">Guardian consent record<input aria-label="Upload guardian consent record" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(event) => { setGuardianConsentFile(event.target.files?.[0] ?? null); setGuardianConsentConfirmed(false); }} /><small>PDF, JPEG, PNG, or WebP · up to 10 MB · private reviewer access only</small></label>{guardianConsentFile && <label className="check"><input type="checkbox" checked={guardianConsentConfirmed} required onChange={(event) => setGuardianConsentConfirmed(event.target.checked)} /><span>I confirm this record is current, authentic, and signed or approved by the child&apos;s parent or legal guardian for this recording and submission.</span></label>}</>}</section>}<label className="upload-zone">{file ? <><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB · ready to preview</span></> : <><strong>Choose or record video/audio</strong><span>Every task requires a 1–60 minute recording · 100 MB testing limit</span></>}<input aria-label="Choose video or audio recording" type="file" accept={accept} capture="environment" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); setSourceFile(next); setGalleryVideoId(null); setGallerySaveMessage(""); setPrivacyBlurApplied(false); setPrivacyProgress(0); setProcessingMessage(""); setRecordingDurationSeconds(null); }} /></label>{file && (file.type.startsWith("video/") || file.type.startsWith("audio/")) && <EvidencePreview file={file} onDuration={readDuration} />}{recordingDurationSeconds != null && <div className={`duration-result ${recordingDurationSeconds >= 60 && recordingDurationSeconds <= 3600 ? "valid" : "invalid"}`} role="status"><strong>{durationLabel(recordingDurationSeconds)}</strong><span>{recordingDurationSeconds < 60 ? "Too short — record at least 1 minute." : recordingDurationSeconds > 3600 ? "Too long — maximum is 60 minutes." : "Duration is within the required 1–60 minute range."}</span></div>}<div className="form-grid"><label>Task started<input name="startedAt" type="datetime-local" required value={startedAt} onChange={(event) => setStartedAt(event.target.value)} /></label><label>Task ended<input name="endedAt" type="datetime-local" required value={endedAt} onChange={(event) => setEndedAt(event.target.value)} /></label></div><label>Notes and required annotations<textarea name="notes" minLength={5} maxLength={2000} required placeholder="Describe what you completed and note any approved variations." value={notes} onChange={(event) => setNotes(event.target.value)} /></label><section className="submission-checklist"><h2>Submission checklist</h2><label className="check"><input type="checkbox" required checked={checklistDuration} onChange={(event) => setChecklistDuration(event.target.checked)} /><span><strong>Record 1–60 minutes.</strong> I checked that this recording is at least 1 minute and no more than 60 minutes.</span></label><label className="check"><input type="checkbox" required checked={checklistReviewed} onChange={(event) => setChecklistReviewed(event.target.checked)} /><span>I reviewed the full recording and the required work is visible.</span></label><label className="check"><input type="checkbox" required checked={checklistOwnership} onChange={(event) => setChecklistOwnership(event.target.checked)} /><span>I confirm I own or am authorized to submit this evidence, and I followed the task&apos;s consent, safety, and privacy requirements.</span></label>{task.publicSharingProhibited && <label className="check"><input type="checkbox" required checked={checklistNoShare} onChange={(event) => setChecklistNoShare(event.target.checked)} /><span>I will not publicly share, repost, or personally reuse this recording or any exported copy.</span></label>}</section>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={submit.isPending || !isReadyToSubmit}>{submit.isPending ? "Uploading securely…" : "Submit for human review"}</button>{missingItems.length > 0 ? <div className="submit-gate" role="status" aria-live="polite"><strong>Still needed before you can submit</strong><ul>{missingItems.map((item) => <li key={item}>{item}</li>)}</ul></div> : <div className="submit-ready" role="status" aria-live="polite"><strong>Ready to submit</strong><span>Video length, Privacy Blur, times, notes, and checklist all check out. Tap &lsquo;Submit for human review&rsquo; above.</span></div>}<p className="fine">A received submission has no withdrawable value until a reviewer approves payable work.</p></form></div>;
}

function Money({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  type Provider = AppState["payoutMethods"][number]["provider"];
  const providers: Array<{ id: Provider; name: string }> = [
    { id: "paypal", name: "PayPal" },
    { id: "venmo", name: "Venmo" },
    { id: "cash_app", name: "Cash App" },
    { id: "whop", name: "Whop" },
  ];
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<Provider>("paypal");
  const [accountLabel, setAccountLabel] = useState("");
  const [message, setMessage] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_PAGE_SIZE = 12;
  const ledgerPages = Math.max(1, Math.ceil(data.ledger.length / LEDGER_PAGE_SIZE));
  const currentLedgerPage = Math.min(ledgerPage, ledgerPages);
  const visibleLedger = data.ledger.slice((currentLedgerPage - 1) * LEDGER_PAGE_SIZE, currentLedgerPage * LEDGER_PAGE_SIZE);
  const profileId = data.profile?.id ?? 0;
  const selectedMethod = data.payoutMethods.find((method) => method.isSelected && method.status === "test_verified");
  const changed = (text: string) => { setMessage(text); onChanged(); };
  const add = useMutation({ mutationFn: api.addPayoutMethod, onSuccess: () => { setAccountLabel(""); changed("Sandbox payout method saved. Test verification is still required."); }, onError: (e) => setMessage(String(e)) });
  const verify = useMutation({ mutationFn: api.verifyPayoutMethod, onSuccess: () => changed("Method verified for SANDBOX / TEST MODE only. No provider account was contacted."), onError: (e) => setMessage(String(e)) });
  const select = useMutation({ mutationFn: api.selectPayoutMethod, onSuccess: () => changed("Sandbox payout route selected."), onError: (e) => setMessage(String(e)) });
  const remove = useMutation({ mutationFn: api.removePayoutMethod, onSuccess: () => changed("Sandbox payout method removed."), onError: (e) => setMessage(String(e)) });
  const withdraw = useMutation({ mutationFn: api.requestWithdrawal, onSuccess: (r) => { setMessage(`${r.withdrawalId} requested in SANDBOX / TEST MODE. No real money moved.`); setAmount(""); onChanged(); }, onError: (e) => setMessage(String(e)) });
  const saveMethod = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); add.mutate({ profileId, provider, accountLabel }); };
  return <div className="page">
    {data.project?.isTest && <div className="task-test-warning"><TestFundsLabel /><span>All balances, ledger credits, payout methods, and withdrawals are sandbox values with no monetary value.</span></div>}
    <div className="page-heading"><span className="eyebrow">Transparent ledger</span><h1>Earnings</h1><p>{data.project?.isTest ? "Use this page to test approvals and withdrawal states. No real funds can be withdrawn." : "Only the available balance can be requested. Pending review never appears as withdrawable money."}</p></div>
    <section className="money-stack"><div className="available-panel"><small>Available balance</small><strong>{money(data.metrics.availableCents)}</strong><span>Approved and not already requested</span></div><div><small>Pending</small><strong>{money(data.metrics.pendingCents)}</strong><span>Not withdrawable</span></div><div><small>Referral rewards</small><strong>{money(data.metrics.referralCents)}</strong><span>Verified activity only</span></div></section>
    <section className="payout-center">
      <div className="section-title"><div><span className="eyebrow">SANDBOX / TEST MODE</span><h2>Payout methods</h2></div><Status value="sandbox" /></div>
      <p className="payout-warning"><strong>No real money moves.</strong> Test verification checks this app flow only. Never enter a payment-app password, bank login, API key, or other credential.</p>
      <form className="payout-add" onSubmit={saveMethod}><label>Provider<select aria-label="Sandbox payout provider" value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.name} — sandbox</option>)}</select></label><label>Sandbox account label<input aria-label="Sandbox account label" value={accountLabel} onChange={(event) => setAccountLabel(event.target.value)} required minLength={2} maxLength={80} placeholder="Testing nickname only" /></label><button className="secondary" disabled={add.isPending || !accountLabel.trim()}>{add.isPending ? "Saving…" : "Add or update test method"}</button></form>
      <div className="payout-methods">{providers.map((item) => { const method = data.payoutMethods.find((row) => row.provider === item.id); return <article key={item.id} className={method?.isSelected ? "selected" : ""}><div className="payout-method-head"><div><strong>{item.name}</strong><span>SANDBOX / TEST MODE</span></div><Status value={method?.status ?? "not_added"} /></div>{method ? <p>Test label: <b>{method.accountLabel}</b></p> : <p>No sandbox method added.</p>}<small>Production setup: not connected. Requires the founder&apos;s own API credentials, provider business approval, and account onboarding.</small>{method && <div className="method-actions">{method.status === "unverified" ? <button className="secondary" disabled={verify.isPending} onClick={() => verify.mutate({ profileId, payoutMethodId: method.id })}>Verify in test mode</button> : <button className="secondary" disabled={select.isPending || method.isSelected} onClick={() => select.mutate({ profileId, payoutMethodId: method.id })}>{method.isSelected ? "Selected for testing" : "Select for withdrawal"}</button>}<button className="text-button danger-text" disabled={remove.isPending} onClick={() => remove.mutate({ profileId, payoutMethodId: method.id })}>Remove</button></div>}</article>; })}</div>
    </section>
    <section className="withdraw-panel"><div className="section-title"><div><span className="eyebrow">SANDBOX / TEST MODE</span><h2>Request test withdrawal</h2></div><Status value="sandbox" /></div><label>Amount in USD test funds<input aria-label="Withdrawal amount in USD test funds" type="number" min="10" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10.00" /></label><label>Selected payout route<input readOnly value={selectedMethod ? `${providers.find((item) => item.id === selectedMethod.provider)?.name ?? selectedMethod.provider} — SANDBOX / TEST MODE` : "Verify and select a test method above"} /></label><button className="primary" disabled={withdraw.isPending || !selectedMethod || !amount || Number(amount) < 10 || Number(amount) * 100 > data.metrics.availableCents} onClick={() => selectedMethod && withdraw.mutate({ profileId, amountCents: Math.round(Number(amount) * 100), payoutMethodId: selectedMethod.id })}>{withdraw.isPending ? "Requesting…" : "Request test withdrawal"}</button><p className="fine">This creates a pending sandbox record only. No provider is contacted and no transfer is marked completed. Production payouts require approved integrations, secure credentials, verified payout accounts, signed webhooks, reconciliation, and idempotency controls.</p>{message && <p className="notice">{message}</p>}</section>
    <section><h2>Transaction ledger</h2>{data.ledger.length ? <><div className="ledger">{visibleLedger.map((e) => <article key={e.id}><div><Status value={e.status} /><strong>{e.kind === "partner_share" ? "Partner revenue share" : e.kind.replaceAll("_", " ")}</strong><p>{e.calculation}</p><small>{e.transactionId} · {when(e.createdAt)}</small></div><b>{e.amountCents >= 0 ? "+" : ""}{money(e.amountCents)}</b></article>)}</div>{ledgerPages > 1 && <div className="pagination"><button className="secondary" disabled={currentLedgerPage === 1} onClick={() => setLedgerPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {currentLedgerPage} of {ledgerPages} · {data.ledger.length} entries</span><button className="secondary" disabled={currentLedgerPage === ledgerPages} onClick={() => setLedgerPage((value) => Math.min(ledgerPages, value + 1))}>Next</button></div>}</> : <Empty title="No earnings entries" text="Approved submissions, verified referral rewards, adjustments, reversals, and partner shares will form a complete audit trail here." />}</section>
  </div>;
}

function More({ data, theme, setTheme, navigate, onChanged }: { data: AppState; theme: "system" | "light" | "dark"; setTheme: (v: "system" | "light" | "dark") => void; navigate: (s: Screen) => void; onChanged: () => void }) {
  const markRead = useMutation({ mutationFn: () => api.markNotificationsRead({ profileId: data.profile?.id ?? 0 }), onSuccess: onChanged });
  return <div className="page"><div className="profile-banner"><span className="avatar large">{data.profile?.displayName.slice(0, 1).toUpperCase()}</span><div><h1>{data.profile?.displayName}</h1><p>{data.profile?.email}</p><span>{data.profile?.accountType} · {data.profile?.country}</span>{data.training?.status === "completed" && <strong className="training-badge">Training Complete</strong>}</div></div><section><div className="section-title"><div><span className="eyebrow">Inbox</span><h2>Notifications</h2></div>{data.metrics.unreadNotifications > 0 && <button onClick={() => markRead.mutate()}>Mark read</button>}</div>{data.notifications.length ? <div className="notifications">{data.notifications.slice(0, 4).map((n) => <article key={n.id} className={n.read ? "" : "unread"}><span /><div><strong>{n.title}</strong><p>{n.body}</p><small>{when(n.createdAt)}</small><NovaVoice src={novaNotificationAudio} label={`Nova alert: ${n.title}`} compact /></div></article>)}</div> : <p className="muted">No notifications.</p>}</section><section className="menu-section"><h2>Account & programs</h2><button onClick={() => navigate("partner")}><span>Workplace Partner Program</span><small>Hotels, healthcare, childcare, cleaning companies & more</small></button><button onClick={() => navigate("business")}><span>Business Management</span><small>Invite and manage unlimited employees</small></button><button onClick={() => navigate("support")}><span>Help, disputes & support</span><small>Open a tracked support ticket</small></button><button onClick={() => navigate("tester-feedback")}><span>Tester Feedback</span><small>Email feedback to the Earnova team</small></button><button onClick={() => navigate("legal")}><span>Terms, privacy & consent</span><small>Draft policies and data-use controls</small></button>{data.viewerAccess.isFounder && <button onClick={() => navigate("launch")}><span>Launch roadmap</span><small>The real-launch checklist — kickoff started Oct 22</small></button>}{data.viewerAccess.isFounder && <button onClick={() => navigate("meta-ai")}><span>Meta AI · SAM 3.1 Lab</span><small>{data.metaIntegration.configured ? `Key saved · last test: ${data.metaIntegration.lastTestStatus ?? "not tested"}` : "No API key yet — built-in blur remains active"}</small></button>}</section><section className="referral-panel"><span className="eyebrow">Single-level rewards</span><h2>Your referral code</h2><strong>{data.profile?.referralCode}</strong><p>Proposed reward: $2 per approved qualifying hour, subject to eligibility, program budget, and anti-abuse review. Signups alone do not earn money.</p><button onClick={() => data.profile && void navigator.clipboard.writeText(data.profile.referralCode)}>Copy code</button></section><section className="appearance"><h2>Appearance</h2><div className="theme-switch">{(["system", "light", "dark"] as const).map((v) => <button key={v} className={theme === v ? "active" : ""} onClick={() => setTheme(v)}>{v}</button>)}</div></section>{data.viewerAccess.isFounder && <section className="founder-console"><div className="section-title"><div><span className="eyebrow">Private build tools</span><h2>Founder console</h2></div><Status value="test_mode" /></div><div className="admin-metrics"><span><b>{data.admin.totalProfiles}</b> profiles</span><span><b>{data.admin.publishedTasks}</b> live tasks</span><span><b>{data.admin.reviewQueue}</b> to review</span><span><b>{money(data.admin.totalLiabilityCents)}</b> liability</span><span><b>{data.admin.pendingCommercialInquiries}</b> inquiries</span></div><div className="button-row"><button className="primary" onClick={() => navigate("admin-create")}>Create funded task</button><button className="secondary" onClick={() => navigate("admin-review")}>Review submissions</button></div><button className="support-admin-link" onClick={() => navigate("admin-commercial")}>Partner & Investor Inquiries · {data.admin.pendingCommercialInquiries} pending</button><button className="support-admin-link" onClick={() => navigate("partner")}>Workplace Partnerships · {data.partnershipRequests.filter((request) => request.status === "pending").length} pending</button><button className="support-admin-link" onClick={() => navigate("launch")}>Launch roadmap · {data.launchItems.filter((item) => item.status === "done").length} of {data.launchItems.length} done</button><button className="support-admin-link" onClick={() => navigate("meta-ai")}>SAM 3.1 Lab · {data.metaIntegration.configured ? `key saved · ${data.metaIntegration.lastTestStatus ?? "untested"}` : "no API key yet"}</button><button className="support-admin-link" onClick={() => navigate("admin-support")}>Open staff support queue · {data.admin.openTickets} open</button><p className="fine">This console relies on the Muse artifact's private access in testing. Production launch still needs dedicated identity, role-based access, MFA, email verification, and recovery providers.</p></section>}<section className="integration-list"><h2>Launch readiness</h2>{([["Identity verification","Provider not configured"],["Email notifications","Provider not configured"],["Bank and PayPal payouts","Sandbox only"],["Cash App and Venmo","Approved API required"],["Automated video quality checks","Duplicate checksum active; media analysis pending"],["Legal and tax workflows","Professional review required"]] as const).map(([a,b]) => <div key={a}><span>{a}</span><Status value={b.toLowerCase().replaceAll(" ", "_")} /></div>)}<div><span>SAM 3.1 privacy segmentation</span><Status value={data.metaIntegration.lastTestStatus === "connected" ? "connected" : data.metaIntegration.configured ? "key_saved_untested" : "not_configured"} /></div></section></div>;
}

function AdminCreate({ onDone }: { onDone: () => void }) {
  const [message, setMessage] = useState(""); const [createdId, setCreatedId] = useState<number | null>(null);
  const create = useMutation({ mutationFn: api.createTask, onSuccess: (r) => { setCreatedId(r.id); setMessage("Draft saved. Review it before publishing."); }, onError: (e) => setMessage(String(e)) });
  const publish = useMutation({ mutationFn: (id: number) => api.setTaskStatus({ taskId: id, status: "published" }), onSuccess: onDone, onError: (e) => setMessage(String(e)) });
  const handle = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ ownerName: String(f.get("ownerName")), title: String(f.get("title")), category: String(f.get("category")), description: String(f.get("description")), instructions: String(f.get("instructions")), reviewCriteria: String(f.get("reviewCriteria")), compensationType: String(f.get("compensationType")) as "hourly" | "fixed", rateCents: Math.round(Number(f.get("rate")) * 100), maxMinutes: Number(f.get("maxMinutes")), budgetCents: Math.round(Number(f.get("budget")) * 100), expectedReviewDays: Number(f.get("reviewDays")), evidenceType: String(f.get("evidenceType")) as "video" | "audio" | "photo" | "text", cameraRequirements: String(f.get("cameraRequirements")), safetyRequirements: String(f.get("safetyRequirements")), privacyRequirements: String(f.get("privacyRequirements")) }); };
  return <div className="page"><div className="page-heading"><span className="eyebrow">Founder console</span><h1>Create a funded task</h1><p>A task stays in draft until you deliberately publish it. Do not enter a client name or budget you cannot verify.</p></div><form className="admin-form" onSubmit={handle}><div className="form-grid"><label>Legitimate project owner<input name="ownerName" required minLength={2} /></label><label>Task title<input name="title" required minLength={4} /></label><label>Category<select name="category">{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label>Required evidence<input name="evidenceType" value="video" readOnly /><small>Every task requires a 1–60 minute video or audio recording. Photos or text may be requested only as supplementary evidence.</small></label><label>Compensation model<select name="compensationType"><option value="hourly">Hourly</option><option value="fixed">Fixed deliverable</option></select></label><label>Rate / payment (USD)<input name="rate" type="number" min="1" step="0.01" defaultValue="10" required /></label><label>Maximum payable minutes<input name="maxMinutes" type="number" min="1" max="60" defaultValue="60" required /></label><label>Funded budget (USD)<input name="budget" type="number" min="1" step="0.01" required /></label><label>Review window in days<input name="reviewDays" type="number" min="1" max="30" defaultValue="5" required /></label></div><label>Short description<textarea name="description" minLength={10} required /></label><label>Step-by-step deliverables<textarea name="instructions" minLength={10} required /></label><label>Review criteria<textarea name="reviewCriteria" minLength={10} required placeholder="Explain what must be visible and complete for approval." /></label><label>Camera or capture requirements<textarea name="cameraRequirements" /></label><label>Safety requirements<textarea name="safetyRequirements" minLength={5} required /></label><label>Privacy restrictions<textarea name="privacyRequirements" minLength={5} required /></label><button className="primary" disabled={create.isPending || createdId !== null}>{create.isPending ? "Saving…" : "Save as draft"}</button>{message && <p className="notice">{message}</p>}{createdId && <div className="publish-check"><p><strong>Ready to publish?</strong> Confirm the owner, deliverable, approved budget, compensation, safety, and privacy terms above are real.</p><div className="button-row"><button type="button" className="secondary" onClick={onDone}>Keep draft</button><button type="button" className="primary" disabled={publish.isPending} onClick={() => publish.mutate(createdId)}>{publish.isPending ? "Publishing…" : "Publish funded task"}</button></div></div>}</form></div>;
}

const REVIEW_MUTED_KEY = "earnova-review-muted";
const REVIEW_VOLUME_KEY = "earnova-review-volume";

function ReviewEvidencePlayer({ submissionId, evidenceName }: { submissionId: number; evidenceName: string | null }) {
  const evidence = useQuery({
    queryKey: ["submission-evidence", submissionId],
    queryFn: () => api.getSubmissionEvidenceUrl({ submissionId }),
    enabled: Boolean(evidenceName),
  });
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [muted, setMuted] = useState(() => {
    try { return window.sessionStorage.getItem(REVIEW_MUTED_KEY) === "true"; } catch { return false; }
  });
  const [volume, setVolume] = useState(() => {
    try {
      const stored = window.sessionStorage.getItem(REVIEW_VOLUME_KEY);
      if (stored === null) return 0.8;
      const saved = Number(stored);
      return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.8;
    } catch { return 0.8; }
  });
  useEffect(() => {
    try { window.sessionStorage.setItem(REVIEW_MUTED_KEY, String(muted)); } catch { /* Session storage may be unavailable in hardened browsers. */ }
    if (mediaRef.current) mediaRef.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    try { window.sessionStorage.setItem(REVIEW_VOLUME_KEY, String(volume)); } catch { /* Keep the in-memory setting for this view. */ }
    if (mediaRef.current) mediaRef.current.volume = volume;
  }, [volume]);
  const attachMedia = (node: HTMLMediaElement | null) => {
    mediaRef.current = node;
    if (node) { node.muted = muted; node.volume = volume; }
  };
  if (!evidenceName) return <div className="review-media-empty"><strong>No media file attached</strong><span>This submission has text evidence only.</span></div>;
  if (evidence.isPending) return <div className="review-media-empty" role="status"><strong>Loading private evidence…</strong><span>{evidenceName}</span></div>;
  if (evidence.error || !evidence.data) return <div className="review-media-empty" role="alert"><strong>Evidence could not be loaded</strong><span>{String(evidence.error ?? "The private media link is unavailable.")}</span><button className="secondary" onClick={() => void evidence.refetch()}>Try loading again</button></div>;
  const isVideo = evidence.data.mime.startsWith("video/");
  const isAudio = evidence.data.mime.startsWith("audio/");
  return <section className="review-media" aria-label="Submission media review player">
    <div className="review-media-head"><div><span className="eyebrow">Private submission media</span><h3>{evidence.data.name}</h3></div><span>{isVideo ? "Video" : isAudio ? "Audio" : "File"}</span></div>
    {isVideo ? <video ref={attachMedia} controls playsInline muted={muted} src={evidence.data.url} /> : isAudio ? <audio ref={attachMedia} controls muted={muted} src={evidence.data.url} /> : <div className="review-media-empty"><strong>Preview unavailable</strong><span>This file type cannot be played in the review player.</span></div>}
    {(isVideo || isAudio) && <div className="review-audio-controls">
      <button type="button" className={muted ? "muted" : ""} aria-pressed={muted} aria-label={muted ? "Unmute submission audio" : "Mute submission audio"} onClick={() => setMuted((value) => !value)}><span aria-hidden="true">{muted ? "×" : "♪"}</span>{muted ? "Unmute audio" : "Mute audio"}</button>
      <label><span>Submission volume</span><input aria-label="Submission audio volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (next > 0 && muted) setMuted(false); }} /><output>{Math.round(volume * 100)}%</output></label>
      <p>{muted ? "Submission audio is muted. Audio from other apps can keep playing." : "Submission audio is on."} Your mute choice is remembered for this review session.</p>
    </div>}
  </section>;
}

function AdminReview({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const queue = data.submissions.filter((s) => s.status === "awaiting_review"); const [selected, setSelected] = useState<number | null>(queue[0]?.id ?? null); const current = queue.find((s) => s.id === selected) ?? queue[0]; const [feedback, setFeedback] = useState(""); const [minutes, setMinutes] = useState(0); const [message, setMessage] = useState("");
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const review = useMutation({ mutationFn: api.reviewSubmission, onSuccess: (r) => { setMessage(`${r.status}; ${money(r.payableCents)} recorded.`); setFeedback(""); void onChanged(); }, onError: (e) => setMessage(String(e)) });
  const loadConsent = useMutation({ mutationFn: api.getGuardianConsentUrl, onSuccess: (result) => { setConsentUrl(result.url); setMessage("Consent record is ready for reviewer inspection."); }, onError: (e) => setMessage(String(e)) });
  if (!current) return <div className="page"><div className="page-heading"><span className="eyebrow">Human review</span><h1>Submission queue</h1></div><Empty title="Queue is clear" text="New submissions will stay here until a reviewer records a decision and explanation." /></div>;
  return <div className="page"><div className="page-heading"><span className="eyebrow">Human review</span><h1>Submission queue</h1><p>Automated checks may flag work, but only a reviewer can approve payable minutes or reject with an explanation.</p></div><label className="select-label">Submission<select value={current.id} onChange={(e) => { setSelected(Number(e.target.value)); setConsentUrl(null); }}>{queue.map((s) => <option key={s.id} value={s.id}>{s.taskTitle} · #{s.id}</option>)}</select></label><section className="review-sheet"><Status value={current.status} /><h2>{current.taskTitle}</h2><p>{current.notes}</p><dl><div><dt>Submitted</dt><dd>{when(current.submittedAt)}</dd></div><div><dt>Evidence</dt><dd>{current.evidenceName ?? "Text response"}</dd></div><div><dt>Recording duration</dt><dd>{current.recordingDurationSeconds == null ? "Not available" : durationLabel(current.recordingDurationSeconds)}</dd></div><div><dt>Privacy Blur</dt><dd>{current.privacyBlurEnabled ? (current.privacyBlurApplied ? "Applied to stored copy" : "Enabled but not verified") : "Not enabled"}</dd></div>{current.minorsPresent && <div><dt>Guardian consent</dt><dd>{current.guardianConsentConfirmed && current.guardianConsentName ? `Recorded · ${current.guardianConsentName}` : "MISSING — do not approve"}</dd></div>}{current.publicSharingProhibited && <div><dt>Sharing restriction</dt><dd>No public sharing, reposting, or personal reuse</dd></div>}</dl><ReviewEvidencePlayer submissionId={current.id} evidenceName={current.evidenceName} />{current.guardianConsentName && <div className="consent-review-actions"><button className="secondary" disabled={loadConsent.isPending} onClick={() => loadConsent.mutate({ submissionId: current.id })}>{loadConsent.isPending ? "Preparing record…" : "Load guardian consent record"}</button>{consentUrl && <a href={consentUrl} target="_blank" rel="noreferrer">Open consent record for verification</a>}</div>}{current.recordingDurationSeconds != null && (current.recordingDurationSeconds < 60 || current.recordingDurationSeconds > 3600) && <p className="form-error">This recording is outside the required 1–60 minute range. It cannot receive payable time; flag or reject it with a clear explanation.</p>}<label>Approved payable minutes (1–60)<input type="number" min="1" max="60" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label><label>Decision explanation<textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} minLength={3} required /></label><div className="review-actions"><button disabled={!feedback || review.isPending} onClick={() => review.mutate({ submissionId: current.id, decision: "flagged", approvedMinutes: 0, feedback })}>Flag for review</button><button disabled={!feedback || review.isPending} className="danger" onClick={() => review.mutate({ submissionId: current.id, decision: "rejected", approvedMinutes: 0, feedback })}>Reject</button><button disabled={!feedback || review.isPending || minutes < 1 || minutes > 60 || current.recordingDurationSeconds == null || current.recordingDurationSeconds < 60 || current.recordingDurationSeconds > 3600} className="primary" onClick={() => review.mutate({ submissionId: current.id, decision: "approved", approvedMinutes: minutes, feedback })}>Approve payable work</button></div>{message && <p className="notice">{message}</p>}</section></div>;
}

function Business({ profileId, data, onChanged }: { profileId: number; data: AppState; onChanged: () => void }) {
  const PAGE_SIZE = 12;
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(data.teamMembers[0]?.id ?? null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(data.tasks.find((task) => task.status === "published")?.id ?? null);
  const [businessRate, setBusinessRate] = useState(String((data.business?.businessRateCents ?? 2000) / 100));
  const [partnerSharePercent, setPartnerSharePercent] = useState(String((data.business?.partnerShareBps ?? 1000) / 100));
  const invite = useMutation({ mutationFn: api.addTeamMember, onSuccess: () => { setMessage("Invitation recorded. Your unlimited team has room for every employee you need. Email delivery requires a configured provider."); onChanged(); }, onError: (e) => setMessage(String(e)) });
  const assign = useMutation({ mutationFn: api.assignTaskToTeamMember, onSuccess: (result) => { setMessage(`Task assigned to ${result.assigneeEmail}.`); onChanged(); }, onError: (e) => setMessage(String(e)) });
  const configure = useMutation({ mutationFn: api.updateBusinessCompensation, onSuccess: (result) => { setMessage(`Business team rate saved at ${money(result.businessRateCents)}/hour with a ${(result.partnerShareBps / 100).toFixed(2)}% partner share.`); onChanged(); }, onError: (e) => setMessage(String(e)) });
  const filteredMembers = data.teamMembers.filter((member) => `${member.name} ${member.email} ${member.role} ${member.status}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalEarnings = data.teamMembers.reduce((sum, member) => sum + member.earningsCents, 0);
  const partnerShareEarnings = data.ledger.filter((entry) => entry.kind === "partner_share" && entry.status !== "reversed").reduce((sum, entry) => sum + entry.amountCents, 0);
  const totalMinutes = data.teamMembers.reduce((sum, member) => sum + member.approvedMinutes, 0);
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); invite.mutate({ profileId, businessName: String(f.get("businessName")), memberName: String(f.get("memberName")), memberEmail: String(f.get("memberEmail")), role: String(f.get("role")) as "member" | "manager" }); e.currentTarget.reset(); };
  const exportCsv = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows: Array<Array<string | number>> = [["Employee", "Email", "Permission", "Status", "Approved tasks", "Approved minutes", "Employee earnings", "Ledger entries"], ...data.teamMembers.map((member) => [member.name, member.email, member.role, member.status, member.completedTasks, member.approvedMinutes, (member.earningsCents / 100).toFixed(2), member.ledgerEntryCount]), ["BUSINESS PARTNER SHARE", "", "", "", "", "", (partnerShareEarnings / 100).toFixed(2), data.ledger.filter((entry) => entry.kind === "partner_share").length]];
    const blob = new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "earnova-team-report.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="page business-page">
    <div className="page-heading"><span className="eyebrow">Unlimited employees</span><h1>Business Management</h1><p>Invite as many employees as your organization needs. Existing member and manager permissions, invitations, and team workflows stay in place.</p></div>
    <section className="unlimited-policy"><div><span className="eyebrow">Admin team policy</span><h2>No employee cap</h2><p>Business teams default to unlimited. There is no employee-cap validation blocking new invitations.</p></div><strong>∞</strong></section>
    <section className="business-compensation"><div className="section-title"><div><span className="eyebrow">Admin-configurable compensation</span><h2>Business team rate & partner share</h2></div><Status value="test_mode" /></div><p>Business team contributors receive their full approved earnings at the configured team rate. Verified partners receive a separate share entry after approval. Individual contributors remain at $10/hour in TEST FUNDS — not real money.</p><div className="compensation-controls"><label>Business team rate (USD/hour)<input type="number" min="1" max="1000" step="0.01" value={businessRate} onChange={(event) => setBusinessRate(event.target.value)} /></label><label>Partner revenue share (%)<input type="number" min="0" max="50" step="0.01" value={partnerSharePercent} onChange={(event) => setPartnerSharePercent(event.target.value)} /></label><button className="primary" disabled={configure.isPending || Number(businessRate) < 1 || Number(partnerSharePercent) < 0 || Number(partnerSharePercent) > 50} onClick={() => configure.mutate({ profileId, businessRateCents: Math.round(Number(businessRate) * 100), partnerShareBps: Math.round(Number(partnerSharePercent) * 100) })}>{configure.isPending ? "Saving…" : "Save compensation settings"}</button></div><div className="rate-separation"><span><small>Individual rate</small><b>$10.00/hour</b></span><span><small>Business team rate</small><b>{money(data.business?.businessRateCents ?? 2000)}/hour</b></span><span><small>Partner share</small><b>{((data.business?.partnerShareBps ?? 1000) / 100).toFixed(2)}%</b></span></div><p className="fine"><strong>TEST CALCULATIONS ONLY:</strong> These rates, earnings, and revenue-share entries have no real monetary value in the founder sandbox.</p></section>
    <form className="admin-form business-invite" onSubmit={submit}><div className="section-title"><div><span className="eyebrow">Employee invitations</span><h2>Add another team member</h2></div><Status value="unlimited" /></div><label>Company name<input name="businessName" required /></label><div className="form-grid"><label>Team member name<input name="memberName" required /></label><label>Team member email<input name="memberEmail" type="email" required /></label><label>Permission<select name="role"><option value="member">Member</option><option value="manager">Manager</option></select></label></div><button className="primary" disabled={invite.isPending}>{invite.isPending ? "Recording invitation…" : "Record employee invitation"}</button><p className="fine">Invite unlimited employees one at a time. Invitation email delivery begins after a transactional email provider and verified domain are connected.</p></form>
    <section className="business-assignment"><div className="section-title"><div><span className="eyebrow">Approved partner onboarding</span><h2>Assign an approved task</h2></div></div><p>Select an employee and a published task. The employee must first create an Earnova profile using the invited email.</p><div className="assignment-controls"><label>Employee<select value={selectedMemberId ?? ""} onChange={(event) => setSelectedMemberId(Number(event.target.value))}><option value="" disabled>Select employee</option>{data.teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select></label><label>Approved task<select value={selectedTaskId ?? ""} onChange={(event) => setSelectedTaskId(Number(event.target.value))}><option value="" disabled>Select task</option>{data.tasks.filter((task) => task.status === "published").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><button className="primary" disabled={assign.isPending || selectedMemberId == null || selectedTaskId == null} onClick={() => { if (selectedMemberId != null && selectedTaskId != null) assign.mutate({ profileId, teamMemberId: selectedMemberId, taskId: selectedTaskId }); }}>{assign.isPending ? "Assigning…" : "Assign task"}</button></div></section>
    {message && <p className="notice" role="status">{message}</p>}
    <section className="team-report"><div className="section-title"><div><span className="eyebrow">Productivity & earnings ledger</span><h2>Team performance</h2></div><button className="secondary" disabled={!data.teamMembers.length} onClick={exportCsv}>Export all as CSV</button></div><div className="team-summary"><span><b>{data.teamMembers.length}</b> employees</span><span><b>{totalMinutes}</b> approved minutes</span><span><b>{money(totalEarnings)}</b> employee earnings</span><span><b>{money(partnerShareEarnings)}</b> partner share</span></div><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search employees" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search employees" /></label>{visibleMembers.length ? <div className="team-report-list">{visibleMembers.map((member) => <article key={member.id}><div className="team-member-main"><strong>{member.name}</strong><span>{member.email}</span><small>{member.role} · {member.status}</small></div><div className="team-metrics"><span><b>{member.completedTasks}</b> tasks</span><span><b>{member.approvedMinutes}</b> min</span><span><b>{money(member.earningsCents)}</b> earnings</span><span><b>{member.ledgerEntryCount}</b> ledger rows</span></div></article>)}</div> : <Empty title="No employees found" text={data.teamMembers.length ? "Try a different search." : "Record your first employee invitation above. Your team can grow without a cap."} />}{totalPages > 1 && <div className="pagination" aria-label="Team report pages"><button className="secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {currentPage} of {totalPages} · {filteredMembers.length} employees</span><button className="secondary" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div>}<p className="fine">CSV exports always include the full team, not only the current page. The on-screen report paginates automatically as your team grows.</p></section>
    <section className="integration-list"><h2>Business controls</h2><div><span>Company verification</span><Status value="pending" /></div><div><span>Employee capacity</span><Status value="unlimited" /></div><div><span>Duplicate assignment protection</span><Status value="active" /></div><div><span>Team report & CSV export</span><Status value="active" /></div><div><span>Tax documents</span><Status value="provider_required" /></div></section>
  </div>;
}

function CommercialInquiryPage({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const profileId = data.profile?.id ?? 0;
  const [kind, setKind] = useState<"partnership" | "investor">("partnership");
  const [message, setMessage] = useState("");
  const createInquiry = useMutation({
    mutationFn: api.createCommercialInquiry,
    onSuccess: (result) => { setMessage(`Inquiry #${result.inquiryId} was saved. The Earnova AI team will respond personally.`); onChanged(); },
    onError: (error) => setMessage(`Nothing was saved. ${String(error)}`),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    createInquiry.mutate({
      profileId,
      kind,
      name: String(form.get("name")),
      organization: String(form.get("organization")),
      email: String(form.get("email")),
      tier: null,
      budget: null,
      message: String(form.get("message")),
    });
  };
  return <div className="page inquiry-page">
    <section className="inquiry-intro"><span className="eyebrow">Private conversation</span><h1>For Partners &amp; Investors</h1><p>Interested in working with Earnova AI? Send a short note below. The Earnova AI team will respond personally with the partnership pitch and investment details.</p></section>
    <section className="commercial-inquiry"><form className="admin-form" onSubmit={submit}><div className="form-grid"><label>Name<input aria-label="Name" name="name" defaultValue={data.profile?.displayName ?? ""} minLength={2} required /></label><label>Organization<input aria-label="Organization" name="organization" minLength={2} required /></label><label>Email<input aria-label="Email" name="email" type="email" defaultValue={data.profile?.email ?? ""} required /></label><label>Inquiry type<select aria-label="Inquiry type" value={kind} onChange={(event) => setKind(event.target.value as "partnership" | "investor")}><option value="partnership">Partnership</option><option value="investor">Investment</option></select></label></div><label>Message<textarea aria-label="Message" name="message" minLength={10} maxLength={4000} required placeholder="Tell us about your organization and what you would like to discuss." /></label><button className="primary" disabled={createInquiry.isPending}>{createInquiry.isPending ? "Saving inquiry…" : "Send inquiry"}</button>{message && <p className={message.startsWith("Nothing") ? "form-error" : "notice"} role="status">{message}</p>}<p className="fine">When submitted, your inquiry will be saved for founder review. Submitting this form does not create a partnership, investment commitment, contract, or payment.</p></form></section>
  </div>;
}

function CommercialInquiryAdmin({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const [message, setMessage] = useState("");
  const profileId = data.profile?.id ?? 0;
  const updateInquiry = useMutation({ mutationFn: (args: { inquiryId: number; status: "pending" | "contacted" | "closed" }) => api.updateCommercialInquiryStatus({ profileId, ...args }), onSuccess: () => { setMessage("Inquiry status saved."); onChanged(); }, onError: (error) => setMessage(`Status was not saved. ${String(error)}`) });
  const pending = data.commercialInquiries.filter((item) => item.status === "pending").length;
  return <div className="page"><div className="page-heading"><span className="eyebrow">Founder dashboard</span><h1>Partner &amp; investor inquiries</h1><p>Review private requests and follow up personally with the appropriate pitch and details.</p></div><section className="commercial-admin"><div className="section-title"><div><h2>Inquiry queue</h2><p>{pending} pending</p></div><Status value={pending ? "action_needed" : "up_to_date"} /></div>{message && <p className={message.startsWith("Status was not") ? "form-error" : "notice"} role="status">{message}</p>}{data.commercialInquiries.length ? <div className="commercial-inquiry-list">{data.commercialInquiries.map((item) => <article key={item.id}><div><span className="inquiry-kind">{item.kind === "partnership" ? "Partnership" : "Investment"}</span><Status value={item.status} /></div><h3>{item.organization}</h3><p>{item.name} · {item.email}</p><dl><div><dt>Received</dt><dd>{when(item.createdAt)}</dd></div></dl><p>{item.message}</p><div className="review-actions"><button className="secondary" disabled={updateInquiry.isPending || item.status === "contacted"} onClick={() => updateInquiry.mutate({ inquiryId: item.id, status: "contacted" })}>Mark contacted</button><button className="secondary" disabled={updateInquiry.isPending || item.status === "closed"} onClick={() => updateInquiry.mutate({ inquiryId: item.id, status: "closed" })}>Close</button></div></article>)}</div> : <Empty title="No inquiries yet" text="New partner and investor inquiries will appear here after they are saved." />}</section></div>;
}

function Partnerships({ data, onChanged, onOpenBusiness }: { data: AppState; onChanged: () => void; onOpenBusiness: () => void }) {
  const profileId = data.profile?.id ?? 0;
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 6;
  const create = useMutation({ mutationFn: api.createPartnershipRequest, onSuccess: (result) => { setMessage(`Partnership request #${result.requestId} is ready for founder review.`); onChanged(); }, onError: (error) => setMessage(String(error)) });
  const review = useMutation({ mutationFn: api.reviewPartnershipRequest, onSuccess: (result) => { setMessage(`Partnership request ${result.status}.`); onChanged(); }, onError: (error) => setMessage(String(error)) });
  const mine = data.partnershipRequests.filter((request) => request.requesterProfileId === profileId);
  const approved = mine.some((request) => request.status === "approved");
  const adminPages = Math.max(1, Math.ceil(data.partnershipRequests.length / ADMIN_PAGE_SIZE));
  const currentAdminPage = Math.min(adminPage, adminPages);
  const visibleRequests = data.partnershipRequests.slice((currentAdminPage - 1) * ADMIN_PAGE_SIZE, currentAdminPage * ADMIN_PAGE_SIZE);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate({ profileId, companyName: String(form.get("companyName")), industry: String(form.get("industry")) as "hotel" | "healthcare" | "childcare" | "cleaning" | "other", contactPerson: String(form.get("contactPerson")), workEmail: String(form.get("workEmail")), approximateEmployees: Number(form.get("approximateEmployees")), message: String(form.get("message")) }); event.currentTarget.reset(); };
  return <div className="page partnerships-page"><div className="page-heading"><span className="eyebrow">Business Partnerships</span><h1>Partner With Us</h1><p>Hotels, hospitals and healthcare organizations, daycares, cleaning companies, and other employers can explore approved workplace task programs with Earnova.</p></div>
    <section className="earn-on-job"><div><span className="eyebrow">Earn while on the job</span><h2>Employer-approved work can create extra earning opportunities</h2><p>With the employer&apos;s explicit consent, employees may complete approved Earnova tasks during employer-approved times at work to earn extra funds. Every task still follows its stated review, privacy, consent, and payment rules.</p></div><span className="earn-mark" aria-hidden="true">$+</span></section>
    <section className="workplace-guardrails"><span className="eyebrow">Strict workplace guardrails</span><h2>Authorization before recording—every time</h2><ul><li><strong>Employer authorization is required</strong> before any workplace recording.</li><li>No recording in patient-care areas.</li><li>No recording in childcare areas without verifiable parental consent.</li><li>No recording in hotel guest rooms or anywhere guests expect privacy.</li><li>No recording where prohibited by law or employer policy.</li><li>All existing Privacy Blur, human-review, consent, and no-public-sharing safeguards continue to apply.</li></ul></section>
    <form className="admin-form partnership-form" onSubmit={submit}><div className="section-title"><div><span className="eyebrow">Partnership inquiry</span><h2>Tell us about your organization</h2></div></div><div className="form-grid"><label>Company name<input name="companyName" minLength={2} required /></label><label>Industry<select name="industry" required><option value="hotel">Hotel</option><option value="healthcare">Hospital / healthcare</option><option value="childcare">Daycare / childcare</option><option value="cleaning">Cleaning company</option><option value="other">Other</option></select></label><label>Contact person<input name="contactPerson" minLength={2} required /></label><label>Work email<input name="workEmail" type="email" required /></label><label>Approximate number of employees<input name="approximateEmployees" type="number" min="1" max="1000000" required /></label></div><label>How would you like to partner?<textarea name="message" minLength={10} maxLength={3000} required /></label><button className="primary" disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit partnership inquiry"}</button><p className="legal-note"><strong>Launch review required:</strong> Worker classification, minimum-wage, and overtime implications of on-the-job earning require professional legal review before launch. This program does not state a legal conclusion.</p></form>
    {message && <p className="notice" role="status">{message}</p>}
    {mine.length > 0 && <section className="partnership-status"><h2>Your requests</h2>{mine.map((request) => <article key={request.id}><div><strong>{request.companyName}</strong><Status value={request.status} /></div><small>{request.industry} · about {request.approximateEmployees} employees · submitted {when(request.createdAt)}</small>{request.reviewNotes && <p><strong>Founder notes:</strong> {request.reviewNotes}</p>}</article>)}</section>}
    {approved && <section className="partner-onboarding"><span className="eyebrow">Approved partner onboarding</span><h2>Your business workspace is ready</h2><ol><li>Invite unlimited employees using their work email.</li><li>Assign published, approved Earnova tasks after the employee creates a matching profile.</li><li>Track approved minutes, completed tasks, and team earnings in the paginated report.</li></ol><button className="primary" onClick={onOpenBusiness}>Open Business Management</button></section>}
    <section className="partnership-admin"><div className="section-title"><div><span className="eyebrow">Founder dashboard</span><h2>Partnership requests</h2></div><span>{data.partnershipRequests.filter((request) => request.status === "pending").length} pending</span></div>{visibleRequests.length ? <div className="partnership-admin-list">{visibleRequests.map((request) => <article key={request.id}><div className="partnership-request-head"><div><strong>{request.companyName}</strong><small>{request.industry} · {request.contactPerson} · {request.workEmail}</small></div><Status value={request.status} /></div><p>{request.message}</p><small>Approximate employees: {request.approximateEmployees} · received {when(request.createdAt)}</small>{request.status === "pending" ? <><label>Founder review notes<textarea value={reviewNotes[request.id] ?? ""} onChange={(event) => setReviewNotes((notes) => ({ ...notes, [request.id]: event.target.value }))} minLength={3} /></label><div className="review-actions"><button className="danger" disabled={review.isPending || (reviewNotes[request.id]?.trim().length ?? 0) < 3} onClick={() => review.mutate({ requestId: request.id, decision: "declined", notes: reviewNotes[request.id] ?? "" })}>Decline</button><button className="primary" disabled={review.isPending || (reviewNotes[request.id]?.trim().length ?? 0) < 3} onClick={() => review.mutate({ requestId: request.id, decision: "approved", notes: reviewNotes[request.id] ?? "" })}>Approve & open workspace</button></div></> : request.reviewNotes && <p className="reviewed-note"><strong>Review notes:</strong> {request.reviewNotes}</p>}</article>)}</div> : <Empty title="No partnership requests" text="New inquiries will appear here for founder review." />}{adminPages > 1 && <div className="pagination"><button className="secondary" disabled={currentAdminPage === 1} onClick={() => setAdminPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {currentAdminPage} of {adminPages}</span><button className="secondary" disabled={currentAdminPage === adminPages} onClick={() => setAdminPage((value) => Math.min(adminPages, value + 1))}>Next</button></div>}</section>
  </div>;
}

function Support({ data, onChanged, onOpenNova, onFeedback }: { data: AppState; onChanged: () => void; onOpenNova: () => void; onFeedback: () => void }) {
  const profileId = data.profile?.id ?? 0;
  const [message, setMessage] = useState("");
  const ticket = useMutation({ mutationFn: api.createSupportTicket, onSuccess: (result) => { setMessage(`Ticket #${result.ticketId} is in the Earnova staff queue. Expect a response ${result.expectedResponse}; Nova is not a live human agent.`); onChanged(); }, onError: (e) => setMessage(String(e)) });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); ticket.mutate({ profileId, subject: String(form.get("subject")), message: String(form.get("message")) }); };
  const mine = data.supportTickets.filter((item) => item.profileId === profileId);
  return <div className="page"><div className="page-heading"><span className="eyebrow">Help & Support</span><h1>Get answers or reach our staff</h1><p>Nova is an automated helper for quick guidance. For a human response, open a tracked ticket; staff normally respond within 1–2 business days.</p></div><section className="nova-home"><div className="nova-avatar nova-photo"><img src={novaTabletImage} alt="" /></div><div><span className="eyebrow">AI helper &amp; trainer character</span><h2>Meet Nova</h2><p>Ask about tasks, the 1–60 minute recording rule, earnings, withdrawals, referrals, safety, privacy, or staff onboarding.</p><NovaVoice src={novaGreetingAudio} label="Signature greeting" compact /><button className="primary" onClick={onOpenNova}>Chat with Nova</button></div></section><section className="tester-help-link"><div><span className="eyebrow">Official Testers</span><h2>Testing the app?</h2><p>Send a bug report, suggestion, praise, or other product feedback through your device&apos;s email app.</p></div><button className="secondary" onClick={onFeedback}>Open Tester Feedback</button></section><form className="admin-form support-form" onSubmit={submit}><h2>Talk to a staff member</h2><p>A ticket goes to the Earnova staff team. A human will not reply instantly.</p><label>Subject<input name="subject" minLength={4} required /></label><label>How can staff help?<textarea name="message" minLength={10} required /></label><button className="primary" disabled={ticket.isPending}>{ticket.isPending ? "Routing to staff…" : "Create staff support ticket"}</button>{message && <p className="notice">{message}</p>}</form>{mine.length > 0 && <section className="ticket-history"><h2>Your support tickets</h2>{mine.map((item) => <article key={item.id}><div><strong>#{item.id} · {item.subject}</strong><Status value={item.status} /></div><p>{item.message}</p>{item.messages.map((reply) => <blockquote key={reply.id}><b>{reply.authorRole === "staff" ? "Earnova staff" : reply.authorName}</b><span>{reply.message}</span><small>{when(reply.createdAt)}</small></blockquote>)}</article>)}</section>}<section className="faq"><h2>Common questions</h2><details><summary>How long should every recording be?</summary><p>Record 1–60 minutes. Anything shorter than 1 minute or longer than 60 minutes cannot be submitted or counted as payable time.</p></details><details><summary>When do earnings become available?</summary><p>Only after a human reviewer approves payable work. At the current contributor rate, approved minutes are calculated at $10 per hour in TEST FUNDS — not real money; uploading alone does not create withdrawable earnings.</p></details><details><summary>Can I record other people?</summary><p>Only when the task allows it and every identifiable person has given the required informed consent. Follow heightened safeguards for children and educational settings.</p></details><details><summary>Which payout methods are available?</summary><p>PayPal, Venmo, Cash App, and Whop appear for sandbox testing. Real payouts require approved provider integrations and the app will never ask for your payment-app password.</p></details></section></div>;
}

function TesterFeedback({ profileName, profileEmail }: { profileName: string; profileEmail: string }) {
  const [testerName, setTesterName] = useState(profileName);
  const [testerEmail, setTesterEmail] = useState(profileEmail);
  const [feedbackType, setFeedbackType] = useState("bug report");
  const [message, setMessage] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = "Earnova AI Tester Feedback";
    const body = [`Tester name: ${testerName}`, `Tester email: ${testerEmail}`, `Feedback type: ${feedbackType}`, "", message].join("\n");
    window.location.href = `mailto:Royaltyradiomedia1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  return <div className="page tester-feedback-page"><section className="official-testers-welcome"><span className="eyebrow">Official Testers</span><h1>Welcome to the Earnova test program</h1><p>Explore the private founder build and tell the Earnova team what worked, what felt confusing, and anything that blocked you. Clear steps, expected behavior, and what happened instead are especially helpful for bug reports.</p><ul><li>Report repeatable bugs and the screen where they happened.</li><li>Suggest improvements to tasks, recording, review, or payouts.</li><li>Share praise so the team knows what to preserve.</li></ul><p className="fine"><strong>Private testing note:</strong> This flow does not create an external tester account or sign anyone in. It opens your device&apos;s email app with the feedback prefilled.</p></section><form className="admin-form tester-feedback-form" onSubmit={submit}><h2>Tester Feedback</h2><div className="form-grid"><label>Tester name<input value={testerName} onChange={(event) => setTesterName(event.target.value)} minLength={2} required /></label><label>Tester email<input type="email" value={testerEmail} onChange={(event) => setTesterEmail(event.target.value)} required /></label></div><label>Feedback type<select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}><option value="bug report">Bug report</option><option value="suggestion">Suggestion</option><option value="praise">Praise</option><option value="other">Other</option></select></label><label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} required placeholder="Tell us what you tried, what you expected, and what happened." /></label><button className="primary" disabled={testerName.trim().length < 2 || !testerEmail.trim() || message.trim().length < 10}>Compose feedback email</button><p className="fine">Your email is addressed to Royaltyradiomedia1@gmail.com with the subject “Earnova AI Tester Feedback.” Nothing is sent until you review and send it in your email app.</p></form></div>;
}

function AdminSupport({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(data.supportTickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved">("in_progress");
  const [message, setMessage] = useState("");
  const current = data.supportTickets.find((ticket) => ticket.id === selectedId) ?? data.supportTickets[0];
  const respond = useMutation({ mutationFn: api.respondSupportTicket, onSuccess: () => { setReply(""); setMessage("Staff response saved and the contributor was notified."); onChanged(); }, onError: (error) => setMessage(String(error)) });
  if (!current) return <div className="page"><div className="page-heading"><span className="eyebrow">Staff support</span><h1>Support queue</h1></div><Empty title="No support tickets" text="Tickets created through Nova or Help & Support will appear here for staff response." /></div>;
  return <div className="page"><div className="page-heading"><span className="eyebrow">Staff support</span><h1>Support queue</h1><p>Read contributor requests, respond as Earnova staff, and keep ticket status accurate. Nova never presents these replies as instant or automated human contact.</p></div><label className="select-label">Ticket<select value={current.id} onChange={(event) => setSelectedId(Number(event.target.value))}>{data.supportTickets.map((ticket) => <option value={ticket.id} key={ticket.id}>#{ticket.id} · {ticket.subject} · {ticket.status}</option>)}</select></label><section className="support-thread"><div className="support-thread-head"><div><small>Contributor</small><h2>{current.profileName}</h2></div><Status value={current.status} /></div><article><b>{current.subject}</b><p>{current.message}</p><small>{when(current.createdAt)}</small></article>{current.messages.map((item) => <article key={item.id} className={item.authorRole === "staff" ? "staff-message" : "contributor-message"}><b>{item.authorRole === "staff" ? "Earnova staff" : item.authorName}</b><p>{item.message}</p><small>{when(item.createdAt)}</small></article>)}<label>Ticket status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><label>Staff response<textarea value={reply} onChange={(event) => setReply(event.target.value)} minLength={2} placeholder="Write a clear human response…" /></label><button className="primary" disabled={respond.isPending || reply.trim().length < 2} onClick={() => respond.mutate({ ticketId: current.id, authorRole: "staff", authorName: "Earnova Staff", message: reply, status })}>{respond.isPending ? "Sending…" : "Send staff response"}</button>{message && <p className="notice">{message}</p>}</section></div>;
}

type NovaTopic = "tasks" | "recording" | "earnings" | "withdrawals" | "referrals" | "safety" | "privacy" | "staff";
const novaKnowledge: Record<NovaTopic, { label: string; answer: string; audio: string }> = {
  tasks: { label: "How tasks work", answer: "Open Tasks, choose a funded task, review every instruction, and accept it. Complete only authorized work, record the required evidence, submit it, and wait for human review. A submission is not payable until approved.", audio: novaTasksAudio },
  recording: { label: "Recording length", answer: "Every task recording must be between 1 minute and 60 minutes. The recorder shows a live clock with the 1-minute minimum and 60-minute maximum. Shorter or longer recordings are blocked and never counted as payable time.", audio: novaRecordingAudio },
  earnings: { label: "Earnings & $10/hour", answer: "Contributor test tasks use a $10 per approved payable hour rate in TEST FUNDS — not real money. For example, 15 approved minutes equals $2.50 in test funds and 60 approved minutes equals $10 in test funds. Only human-approved payable minutes become available; raw recording length is not automatically paid.", audio: novaEarningsAudio },
  withdrawals: { label: "Withdrawals", answer: "The current payout center supports sandbox testing for PayPal, Venmo, Cash App, and Whop. No real provider is connected yet, no real money moves, and you should never provide a payment-app password. Production withdrawals need approved provider integrations.", audio: novaWithdrawalsAudio },
  referrals: { label: "Referrals", answer: "Referral rewards are single-level and tied to verified, approved work—not signups alone. The proposed reward is $2 per qualifying approved hour, subject to eligibility, available referral budget, program limits, and anti-abuse review.", audio: novaReferralsAudio },
  safety: { label: "Recording safety", answer: "Set up before starting, use the right tools and protective equipment, keep bystanders out, and stop if work becomes unsafe. While driving, the camera must be mounted hands-free before moving; never touch the phone while driving and obtain passenger consent.", audio: novaSafetyAudio },
  privacy: { label: "Account & privacy", answer: "Record only content you are authorized to submit. Keep addresses, passwords, financial records, medical details, confidential documents, screens, and private conversations out of frame. Use Help & Support for access, correction, deletion, or consent requests.", audio: novaPrivacyAudio },
  staff: { label: "Staff orientation", answer: "Earnova staff should verify task funding and instructions, apply the 1–60 minute rule, review safety and consent, approve only verified payable minutes, explain decisions clearly, and never treat pending or test funds as available real money.", audio: novaStaffAudio },
};

function NovaAssistant({ profileId, onClose, onTicketCreated }: { profileId: number; onClose: () => void; onTicketCreated: () => void }) {
  const [topic, setTopic] = useState<NovaTopic | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Hi! I’m Nova, your AI helper and trainer! I can explain tasks, recording rules, earnings, safety, privacy, and staff procedures. Your journey starts here!");
  const [answerAudio, setAnswerAudio] = useState(novaGreetingAudio);
  const [handoff, setHandoff] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const ticket = useMutation({ mutationFn: api.createSupportTicket, onSuccess: (result) => { setTicketMessage(`Ticket #${result.ticketId} is now in the Earnova staff queue. A human is expected to respond ${result.expectedResponse}; nobody is replying instantly.`); setStaffMessage(""); onTicketCreated(); }, onError: (error) => setTicketMessage(String(error)) });
  const ask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = question.toLowerCase();
    const found: NovaTopic = normalized.includes("minute") || normalized.includes("record") || normalized.includes("duration") ? "recording" : normalized.includes("withdraw") || normalized.includes("paypal") || normalized.includes("venmo") || normalized.includes("cash app") || normalized.includes("whop") ? "withdrawals" : normalized.includes("earn") || normalized.includes("rate") || normalized.includes("pay") ? "earnings" : normalized.includes("refer") ? "referrals" : normalized.includes("safe") || normalized.includes("drive") ? "safety" : normalized.includes("privacy") || normalized.includes("account") || normalized.includes("delete") ? "privacy" : normalized.includes("staff") || normalized.includes("train") || normalized.includes("review") ? "staff" : "tasks";
    setTopic(found); setAnswer(novaKnowledge[found].answer); setAnswerAudio(novaKnowledge[found].audio); setQuestion("");
  };
  const chooseTopic = (next: NovaTopic) => { setTopic(next); setAnswer(novaKnowledge[next].answer); setAnswerAudio(novaKnowledge[next].audio); };
  const toggleHandoff = () => { setHandoff((open) => !open); setTicketMessage(""); };
  return <aside className="nova-panel" role="dialog" aria-modal="false" aria-label="Nova automated helper"><div className="nova-header"><div className="nova-avatar nova-photo"><img src={novaTabletImage} alt="Nova, Earnova AI’s illustrated helper and trainer character" /></div><div><strong>Nova</strong><span>AI helper &amp; trainer character</span></div><button aria-label="Close Nova" onClick={onClose}>×</button></div><div className="nova-body"><div className="nova-message"><b>Nova</b><p>{answer}</p><NovaVoice src={answerAudio} label={topic ? novaKnowledge[topic].label : "Signature greeting"} autoPlay compact /></div><div className="nova-topics" aria-label="Nova help topics">{(Object.keys(novaKnowledge) as NovaTopic[]).map((key) => <button key={key} className={topic === key ? "active" : ""} onClick={() => chooseTopic(key)}>{novaKnowledge[key].label}</button>)}</div><form className="nova-ask" onSubmit={ask}><label htmlFor="nova-question">Ask Nova a question</label><div><input id="nova-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="How does the 1–60 minute rule work?" /><button disabled={!question.trim()}>Ask</button></div></form><button className="talk-to-staff" onClick={toggleHandoff}>Talk to a staff member</button>{handoff && <section className="nova-handoff"><strong>Send this to Earnova staff</strong><p>I can create a tracked support ticket. I&apos;m an automated helper, not a human, and staff normally respond within 1–2 business days.</p><NovaVoice src={novaHandoffAudio} label="Staff handoff" autoPlay compact /><textarea aria-label="Message for Earnova staff" value={staffMessage} onChange={(event) => setStaffMessage(event.target.value)} minLength={10} placeholder="Tell the staff team how they can help…" /><button className="primary" disabled={ticket.isPending || staffMessage.trim().length < 10} onClick={() => ticket.mutate({ profileId, subject: "Nova handoff to Earnova staff", message: staffMessage })}>{ticket.isPending ? "Routing…" : "Create staff ticket"}</button>{ticketMessage && <div><p className="notice">{ticketMessage}</p><NovaVoice src={novaTicketConfirmedAudio} label="Ticket confirmation" autoPlay compact /></div>}</section>}</div></aside>;
}

const launchPhases = [
  { n: 1, title: "Legal & money rails", sub: "Nothing launches without these" },
  { n: 2, title: "Trust & safety", sub: "Non-negotiable for a task marketplace" },
  { n: 3, title: "Product hardening", sub: "Build work" },
  { n: 4, title: "Distribution", sub: "Getting it into the world" },
  { n: 5, title: "First revenue", sub: "One paying pilot beats a hundred signups" },
] as const;

const launchStatusLabel: Record<string, string> = { not_started: "Not started", in_progress: "In progress", done: "Done" };
const launchOwnerLabel: Record<string, string> = { manny: "On Manny", build: "Build work", both: "Manny + build" };

function LaunchNoteEditor({ item, profileId, onChanged }: { item: AppState["launchItems"][number]; profileId: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? "");
  const [error, setError] = useState("");
  const save = useMutation({ mutationFn: api.updateLaunchItem, onSuccess: () => { setEditing(false); setError(""); onChanged(); }, onError: (e) => setError(String(e)) });
  useEffect(() => { if (!editing) setDraft(item.note ?? ""); }, [item.note, editing]);
  if (!editing) return <div className="launch-note-row">{item.note ? <p className="launch-note">{item.note}</p> : <p className="launch-note muted-note">No note yet.</p>}<button type="button" className="text-button" aria-label={`Edit note for ${item.title}`} onClick={() => setEditing(true)}>{item.note ? "Edit note" : "Add note"}</button></div>;
  return <div className="launch-note-edit"><label>Note for {item.title}<textarea aria-label={`Note for ${item.title}`} value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)} placeholder="Progress, links, decisions…" /></label>{error && <p className="form-error">{error}</p>}<div className="button-row"><button type="button" className="secondary" onClick={() => { setEditing(false); setDraft(item.note ?? ""); }}>Cancel</button><button type="button" className="primary" disabled={save.isPending} onClick={() => save.mutate({ profileId, itemId: item.id, note: draft })}>{save.isPending ? "Saving…" : "Save note"}</button></div></div>;
}

function LaunchItemRow({ item, profileId, onChanged }: { item: AppState["launchItems"][number]; profileId: number; onChanged: () => void }) {
  const [error, setError] = useState("");
  const update = useMutation({ mutationFn: api.updateLaunchItem, onSuccess: () => { setError(""); onChanged(); }, onError: (e) => setError(String(e)) });
  return <article className={`launch-item status-border-${item.status}`}>
    <div className="launch-item-head"><strong>{item.title}</strong><span className="launch-owner">{launchOwnerLabel[item.owner]}</span></div>
    <p>{item.detail}</p>
    <div className="launch-status-switch" role="group" aria-label={`Status for ${item.title}`}>{(["not_started", "in_progress", "done"] as const).map((status) => <button key={status} type="button" className={item.status === status ? "active" : ""} aria-pressed={item.status === status} disabled={update.isPending || item.status === status} onClick={() => update.mutate({ profileId, itemId: item.id, status })}>{launchStatusLabel[status]}</button>)}</div>
    <LaunchNoteEditor item={item} profileId={profileId} onChanged={onChanged} />
    {error && <p className="form-error">{error}</p>}
    <small className="launch-updated">Updated {when(item.updatedAt)}</small>
  </article>;
}

function LaunchRoadmap({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const profileId = data.profile?.id ?? 0;
  const items = data.launchItems;
  const done = items.filter((item) => item.status === "done").length;
  const active = items.filter((item) => item.status === "in_progress").length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  if (!data.viewerAccess.isFounder) return <div className="page"><div className="page-heading"><span className="eyebrow">Founder only</span><h1>Launch roadmap</h1><p>The real-launch roadmap is part of the founder console and is only visible on the founder profile.</p></div></div>;
  return <div className="page launch-page">
    <div className="page-heading launch-heading"><img src={markImage} alt="Earnova AI logo" /><div><span className="eyebrow">Royalty Radio Media LLC · Roadmap kickoff Oct 22, 2026</span><h1>Real-launch roadmap</h1><p>The plan you approved on Oct 13, now in motion. Earnova stays private and in founder-testing mode until this checklist is done — the hold-off decision stands, and nothing here launches publicly until you say go.</p></div></div>

    <section className="launch-timing" aria-label="Timing caution">
      <span className="eyebrow">Timing caution — read first</span>
      <h2>Three clocks are running</h2>
      <div className="launch-clocks">
        <article><strong>Oct 26 – Nov 4</strong><h3>Meta AI Developer Hackathon</h3><p>Approval decision lands by Oct 26, 9:00 AM ET. The demo video and live demo will be seen by judges and posted publicly.</p></article>
        <article className="urgent"><strong>Before Nov 4</strong><h3>Patent decision</h3><p>That public demo counts as a public disclosure. If patent protection matters, the provisional filing decision should land before Nov 4 — the attorney conversation is worth having this week.</p></article>
        <article><strong>After Nov 4</strong><h3>No public launch before the hackathon ends</h3><p>Then Phase 1 (attorney review + payout provider) and the Phase 5 pilot push run in parallel with Phase 3 hardening.</p></article>
      </div>
    </section>

    <section className="launch-progress" aria-label="Roadmap progress">
      <div className="launch-progress-head"><div><span className="eyebrow">Kickoff progress</span><h2>{done} of {items.length} items done</h2></div><strong>{pct}%</strong></div>
      <div className="training-progress" role="progressbar" aria-label="Launch roadmap progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}><span style={{ width: `${pct}%` }} /></div>
      <p>{active} item{active === 1 ? "" : "s"} in progress. Tap a status on any item to update it — your changes save here and stay saved.</p>
    </section>

    <section className="launch-kickoff-done">
      <span className="eyebrow">Kickoff — Oct 22, 2026</span>
      <h2>What kicked off</h2>
      <ul>
        <li><strong>Attorney packet assembled</strong> — invention disclosure covering 5 candidate areas (privacy-blur pipeline, demonstration-data workflow, Nova trainer, compensation ledger, mid-recording camera switch) plus a brief asking whether a provisional filing should land before Nov 4. The four documents needing review: Terms of Service, Privacy Policy, contributor/worker agreement, payout terms.</li>
        <li><strong>Payout-provider comparison</strong> — research started on a real provider to replace the sandbox (identity checks, W-9/W-8BEN handling, thresholds, fees).</li>
        <li><strong>Business domain &amp; email</strong> — verification of royaltyradiomedia.com started; a business-domain email also unblocks the 5 outreach forms that reject Gmail.</li>
        <li><strong>Branding pass started</strong> — the Earnova logo mark now sits in the app shell header on every screen; it was previously only in onboarding.</li>
      </ul>
    </section>

    {launchPhases.map((phase) => {
      const phaseItems = items.filter((item) => item.phase === phase.n);
      const phaseDone = phaseItems.filter((item) => item.status === "done").length;
      return <section className="launch-phase" key={phase.n} aria-label={`Phase ${phase.n}: ${phase.title}`}>
        <div className="section-title"><div><span className="eyebrow">Phase {phase.n}</span><h2>{phase.title}</h2><p className="launch-phase-sub">{phase.sub}</p></div><span className="launch-phase-count">{phaseDone}/{phaseItems.length} done</span></div>
        <div className="launch-items">{phaseItems.map((item) => <LaunchItemRow key={item.id} item={item} profileId={profileId} onChanged={onChanged} />)}</div>
      </section>;
    })}

    <section className="launch-split">
      <div><span className="eyebrow">Only you can</span><h2>Founder action items</h2><ul><li>Hire the attorney and decide the patent filing</li><li>Sign the payout-provider agreements and verify your identity with the provider</li><li>Set up the business email and domain</li><li>Approve anything that goes to a third party</li></ul></div>
      <div><span className="eyebrow">Build work</span><h2>What Friday can build</h2><ul><li>Product hardening (Phase 3)</li><li>Re-cut all launch content once Phase 1 is done</li><li>Draft pilot contract terms for attorney review</li><li>Run the outreach follow-ups and prep App Store listings</li></ul></div>
    </section>

    <p className="fine">This roadmap is a planning tool, not legal advice. Every legal and financial step needs the appropriate professional. Full document: earnova-launch-roadmap.md in your files; attorney packet: earnova-launch/attorney-packet/.</p>
  </div>;
}

const samConcepts = ["person", "face", "dog", "cat", "document", "license plate", "phone screen"] as const;
type SamRegionView = AppState["samJobs"][number]["regions"][number];

function samStatusView(data: AppState): { label: string; tone: string } {
  const meta = data.metaIntegration;
  if (!meta.configured) return { label: "Not configured — built-in blur active", tone: "idle" };
  if (meta.lastTestStatus === "connected") return { label: "Connected — SAM 3.1 available", tone: "ok" };
  if (meta.lastTestStatus === "model_not_found") return { label: "Key works — SAM 3.1 access not granted yet", tone: "warn" };
  if (meta.lastTestStatus === "invalid_key") return { label: "Key rejected by Meta", tone: "bad" };
  if (meta.lastTestStatus === "unreachable") return { label: "Last test could not reach api.meta.ai", tone: "warn" };
  return { label: "Key saved — connection not tested yet", tone: "warn" };
}

function MetaBuildRow({ item, profileId, onChanged }: { item: AppState["metaBuildItems"][number]; profileId: number; onChanged: () => void }) {
  const [error, setError] = useState("");
  const update = useMutation({ mutationFn: api.updateMetaBuildItem, onSuccess: () => { setError(""); onChanged(); }, onError: (e) => setError(String(e)) });
  return <article className={`launch-item status-border-${item.status}`}>
    <div className="launch-item-head"><strong>{item.title}</strong><Status value={item.status} /></div>
    <p>{item.detail}</p>
    {item.note && <p className="launch-note">{item.note}</p>}
    <div className="launch-status-switch" role="group" aria-label={`Status for ${item.title}`}>{(["not_started", "in_progress", "done"] as const).map((status) => <button key={status} type="button" className={item.status === status ? "active" : ""} aria-pressed={item.status === status} disabled={update.isPending || item.status === status} onClick={() => update.mutate({ profileId, itemId: item.id, status })}>{launchStatusLabel[status]}</button>)}</div>
    {error && <p className="form-error">{error}</p>}
    <small className="launch-updated">Updated {when(item.updatedAt)}</small>
  </article>;
}

function MetaAiLab({ data, onChanged }: { data: AppState; onChanged: () => void }) {
  const profileId = data.profile?.id ?? 0;
  const meta = data.metaIntegration;
  const status = samStatusView(data);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [concept, setConcept] = useState<string>("person");
  const [imageName, setImageName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePayload, setImagePayload] = useState<{ base64: string; mime: "image/jpeg" | "image/png" } | null>(null);
  const [regions, setRegions] = useState<SamRegionView[]>([]);
  const [labMessage, setLabMessage] = useState("");
  const [showBlurPreview, setShowBlurPreview] = useState(true);
  const saveKey = useMutation({ mutationFn: api.saveMetaApiKey, onSuccess: (result) => { setApiKeyInput(""); setKeyMessage(`Key saved (${result.keyHint}). Now run the connection test — a saved key does not by itself prove SAM 3.1 access.`); onChanged(); }, onError: (e) => setKeyMessage(String(e)) });
  const clearKey = useMutation({ mutationFn: api.clearMetaApiKey, onSuccess: () => { setKeyMessage("Key removed. SAM 3.1 requests are off; Privacy Blur is on the built-in engine."); setRegions([]); onChanged(); }, onError: (e) => setKeyMessage(String(e)) });
  const testConnection = useMutation({ mutationFn: api.testMetaConnection, onSuccess: (result) => { setKeyMessage(result.message); onChanged(); }, onError: (e) => setKeyMessage(String(e)) });
  const analyze = useMutation({ mutationFn: api.analyzePrivacyImage, onSuccess: (result) => { setRegions(result.regions); setLabMessage(result.summary); onChanged(); }, onError: (e) => setLabMessage(String(e)) });
  if (!data.viewerAccess.isFounder) return <div className="page"><div className="page-heading"><span className="eyebrow">Founder only</span><h1>Meta AI · SAM 3.1 Lab</h1><p>The Meta-model integration console is part of the founder build tools and is only visible on the founder profile.</p></div></div>;
  const prepareImage = async (file: File) => {
    setLabMessage(""); setRegions([]);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round(bitmap.width * scale));
      canvas.height = Math.max(2, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image preview is not supported on this device.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) throw new Error("The image could not be prepared.");
      setPreviewUrl(dataUrl);
      setImagePayload({ base64, mime: "image/jpeg" });
      setImageName(file.name);
    } catch (cause) {
      setLabMessage(cause instanceof Error ? cause.message : "The image could not be prepared.");
    }
  };
  const doneCount = data.metaBuildItems.filter((item) => item.status === "done").length;
  return <div className="page sam-page">
    <div className="page-heading"><span className="eyebrow">Meta-model build · SAM 3.1 first</span><h1>SAM 3.1 Privacy Lab</h1><p>Meta&apos;s Segment Anything Model 3.1 turns one concept phrase — <em>person</em>, <em>face</em>, <em>dog</em> — into pixel-level masks, so privacy blur can follow a subject&apos;s shape instead of a box. This lab wires Earnova to the hosted Meta Model API (<code>api.meta.ai/v1</code>, model <code>sam-3.1</code>) and proves each step before any task submission depends on it.</p></div>

    <section className={`sam-status-card tone-${status.tone}`} aria-live="polite"><div><span className="eyebrow">Integration status</span><h2>{status.label}</h2><p>{meta.configured ? <>Key on file: <strong>{meta.keyHint ?? "masked"}</strong>{meta.lastTestedAt ? <> · Last tested {when(meta.lastTestedAt)}</> : " · Never tested"}</> : "No key on file. Create an account and API key at dev.meta.ai — participant API credits from the hackathon may cover early usage."}</p>{meta.lastTestMessage && <p className="sam-last-test">{meta.lastTestMessage}</p>}</div><strong className="sam-build-count">{doneCount}/{data.metaBuildItems.length} steps</strong></section>

    <section className="sam-panel"><div className="section-title"><div><span className="eyebrow">Founder only · Step 1</span><h2>Meta Model API key</h2></div></div>
      <p>The key is stored on the app server and used only by server actions calling Meta. It is never hard-coded, never shown back in full, and never written to logs. Paste it here — not in chat.</p>
      <label className="sam-key-label">Meta Model API key<input aria-label="Meta Model API key" type="password" autoComplete="off" placeholder={meta.configured ? `Saved (${meta.keyHint ?? "masked"}) — paste a new key to replace it` : "Paste the key from dev.meta.ai"} value={apiKeyInput} onChange={(event) => setApiKeyInput(event.target.value)} /></label>
      <div className="button-row">
        <button className="primary" disabled={saveKey.isPending || apiKeyInput.trim().length < 8} onClick={() => saveKey.mutate({ profileId, apiKey: apiKeyInput.trim() })}>{saveKey.isPending ? "Saving…" : meta.configured ? "Replace saved key" : "Save key"}</button>
        <button className="secondary" disabled={testConnection.isPending} onClick={() => testConnection.mutate({ profileId })}>{testConnection.isPending ? "Testing…" : "Test connection"}</button>
        {meta.configured && <button className="secondary danger-outline" disabled={clearKey.isPending} onClick={() => clearKey.mutate({ profileId })}>Remove key</button>}
      </div>
      {keyMessage && <p className="notice" role="status">{keyMessage}</p>}
      <p className="fine">The test asks the API for its model list and checks whether <code>sam-3.1</code> is available to this key. Meta documents a <code>404 model_not_found</code> outcome for accounts without model access — if that is the result, the lab shows it plainly instead of pretending SAM ran.</p>
    </section>

    <section className="sam-panel"><div className="section-title"><div><span className="eyebrow">Step 2</span><h2>Segment a still image</h2></div></div>
      <p>One concept phrase per request — people and pets are separate runs. The image is resized on this device (max 1280px edge) before it is sent. Returned regions are drawn over your image; toggle the blur preview to see exactly what mask blur would cover.</p>
      <div className="sam-lab-controls">
        <label>Concept phrase<select aria-label="SAM concept phrase" value={concept} onChange={(event) => setConcept(event.target.value)}>{samConcepts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="sam-upload">Test image<input aria-label="Choose a test image for SAM segmentation" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void prepareImage(file); }} /><small>{imageName ? imageName : "JPEG, PNG, or WebP · resized on-device before sending"}</small></label>
      </div>
      {previewUrl && <div className="sam-preview-wrap"><img src={previewUrl} alt="Your test image with SAM segmentation regions overlaid" />{regions.map((region, index) => <div key={index} className="sam-region" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, backdropFilter: showBlurPreview ? "blur(10px)" : undefined, WebkitBackdropFilter: showBlurPreview ? "blur(10px)" : undefined }}><span>{region.label}{region.confidence != null ? ` · ${Math.round(region.confidence * 100)}%` : ""}</span></div>)}</div>}
      {regions.length > 0 && <label className="check sam-blur-toggle"><input type="checkbox" checked={showBlurPreview} onChange={(event) => setShowBlurPreview(event.target.checked)} /><span>Preview mask blur inside the SAM regions</span></label>}
      <button className="primary" disabled={analyze.isPending || !imagePayload} onClick={() => { if (imagePayload) analyze.mutate({ profileId, concept, imageName: imageName || "test-image", imageMime: imagePayload.mime, imageBase64: imagePayload.base64 }); }}>{analyze.isPending ? "Sending to SAM 3.1…" : meta.configured ? `Run SAM 3.1 · concept “${concept}”` : "Run segmentation (no key — will record the honest no-key result)"}</button>
      {!meta.configured && <p className="fine">Without a key, this button records a <strong>no_key</strong> job and sends nothing to Meta. That is deliberate: the history below shows every attempt exactly as it happened.</p>}
      {labMessage && <p className="notice" role="status">{labMessage}</p>}
    </section>

    <section className="sam-panel"><div className="section-title"><div><span className="eyebrow">Evidence trail</span><h2>Segmentation job history</h2></div><span>{data.samJobs.length} recorded</span></div>
      {data.samJobs.length ? <div className="sam-job-list">{data.samJobs.map((job) => <article key={job.id}><div><Status value={job.status} /><strong>“{job.concept}”</strong><small>{job.mediaName || "image"} · {when(job.createdAt)}</small></div><p>{job.summary}</p>{job.regionCount != null && <small>{job.regionCount} region{job.regionCount === 1 ? "" : "s"} decoded</small>}{job.errorMessage && <small className="sam-job-error">{job.errorMessage}</small>}</article>)}</div> : <Empty title="No SAM jobs yet" text="Save a key, test the connection, and run the first image. Every attempt — success, no-key, or model_not_found — is recorded here." />}
    </section>

    <section className="sam-panel"><div className="section-title"><div><span className="eyebrow">Build tracker</span><h2>Meta-model build order</h2></div></div>
      <p>SAM 3.1 first, then Nova&apos;s Muse Spark brain, then Muse Image. Statuses save to the database; update them only when the step is genuinely true.</p>
      <div className="launch-items">{data.metaBuildItems.map((item) => <MetaBuildRow key={item.id} item={item} profileId={profileId} onChanged={onChanged} />)}</div>
    </section>

    <section className="sam-panel sam-policy"><span className="eyebrow">Unchanged &amp; non-negotiable</span><h2>Privacy rules do not move</h2><ul><li>Privacy Blur stays locked ON for childcare and caregiving tasks, with guardian consent and mandatory human review — SAM masks make blur more precise, never more optional.</li><li>Care recordings are never publicly shared, whichever engine processed them.</li><li>Until the video pipeline is verified with a real clip, submissions keep using the built-in mask engine and say so.</li><li>Pricing reference (checked Sept 2026, re-check at deploy): $2.50 per 1,000 images; $0.20 per 1,000 video frames — about $0.36 per concept for a 1-minute 30fps clip. Video limits: 15,000 frames, 16 tracked objects per frame; MP4/MOV H.264 accepted, WebM is not.</li></ul></section>
  </div>;
}

function Legal() {
  return <div className="page legal"><div className="page-heading"><span className="eyebrow">Draft policy center</span><h1>Trust, consent & rights</h1><p>These product rules are operational guidance, not final legal advice. A qualified professional must review policies before public launch.</p></div><section><h2>Data-use consent</h2><p>Each task must state whether submitted media may train AI, who may review it, the permitted license, how long clients may retain it, whether redistribution is allowed, and when consent can still be withdrawn. A contributor's acceptance is versioned and recorded.</p></section><section><h2>Recording rules</h2><p>Contributors may submit only recordings they are authorized to create and license. Avoid bystanders, passwords, financial records, confidential documents, private conversations, and hidden recording. Tasks involving children or educational settings require heightened review and age-appropriate consent.</p></section><section><h2>Work and classification</h2><p>Earnova does not label contributors as employees or independent contractors through this interface. Worker classification, minimum wage, overtime, tax reporting, payment, privacy, and international-operation obligations require jurisdiction-specific professional assessment.</p></section><section><h2>Payments and referrals</h2><p>Project funds, contributor liabilities, referral liabilities, and platform revenue must remain separate. Referral rewards are single-level, tied only to verified approved work, and subject to abuse controls, program limits, reversals, and available budget.</p></section><section><h2>Your controls</h2><ul><li>Request access, correction, deletion, or consent review through a support ticket.</li><li>Appeal a task decision with the original feedback and submission ID.</li><li>Withdraw consent where the applicable agreement and delivery status still permit it.</li><li>Never send bank or payment-app passwords to Earnova support.</li></ul></section></div>;
}
