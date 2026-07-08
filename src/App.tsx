import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Check,
  ClipboardList,
  Copy,
  UserCog,
  Dumbbell,
  Eye,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Shuffle,
  Scissors,
  Settings,
  Trash2,
  Bell,
  TrendingUp,
  UserCircle,
  Users,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type DragEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useTranslation } from "react-i18next";
import "./App.css";

// Charts are lazy-loaded so recharts stays out of the main bundle.
const RevenueChart = lazy(() => import("./RevenueChart"));
const ProgressChart = lazy(() => import("./ProgressChart"));
const WellnessChart = lazy(() => import("./WellnessChart"));

import {
  mapWithConcurrency,
  CACHE_KEYS,
  CATEGORY_OPTIONS,
  MOVEMENT_PATTERN_OPTIONS,
  RUNNING_ZONE_OPTIONS,
  STRENGTH_TRACKING_FIELDS,
  addDays,
  addMonths,
  buildExerciseAiPrompt,
  buildExerciseCueDraft,
  categoryPrescriptionDefaults,
  clearPersistentCache,
  composeExerciseNotes,
  dateToInputValue,
  effectiveTrackingFields,
  formatCalendarLabel,
  formatCalendarRangeLabel,
  formatMonthTitle,
  formatWeekStripLabel,
  getAssignmentColorClass,
  getDisplayTaskStatus,
  getMondayStart,
  getMonthCalendarDates,
  getMonthDates,
  getWorkoutColorClass,
  isCardioCategory,
  isCardioSectionName,
  isConditioningCategory,
  isFreshCache,
  languagePreferenceToCode,
  lookupTextMatches,
  makeExerciseLabel,
  normalizeDate,
  normalizeLookupText,
  normalizeTaskStatus,
  parseExerciseCueSections,
  parseExerciseNotes,
  readPersistentCache,
  toYoutubeEmbed,
  writePersistentCache,
} from "./appCore";
import type {
  AlternateExerciseDetail,
  AppMode,
  AssignableWorkout,
  AthleteMetric,
  BuilderLibraryMode,
  CachedData,
  CalendarActionMenuPayload,
  CalendarActionMenuState,
  CalendarDisplayMode,
  CalendarView,
  CheckInFilter,
  Client,
  ClientBucket,
  ClientProgramScheduleMode,
  ClientTab,
  Coach,
  CoachAnalytics,
  ContentAssignment,
  ContentResponse,
  ContentResponseGroup,
  CopiedCalendarItem,
  ExerciseDetail,
  ExerciseNoteMeta,
  ExerciseResult,
  ExerciseSetPrescription,
  LibraryExercise,
  Page,
  PortalCheckIn,
  ProductOrder,
  Program,
  ProgramExercise,
  ProgramReview,
  ProgramSession,
  SavedFormTemplate,
  SavedProgramTemplate,
  SavedTestItem,
  SavedTestTemplate,
  SetLog,
  SimpleTaskStatus,
  Subscription,
  Team,
  Toast,
  ToastType,
  TrackingType,
  WorkloadLog,
  Workout,
  WorkoutComment,
  WorkoutHistoryLog,
  WorkoutPageTab,
} from "./appCore";
import LandingPage from "./LandingPage";
import type { CelebrationVariant } from "./Celebration";

// A shared loading placeholder for code-split routes.
function PageFallback() {
  return <div className="lazyFallback" aria-busy="true" aria-live="polite" />;
}

// Wrap a dynamically-imported component in its own Suspense boundary. Each
// becomes a separate chunk, so the initial load (and the public landing
// path) no longer pulls every coach/portal page or modal into the main
// bundle. The per-component boundary keeps a swap from flashing the
// surrounding chrome; modals pass fallback={null} so opening one loads its
// chunk silently instead of showing a spinner.
function withSuspense<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  fallback: ReactNode = <PageFallback />,
) {
  const Lazy = lazy(factory);
  return function LazyRoute(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

const StorePage = withSuspense(() => import("./StorePage"));
const ClientInvitePage = withSuspense(() => import("./ClientInvitePage"));
const InPersonEnquiryPage = withSuspense(() => import("./InPersonEnquiryPage"));
const PortalWelcome = withSuspense(() => import("./PortalWelcome"));
const ReviewPage = withSuspense(() => import("./ReviewPage"));
const CoachClientsPage = withSuspense(() => import("./CoachClientsPage"));
const CoachOrdersPage = withSuspense(() => import("./CoachOrdersPage"));
const CoachTeamsPage = withSuspense(() => import("./CoachTeamsPage"));
const CoachRevenuePage = withSuspense(() => import("./CoachRevenuePage"));
const CoachBuilderPage = withSuspense(() => import("./CoachBuilderPage"));
const CoachLibraryPage = withSuspense(() => import("./CoachLibraryPage"));
const CoachTestsPage = withSuspense(() => import("./CoachTestsPage"));
const CoachesAdminPage = withSuspense(() => import("./CoachesAdminPage"));
const ClientWorkspace = withSuspense(() => import("./ClientWorkspace"));
const CheckInsPage = withSuspense(() => import("./CheckInsPage"));

// Modals/menus are only needed on interaction, never at first paint — split
// them out with a null fallback so opening one loads its chunk silently.
const WorkoutPlayerModal = withSuspense(() => import("./WorkoutPlayerModal"), null);
const ContentAssignmentModal = withSuspense(() => import("./ContentAssignmentModal"), null);
const AddClientModal = withSuspense(() => import("./AddClientModal"), null);
const AccountModal = withSuspense(() => import("./AccountModal"), null);
const ExerciseModal = withSuspense(() => import("./ExerciseModal"), null);
const ExerciseHistoryModal = withSuspense(() => import("./ExerciseHistoryModal"), null);
const CoachEditModal = withSuspense(() => import("./CoachEditModal"), null);
const CalendarActionMenu = withSuspense(() => import("./CalendarActionMenu"), null);
const AssignmentDrawer = withSuspense(() => import("./AssignmentDrawer"), null);
const CreateProgramModal = withSuspense(() => import("./CreateProgramModal"), null);
const ProgramPreviewModal = withSuspense(() => import("./ProgramPreviewModal"), null);
const Celebration = withSuspense(() => import("./Celebration"), null);

function App({ onReady }: { onReady?: () => void } = {}) {
  const { t, i18n } = useTranslation();
  // Fire the boot-splash "ready" signal exactly once, when the first meaningful
  // screen has its data: the client portal once its client resolves, the coach
  // console once the initial clients fetch settles.
  const bootReadyRef = useRef(false);
  const fireBootReady = () => {
    if (bootReadyRef.current) return;
    bootReadyRef.current = true;
    onReady?.();
  };
  // Load the ~2MB Chinese font set only when the language is Chinese.
  useEffect(() => {
    if (i18n.language === "zh") {
      void import("@fontsource/noto-sans-sc/chinese-simplified-400.css");
      void import("@fontsource/noto-sans-sc/chinese-simplified-900.css");
    }
  }, [i18n.language]);
  const inviteSearchParams = new URLSearchParams(window.location.search);
  const isClientInvite = inviteSearchParams.get("invite") === "client";
  const isInPersonEnquiry = inviteSearchParams.get("enquiry") === "inperson";
  const isClientPortal = inviteSearchParams.get("portal") === "client";
  const isCoachView = inviteSearchParams.get("view") === "coach";
  const publicPath = window.location.pathname.replace(/\/+$/, "") || "/";
  // Root is the public brand landing page. Store remains available at /store
  // and ?page=store. Coach app is at ?view=coach, athlete portal at
  // ?portal=client, intake at ?invite=client.
  const isStorePage =
    inviteSearchParams.get("page") === "store" || publicPath === "/store";
  const isPublicLandingPage =
    !isStorePage &&
    !isClientPortal &&
    !isClientInvite &&
    !isInPersonEnquiry &&
    !isCoachView;
  // Coach/portal-only styles live in a separate chunk (appInterior.css) so the
  // public bundle stays lean. Load it on demand when a coach or client is in.
  const needsInteriorCss = isCoachView || isClientPortal;
  const [interiorCssReady, setInteriorCssReady] = useState(!needsInteriorCss);
  useEffect(() => {
    if (!needsInteriorCss) return;
    let alive = true;
    void import("./appInterior.css").then(() => {
      if (alive) setInteriorCssReady(true);
    });
    return () => {
      alive = false;
    };
  }, [needsInteriorCss]);
  const clientPortalCode = (
    inviteSearchParams.get("client") ||
    inviteSearchParams.get("clientCode") ||
    ""
  ).trim();
  const publicInvitePackage = inviteSearchParams.get("package") || "Pending";
  // Deep-link a coach page via ?page=… (e.g. ?view=coach&page=Workouts opens
  // the program builder directly). Falls back to Clients.
  const [activePage, setActivePage] = useState<Page>(() => {
    const requested = inviteSearchParams.get("page");
    const coachPages: Page[] = [
      "Clients",
      "Teams",
      "Library",
      "Workouts",
      "Tests",
      "Review",
      "Coaches",
      "Orders",
      "Revenue",
    ];
    return requested && coachPages.includes(requested as Page)
      ? (requested as Page)
      : "Clients";
  });
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
  const [coachScope, setCoachScope] = useState("All Coaches");
  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const [coachSharePercent, setCoachSharePercent] = useState(70);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderProcessingId, setOrderProcessingId] = useState("");
  const [orderStartDates, setOrderStartDates] = useState<Record<string, string>>({});
  const [showManualOrderForm, setShowManualOrderForm] = useState(false);
  const [activationPortalLink, setActivationPortalLink] = useState("");
  const [activationClientName, setActivationClientName] = useState("");
  const [savingManualOrder, setSavingManualOrder] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    clientName: "",
    email: "",
    phone: "",
    productType: "Digital Program",
    programId: "",
    productName: "",
    amount: "",
    currency: "CNY",
    paymentStatus: "Paid",
    paymentProvider: "WeChat QR",
    paymentReference: "",
    assignedCoach: "Kent Bastell",
    purchasedAt: dateToInputValue(new Date()),
    accessStartDate: dateToInputValue(new Date()),
    accessEndDate: "",
    notes: "",
  });
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [savingCoach, setSavingCoach] = useState(false);
  const [coachForm, setCoachForm] = useState({
    name: "",
    email: "",
    phoneWechat: "",
    role: "Coach",
    status: "Active",
    bio: "",
  });
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("All");
  const [checkInSearch, setCheckInSearch] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("Due");
  const [savingCheckInClientId, setSavingCheckInClientId] = useState("");
  const [checkInFormClient, setCheckInFormClient] = useState<Client | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    bodyWeight: "",
    sleepQuality: "",
    energy: "",
    mood: "",
    stress: "",
    soreness: "",
    nutritionNotes: "",
    trainingNotes: "",
    wins: "",
    problemsPain: "",
  });
  const [clientBucket, setClientBucket] = useState<ClientBucket>("All Clients");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [updatingClientStatus, setUpdatingClientStatus] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const appMode: AppMode = isClientPortal ? "Client" : "Coach";
  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; type: string; read: boolean; createdAt: string }[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [coachInvitePackage, setCoachInvitePackage] = useState("Pending");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    trainingFormat: "Online Coaching",
    // Body basics
    dob: "",
    gender: "",
    height: "",
    weight: "",
    // Training background
    experience: "",
    sport: "",
    currentTraining: "",
    // Availability & equipment
    daysPerWeek: "",
    sessionLength: "",
    equipment: "",
    // Goals / free text
    goals: "",
    notes: "",
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteSubmitted, setInviteSubmitted] = useState(false);
  const [inviteClientId, setInviteClientId] = useState("");
  const [inviteLang, setInviteLang] = useState<"en" | "zh">(() =>
    localStorage.getItem("nl_public_lang") === "zh" ? "zh" : "en"
  );
  useEffect(() => {
    localStorage.setItem("nl_public_lang", inviteLang);
  }, [inviteLang]);
  // In-person training & consulting enquiry form.
  const [enquiryForm, setEnquiryForm] = useState({
    contactPerson: "",
    contact: "",
    organization: "",
    athletes: "",
    duration: "",
    notes: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  // Language survives full-page navigation between landing/store/invite.
  const [storeLang, setStoreLang] = useState<"en" | "zh">(() =>
    localStorage.getItem("nl_public_lang") === "zh" ? "zh" : "en"
  );
  useEffect(() => {
    localStorage.setItem("nl_public_lang", storeLang);
  }, [storeLang]);
  const [storeLauncherOpen, setStoreLauncherOpen] = useState(false);
  const [storeLauncherClient, setStoreLauncherClient] = useState("");
  const [programsLoading, setProgramsLoading] = useState(false);
  const [storeSelectedProgram, setStoreSelectedProgram] = useState<Program | null>(null);
  const storeStepIntentRef = useRef<number | null>(null);
  const [storeSelectedAddonIds, setStoreSelectedAddonIds] = useState<string[]>([]);
  // Store checkout step: 1 = details, 2 = add-ons, 3 = cart + payment.
  const [storeStep, setStoreStep] = useState(1);
  const [storeCategoryFilter, setStoreCategoryFilter] = useState("all");
  const [storeSeasonFilter, setStoreSeasonFilter] = useState("all");
  const [storeProgramSearch, setStoreProgramSearch] = useState("");
  // Which store FAQ row is expanded (accordion; null = all collapsed).
  const [storeFaqOpen, setStoreFaqOpen] = useState<number | null>(0);
  const [storeRegName, setStoreRegName] = useState("");
  const [storeRegPhone, setStoreRegPhone] = useState("");
  const [storeRegistering, setStoreRegistering] = useState(false);
  const [storeRegisteredCode, setStoreRegisteredCode] = useState("");
  const [storeRegisteredOrderId, setStoreRegisteredOrderId] = useState("");
  // Payment note code: the buyer writes it in their WeChat transfer note so the
  // coach can one-tap match payments to orders. Generated once per checkout.
  const [storePaymentCode, setStorePaymentCode] = useState("");
  // "Find my portal" recovery modal (store page).
  const [findPortalOpen, setFindPortalOpen] = useState(false);
  const [findPortalName, setFindPortalName] = useState("");
  const [findPortalPhone, setFindPortalPhone] = useState("");
  const [findPortalBusy, setFindPortalBusy] = useState(false);
  const [findPortalError, setFindPortalError] = useState("");
  const [portalPostIntake, setPortalPostIntake] = useState(false);
  const [portalAutoLoading, setPortalAutoLoading] = useState(false);
  const [portalLoadedProgram, setPortalLoadedProgram] = useState("");
  // Post-intake start-date chooser (today / Monday / custom) before auto-load.
  const [portalStartPicker, setPortalStartPicker] = useState(false);
  const [portalStartCustom, setPortalStartCustom] = useState("");
  // Remember the athlete's portal in this browser so returning visitors can
  // reopen it from the store without re-entering anything.
  const [rememberedPortalCode] = useState(() => {
    try {
      return window.localStorage.getItem("nl_portal_code") || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    if (isClientPortal && clientPortalCode) {
      try {
        window.localStorage.setItem("nl_portal_code", clientPortalCode);
      } catch {
        // Storage unavailable (private mode) — portal still works via URL.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Mint a fresh payment note code whenever the buyer reaches the pay step.
  useEffect(() => {
    if (storeStep === 3 && !storePaymentCode) {
      setStorePaymentCode(makePaymentCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStep, storePaymentCode]);
  // Post-submit celebration card (optimistic — shows instantly, syncs behind).
  const [workoutCelebration, setWorkoutCelebration] = useState<{
    sessionName: string;
    dateLabel: string;
    exercises: number;
    sets: number;
    volumeKg: number;
    rpe: number | null;
    durationMin: number;
    payload: Record<string, unknown>;
    draftKey: string;
  } | null>(null);
  // Which animated celebration variant plays for the current submission.
  const [celebrationVariant, setCelebrationVariant] =
    useState<CelebrationVariant>("fistbump");
  const lastCelebrationVariantRef = useRef<CelebrationVariant | null>(null);
  const pickCelebrationVariant = (): CelebrationVariant => {
    const all: CelebrationVariant[] = ["fistbump", "highfive", "thumbsup"];
    const choices = all.filter((v) => v !== lastCelebrationVariantRef.current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    lastCelebrationVariantRef.current = next;
    return next;
  };
  // A failed background sync is kept here so its Retry survives the celebration
  // being dismissed — a logged workout must never be silently lost.
  const [failedSubmission, setFailedSubmission] = useState<{
    payload: Record<string, unknown>;
    draftKey: string;
  } | null>(null);
  // Store checkout staged progress (the activation call takes several seconds).
  const [storeRegStage, setStoreRegStage] = useState(0);
  // Duplicate a whole program (record + all sessions) server-side.
  const [duplicatingProgramId, setDuplicatingProgramId] = useState("");
  const duplicateSavedProgram = async (program: { recordId: string; programName: string }) => {
    setDuplicatingProgramId(program.recordId);
    try {
      const res = await fetch("/api/duplicateProgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programRecordId: program.recordId, mode: "program" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "failed");
      notify(
        `Duplicated "${program.programName}" — ${data.sessionsCopied} sessions copied.`,
        "success"
      );
      await loadPrograms(true);
    } catch (error) {
      console.error(error);
      notify("Could not duplicate the program.", "error");
    } finally {
      setDuplicatingProgramId("");
    }
  };

  // Coach review queue for athlete form videos.
  const [reviewFormVideos, setReviewFormVideos] = useState<
    Array<{
      recordId: string;
      clientId: string;
      clientName: string;
      exerciseName: string;
      workoutName: string;
      videoUrl: string;
      status: string;
    }>
  >([]);
  const [formVideoReplies, setFormVideoReplies] = useState<
    Record<string, string>
  >({});
  const loadFormVideos = async () => {
    try {
      const res = await fetch("/api/formVideos");
      const data = await res.json();
      if (Array.isArray(data.videos)) setReviewFormVideos(data.videos);
    } catch {
      // review panel simply stays empty
    }
  };
  useEffect(() => {
    if (isClientPortal) return;
    if (activePage === "Review" || activePage === "Clients") {
      void loadFormVideos();
    }
    // The Clients-page "Today" strip needs the review queue + subscriptions.
    if (activePage === "Clients") {
      void loadCoachReviewQueue();
      void loadSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);
  const reviewFormVideo = async (recordId: string) => {
    try {
      const res = await fetch("/api/formVideos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          coachReply: formVideoReplies[recordId] || "",
          status: "Reviewed",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "failed");
      setReviewFormVideos((cur) =>
        cur.map((v) =>
          v.recordId === recordId ? { ...v, status: "Reviewed" } : v
        )
      );
      notify("Video reviewed.", "success");
    } catch {
      notify("Could not save the review.", "error");
    }
  };

  // Form-video review (premium: online / in-person clients only).
  const formVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [formVideoExercise, setFormVideoExercise] = useState<{
    exerciseId: string;
    exerciseName: string;
  } | null>(null);
  const [formVideoBusy, setFormVideoBusy] = useState(false);
  const [formVideoSentIds, setFormVideoSentIds] = useState<string[]>([]);
  // Deferred (arrow) — selectedClient is declared further down the component.
  const isPremiumClient = () =>
    isClientPortal &&
    /online|in-person/i.test(String(selectedClient?.clientType || ""));
  const submitFormVideo = async (file: File) => {
    if (!formVideoExercise || !selectedClient) return;
    setFormVideoBusy(true);
    try {
      const uploadRes = await fetch(
        `/api/uploadFormVideoFile?name=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Upload failed");
      }
      const metaRes = await fetch("/api/formVideos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.clientCode || selectedClient.id,
          clientName: selectedClient.name,
          exerciseName: formVideoExercise.exerciseName,
          workoutName: selectedWorkout
            ? localizedWorkoutName(selectedWorkout)
            : "",
          videoUrl: uploadData.url,
        }),
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.success) {
        throw new Error(metaData.error || "Could not send video");
      }
      setFormVideoSentIds((cur) => [...cur, formVideoExercise.exerciseId]);
      notify(
        paceZh
          ? "视频已发送给教练 ✓"
          : "Form video sent to your coach ✓",
        "success"
      );
    } catch (error) {
      console.error(error);
      notify(
        paceZh
          ? "视频发送失败，请重试。"
          : "Video failed to send — try again.",
        "error"
      );
    } finally {
      setFormVideoBusy(false);
      setFormVideoExercise(null);
      if (formVideoInputRef.current) formVideoInputRef.current.value = "";
    }
  };
  // One-time first-workout coach marks (per browser).
  const [playerTutorialOpen, setPlayerTutorialOpen] = useState(false);
  // Timed-circuit (AMRAP/EMOM) stopwatch + rounds score for the focus player.
  const [wodTimer, setWodTimer] = useState({
    running: false,
    startedAt: 0,
    accumulatedMs: 0,
    // The exercise id of the circuit this clock belongs to. A second timed
    // block in the same workout gets a fresh card instead of inheriting
    // this one's elapsed time and rounds.
    groupId: "",
  });
  const [wodRounds, setWodRounds] = useState(0);
  const [, setWodTick] = useState(0);
  useEffect(() => {
    if (!wodTimer.running) return;
    const id = window.setInterval(() => setWodTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [wodTimer.running]);
  const wodElapsedMs =
    wodTimer.accumulatedMs +
    (wodTimer.running ? Date.now() - wodTimer.startedAt : 0);
  const resetWodState = () => {
    setWodTimer({ running: false, startedAt: 0, accumulatedMs: 0, groupId: "" });
    setWodRounds(0);
  };
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    coach: "Kent Bastell",
    primaryCoachId: "",
    secondaryCoachId: "",
    clientType: "Online Coaching",
    packageType: "Active",
    packageName: "",
    subscriptionStatus: "Active",
    intakeStatus: "Not Sent",
    paymentStatus: "Unpaid",
    source: "Manual Entry",
    purchasedProgramId: "",
    accessStartDate: "",
    accessEndDate: "",
    paymentId: "",
    startDate: dateToInputValue(new Date()),
    notes: "",
    languagePreference: "English",
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>("Home");
  // Portal Home sub-pages (swipeable): Tasks / Records / Metrics.
  const [portalHomeTab, setPortalHomeTab] = useState<
    "tasks" | "records" | "metrics" | "workload"
  >("tasks");
  // My Programs sub-tabs: progress / edit (scheduling) / store (cross-sell).
  const [programsTab, setProgramsTab] = useState<"progress" | "edit" | "store">(
    "progress"
  );
  // Shareable "program complete" finisher card (rendered to a PNG the athlete
  // can long-press to save / share to WeChat moments).
  const [finisherOpen, setFinisherOpen] = useState(false);
  const [finisherUrl, setFinisherUrl] = useState("");
  const [finisherBusy, setFinisherBusy] = useState(false);
  // Client-facing daily wellness check-in (coached clients only). Short daily
  // readiness + a fuller weekly form; feeds the coach load dashboard.
  const [clientCheckIns, setClientCheckIns] = useState<PortalCheckIn[]>([]);
  // Athlete inbox: coach replies (check-ins + form videos) surfaced on Home.
  const [portalVideoReplies, setPortalVideoReplies] = useState<
    Array<{ id: string; exerciseName: string; coachReply: string; at: number }>
  >([]);
  const [inboxSeenAt, setInboxSeenAt] = useState(() => {
    try {
      return Number(window.localStorage.getItem("nl_inbox_seen") || 0);
    } catch {
      return 0;
    }
  });
  const markInboxSeen = (latest: number) => {
    if (latest <= inboxSeenAt) return;
    setInboxSeenAt(latest);
    try {
      window.localStorage.setItem("nl_inbox_seen", String(latest));
    } catch {
      // ignore
    }
  };
  // Aggregated feed, newest first. Check-in reply timestamps come from the
  // reviewed/submitted date; video replies use their submit time.
  const coachInboxItems = () => {
    const items: Array<{
      id: string;
      kind: "checkin" | "video";
      title: string;
      body: string;
      at: number;
    }> = [];
    for (const c of clientCheckIns) {
      if (!c.coachResponse?.trim()) continue;
      const at = new Date(
        `${c.reviewedDate || c.submittedDate}T12:00:00`
      ).getTime();
      if (!Number.isFinite(at)) continue;
      items.push({
        id: `ci-${c.recordId}`,
        kind: "checkin",
        title: paceZh ? "打卡回复" : "Check-in reply",
        body: c.coachResponse,
        at,
      });
    }
    for (const v of portalVideoReplies) {
      items.push({
        id: `fv-${v.id}`,
        kind: "video",
        title: paceZh
          ? `动作视频反馈 · ${v.exerciseName}`
          : `Form feedback · ${v.exerciseName}`,
        body: v.coachReply,
        at: v.at,
      });
    }
    return items.sort((a, b) => b.at - a.at).slice(0, 12);
  };
  useEffect(() => {
    if (!isClientPortal || !selectedClient) return;
    void (async () => {
      try {
        const res = await fetch("/api/formVideos");
        const data = await res.json();
        if (!Array.isArray(data.videos)) return;
        const mine = data.videos
          .filter(
            (v: any) =>
              v.coachReply &&
              (v.clientId === selectedClient.clientCode ||
                v.clientId === selectedClient.id)
          )
          .map((v: any) => ({
            id: v.recordId,
            exerciseName: v.exerciseName || "Exercise",
            coachReply: v.coachReply,
            at: Number(v.submittedAt) || 0,
          }));
        setPortalVideoReplies(mine);
      } catch {
        // feed stays check-in-only
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientPortal, selectedClient?.id]);

  // Today's readiness (from the daily check-in) for adaptive load hints.
  const latestReadiness = () => {
    const today = dateToInputValue(new Date());
    const yesterday = dateToInputValue(new Date(Date.now() - 86400000));
    const recent = clientCheckIns.find(
      (c) =>
        (c.submittedDate === today || c.submittedDate === yesterday) &&
        String(c.readinessScore || "").trim()
    );
    if (!recent) return null;
    const score = Number(recent.readinessScore);
    return Number.isFinite(score) ? score : null;
  };

  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [wellnessSaving, setWellnessSaving] = useState(false);
  const [wellnessThanks, setWellnessThanks] = useState(false);
  const [wellnessForm, setWellnessForm] = useState({
    sleep: 0,
    sleepHours: "",
    energy: 0,
    soreness: 0,
    mood: 0,
    stress: 0,
    bodyWeight: "",
    notes: "",
  });
  // Coach client "Dashboard" sub-tabs: Sport Science (load + wellness) vs Activity.
  const [coachDashTab, setCoachDashTab] = useState<"science" | "activity">(
    "science"
  );
  // Coach wellness-trend chart: which metric to plot for the selected client.
  const [wellnessMetric, setWellnessMetric] = useState<
    "readiness" | "sleep" | "sleepHours" | "energy" | "soreness" | "mood" | "stress" | "bodyWeight"
  >("readiness");
  // Program rating / testimonial capture (on completion) + coach moderation.
  const [clientReviews, setClientReviews] = useState<ProgramReview[]>([]);
  const [storeReviews, setStoreReviews] = useState<ProgramReview[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewProgram, setReviewProgram] = useState<{
    programId: string;
    programName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewQuote, setReviewQuote] = useState("");
  const [reviewShowStore, setReviewShowStore] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [coachReviews, setCoachReviews] = useState<ProgramReview[]>([]);
  const [reviewUpdatingId, setReviewUpdatingId] = useState("");
  // "Start here" program intro — dismissed per program (persisted), reopenable.
  const [startHereDismissed, setStartHereDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("nl_starthere_dismissed") || "[]");
    } catch {
      return [];
    }
  });
  const [startHereForcedPid, setStartHereForcedPid] = useState("");
  const homeTouchRef = useRef<{ x: number; y: number } | null>(null);
  // Athlete weekly workload self-report (technical + extra cardio sessions).
  const [workloadLogs, setWorkloadLogs] = useState<WorkloadLog[]>([]);
  const [workloadDay, setWorkloadDay] = useState("");
  const [workloadSaving, setWorkloadSaving] = useState(false);
  const [workloadDraft, setWorkloadDraft] = useState<{
    techAmRpe: string;
    techAmMin: string;
    techPmRpe: string;
    techPmMin: string;
    cardioRpe: string;
    cardioMin: string;
    notes: string;
  }>({
    techAmRpe: "",
    techAmMin: "",
    techPmRpe: "",
    techPmMin: "",
    cardioRpe: "",
    cardioMin: "",
    notes: "",
  });
  // All athletes' assigned workouts, for the coach roster load watch.
  const [rosterLoadWorkouts, setRosterLoadWorkouts] = useState<Workout[]>([]);
  const [calendarView, setCalendarView] = useState<CalendarView>("Week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientWeekStartDate, setClientWeekStartDate] = useState(
    getMondayStart(dateToInputValue(new Date()))
  );
  const [clientMonthAnchorDate, setClientMonthAnchorDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientCalendarStyle, setClientCalendarStyle] =
    useState<CalendarDisplayMode>("Week");
  const [selectedClientProgramId, setSelectedClientProgramId] = useState("");
  const [clientProgramScheduleMode, setClientProgramScheduleMode] =
    useState<ClientProgramScheduleMode>("Month");
  const [clientProgramStartDate, setClientProgramStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [clientProgramWeekStarts, setClientProgramWeekStarts] = useState<
    Record<string, string>
  >({});
  const [clientProgramDayDates, setClientProgramDayDates] = useState<
    Record<string, string>
  >({});
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(() => {
    if (typeof window === "undefined") return "kg";
    return window.localStorage.getItem("nl_weight_unit") === "lb" ? "lb" : "kg";
  });
  const setWeightUnitPref = (unit: "kg" | "lb") => {
    setWeightUnit(unit);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nl_weight_unit", unit);
    }
  };
  // All weights are stored in kg; convert only for display when lb is chosen.
  const KG_TO_LB = 2.20462;
  const [clientProgramSessions, setClientProgramSessions] = useState<
    AssignableWorkout[]
  >([]);
  const [loadingClientProgramSessions, setLoadingClientProgramSessions] =
    useState(false);
  const [populatingClientProgram, setPopulatingClientProgram] = useState(false);
  const [showCalendarActionMenu, setShowCalendarActionMenu] = useState(false);
  const [showAssignmentDrawer, setShowAssignmentDrawer] = useState(false);
  const [workoutPageTab, setWorkoutPageTab] =
    useState<WorkoutPageTab>("Saved Programs");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [contentAssignments, setContentAssignments] = useState<ContentAssignment[]>(
    []
  );
  // Submissions are loaded for the calendar/task flows; the dashboard no longer
  // lists them directly, so only the setter is bound here.
  const [, setContentResponses] = useState<ContentResponse[]>([]);
  const [contentResponsesLoading, setContentResponsesLoading] = useState(false);
  const [athleteMetrics, setAthleteMetrics] = useState<AthleteMetric[]>([]);
  const [athleteMetricsLoading, setAthleteMetricsLoading] = useState(false);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  // Cross-client Clients list: per-client 7-day training activity, keyed by
  // client record id. Quiet-loaded from /api/analytics on the Clients page.
  const [, setClientActivityMap] = useState<
    Record<string, { completed7d: number; scheduled7d: number }>
  >({});
  // Coach Overview: editable Coach Notes (draft + saving state).
  const [coachNotesDraft, setCoachNotesDraft] = useState("");
  const [savingCoachNotes, setSavingCoachNotes] = useState(false);
  // Coach Overview: which PR metric drives the leaderboard ordering.
  const [prMetric, setPrMetric] = useState<"weight" | "e1rm" | "volume">("e1rm");
  // Coach Overview: collapse the long account/profile detail list by default.
  const [overviewDetailsOpen, setOverviewDetailsOpen] = useState(false);
  const [workoutComments, setWorkoutComments] = useState<WorkoutComment[]>([]);
  const [reviewingWorkoutCommentKey, setReviewingWorkoutCommentKey] = useState("");
  const [selectedContentSubmission, setSelectedContentSubmission] =
    useState<ContentResponseGroup | null>(null);
  const [orderReviewOrder, setOrderReviewOrder] = useState<ProductOrder | null>(
    null
  );
  const [orderReviewResponses, setOrderReviewResponses] = useState<
    ContentResponseGroup[]
  >([]);
  const [orderReviewLoading, setOrderReviewLoading] = useState(false);
  const [coachReviewResponses, setCoachReviewResponses] = useState<
    ContentResponse[]
  >([]);
  const [coachReviewComments, setCoachReviewComments] = useState<
    WorkoutComment[]
  >([]);
  const [coachReviewWorkouts, setCoachReviewWorkouts] = useState<Workout[]>([]);
  // Unreviewed check-ins across all clients + the coach's in-progress replies.
  const [coachReviewCheckIns, setCoachReviewCheckIns] = useState<
    (PortalCheckIn & { clientName?: string })[]
  >([]);
  const [checkInReplyDrafts, setCheckInReplyDrafts] = useState<
    Record<string, string>
  >({});
  const [checkInReplySaving, setCheckInReplySaving] = useState("");
  // In-person enquiries waiting for the coach to action.
  const [coachReviewEnquiries, setCoachReviewEnquiries] = useState<any[]>([]);
  const [coachReviewLoading, setCoachReviewLoading] = useState(false);
  const [coachReviewError, setCoachReviewError] = useState("");
  const [openReviewSections, setOpenReviewSections] = useState<
    Record<string, boolean>
  >({ comments: true, missed: true, submissions: true, checkins: true, enquiries: true });
  const toggleReviewSection = (key: string) =>
    setOpenReviewSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [activeContentAssignment, setActiveContentAssignment] =
    useState<ContentAssignment | null>(null);
  const [contentAssignmentAnswers, setContentAssignmentAnswers] = useState<
    Record<string, string>
  >({});
  const [contentAssignmentComment, setContentAssignmentComment] = useState("");
  const [submittingContentAssignment, setSubmittingContentAssignment] =
    useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<ExerciseDetail[]>([]);
  // The programmed exercises as loaded, so an alternate swap can revert to the
  // original. Captured on load; never mutated (swaps replace workoutDetails).
  const originalExercisesRef = useRef<ExerciseDetail[]>([]);
  // The exercise whose alternate-picker sheet is open in the player (or null).
  const [alternatePickerExercise, setAlternatePickerExercise] =
    useState<ExerciseDetail | null>(null);
  // Retry bookkeeping for resolving the portal's client (handles a transient
  // empty /api/clients response so a valid link doesn't show "could not find").
  const portalResolveAttempts = useRef(0);
  const [portalResolveExhausted, setPortalResolveExhausted] = useState(false);
  // Never let the alternate picker linger once the workout player is closed.
  useEffect(() => {
    if (workoutDetails.length === 0 && alternatePickerExercise) {
      setAlternatePickerExercise(null);
    }
  }, [workoutDetails.length, alternatePickerExercise]);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [restTimer, setRestTimer] = useState<{
    remaining: number;
    total: number;
    running: boolean;
    label: string;
  } | null>(null);
  const restAudioRef = useRef<AudioContext | null>(null);
  const [workoutSubmissionNote, setWorkoutSubmissionNote] = useState("");
  const [workoutHistoryLogs, setWorkoutHistoryLogs] = useState<WorkoutHistoryLog[]>(
    []
  );
  const [workoutLoggingStarted, setWorkoutLoggingStarted] = useState(false);
  // First-workout tutorial: show once per browser, the first time logging opens.
  useEffect(() => {
    if (!isClientPortal || !workoutLoggingStarted) return;
    try {
      if (!window.localStorage.getItem("nl_player_tutorial_seen")) {
        setPlayerTutorialOpen(true);
      }
    } catch {
      // storage unavailable — skip the tutorial rather than nag every time
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutLoggingStarted]);
  const dismissPlayerTutorial = () => {
    setPlayerTutorialOpen(false);
    try {
      window.localStorage.setItem("nl_player_tutorial_seen", "1");
    } catch {
      // ignore
    }
  };
  const [workoutFocusMode, setWorkoutFocusMode] = useState(true);
  const [workoutFocusIndex, setWorkoutFocusIndex] = useState(0);
  const [workoutFocusSetRound, setWorkoutFocusSetRound] = useState(1);
  const focusTouchRef = useRef<{ x: number; y: number } | null>(null);
  const workoutStartedAtRef = useRef<number | null>(null);
  // Pre-save finish/review screen (edit + session RPE + celebrate, then save).
  const [workoutFinishOpen, setWorkoutFinishOpen] = useState(false);
  const [workoutRpe, setWorkoutRpe] = useState<number | null>(null);
  const [finishDurationMin, setFinishDurationMin] = useState(0);
  const [finishExpanded, setFinishExpanded] = useState<Record<string, boolean>>(
    {}
  );
  const [savedExerciseDraftIds, setSavedExerciseDraftIds] = useState<string[]>([]);
  const [checkedWorkoutPageItems, setCheckedWorkoutPageItems] = useState<string[]>(
    []
  );
  const [workoutVideoOverlay, setWorkoutVideoOverlay] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [openWorkoutActionMenuId, setOpenWorkoutActionMenuId] = useState("");
  const [historyExerciseName, setHistoryExerciseName] = useState("");
  const [expandedHistoryDates, setExpandedHistoryDates] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [editingWorkoutDate, setEditingWorkoutDate] = useState("");
  const [updatingWorkoutDate, setUpdatingWorkoutDate] = useState(false);
  const [draggingWorkoutId, setDraggingWorkoutId] = useState("");
  const [draggingAssignmentId, setDraggingAssignmentId] = useState("");
  const [clientCalendarWorkoutOrder, setClientCalendarWorkoutOrder] = useState<
    Record<string, string[]>
  >({});
  const [calendarDropWorkoutId, setCalendarDropWorkoutId] = useState("");
  const movingWorkoutId = "";
  const movingAssignmentId = "";
  const [copiedCalendarItem, setCopiedCalendarItem] =
    useState<CopiedCalendarItem | null>(null);
  const [calendarActionMenu, setCalendarActionMenu] =
    useState<CalendarActionMenuState | null>(null);
  const clientCalendarTouchDrag = useRef<{
    workoutId: string;
    date: string;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClientCalendarTouchClick = useRef(false);
  const calendarLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const calendarLongPressOpened = useRef(false);
  const [useMobileWorkoutRows, setUseMobileWorkoutRows] = useState(false);

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState("All");
  const [progressSearch, setProgressSearch] = useState("");
  const [selectedProgressExercise, setSelectedProgressExercise] = useState("");
  // Which number the per-lift trend chart plots: "e1rm" (rep-normalised
  // estimated 1RM — the fairest progression line), "top" (heaviest set that
  // day) or "volume" (Σ weight×reps that day).
  const [progressTrendMetric, setProgressTrendMetric] = useState<
    "e1rm" | "top" | "volume"
  >("e1rm");
  const clientsCacheRef = useRef<{ data: Client[]; timestamp: number } | null>(
    null
  );
  const exerciseLibraryCacheRef = useRef<{
    data: LibraryExercise[];
    timestamp: number;
  } | null>(null);
  const workoutCacheRef = useRef<
    Record<string, { data: Workout[]; timestamp: number }>
  >({});
  const productOrdersCacheRef = useRef<CachedData<ProductOrder[]> | null>(null);
  const programsCacheRef = useRef<CachedData<Program[]> | null>(null);
  const formTemplatesCacheRef =
    useRef<CachedData<SavedFormTemplate[]> | null>(null);
  const testTemplatesCacheRef =
    useRef<CachedData<SavedTestTemplate[]> | null>(null);
  const pendingWorkoutMoveIds = useRef(new Set<string>());
  const pendingAssignmentMoveIds = useRef(new Set<string>());
  const workoutMoveVersions = useRef<Record<string, number>>({});
  const assignmentMoveVersions = useRef<Record<string, number>>({});
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [technicalCueExercise, setTechnicalCueExercise] =
    useState<LibraryExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(
    null
  );
  const [savingExercise, setSavingExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    exerciseId: "",
    exerciseName: "",
    videoUrl: "",
    longVideoUrl: "",
    category: "",
    muscleGroup: "",
    movementPattern: "",
    equipment: "",
    notes: "",
    trackingType: "Weight" as TrackingType,
    isUnilateral: false,
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedSavedProgramId, setSelectedSavedProgramId] = useState("");
  const [deletingSavedProgramId, setDeletingSavedProgramId] = useState("");
  const [savedProgramTemplates, setSavedProgramTemplates] = useState<
    SavedProgramTemplate[]
  >([]);
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(false);
  const [savedAssignClientId, setSavedAssignClientId] = useState("");
  const [savedAssignStartDate, setSavedAssignStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [savedAssignableWorkouts, setSavedAssignableWorkouts] = useState<
    AssignableWorkout[]
  >([]);
  const [savedAssignLoading, setSavedAssignLoading] = useState(false);
  const [savedAssigningProgram, setSavedAssigningProgram] = useState(false);
  const [savedProgramSearch, setSavedProgramSearch] = useState("");
  const [savedProgramProductFilter, setSavedProgramProductFilter] = useState("All");
  const [selectedAssignProgramId, setSelectedAssignProgramId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(dateToInputValue(new Date()));
  const [assignableWorkouts, setAssignableWorkouts] = useState<AssignableWorkout[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigningProgram, setAssigningProgram] = useState(false);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subDraft, setSubDraft] = useState<{
    plan: string;
    price: string;
    currency: string;
    billingCycle: string;
    startDate: string;
    nextBillingDate: string;
    status: string;
    autoRenew: boolean;
    paymentId: string;
  }>({
    plan: "Online Coaching",
    price: "",
    currency: "CNY",
    billingCycle: "1 Month",
    startDate: "",
    nextBillingDate: "",
    status: "Active",
    autoRenew: false,
    paymentId: "",
  });
  const [savingSub, setSavingSub] = useState(false);

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [editingTeam, setEditingTeam] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamDraft, setTeamDraft] = useState<{
    name: string;
    notes: string;
    focus: string;
    memberIds: string[];
    positions: Record<string, string>;
    groups: string[];
  }>({
    name: "",
    notes: "",
    focus: "",
    memberIds: [],
    positions: {},
    groups: [],
  });
  const [teamGroupInput, setTeamGroupInput] = useState("");
  const [teamAssignSubgroup, setTeamAssignSubgroup] = useState("All");
  // Teams table UI
  const [teamRowMenuId, setTeamRowMenuId] = useState("");
  const [teamInviteId, setTeamInviteId] = useState("");
  const [teamInviteMemberIds, setTeamInviteMemberIds] = useState<string[]>([]);
  const [teamPlannedCounts, setTeamPlannedCounts] = useState<
    Record<string, number>
  >({});
  // Athlete Account modal
  const [accountClientId, setAccountClientId] = useState("");
  const [accountDraft, setAccountDraft] = useState<{
    tags: string[];
    categories: string[];
  }>({ tags: [], categories: [] });
  const [accountTagInput, setAccountTagInput] = useState("");
  const [accountCategoryInput, setAccountCategoryInput] = useState("");
  // Roster: multi-select bulk actions + sort + group-by
  const [rosterSelectedIds, setRosterSelectedIds] = useState<string[]>([]);
  const [rosterSort, setRosterSort] = useState<{
    key: "name" | "type" | "lastLogin" | "teams" | "engagement";
    dir: "asc" | "desc";
  }>({ key: "name", dir: "asc" });
  const [rosterGroupBy, setRosterGroupBy] = useState<
    "none" | "team" | "type" | "tag" | "category"
  >("none");
  const [rosterTriage, setRosterTriage] = useState<
    "" | "needsProgram" | "needsContact" | "needsCheckIn" | "inactive"
  >("");
  const [bulkPanel, setBulkPanel] = useState<"" | "program" | "team" | "tag">("");
  const [bulkProgramId, setBulkProgramId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [accountProgramId, setAccountProgramId] = useState("");
  const [accountStartDate, setAccountStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [savingAccount, setSavingAccount] = useState(false);
  const [teamAssignProgramId, setTeamAssignProgramId] = useState("");
  const [teamAssignStartDate, setTeamAssignStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [teamAssigning, setTeamAssigning] = useState(false);
  // Which athletes are checked to receive the program (defaults to all members).
  const [teamAssignSelectedIds, setTeamAssignSelectedIds] = useState<string[]>([]);
  // Teams table: sort + quick "assign program to the whole squad"
  const [teamSort, setTeamSort] = useState<{
    key: "name" | "planned" | "athletes" | "focus" | "created";
    dir: "asc" | "desc";
  }>({ key: "name", dir: "asc" });
  const [teamQuickAssignId, setTeamQuickAssignId] = useState("");
  const [teamQuickProgramId, setTeamQuickProgramId] = useState("");
  const [teamQuickStartDate, setTeamQuickStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [teamQuickBusy, setTeamQuickBusy] = useState(false);
  // Teams table: multi-select bulk (assign a program across several squads)
  const [teamSelectedIds, setTeamSelectedIds] = useState<string[]>([]);
  const [teamBulkPanel, setTeamBulkPanel] = useState<"" | "program">("");
  const [teamBulkProgramId, setTeamBulkProgramId] = useState("");
  const [teamBulkStartDate, setTeamBulkStartDate] = useState(
    dateToInputValue(new Date())
  );
  const [teamBulkBusy, setTeamBulkBusy] = useState(false);

  const [programName, setProgramName] = useState("Foundation Program");
  const [programGoal, setProgramGoal] = useState("General Strength");
  const [programSport, setProgramSport] = useState("Fitness");
  const [programLevel, setProgramLevel] = useState("Beginner");
  const [programDurationWeeks, setProgramDurationWeeks] = useState("4");
  const [programPhase, setProgramPhase] = useState("Foundation");
  const [programSessionsPerWeek, setProgramSessionsPerWeek] = useState("3");
  const [programCoach, setProgramCoach] = useState("Kent Bastell");
  const [programProductType, setProgramProductType] = useState("Digital Program");
  const [programPrice, setProgramPrice] = useState("");
  const [programCurrency, setProgramCurrency] = useState("CNY");
  const [programPublicStoreVisible, setProgramPublicStoreVisible] = useState(false);
  const [programPurchaseLink, setProgramPurchaseLink] = useState("");
  const [programDefaultIntakeFormId, setProgramDefaultIntakeFormId] = useState("");
  const [programAccessLengthDays, setProgramAccessLengthDays] = useState("42");
  const [programProductStatus, setProgramProductStatus] = useState("Draft");
  const [programSalesDescription, setProgramSalesDescription] = useState("");
  // Tag a saved program with the client / team it was built for (searchable,
  // reusable). Empty = a generic/internal template.
  const [programBuiltForClient, setProgramBuiltForClient] = useState("");
  const [programBuiltForTeam, setProgramBuiltForTeam] = useState("");
  const [programBuiltForMode, setProgramBuiltForMode] = useState<
    "internal" | "client" | "team"
  >("internal");
  // Store placement (set in the builder when "Show in digital store" is on).
  const [programStoreCategory, setProgramStoreCategory] = useState("");
  const [programStoreCategoryCn, setProgramStoreCategoryCn] = useState("");
  const [programBundleIds, setProgramBundleIds] = useState<string[]>([]);
  const [programBundleSearch, setProgramBundleSearch] = useState("");

  const [programWeek, setProgramWeek] = useState("1");
  const [programDay, setProgramDay] = useState("1");
  const [sessionName, setSessionName] = useState("Lower Strength");
  const [sessionNameCn, setSessionNameCn] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [builderMode, setBuilderMode] = useState<"Program" | "Single Workout">(
    "Program"
  );
  // Desktop builder sub-tabs: the day-by-day "Build" canvas vs. the digital
  // "Product Settings" panel.
  const [builderSubTab, setBuilderSubTab] = useState<"build" | "product">(
    "build"
  );
  const [programDetailsOpen, setProgramDetailsOpen] = useState(true);
  const [sessionSetupOpen, setSessionSetupOpen] = useState(true);
  // "Create Program" details modal (Programming landing → blank builder).
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    productType: "Digital Program",
    name: "",
    goal: "",
    phase: "Foundation",
    durationWeeks: "4",
  });
  const [sessionType, setSessionType] = useState("Strength");
  const [sessionGoal, setSessionGoal] = useState("");
  const [sessionEstimatedDuration, setSessionEstimatedDuration] = useState("");
  const [sessionIntensity, setSessionIntensity] = useState("Moderate");
  const [accessoryTargetIndex, setAccessoryTargetIndex] = useState<number | null>(
    null
  );
  const [builderSearch, setBuilderSearch] = useState("");
  const [builderEquipFilter, setBuilderEquipFilter] = useState("");
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSelectedIdx, setBulkSelectedIdx] = useState<Set<number>>(new Set());
  const [bulkSets, setBulkSets] = useState("");
  const [bulkReps, setBulkReps] = useState("");
  const [bulkRest, setBulkRest] = useState("");
  // Mobile-native builder (Everfit-style portrait flow). These only drive the
  // mobile render branch; the desktop builder ignores them entirely.
  const [mobileBuilderStep, setMobileBuilderStep] = useState<
    "details" | "editor" | "picker" | "arrange" | "overview" | "libpick"
  >("details");
  const [mobilePickerSelected, setMobilePickerSelected] = useState<Set<string>>(
    new Set()
  );
  const [mobileDragIndex, setMobileDragIndex] = useState<number | null>(null);
  const [mobileDragOverIndex, setMobileDragOverIndex] = useState<number | null>(
    null
  );
  const mobileArrangeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileArrangeItemsRef = useRef<{ start: number }[]>([]);
  const mobileDragIndexRef = useRef<number | null>(null);
  const mobileDragOverIndexRef = useRef<number | null>(null);
  const [mobileMenuIndex, setMobileMenuIndex] = useState<number | null>(null);
  const [mobileDetailsIndex, setMobileDetailsIndex] = useState<number | null>(
    null
  );
  const [mobileAlternateIndex, setMobileAlternateIndex] = useState<
    number | null
  >(null);
  const [workoutTabsMenuOpen, setWorkoutTabsMenuOpen] = useState(false);
  const [reviewFlashColumn, setReviewFlashColumn] = useState<string | null>(null);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [metricsDraft, setMetricsDraft] = useState({
    mas: "",
    hrMax: "",
    restingHr: "",
    z5k: "",
    z10k: "",
    zThreshold: "",
    zEasy: "",
  });
  const [builderLibraryMode, setBuilderLibraryMode] =
    useState<BuilderLibraryMode>("Exercises");
  const [isBuilderLibraryOpen, setIsBuilderLibraryOpen] = useState(false);
  const [isBuilderOrderOpen, setIsBuilderOrderOpen] = useState(false);
  const builderModalListRef = useRef<HTMLDivElement | null>(null);
  const latestBuilderExerciseRef = useRef<HTMLDivElement | null>(null);
  const [latestBuilderExerciseIndex, setLatestBuilderExerciseIndex] =
    useState<number | null>(null);
  const [expandedBuilderExerciseIndexes, setExpandedBuilderExerciseIndexes] =
    useState<Set<number>>(new Set());
  // Builder: which exercises have the %1RM field revealed (off by default; the
  // "Use %" button beside the exercise name toggles it on).
  const [usePercentExerciseIndexes, setUsePercentExerciseIndexes] = useState<
    Set<number>
  >(new Set());
  // Builder: exercise index whose "Customize fields" picker is open (or null).
  const [customizeFieldsIndex, setCustomizeFieldsIndex] = useState<
    number | null
  >(null);
  const [builderExerciseOptionsIndex, setBuilderExerciseOptionsIndex] =
    useState<number | null>(null);
  const [alternateEditorExerciseIndex, setAlternateEditorExerciseIndex] =
    useState<number | null>(null);
  const [alternateSearch, setAlternateSearch] = useState("");
  const [alternateDragIndex, setAlternateDragIndex] = useState<number | null>(
    null
  );
  const [pendingSectionName, setPendingSectionName] = useState("Warmup");
  const [customBuilderSectionName, setCustomBuilderSectionName] = useState("");
  const [arrangementDragIndex, setArrangementDragIndex] = useState<number | null>(
    null
  );
  const [arrangementDropIndex, setArrangementDropIndex] = useState<number | null>(
    null
  );
  const [programSessionDropId, setProgramSessionDropId] = useState("");
  const [formTemplateName, setFormTemplateName] = useState("Weekly Check-in");
  const [formTemplateType, setFormTemplateType] = useState("Check-in");
  const [formQuestions, setFormQuestions] = useState([
    {
      id: "Q1",
      label: "How are you feeling today?",
      questionType: "Scale",
      required: true,
    },
  ]);
  const [savedFormTemplates, setSavedFormTemplates] = useState<
    SavedFormTemplate[]
  >([]);
  const [savedFormSearch, setSavedFormSearch] = useState("");
  const [selectedSavedFormId, setSelectedSavedFormId] = useState("");
  const [editingFormTemplate, setEditingFormTemplate] = useState<{
    recordId: string;
    formId: string;
  } | null>(null);
  const [formTemplatesLoading, setFormTemplatesLoading] = useState(false);
  const [savingFormTemplate, setSavingFormTemplate] = useState(false);
  const [testTemplateName, setTestTemplateName] = useState("Performance Test");
  const [testTemplateCategory, setTestTemplateCategory] = useState("Other");
  const [testItems, setTestItems] = useState([
    {
      id: "T1",
      testName: "Back Squat 3RM",
      metricType: "Weight",
      unit: "kg",
      createsMetric: true,
      metricName: "Predicted 1RM",
      metricUnit: "kg",
      calculationMethod: "Epley 1RM",
      inputUnit: "kg x reps",
    },
  ]);
  const [savedTestTemplates, setSavedTestTemplates] = useState<
    SavedTestTemplate[]
  >([]);
  const [savedTestSearch, setSavedTestSearch] = useState("");
  const [selectedSavedTestId, setSelectedSavedTestId] = useState("");
  const [editingTestTemplate, setEditingTestTemplate] = useState<{
    recordId: string;
    testTemplateId: string;
  } | null>(null);
  const [testTemplatesLoading, setTestTemplatesLoading] = useState(false);
  const [savingTestTemplate, setSavingTestTemplate] = useState(false);
  const [assignmentType, setAssignmentType] = useState("Program");
  const [assignmentClientId, setAssignmentClientId] = useState("");
  const [assignmentTemplateId, setAssignmentTemplateId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState(
    dateToInputValue(new Date())
  );
  const assignmentHubDateInputRef = useRef<HTMLInputElement>(null);
  const calendarAssignmentDateInputRef = useRef<HTMLInputElement>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [selectedProgramExercises, setSelectedProgramExercises] = useState<
    ProgramExercise[]
  >([]);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);
  const [editingProgramSessionId, setEditingProgramSessionId] = useState("");
  const [draggedProgramSessionId, setDraggedProgramSessionId] = useState("");
  const [programGridDrop, setProgramGridDrop] = useState<{
    w: number;
    d: number;
  } | null>(null);
  // Collapsible Day-1-7 columns in the program grid (rest/finished days fold up).
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  // "Duplicate week" dropdown: which week's menu is open + the load progression.
  const [weekDupMenu, setWeekDupMenu] = useState<number | null>(null);
  const [weekDupPct, setWeekDupPct] = useState(0);
  // Multi-day builder: the session editor opens as a right-side drawer so the
  // calendar stays in view.
  const [sessionEditorOpen, setSessionEditorOpen] = useState(false);
  // Programs landing: the detail/assign panel shows only when explicitly
  // opened via the gear (clicking a row opens the builder calendar instead).
  const [showProgramDetail, setShowProgramDetail] = useState(false);
  // Right-click context menu on a program row.
  const [programMenu, setProgramMenu] = useState<{
    program: Program;
    x: number;
    y: number;
  } | null>(null);
  // In-place edit: when set, "Save Full Program" updates this record instead
  // of creating a new one.
  const [editProgramId, setEditProgramId] = useState("");
  const [editProgramRecordId, setEditProgramRecordId] = useState("");
  // Read-only preview window (at-a-glance snapshot of a saved program).
  const [previewProgram, setPreviewProgram] = useState<{
    program: Program;
    sessions: ProgramSession[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Session Library: reuse days from any saved program by dragging onto a cell.
  // Program-builder cell "+"/right-click menu (sessionLocalId set => "Edit"
  // targets that session) and the "Add from Library" picker target.
  const [cellMenu, setCellMenu] = useState<{
    w: number;
    d: number;
    x: number;
    y: number;
    sessionLocalId?: string;
  } | null>(null);
  const [libPickTarget, setLibPickTarget] = useState<{
    w: number;
    d: number;
  } | null>(null);
  const [libPickLoadingId, setLibPickLoadingId] = useState("");
  // Cut/Copy clipboard for builder sessions; Paste drops it on another day.
  const [copiedSession, setCopiedSession] = useState<{
    session: ProgramSession;
    mode: "copy" | "cut";
  } | null>(null);
  // Client calendar "+" menu: add a full program or a single session.
  const [calAddMenu, setCalAddMenu] = useState<{
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const [assignProgramKind, setAssignProgramKind] = useState<
    "program" | "session"
  >("program");
  // Forms / Tests: list table (default) vs the builder for the selected item.
  const [formView, setFormView] = useState<"list" | "builder">("list");
  const [testView, setTestView] = useState<"list" | "builder">("list");
  const [templateMenu, setTemplateMenu] = useState<{
    kind: "form" | "test";
    recordId: string;
    x: number;
    y: number;
  } | null>(null);
  const [sessionLibProgramId, setSessionLibProgramId] = useState("");
  const [sessionLibSessions, setSessionLibSessions] = useState<ProgramSession[]>(
    []
  );
  const [sessionLibLoading, setSessionLibLoading] = useState(false);
  const [draggedLibSessionId, setDraggedLibSessionId] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [builderSaveStatus, setBuilderSaveStatus] = useState<"saved" | "dirty">(
    "saved"
  );
  const builderSaveStatusReadyRef = useRef(false);

  const notify = (message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const buildInviteLink = (packageType = coachInvitePackage) => {
    const params = new URLSearchParams({
      invite: "client",
      package: packageType,
    });

    return `${window.location.origin}/?${params.toString()}`;
  };

  const coachInviteLink = buildInviteLink();
  const coachInviteMessage = `Hi, here is your NoLimit Training onboarding link. Please fill this out before we get started: ${coachInviteLink}`;
  const fallbackCoaches: Coach[] = [
    {
      recordId: "",
      coachId: "COACH-KENT",
      name: "Kent Bastell",
      role: "Admin",
      status: "Active",
    },
    {
      recordId: "",
      coachId: "COACH-MARIO",
      name: "Mario Artukovic",
      role: "Admin",
      status: "Active",
    },
  ];
  const validCoaches = coaches.filter(
    (coach) => coach.name && coach.name !== "Unnamed Coach"
  );
  const visibleCoaches = validCoaches.length > 0 ? validCoaches : fallbackCoaches;
  const activeCoaches = visibleCoaches.filter(
    (coach) => coach.status !== "Inactive"
  );
  const allCoaches = visibleCoaches;
  const currentScopedCoach = activeCoaches.find(
    (coach) => coach.name === coachScope
  );
  const canManageCoaches =
    coachScope === "All Coaches" || currentScopedCoach?.role === "Admin";
  const getCoachRecordIdByName = (name: string) =>
    activeCoaches.find((coach) => coach.name === name)?.recordId || "";
  const getCoachDisplayName = (value = "") => {
    const match = activeCoaches.find(
      (coach) =>
        coach.recordId === value ||
        coach.coachId === value ||
        coach.name.toLowerCase() === value.toLowerCase()
    );

    return match?.name || value;
  };
  const clientBelongsToCoach = (client: Client, coach: Coach) => {
    const coachValues = [client.coach, client.primaryCoach, client.secondaryCoach]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const coachMatches = [
      coach.name,
      coach.recordId,
      coach.coachId,
      getCoachDisplayName(coach.name),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return coachValues.some((value) =>
      coachMatches.some((coachValue) => value === coachValue)
    );
  };

  const buildClientPortalLink = (client: Client) =>
    `${window.location.origin}/?portal=client&client=${encodeURIComponent(
      client.clientCode || client.id
    )}`;

  const copyToClipboard = async (text: string, label: string) => {
    if (!navigator.clipboard) {
      notify("Clipboard is not available in this browser.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied.`, "success");
    } catch (error) {
      console.error(error);
      notify(`Could not copy ${label.toLowerCase()}.`, "error");
    }
  };

  const submitInviteForm = async () => {
    if (!inviteForm.name.trim()) {
      notify("Please enter your name.", "error");
      return;
    }

    if (!inviteForm.email.trim() && !inviteForm.phone.trim()) {
      notify("Please add an email or phone/WeChat.", "error");
      return;
    }

    setSubmittingInvite(true);

    try {
      // Format every intake answer into a clean labeled block in the client's
      // notes (no schema change), so the coach reads the full intake in-profile.
      const line = (label: string, value: string) =>
        value && value.trim() ? `${label}: ${value.trim()}` : "";
      const inviteNotes = [
        "— CLIENT INTAKE —",
        line("Training format", inviteForm.trainingFormat),
        line("Main goal", inviteForm.goals),
        "",
        "Body",
        line("Date of birth", inviteForm.dob),
        line("Gender", inviteForm.gender),
        line("Height", inviteForm.height),
        line("Current weight", inviteForm.weight),
        "",
        "Training background",
        line("Experience", inviteForm.experience),
        line("Sport / focus", inviteForm.sport),
        line("Current training", inviteForm.currentTraining),
        "",
        "Availability & equipment",
        line("Days per week", inviteForm.daysPerWeek),
        line("Session length", inviteForm.sessionLength),
        line("Equipment", inviteForm.equipment),
        "",
        line("Anything else", inviteForm.notes),
      ]
        // Drop empty value-lines but keep section headers that have content.
        .filter((l, i, arr) => {
          if (l !== "") return true;
          // keep a blank separator only if the previous kept line wasn't blank
          return i > 0 && arr[i - 1] !== "";
        })
        .join("\n")
        .trim();

      const response = await fetch("/api/createClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          phone: inviteForm.phone,
          coach: "Kent Bastell",
          clientType: inviteForm.trainingFormat,
          packageType: publicInvitePackage,
          startDate: dateToInputValue(new Date()),
          notes: inviteNotes,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not submit invite form. Please try again.", "error");
        return;
      }

      setInviteClientId(data.clientId || "");
      setInviteSubmitted(true);
      notify("Your intake form was submitted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not submit invite form.", "error");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const submitEnquiry = async () => {
    if (!enquiryForm.contactPerson.trim()) {
      notify("Please enter a contact person.", "error");
      return;
    }
    if (!enquiryForm.contact.trim()) {
      notify("Please add a WeChat or email so we can reach you.", "error");
      return;
    }
    setSubmittingEnquiry(true);
    try {
      const response = await fetch("/api/inPersonEnquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not send your enquiry. Please try again.", "error");
        return;
      }
      setEnquirySubmitted(true);
      notify("Enquiry sent.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not send your enquiry.", "error");
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const closeClientForm = () => {
    setShowAddClientModal(false);
    setEditingClient(null);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      coach: "Kent Bastell",
      primaryCoachId: "",
      secondaryCoachId: "",
      clientType: "Online Coaching",
      packageType: "Active",
      packageName: "",
      subscriptionStatus: "Active",
      intakeStatus: "Not Sent",
      paymentStatus: "Unpaid",
      source: "Manual Entry",
      purchasedProgramId: "",
      accessStartDate: "",
      accessEndDate: "",
      paymentId: "",
      startDate: dateToInputValue(new Date()),
      notes: "",
      languagePreference: "English",
    });
  };

  const openNewClientForm = () => {
    setEditingClient(null);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      coach: "Kent Bastell",
      primaryCoachId: "",
      secondaryCoachId: "",
      clientType: "Online Coaching",
      packageType: "Active",
      packageName: "",
      subscriptionStatus: "Active",
      intakeStatus: "Not Sent",
      paymentStatus: "Unpaid",
      source: "Manual Entry",
      purchasedProgramId: "",
      accessStartDate: "",
      accessEndDate: "",
      paymentId: "",
      startDate: dateToInputValue(new Date()),
      notes: "",
      languagePreference: "English",
    });
    setShowAddClientModal(true);
  };

  const openEditClientForm = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      coach: getCoachDisplayName(client.coach || client.primaryCoach || "Kent Bastell"),
      primaryCoachId: getCoachRecordIdByName(
        getCoachDisplayName(client.coach || client.primaryCoach || "Kent Bastell")
      ),
      secondaryCoachId: getCoachRecordIdByName(
        getCoachDisplayName(client.secondaryCoach || "")
      ),
      clientType: client.clientType || "Online Coaching",
      packageType: client.status || "Active",
      packageName: client.package || "",
      subscriptionStatus: client.subscriptionStatus || "Active",
      intakeStatus: client.intakeStatus || "Not Sent",
      paymentStatus: client.paymentStatus || "Unpaid",
      source: client.source || "Manual Entry",
      purchasedProgramId: client.purchasedProgramId || "",
      accessStartDate:
        client.accessStartDate && client.accessStartDate !== "--"
          ? client.accessStartDate
          : "",
      accessEndDate:
        client.accessEndDate && client.accessEndDate !== "--"
          ? client.accessEndDate
          : "",
      paymentId: client.paymentId || "",
      startDate:
        client.startDate && client.startDate !== "--" ? client.startDate : "",
      notes: client.notes || "",
      languagePreference: client.languagePreference || "English",
    });
    setShowAddClientModal(true);
  };

  const loadClients = async (force = false) => {
    const shouldForce = force === true;
    const cached = clientsCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.clients);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setClients(cached.data);
      setLoading(false);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<Client[]>(CACHE_KEYS.clients);
    if (persistentCache) {
      clientsCacheRef.current = persistentCache;
      setClients(persistentCache.data);
      setLoading(false);
      return persistentCache.data;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      const nextClients = data.clients || [];
      clientsCacheRef.current = { data: nextClients, timestamp: Date.now() };
      writePersistentCache(CACHE_KEYS.clients, nextClients);
      setClients(nextClients);
      return nextClients;
    } catch (error) {
      console.error(error);
      return clients;
    } finally {
      setLoading(false);
    }
  };

  const loadCoaches = async () => {
    try {
      const response = await fetch("/api/coaches");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setCoaches([]);
        return;
      }

      setCoaches(data.coaches || []);
    } catch (error) {
      console.error(error);
      setCoaches([]);
    }
  };

  const loadTeams = async () => {
    setTeamsLoading(true);
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();
      if (!response.ok) {
        console.error(data);
        setTeams([]);
        return [];
      }
      const nextTeams: Team[] = data.teams || [];
      setTeams(nextTeams);
      return nextTeams;
    } catch (error) {
      console.error(error);
      setTeams([]);
      return [];
    } finally {
      setTeamsLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      const data = await response.json();
      if (!response.ok) {
        console.error(data);
        setSubscriptions([]);
        return [];
      }
      const next: Subscription[] = data.subscriptions || [];
      setSubscriptions(next);
      return next;
    } catch (error) {
      console.error(error);
      setSubscriptions([]);
      return [];
    }
  };

  const loadProductOrders = async (force?: unknown) => {
    const shouldForce = force === true;
    const cached = productOrdersCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.productOrders);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setProductOrders(cached.data);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<ProductOrder[]>(CACHE_KEYS.productOrders);
    if (persistentCache) {
      productOrdersCacheRef.current = persistentCache;
      setProductOrders(persistentCache.data);
      return persistentCache.data;
    }

    try {
      const response = await fetch("/api/productOrders");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setProductOrders([]);
        return [];
      }

      const orders = data.orders || [];
      productOrdersCacheRef.current = { data: orders, timestamp: Date.now() };
      writePersistentCache(CACHE_KEYS.productOrders, orders);
      setProductOrders(orders);
      return orders;
    } catch (error) {
      console.error(error);
      setProductOrders([]);
      return [];
    }
  };

  const closeCoachForm = () => {
    setShowCoachModal(false);
    setEditingCoach(null);
    setCoachForm({
      name: "",
      email: "",
      phoneWechat: "",
      role: "Coach",
      status: "Active",
      bio: "",
    });
  };

  const openNewCoachForm = () => {
    setEditingCoach(null);
    setCoachForm({
      name: "",
      email: "",
      phoneWechat: "",
      role: "Coach",
      status: "Active",
      bio: "",
    });
    setShowCoachModal(true);
  };

  const openEditCoachForm = (coach: Coach) => {
    setEditingCoach(coach);
    setCoachForm({
      name: coach.name || "",
      email: coach.email || "",
      phoneWechat: coach.phoneWechat || "",
      role: coach.role || "Coach",
      status: coach.status || "Active",
      bio: coach.bio || "",
    });
    setShowCoachModal(true);
  };

  const saveCoachForm = async () => {
    if (!coachForm.name.trim()) {
      notify("Please enter a coach name.", "error");
      return;
    }
    // Editing a fallback row (no Feishu record) would CREATE a duplicate.
    if (editingCoach && !editingCoach.recordId) {
      notify("This coach needs to exist in Feishu before editing.", "error");
      return;
    }

    setSavingCoach(true);

    try {
      const response = await fetch("/api/upsertCoach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...coachForm,
          recordId: editingCoach?.recordId,
          coachId: editingCoach?.coachId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not save coach.", "error");
        return;
      }

      await loadCoaches();
      closeCoachForm();
      notify(editingCoach ? "Coach updated." : "Coach created.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not save coach.", "error");
    } finally {
      setSavingCoach(false);
    }
  };

  const updateCoachStatus = async (coach: Coach, status: "Active" | "Inactive") => {
    if (!coach.recordId) {
      notify("This coach needs to exist in Feishu before editing.", "error");
      return;
    }

    setSavingCoach(true);

    try {
      const response = await fetch("/api/upsertCoach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...coach,
          phoneWechat: coach.phoneWechat || "",
          status,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update coach status.", "error");
        return;
      }

      await loadCoaches();
      notify(`Coach marked ${status}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update coach status.", "error");
    } finally {
      setSavingCoach(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setShowAnalyticsModal(true);

    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not load workout analytics.", "error");
        return;
      }

      setAnalytics(data);
    } catch (error) {
      console.error(error);
      notify("Could not load workout analytics.", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Quiet-load per-client 7-day activity for the Clients list (no modal).
  useEffect(() => {
    if (isClientPortal || activePage !== "Clients") return;

    let cancelled = false;
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, { completed7d: number; scheduled7d: number }> = {};
        (data.clientActivity || []).forEach((entry: any) => {
          if (entry.recordId) {
            map[entry.recordId] = {
              completed7d: entry.completed7d || 0,
              scheduled7d: entry.scheduled7d || 0,
            };
          }
        });
        setClientActivityMap(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isClientPortal, activePage, clients.length]);

  useEffect(() => {
    if (isStorePage || isPublicLandingPage) {
      void loadPrograms();
      void loadClients(); // for the "Client View" launcher picker
      void loadCoaches(); // powers the store "Meet your coach" section
      fetch("/api/reviews?storeOnly=1")
        .then((res) => res.json())
        .then((data) => setStoreReviews(data.reviews || []))
        .catch(() => setStoreReviews([]));
      return;
    }
    void loadClients().then(() => {
      // Coach console is ready once the clients fetch settles. The portal waits
      // instead for its client to resolve (see the selectedClient effect below).
      if (!isClientPortal) fireBootReady();
    });
    void loadNotifications();
    // Coaches / teams / subscriptions / coach reviews are coach-only — don't
    // make the client portal wait on (or fetch) them.
    if (!isClientPortal) {
      loadCoaches();
      void loadTeams();
      void loadSubscriptions();
      void loadCoachReviews();
    }
  }, []);

  // Client portal: ready as soon as its client resolves (the "Loading your
  // training portal" gate clears), so the splash hands off to a populated view.
  useEffect(() => {
    if (isClientPortal && selectedClient) fireBootReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientPortal, selectedClient]);

  useEffect(() => {
    // The portal needs orders (purchased programs); the coach only on
    // Orders/Revenue.
    if (activePage !== "Orders" && activePage !== "Revenue" && !isClientPortal)
      return;

    void loadProductOrders();
  }, [activePage, isClientPortal]);

  useEffect(() => {
    if (!isClientPortal || !clientPortalCode) return;

    const normalizedPortalCode = clientPortalCode.toLowerCase();
    const portalClient = clients.find(
      (client) =>
        client.clientCode.toLowerCase() === normalizedPortalCode ||
        client.id.toLowerCase() === normalizedPortalCode
    );

    if (portalClient) {
      portalResolveAttempts.current = 0;
      setPortalResolveExhausted(false);
      setSelectedClient(portalClient);
      setClientTab("Home");
      setActivePage("Clients");
      return;
    }

    // The clients fetch can come back transiently empty/stale (a token blip or
    // rate limit), which would otherwise show "could not find" on a valid
    // portal link. Retry a fresh fetch a few times before giving up; the UI
    // keeps showing "Loading…" until then.
    if (portalResolveAttempts.current < 5) {
      const timer = window.setTimeout(() => {
        portalResolveAttempts.current += 1;
        void loadClients(true);
      }, 800);
      return () => window.clearTimeout(timer);
    }

    setPortalResolveExhausted(true);
  }, [clients, clientPortalCode, isClientPortal]);

  useEffect(() => {
    if (!isClientPortal || !selectedClient) return;

    const nextLanguage = languagePreferenceToCode(
      selectedClient.languagePreference
    );

    if (i18n.language !== nextLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }
  }, [i18n, isClientPortal, selectedClient]);

  useEffect(() => {
    if (!selectedClient) {
      setClientCalendarWorkoutOrder({});
      return;
    }

    try {
      const savedOrder = window.localStorage.getItem(
        getClientCalendarWorkoutOrderStorageKey(selectedClient)
      );
      setClientCalendarWorkoutOrder(savedOrder ? JSON.parse(savedOrder) : {});
    } catch {
      setClientCalendarWorkoutOrder({});
    }
  }, [selectedClient?.clientCode, selectedClient?.id]);

  useEffect(() => {
    const openDatePickerFromClick = (event: MouseEvent) => {
      const input = (event.target as HTMLElement | null)?.closest?.(
        'input[type="date"]'
      ) as HTMLInputElement | null;

      if (!input || input.disabled || input.readOnly) return;

      try {
        input.showPicker?.();
      } catch {
        input.focus();
      }
    };

    document.addEventListener("click", openDatePickerFromClick);

    return () => {
      document.removeEventListener("click", openDatePickerFromClick);
    };
  }, []);

  const useChineseClientText =
    isClientPortal &&
    languagePreferenceToCode(selectedClient?.languagePreference) === "zh";
  const clientLocale = useChineseClientText ? "zh-CN" : "en-US";

  const localizeText = (english = "", chinese = "") =>
    useChineseClientText && chinese ? chinese : english;

  const localizedWorkoutName = (workout: Workout) =>
    localizeText(workout.sessionName || "Workout", workout.sessionNameCn || "");

  const localizedAssignableWorkoutName = (workout: AssignableWorkout) =>
    localizeText(workout.sessionName || "Workout", workout.sessionNameCn || "");

  const localizedProductType = (productType = "") =>
    lookupTextMatches(productType, "Digital Program")
      ? t("digitalProgram")
      : productType || t("program");

  const localizedExerciseName = (
    exercise: Pick<LibraryExercise, "exerciseName" | "exerciseNameCn"> & {
      exerciseId?: string;
    }
  ) => {
    const libraryMatch = libraryExercises.find(
      (item) =>
        (exercise.exerciseId && item.exerciseId === exercise.exerciseId) ||
        item.exerciseName.toLowerCase() ===
          String(exercise.exerciseName || "").toLowerCase()
    );

    return localizeText(
      exercise.exerciseName || libraryMatch?.exerciseName || "Exercise",
      exercise.exerciseNameCn || libraryMatch?.exerciseNameCn || ""
    );
  };

  const localizedExerciseNotes = (
    exercise: Pick<
      LibraryExercise,
      | "notes"
      | "notesCn"
      | "technicalInstructionsCn"
      | "coachingCuesCn"
      | "commonMistakesCn"
    >
  ) => {
    const englishNotes = exercise.notes || "";
    const chineseNotes = [
      exercise.notesCn,
      exercise.technicalInstructionsCn &&
        `动作说明:\n${exercise.technicalInstructionsCn}`,
      exercise.coachingCuesCn && `技术提示:\n${exercise.coachingCuesCn}`,
      exercise.commonMistakesCn && `常见错误:\n${exercise.commonMistakesCn}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    return localizeText(englishNotes, chineseNotes) || englishNotes || chineseNotes;
  };

  const localizedCalendarLabel = (dateString: string) =>
    formatCalendarLabel(dateString, clientLocale);

  const localizedMonthTitle = (dateString: string) =>
    formatMonthTitle(dateString, clientLocale);

  const localizedWeekStripLabel = (dateString: string) =>
    formatWeekStripLabel(dateString, clientLocale);

  const updateClientLanguagePreference = async (languagePreference: string) => {
    if (!selectedClient) return;

    setSelectedClient({ ...selectedClient, languagePreference });
    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id
          ? { ...client, languagePreference }
          : client
      )
    );
    void i18n.changeLanguage(languagePreferenceToCode(languagePreference));

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          languagePreference,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        notify("Could not update language preference.", "error");
      }
    } catch (error) {
      console.error(error);
      notify("Could not update language preference.", "error");
    }
  };

  const saveCoachNotes = async () => {
    if (!selectedClient) return;
    const notes = coachNotesDraft;
    setSavingCoachNotes(true);

    // Optimistic update so the saved value sticks locally.
    setSelectedClient({ ...selectedClient, notes });
    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id ? { ...client, notes } : client
      )
    );

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRecordId: selectedClient.id, notes }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        notify("Could not save coach notes.", "error");
      } else {
        notify("Coach notes saved.", "success");
      }
    } catch (error) {
      console.error(error);
      notify("Could not save coach notes.", "error");
    } finally {
      setSavingCoachNotes(false);
    }
  };

  const openMetricsEditor = () => {
    if (!selectedClient) return;
    setMetricsDraft({
      mas: selectedClient.masKmhOverride || "",
      hrMax: selectedClient.hrMaxOverride || "",
      restingHr: selectedClient.restingHrOverride || "",
      z5k: selectedClient.zone5kPct || "",
      z10k: selectedClient.zone10kPct || "",
      zThreshold: selectedClient.zoneThresholdPct || "",
      zEasy: selectedClient.zoneEasyPct || "",
    });
    setEditingMetrics(true);
  };

  const saveMetricsOverrides = async () => {
    if (!selectedClient) return;
    setSavingMetrics(true);

    const patch = {
      masKmhOverride: metricsDraft.mas.trim(),
      hrMaxOverride: metricsDraft.hrMax.trim(),
      restingHrOverride: metricsDraft.restingHr.trim(),
      zone5kPct: metricsDraft.z5k.trim(),
      zone10kPct: metricsDraft.z10k.trim(),
      zoneThresholdPct: metricsDraft.zThreshold.trim(),
      zoneEasyPct: metricsDraft.zEasy.trim(),
    };

    // Optimistic local update so the zone table recomputes immediately.
    setSelectedClient({ ...selectedClient, ...patch });
    setClients((current) =>
      current.map((client) =>
        client.id === selectedClient.id ? { ...client, ...patch } : client
      )
    );

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRecordId: selectedClient.id, ...patch }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        notify("Could not save performance metrics.", "error");
      } else if (data.omittedFields?.length) {
        notify(
          `Saved for this session. Add these Clients columns in Feishu to persist: ${data.omittedFields.join(", ")}`,
          "info"
        );
      } else {
        notify("Performance metrics updated.", "success");
      }
    } catch (error) {
      console.error(error);
      notify("Could not save performance metrics.", "error");
    } finally {
      setSavingMetrics(false);
      setEditingMetrics(false);
    }
  };

  useEffect(() => {
    const updateWorkoutRowMode = () => {
      const narrowViewport = window.innerWidth <= 700;
      setUseMobileWorkoutRows(narrowViewport);
    };

    updateWorkoutRowMode();
    window.addEventListener("resize", updateWorkoutRowMode);

    return () => window.removeEventListener("resize", updateWorkoutRowMode);
  }, []);

  // Guard against losing an in-progress program build on tab close / refresh.
  useEffect(() => {
    const unsaved =
      workoutPageTab === "Program Builder" &&
      (selectedProgramExercises.length > 0 || programSessions.length > 0);
    if (!unsaved) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [workoutPageTab, selectedProgramExercises.length, programSessions.length]);

  const cacheClientWorkouts = (clientCode: string, nextWorkouts: Workout[]) => {
    if (!clientCode) return;

    workoutCacheRef.current[clientCode] = {
      data: nextWorkouts,
      timestamp: Date.now(),
    };
    writePersistentCache(CACHE_KEYS.clientWorkouts(clientCode), nextWorkouts);
  };

  const loadClientWorkouts = async (client: Client, force = false) => {
    const shouldForce = force === true;
    const clientCode = client.clientCode;
    const cached = workoutCacheRef.current[clientCode];

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.clientWorkouts(clientCode));
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setWorkouts(cached.data);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<Workout[]>(CACHE_KEYS.clientWorkouts(clientCode));
    if (persistentCache) {
      workoutCacheRef.current[clientCode] = persistentCache;
      setWorkouts(persistentCache.data);
      return persistentCache.data;
    }

    const response = await fetch(`/api/workouts?clientCode=${clientCode}`);
    const data = await response.json();
    const nextWorkouts = data.workouts || [];
    cacheClientWorkouts(clientCode, nextWorkouts);
    setWorkouts(nextWorkouts);
    return nextWorkouts;
  };

  useEffect(() => {
    if (!selectedClient) return;

    const cachedWorkouts = workoutCacheRef.current[selectedClient.clientCode];
    const hasFreshWorkouts =
      Boolean(cachedWorkouts) && isFreshCache(cachedWorkouts.timestamp);

    setWorkoutsLoading(!hasFreshWorkouts);
    setSelectedWorkout(null);
    setWorkoutDetails([]);
    setSetLogs([]);
    setSavedExerciseDraftIds([]);
    setCheckedWorkoutPageItems([]);
    setContentAssignments([]);
    setContentResponses([]);
    setAthleteMetrics([]);
    setWorkoutComments([]);
    setWorkouts(hasFreshWorkouts && cachedWorkouts ? cachedWorkouts.data : []);

    loadPrograms();

    Promise.all([
      loadClientWorkouts(selectedClient),
      loadContentAssignments(selectedClient).then((assignments) => ({ assignments })),
      loadContentResponses(selectedClient).then((responses) => ({ responses })),
      loadAthleteMetrics(selectedClient).then((metrics) => ({ metrics })),
      loadWorkoutComments(selectedClient).then((comments) => ({ comments })),
    ])
      .then(([workoutData, assignmentData, responseData, metricData, commentData]) => {
        setWorkouts(workoutData || []);
        setContentAssignments(assignmentData.assignments || []);
        setContentResponses(responseData.responses || []);
        setAthleteMetrics(metricData.metrics || []);
        setWorkoutComments(commentData.comments || []);
        setWorkoutsLoading(false);
      })
      .catch(() => {
        setWorkouts([]);
        setContentAssignments([]);
        setContentResponses([]);
        setAthleteMetrics([]);
        setWorkoutComments([]);
        setWorkoutsLoading(false);
      });
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;

    fetch(`/api/workoutHistory?clientId=${selectedClient.id}`)
      .then((res) => res.json())
      .then((data) => setWorkoutHistoryLogs(data.logs || []))
      .catch(() => setWorkoutHistoryLogs([]));

    fetch(`/api/exerciseResults?clientId=${selectedClient.id}`)
      .then((res) => res.json())
      .then((data) => setExerciseResults(data.results || []))
      .catch(() => setExerciseResults([]));

    // Load check-ins for the selected client (athlete portal: the logged-in
    // client; coach: the client being viewed — powers the wellness trend chart).
    fetch(
      `/api/checkIns?clientId=${selectedClient.clientCode || selectedClient.id}`
    )
      .then((res) => res.json())
      .then((data) => setClientCheckIns(data.checkIns || []))
      .catch(() => setClientCheckIns([]));
    if (isClientPortal) {
      fetch(
        `/api/reviews?clientId=${selectedClient.clientCode || selectedClient.id}`
      )
        .then((res) => res.json())
        .then((data) => setClientReviews(data.reviews || []))
        .catch(() => setClientReviews([]));
    }

    setCoachNotesDraft(selectedClient.notes || "");

    if (isClientPortal && libraryExercises.length === 0) {
      loadExerciseLibrary();
    }
  }, [selectedClient, isClientPortal]);

  useEffect(() => {
    // Only the detail/assign panel (opened via the gear) needs this; skip the
    // fetch on a plain row click that opens the builder.
    if (activePage !== "Workouts" || !selectedSavedProgramId || !showProgramDetail)
      return;

    loadSavedProgramTemplates(selectedSavedProgramId);
  }, [activePage, selectedSavedProgramId, showProgramDetail]);

  const loadExerciseLibrary = async (force = false) => {
    const shouldForce = force === true;
    const cached = exerciseLibraryCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.exercises);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setLibraryExercises(cached.data);
      setLibraryLoading(false);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<LibraryExercise[]>(CACHE_KEYS.exercises);
    if (persistentCache) {
      exerciseLibraryCacheRef.current = persistentCache;
      setLibraryExercises(persistentCache.data);
      setLibraryLoading(false);
      return persistentCache.data;
    }

    setLibraryLoading(true);

    try {
      const res = await fetch("/api/exercises");
      if (!res.ok) {
        throw new Error(`Exercise library request failed: ${res.status}`);
      }
      const data = await res.json();
      const nextExercises = Array.isArray(data.exercises) ? data.exercises : [];
      exerciseLibraryCacheRef.current = {
        data: nextExercises,
        timestamp: Date.now(),
      };
      writePersistentCache(CACHE_KEYS.exercises, nextExercises);
      setLibraryExercises(nextExercises);
      return nextExercises;
    } catch (err) {
      console.error(err);
      return libraryExercises;
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (activePage !== "Library") return;

    if (libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
  }, [activePage]);

  const resetExerciseForm = () => {
    setExerciseForm({
      exerciseId: "",
      exerciseName: "",
      videoUrl: "",
      longVideoUrl: "",
      category: "",
      muscleGroup: "",
      movementPattern: "",
      equipment: "",
      notes: "",
      trackingType: "Weight",
      isUnilateral: false,
    });
  };

  const openNewExerciseForm = () => {
    setEditingExercise(null);
    resetExerciseForm();
    setShowExerciseModal(true);
  };

  const openEditExerciseForm = (exercise: LibraryExercise) => {
    const meta = parseExerciseNotes(exercise.notes || "");

    setEditingExercise(exercise);
    setExerciseForm({
      exerciseId: exercise.exerciseId || "",
      exerciseName: exercise.exerciseName || "",
      videoUrl: exercise.videoUrl || "",
      longVideoUrl: exercise.longVideoUrl || "",
      category: exercise.category || "",
      muscleGroup: exercise.primaryMuscles || "",
      movementPattern: exercise.movementPattern || "",
      equipment: exercise.equipment || "",
      notes: meta.coachingNotes || "",
      trackingType: meta.trackingType,
      isUnilateral: meta.isUnilateral,
    });
    setShowExerciseModal(true);
  };

  // Datalist suggestions for the exercise editor, drawn from the real library so
  // the vocab stays consistent (multi-value fields split on comma/slash).
  const distinctLibraryValues = (key: keyof LibraryExercise) =>
    Array.from(
      new Set(
        libraryExercises
          .flatMap((ex) =>
            String((ex[key] as string) || "")
              .split(/[,/]/)
              .map((part) => part.trim())
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  const categoryOptions = Array.from(
    new Set([...CATEGORY_OPTIONS, ...distinctLibraryValues("category")])
  ).sort((a, b) => a.localeCompare(b));
  const equipmentOptions = distinctLibraryValues("equipment");
  const muscleGroupOptions = distinctLibraryValues("primaryMuscles");
  const movementPatternOptions = Array.from(
    new Set([...MOVEMENT_PATTERN_OPTIONS, ...distinctLibraryValues("movementPattern")])
  );

  const renderVideoPreview = (url: string) => {
    const clean = String(url || "").trim();
    if (!clean) return null;
    const embed = toYoutubeEmbed(clean);
    if (embed) {
      return (
        <div className="exerciseVideoPreview">
          <iframe
            src={embed}
            title="Video preview"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    if (/\.(mp4|webm|mov)(\?|#|$)/i.test(clean)) {
      return <video className="exerciseVideoPreview" src={clean} controls />;
    }
    return (
      <a
        className="exerciseVideoPreviewLink"
        href={clean}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open video ↗
      </a>
    );
  };

  const applyExerciseCueDraft = () => {
    const draft = buildExerciseCueDraft(exerciseForm);
    const currentNotes = exerciseForm.notes.trim();

    setExerciseForm({
      ...exerciseForm,
      notes: currentNotes
        ? `${currentNotes}\n\n--- Draft Cues ---\n${draft}`
        : draft,
    });
    notify("Cue draft added. Review it before saving.", "success");
  };

  const copyExerciseAiPrompt = async () => {
    const prompt = buildExerciseAiPrompt(exerciseForm);

    try {
      await navigator.clipboard.writeText(prompt);
      notify("AI cue prompt copied. Paste it into Feishu AI or your AI tool.", "success");
    } catch {
      setExerciseForm({
        ...exerciseForm,
        notes: `${exerciseForm.notes.trim()}\n\n--- AI Prompt ---\n${prompt}`.trim(),
      });
      notify("Clipboard blocked. Prompt added to notes instead.", "info");
    }
  };

  const closeExerciseForm = () => {
    setShowExerciseModal(false);
    setEditingExercise(null);
    resetExerciseForm();
  };

  const saveExerciseForm = async (archive = false) => {
    if (!exerciseForm.exerciseName.trim() && !archive) {
      notify("Please enter an exercise name.", "error");
      return;
    }

    setSavingExercise(true);

    try {
      const composedNotes = composeExerciseNotes(
        exerciseForm.notes,
        exerciseForm.trackingType,
        exerciseForm.isUnilateral
      );
      const response = await fetch("/api/upsertExercise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...exerciseForm,
          notes: composedNotes,
          recordId: editingExercise?.recordId,
          archive,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(
          data.message || data.error || "Could not save exercise. Check API response.",
          "error"
        );
        return;
      }

      const savedExercise: LibraryExercise = {
        ...(editingExercise || {}),
        recordId: data.recordId || editingExercise?.recordId || "",
        exerciseId: data.exerciseId || exerciseForm.exerciseId,
        exerciseName: exerciseForm.exerciseName.trim(),
        videoUrl: exerciseForm.videoUrl,
        longVideoUrl: exerciseForm.longVideoUrl,
        category: exerciseForm.category,
        equipment: exerciseForm.equipment,
        movementPattern: exerciseForm.movementPattern,
        primaryMuscles: exerciseForm.muscleGroup,
        notes: archive ? `[Archived]\n${composedNotes}`.trim() : composedNotes,
        status: archive ? "Archived" : "Active",
      };

      setLibraryExercises((currentExercises) => {
        const nextExercises = archive
          ? currentExercises.filter(
              (exercise) =>
                exercise.recordId !== savedExercise.recordId &&
                exercise.exerciseId !== savedExercise.exerciseId
            )
          : [
              savedExercise,
              ...currentExercises.filter(
                (exercise) =>
                  exercise.recordId !== savedExercise.recordId &&
                  exercise.exerciseId !== savedExercise.exerciseId
              ),
            ];

        exerciseLibraryCacheRef.current = {
          data: nextExercises,
          timestamp: Date.now(),
        };
        writePersistentCache(CACHE_KEYS.exercises, nextExercises);

        return nextExercises;
      });

      window.setTimeout(() => {
        void loadExerciseLibrary(true);
      }, 2000);
      closeExerciseForm();
      notify(
        archive
          ? "Exercise archived."
          : editingExercise
          ? data.cueFieldName
            ? `Exercise updated. Cues saved to ${data.cueFieldName}.`
            : "Exercise updated."
          : `Exercise created: ${data.exerciseId}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not save exercise.", "error");
    } finally {
      setSavingExercise(false);
    }
  };

  const loadPrograms = async (force?: unknown) => {
    const shouldForce = force === true;
    const cached = programsCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.programs);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setPrograms(cached.data);

      if (cached.data.length > 0) {
        // Functional updater: never clobber a selection the user made while
        // this (possibly async) load was in flight.
        setSelectedAssignProgramId((cur) => cur || cached.data[0].programId);
        setSelectedSavedProgramId((cur) => cur || cached.data[0].programId);
      }

      setProgramsLoading(false);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<Program[]>(CACHE_KEYS.programs);
    if (persistentCache) {
      programsCacheRef.current = persistentCache;
      setPrograms(persistentCache.data);

      if (persistentCache.data.length > 0) {
        setSelectedAssignProgramId((cur) => cur || persistentCache.data[0].programId);
        setSelectedSavedProgramId((cur) => cur || persistentCache.data[0].programId);
      }

      setProgramsLoading(false);
      return persistentCache.data;
    }

    setProgramsLoading(true);
    try {
      const res = await fetch("/api/programs");
      if (!res.ok) {
        throw new Error(`Programs request failed: ${res.status}`);
      }
      const data = await res.json();
      const loadedPrograms = Array.isArray(data.programs) ? data.programs : [];
      programsCacheRef.current = {
        data: loadedPrograms,
        timestamp: Date.now(),
      };
      writePersistentCache(CACHE_KEYS.programs, loadedPrograms);
      setPrograms(loadedPrograms);

      if (loadedPrograms.length > 0) {
        setSelectedAssignProgramId((cur: string) => cur || loadedPrograms[0].programId);
        setSelectedSavedProgramId((cur: string) => cur || loadedPrograms[0].programId);
      }

      return loadedPrograms as Program[];
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setProgramsLoading(false);
    }
  };

  useEffect(() => {
    if (activePage !== "Workouts") return;

    if (programs.length === 0 && !programsLoading) {
      void loadPrograms();
    }
  }, [activePage, workoutPageTab]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const selectedAssignProgram = programs.find(
    (program) => program.programId === selectedAssignProgramId
  );
  const selectedSavedProgram = programs.find(
    (program) => program.programId === selectedSavedProgramId
  );
  const selectedManualOrderProgram = programs.find(
    (program) => program.programId === manualOrder.programId
  );

  const resetManualOrderForm = () => {
    setManualOrder({
      clientName: "",
      email: "",
      phone: "",
      productType: "Digital Program",
      programId: "",
      productName: "",
      amount: "",
      currency: "CNY",
      paymentStatus: "Paid",
      paymentProvider: "WeChat QR",
      paymentReference: "",
      assignedCoach: currentScopedCoach?.name || "Kent Bastell",
      purchasedAt: dateToInputValue(new Date()),
      accessStartDate: dateToInputValue(new Date()),
      accessEndDate: "",
      notes: "",
    });
  };

  const selectManualOrderProgram = (programId: string) => {
    const program = programs.find((item) => item.programId === programId);
    const startDate = manualOrder.accessStartDate || dateToInputValue(new Date());
    const accessLength = Number(program?.accessLengthDays || 0);

    setManualOrder((current) => ({
      ...current,
      programId,
      productName: program?.programName || current.productName,
      productType: program?.productType || current.productType,
      amount: program?.price || current.amount,
      currency: program?.currency || current.currency,
      accessEndDate:
        accessLength > 0 ? addDays(startDate, Math.max(0, accessLength - 1)) : current.accessEndDate,
    }));
  };

  const createManualProductOrder = async (startOnboarding = false) => {
    if (!manualOrder.clientName.trim()) {
      notify("Please enter the client name.", "error");
      return;
    }

    if (!manualOrder.productName.trim() && !manualOrder.programId) {
      notify("Please choose a program or enter a product name.", "error");
      return;
    }

    setSavingManualOrder(true);

    try {
      const orderPayload = {
        ...manualOrder,
        programId: selectedManualOrderProgram?.programId || manualOrder.programId,
        productName:
          selectedManualOrderProgram?.programName || manualOrder.productName,
        assignedCoach:
          manualOrder.assignedCoach || currentScopedCoach?.name || "Kent Bastell",
        onboardingStatus: "New Order",
        intakeStatus: "Not Sent",
        fulfillmentStatus: "Pending",
      };
      const response = await fetch("/api/createProductOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.error || "Could not create manual order.", "error");
        return;
      }

      notify(`Manual order created: ${data.orderId}.`, "success");
      const createdOrder: ProductOrder = {
        recordId: data.recordId,
        orderId: data.orderId,
        clientId: "",
        clientName: orderPayload.clientName,
        email: orderPayload.email,
        phone: orderPayload.phone,
        productType: orderPayload.productType,
        programId: orderPayload.programId,
        productName: orderPayload.productName,
        amount: orderPayload.amount,
        currency: orderPayload.currency,
        paymentStatus: orderPayload.paymentStatus,
        paymentProvider: orderPayload.paymentProvider,
        purchasedAt: orderPayload.purchasedAt,
        accessStartDate: orderPayload.accessStartDate,
        accessEndDate: orderPayload.accessEndDate,
        intakeStatus: orderPayload.intakeStatus,
        assignedCoach: orderPayload.assignedCoach,
        onboardingStatus: orderPayload.onboardingStatus,
        fulfillmentStatus: orderPayload.fulfillmentStatus,
      };

      if (startOnboarding) {
        await assignOrderIntake(createdOrder);
      }

      resetManualOrderForm();
      setShowManualOrderForm(false);
      await loadProductOrders(true);
    } catch (error) {
      console.error(error);
      notify("Could not create manual order.", "error");
    } finally {
      setSavingManualOrder(false);
    }
  };
  const loadFormTemplates = async (force?: unknown) => {
    const shouldForce = force === true;
    const cached = formTemplatesCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.formTemplates);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setSavedFormTemplates(cached.data);

      if (!selectedSavedFormId && cached.data.length > 0) {
        setSelectedSavedFormId(cached.data[0].formId);
      }

      setFormTemplatesLoading(false);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<SavedFormTemplate[]>(CACHE_KEYS.formTemplates);
    if (persistentCache) {
      formTemplatesCacheRef.current = persistentCache;
      setSavedFormTemplates(persistentCache.data);

      if (!selectedSavedFormId && persistentCache.data.length > 0) {
        setSelectedSavedFormId(persistentCache.data[0].formId);
      }

      setFormTemplatesLoading(false);
      return persistentCache.data;
    }

    setFormTemplatesLoading(true);

    try {
      const response = await fetch("/api/formTemplates");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify(data.message || data.error || "Could not load saved forms.", "error");
        return [];
      }

      const forms = data.forms || [];
      formTemplatesCacheRef.current = { data: forms, timestamp: Date.now() };
      writePersistentCache(CACHE_KEYS.formTemplates, forms);
      setSavedFormTemplates(forms);

      if (!selectedSavedFormId && forms.length > 0) {
        setSelectedSavedFormId(forms[0].formId);
      }
      return forms;
    } catch (error) {
      console.error(error);
      notify("Could not load saved forms.", "error");
      return [];
    } finally {
      setFormTemplatesLoading(false);
    }
  };

  const loadTestTemplates = async (force?: unknown) => {
    const shouldForce = force === true;
    const cached = testTemplatesCacheRef.current;

    if (shouldForce) {
      clearPersistentCache(CACHE_KEYS.testTemplates);
    }

    if (!shouldForce && cached && isFreshCache(cached.timestamp)) {
      setSavedTestTemplates(cached.data);

      if (!selectedSavedTestId && cached.data.length > 0) {
        setSelectedSavedTestId(cached.data[0].testTemplateId);
      }

      setTestTemplatesLoading(false);
      return cached.data;
    }

    const persistentCache = shouldForce
      ? null
      : readPersistentCache<SavedTestTemplate[]>(CACHE_KEYS.testTemplates);
    if (persistentCache) {
      testTemplatesCacheRef.current = persistentCache;
      setSavedTestTemplates(persistentCache.data);

      if (!selectedSavedTestId && persistentCache.data.length > 0) {
        setSelectedSavedTestId(persistentCache.data[0].testTemplateId);
      }

      setTestTemplatesLoading(false);
      return persistentCache.data;
    }

    setTestTemplatesLoading(true);

    try {
      const response = await fetch("/api/testTemplates");
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify(data.message || data.error || "Could not load saved tests.", "error");
        return [];
      }

      const tests = data.tests || [];
      testTemplatesCacheRef.current = { data: tests, timestamp: Date.now() };
      writePersistentCache(CACHE_KEYS.testTemplates, tests);
      setSavedTestTemplates(tests);

      if (!selectedSavedTestId && tests.length > 0) {
        setSelectedSavedTestId(tests[0].testTemplateId);
      }
      return tests;
    } catch (error) {
      console.error(error);
      notify("Could not load saved tests.", "error");
      return [];
    } finally {
      setTestTemplatesLoading(false);
    }
  };

  const loadContentAssignments = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setContentAssignments([]);
      return [];
    }

    const assignmentParams = new URLSearchParams({
      clientId: client.id,
      clientCode: client.clientCode || "",
      clientName: client.name || "",
    });
    const response = await fetch(
      `/api/contentAssignments?${assignmentParams.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      throw new Error(data.message || data.error || "Could not load assignments.");
    }

    const assignments = data.assignments || [];
    setContentAssignments(assignments);
    return assignments;
  };

  const loadContentResponses = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setContentResponses([]);
      return [];
    }

    const responseParams = new URLSearchParams({
      clientId: client.id,
      clientName: client.name || "",
    });

    setContentResponsesLoading(true);

    try {
      const response = await fetch(
        `/api/contentResponses?${responseParams.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        throw new Error(data.message || data.error || "Could not load responses.");
      }

      const responses = data.responses || [];
      setContentResponses(responses);
      return responses;
    } catch (error) {
      console.error(error);
      if (!isClientPortal) {
        notify("Could not load questionnaire/test results.", "error");
      }
      return [];
    } finally {
      setContentResponsesLoading(false);
    }
  };

  const loadAthleteMetrics = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setAthleteMetrics([]);
      return [];
    }

    const metricParams = new URLSearchParams({
      clientId: client.clientCode || client.id || "",
      clientCode: client.clientCode || "",
      clientRecordId: client.id || "",
      clientName: client.name || "",
    });

    setAthleteMetricsLoading(true);

    try {
      const response = await fetch(`/api/athleteMetrics?${metricParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        throw new Error(data.message || data.error || "Could not load athlete metrics.");
      }

      const metrics = data.metrics || [];
      setAthleteMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error(error);
      if (!isClientPortal) {
        notify("Could not load athlete metrics.", "error");
      }
      return [];
    } finally {
      setAthleteMetricsLoading(false);
    }
  };

  const loadWorkoutComments = async (client: Client = selectedClient as Client) => {
    if (!client) {
      setWorkoutComments([]);
      return [];
    }

    const commentParams = new URLSearchParams({
      clientId: client.id,
      clientName: client.name || "",
    });

    try {
      const response = await fetch(
        `/api/workoutComments?${commentParams.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        throw new Error(data.message || data.error || "Could not load comments.");
      }

      const comments = data.comments || [];
      setWorkoutComments(comments);
      return comments;
    } catch (error) {
      console.error(error);
      if (!isClientPortal) {
        notify("Could not load workout comments.", "error");
      }
      return [];
    }
  };

  const markWorkoutCommentReviewed = async (comment: WorkoutComment) => {
    if (!comment.recordIds.length) return false;

    setReviewingWorkoutCommentKey(comment.key);

    try {
      const response = await fetch("/api/reviewWorkoutComment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recordIds: comment.recordIds }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not mark comment reviewed.", "error");
        return false;
      }

      setWorkoutComments((current) =>
        current.map((item) =>
          item.key === comment.key ? { ...item, reviewed: true } : item
        )
      );
      notify("Workout comment reviewed.", "success");
      return true;
    } catch (error) {
      console.error(error);
      notify("Could not mark comment reviewed.", "error");
      return false;
    } finally {
      setReviewingWorkoutCommentKey("");
    }
  };

  const fetchAllContentResponses = async () => {
    const response = await fetch("/api/contentResponses");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not load submissions.");
    }

    return (data.responses || []) as ContentResponse[];
  };

  const fetchAllWorkoutComments = async () => {
    const response = await fetch("/api/workoutComments");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not load workout comments.");
    }

    return (data.comments || []) as WorkoutComment[];
  };

  const fetchAllAssignedWorkouts = async () => {
    const response = await fetch("/api/workouts");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not load workouts.");
    }

    return (data.workouts || []) as Workout[];
  };

  // Unreviewed check-ins across every client, tagged with the client's name.
  const fetchUnreviewedCheckIns = async () => {
    const response = await fetch("/api/checkIns");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Could not load check-ins.");
    }
    const all = (data.checkIns || []) as PortalCheckIn[];
    return all
      .filter((c) => !c.coachReviewed)
      .map((c) => {
        const match = clients.find(
          (cl) =>
            cl.clientCode === c.clientId ||
            cl.id === c.clientId ||
            cl.name === c.clientId
        );
        return { ...c, clientName: match?.name || c.clientId };
      })
      .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
  };

  // In-person training / consulting enquiries (newest first).
  const fetchEnquiries = async () => {
    const response = await fetch("/api/enquiries");
    const data = await response.json();
    if (!response.ok) return [];
    return (data.enquiries || []) as any[];
  };

  // Coach replies to a check-in: saves the note, marks it reviewed, and the
  // athlete sees the reply in their portal.
  const respondToCheckIn = async (checkIn: PortalCheckIn) => {
    const text = (checkInReplyDrafts[checkIn.recordId] || "").trim();
    if (!text) {
      notify("Write a reply first.", "error");
      return;
    }
    setCheckInReplySaving(checkIn.recordId);
    try {
      const response = await fetch("/api/checkIns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: checkIn.recordId,
          coachResponse: text,
          coachReviewed: true,
          reviewedDate: dateToInputValue(new Date()),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not send reply.", "error");
        return;
      }
      setCoachReviewCheckIns((cur) =>
        cur.filter((c) => c.recordId !== checkIn.recordId)
      );
      setCheckInReplyDrafts((cur) => {
        const next = { ...cur };
        delete next[checkIn.recordId];
        return next;
      });
      notify("Reply sent.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not send reply.", "error");
    } finally {
      setCheckInReplySaving("");
    }
  };

  const loadCoachReviewQueue = async (force = false) => {
    setCoachReviewLoading(true);
    setCoachReviewError("");

    try {
      const [, responses, comments, assignedWorkouts, checkIns, enquiryList] =
        await Promise.all([
          loadProductOrders(force),
          fetchAllContentResponses(),
          fetchAllWorkoutComments(),
          fetchAllAssignedWorkouts(),
          fetchUnreviewedCheckIns(),
          fetchEnquiries(),
        ]);

      setCoachReviewResponses(responses);
      setCoachReviewComments(comments);
      setCoachReviewWorkouts(assignedWorkouts);
      setCoachReviewCheckIns(checkIns);
      setCoachReviewEnquiries(enquiryList);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Could not load review queue.";
      setCoachReviewError(message);
      notify("Could not load coach review queue.", "error");
    } finally {
      setCoachReviewLoading(false);
    }
  };

  const markGlobalWorkoutCommentReviewed = async (comment: WorkoutComment) => {
    const reviewed = await markWorkoutCommentReviewed(comment);
    if (!reviewed) return;

    setCoachReviewComments((current) =>
      current.map((item) =>
        item.key === comment.key ? { ...item, reviewed: true } : item
      )
    );
  };

  useEffect(() => {
    if (assignmentType === "Program") return;

    if (assignmentType === "Physical Test") {
      if (savedTestTemplates.length === 0 && !testTemplatesLoading) {
        void loadTestTemplates();
      }
      return;
    }

    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
  }, [assignmentType, workoutPageTab, activePage, selectedClient]);

  useEffect(() => {
    if (activePage !== "Orders" && activePage !== "Review") return;

    if (programs.length === 0) {
      void loadPrograms();
    }

    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "Review") return;
    void loadCoachReviewQueue();
  }, [activePage]);

  useEffect(() => {
    if (!selectedClient) return;
    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      void loadFormTemplates();
    }
    if (savedTestTemplates.length === 0 && !testTemplatesLoading) {
      void loadTestTemplates();
    }
  }, [selectedClient]);

  useEffect(() => {
    const closeOnDocumentClick = () => closeCalendarActionMenu();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCalendarActionMenu();
        setCopiedCalendarItem(null);
      }
    };

    document.addEventListener("click", closeOnDocumentClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("click", closeOnDocumentClick);
      document.removeEventListener("keydown", closeOnEscape);
      clearCalendarLongPress();
    };
  }, []);

  const loadSavedFormIntoBuilder = (form: SavedFormTemplate | undefined) => {
    if (!form) {
      notify("Please select a saved form.");
      return;
    }

    setFormTemplateName(form.name || form.formId || "Untitled Form");
    setFormTemplateType(form.type || "Questionnaire");
    setEditingFormTemplate({
      recordId: form.recordId,
      formId: form.formId,
    });
    setFormQuestions(
      form.questions.length > 0
        ? form.questions.map((question, index) => ({
            id: question.questionId || `Q${index + 1}`,
            label: question.label,
            questionType: question.questionType || "Text",
            required: Boolean(question.required),
          }))
        : [
            {
              id: "Q1",
              label: "New question",
              questionType: "Text",
              required: false,
            },
          ]
    );
    notify("Saved form loaded into builder. Saving will update this template.");
  };

  const duplicateSavedFormIntoBuilder = (form: SavedFormTemplate | undefined) => {
    if (!form) {
      notify("Please select a saved form.");
      return;
    }

    setFormTemplateName(`${form.name || form.formId || "Untitled Form"} Copy`);
    setFormTemplateType(form.type || "Questionnaire");
    setEditingFormTemplate(null);
    setFormQuestions(
      form.questions.length > 0
        ? form.questions.map((question, index) => ({
            id: `Q${index + 1}`,
            label: question.label,
            questionType: question.questionType || "Text",
            required: Boolean(question.required),
          }))
        : [
            {
              id: "Q1",
              label: "New question",
              questionType: "Text",
              required: false,
            },
          ]
    );
    notify("Form duplicated into builder. Saving will create a new template.");
  };

  const loadSavedTestIntoBuilder = (test: SavedTestTemplate | undefined) => {
    if (!test) {
      notify("Please select a saved test.");
      return;
    }

    setTestTemplateName(test.name || test.testTemplateId || "Untitled Test");
    setTestTemplateCategory(test.category || "Other");
    setEditingTestTemplate({
      recordId: test.recordId,
      testTemplateId: test.testTemplateId,
    });
    setTestItems(
      test.items.length > 0
        ? test.items.map((item, index) => ({
            id: item.testItemId || `T${index + 1}`,
            testName: item.testName,
            metricType: item.metricType || "Weight",
            unit: item.unit || "kg",
            createsMetric: Boolean(item.createsMetric),
            metricName: item.metricName || "",
            metricUnit: item.metricUnit || "",
            calculationMethod: item.calculationMethod || "Direct Value",
            inputUnit: item.inputUnit || "",
          }))
        : [
            {
              id: "T1",
              testName: "New Test",
              metricType: "Weight",
              unit: "kg",
              createsMetric: false,
              metricName: "",
              metricUnit: "",
              calculationMethod: "Direct Value",
              inputUnit: "",
            },
          ]
    );
    notify("Saved test loaded into builder. Saving will update this template.");
  };

  const duplicateSavedTestIntoBuilder = (test: SavedTestTemplate | undefined) => {
    if (!test) {
      notify("Please select a saved test.");
      return;
    }

    setTestTemplateName(`${test.name || test.testTemplateId || "Untitled Test"} Copy`);
    setTestTemplateCategory(test.category || "Other");
    setEditingTestTemplate(null);
    setTestItems(
      test.items.length > 0
        ? test.items.map((item, index) => ({
            id: `T${index + 1}`,
            testName: item.testName,
            metricType: item.metricType || "Weight",
            unit: item.unit || "kg",
            createsMetric: Boolean(item.createsMetric),
            metricName: item.metricName || "",
            metricUnit: item.metricUnit || "",
            calculationMethod: item.calculationMethod || "Direct Value",
            inputUnit: item.inputUnit || "",
          }))
        : [
            {
              id: "T1",
              testName: "New Test",
              metricType: "Weight",
              unit: "kg",
              createsMetric: false,
              metricName: "",
              metricUnit: "",
              calculationMethod: "Direct Value",
              inputUnit: "",
            },
          ]
    );
    notify("Test duplicated into builder. Saving will create a new template.");
  };

  const deleteSavedFormTemplate = async (form: SavedFormTemplate) => {
    const name = form.name || form.formId || "this saved form";

    if (!window.confirm(`Delete ${name}? This also removes its saved questions.`)) {
      return;
    }

    try {
      const response = await fetch("/api/formTemplates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: form.recordId,
          formId: form.formId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not delete saved form.", "error");
        return;
      }

      notify("Saved form deleted.");
      if (selectedSavedFormId === form.formId) {
        setSelectedSavedFormId("");
      }
      if (editingFormTemplate?.formId === form.formId) {
        setEditingFormTemplate(null);
      }
      await loadFormTemplates(true);
    } catch (error) {
      console.error(error);
      notify("Could not delete saved form.", "error");
    }
  };

  const deleteSavedTestTemplate = async (test: SavedTestTemplate) => {
    const name = test.name || test.testTemplateId || "this saved test";

    if (!window.confirm(`Delete ${name}? This also removes its saved test items.`)) {
      return;
    }

    try {
      const response = await fetch("/api/testTemplates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: test.recordId,
          testTemplateId: test.testTemplateId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not delete saved test.", "error");
        return;
      }

      notify("Saved test deleted.");
      if (selectedSavedTestId === test.testTemplateId) {
        setSelectedSavedTestId("");
      }
      if (editingTestTemplate?.testTemplateId === test.testTemplateId) {
        setEditingTestTemplate(null);
      }
      await loadTestTemplates(true);
    } catch (error) {
      console.error(error);
      notify("Could not delete saved test.", "error");
    }
  };

  const saveFormTemplate = async () => {
    if (!formTemplateName.trim()) {
      notify("Please enter a form name.", "error");
      return;
    }

    if (formQuestions.length === 0) {
      notify("Please add at least one question.", "error");
      return;
    }

    setSavingFormTemplate(true);

    try {
      const response = await fetch("/api/formTemplates", {
        method: editingFormTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: editingFormTemplate?.recordId,
          formId: editingFormTemplate?.formId,
          name: formTemplateName,
          type: formTemplateType,
          status: "Active",
          createdBy: "Kent Bastell",
          questions: formQuestions,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not save form template.", "error");
        return;
      }

      notify(
        editingFormTemplate
          ? `Form updated. Questions saved: ${data.questionRecordsCreated}`
          : `Form saved. Questions created: ${data.questionRecordsCreated}`
      );
      await loadFormTemplates(true);
      setSelectedSavedFormId(data.formId);
      setEditingFormTemplate({
        recordId: data.formRecordId,
        formId: data.formId,
      });
    } catch (error) {
      console.error(error);
      notify("Could not save form template.", "error");
    } finally {
      setSavingFormTemplate(false);
    }
  };

  const saveTestTemplate = async () => {
    if (!testTemplateName.trim()) {
      notify("Please enter a test template name.", "error");
      return;
    }

    if (testItems.length === 0) {
      notify("Please add at least one test item.", "error");
      return;
    }

    setSavingTestTemplate(true);

    try {
      const response = await fetch("/api/testTemplates", {
        method: editingTestTemplate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: editingTestTemplate?.recordId,
          testTemplateId: editingTestTemplate?.testTemplateId,
          name: testTemplateName,
          category: testTemplateCategory,
          status: "Active",
          items: testItems,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not save test template.", "error");
        return;
      }

      notify(
        editingTestTemplate
          ? `Test template updated. Items saved: ${data.itemRecordsCreated}`
          : `Test template saved. Items created: ${data.itemRecordsCreated}`
      );
      await loadTestTemplates(true);
      setSelectedSavedTestId(data.testTemplateId);
      setEditingTestTemplate({
        recordId: data.testRecordId,
        testTemplateId: data.testTemplateId,
      });
    } catch (error) {
      console.error(error);
      notify("Could not save test template.", "error");
    } finally {
      setSavingTestTemplate(false);
    }
  };

  const assignmentTemplateOptions =
    assignmentType === "Program"
      ? programs.map((program) => ({
          id: program.programId,
          label: program.programName || program.programId || "Untitled Program",
          meta: `${program.durationWeeks || "--"} weeks`,
        }))
      : assignmentType === "Physical Test"
      ? savedTestTemplates
          .filter((test) => test.status !== "Archived")
          .map((test) => ({
            id: test.testTemplateId,
            label: test.name || test.testTemplateId || "Untitled Test",
            meta: `${test.items.length} test${test.items.length === 1 ? "" : "s"}`,
          }))
      : savedFormTemplates
          .filter((form) => form.status !== "Archived")
          .filter((form) => {
            const type = form.type.toLowerCase();

            if (assignmentType === "Check-in") {
              return type.includes("check") || type.includes("readiness");
            }

            return true;
          })
          .map((form) => ({
            id: form.formId,
            label: form.name || form.formId || "Untitled Form",
            meta: `${form.type || assignmentType || "Form"} - ${
              form.questions.length
            } question${
              form.questions.length === 1 ? "" : "s"
            }`,
          }));
  const clientNameForCode = (code?: string) => {
    if (!code) return "";
    const match = clients.find(
      (c) => c.clientCode === code || c.id === code || c.name === code
    );
    return match?.name || code;
  };
  // Distinct store categories already in use, for the builder's category picker.
  const existingStoreCategories = Array.from(
    new Set(programs.map((p) => (p.storeCategory || "").trim()).filter(Boolean))
  ).sort();
  const visibleSavedPrograms = programs
    .filter((program) => program.status !== "Archived")
    .filter((program) => {
      const f = savedProgramProductFilter;
      if (f === "All") return true;
      if (f === "internal") {
        // General/internal: no client or team assignment.
        return !program.builtForClient && !program.builtForTeam;
      }
      if (f.startsWith("type:")) {
        return (
          (program.productType || "Internal Coaching Template") ===
          f.slice(5)
        );
      }
      if (f.startsWith("team:")) return program.builtForTeam === f.slice(5);
      if (f.startsWith("client:")) {
        return program.builtForClient === f.slice(7);
      }
      // Back-compat with any plain product-type value.
      return (program.productType || "Internal Coaching Template") === f;
    })
    .filter((program) => {
      const search = savedProgramSearch.toLowerCase();
      const builtClient = clientNameForCode(program.builtForClient).toLowerCase();

      return (
        program.programName.toLowerCase().includes(search) ||
        program.goal.toLowerCase().includes(search) ||
        program.phase.toLowerCase().includes(search) ||
        String(program.productType || "").toLowerCase().includes(search) ||
        builtClient.includes(search) ||
        (program.builtForClient || "").toLowerCase().includes(search) ||
        (program.builtForTeam || "").toLowerCase().includes(search)
      );
    });
  // Split the library: the Programs tab holds multi-week programs; the Sessions
  // tab holds reusable single workouts (saved with productType "Single Workout").
  const isSessionProgram = (p: Program) => p.productType === "Single Workout";
  const visibleProgramsOnly = visibleSavedPrograms.filter(
    (p) => !isSessionProgram(p)
  );
  const visibleSessionsOnly = visibleSavedPrograms.filter(isSessionProgram);
  const visibleSavedForms = savedFormTemplates.filter((form) => {
    const search = savedFormSearch.toLowerCase();

    return (
      form.status !== "Archived" &&
      (form.name.toLowerCase().includes(search) ||
        form.type.toLowerCase().includes(search) ||
        form.description.toLowerCase().includes(search))
    );
  });
  const visibleSavedTests = savedTestTemplates.filter((test) => {
    const search = savedTestSearch.toLowerCase();

    return (
      test.status !== "Archived" &&
      (test.name.toLowerCase().includes(search) ||
        test.description.toLowerCase().includes(search) ||
        test.items.some((item) => item.testName.toLowerCase().includes(search)))
    );
  });

  // Forms / Tests landing table (mirrors the Sessions/Programs table style).
  const renderTemplateLibrary = (kind: "form" | "test") => {
    const isForm = kind === "form";
    const items: any[] = isForm ? visibleSavedForms : visibleSavedTests;
    const loading = isForm ? formTemplatesLoading : testTemplatesLoading;
    const search = isForm ? savedFormSearch : savedTestSearch;
    const setSearch = isForm ? setSavedFormSearch : setSavedTestSearch;
    const openItem = (t: any) => {
      if (isForm) {
        setSelectedSavedFormId(t.formId);
        loadSavedFormIntoBuilder(t);
        setFormView("builder");
      } else {
        setSelectedSavedTestId(t.testTemplateId);
        loadSavedTestIntoBuilder(t);
        setTestView("builder");
      }
    };
    return (
      <section className="programLibraryPanel">
        <div className="programLibraryHeader programLandingHeader">
          <div className="programLandingControls">
            <span className="programViewSelect programViewStatic">
              {isForm ? "Forms" : "Tests"}
            </span>
            <input
              className="templateSearchInput programLandingSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isForm ? "Search forms..." : "Search tests..."}
            />
          </div>
          <div className="programLandingActions">
            <button
              className="outlineButton"
              onClick={() =>
                isForm ? loadFormTemplates(true) : loadTestTemplates(true)
              }
            >
              Refresh
            </button>
            <button
              className="goldButton"
              onClick={() => (isForm ? startNewForm() : startNewTest())}
            >
              {isForm ? "Create Form" : "Create Test"}
            </button>
          </div>
        </div>

        <div className="programLibraryStack">
          <div className="programTable templateTable">
            <div className="programTableHead">
              <span>Title</span>
              <span>Type</span>
              <span>Items</span>
              <span>Created By</span>
              <span className="programTableActionsHead">Actions</span>
            </div>

            {loading && items.length === 0 && (
              <p className="programTableEmpty">Loading…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="programTableEmpty">
                {isForm
                  ? "No saved forms yet. Create one to assign to clients."
                  : "No saved tests yet. Create one to track performance."}
              </p>
            )}

            {items.map((t) => {
              const name = isForm
                ? t.name || t.formId || "Untitled Form"
                : t.name || t.testTemplateId || "Untitled Test";
              const initials =
                String(name)
                  .split(/\s+/)
                  .map((w: string) => w[0])
                  .filter(Boolean)
                  .join("")
                  .slice(0, 3)
                  .toUpperCase() || (isForm ? "FM" : "TS");
              const type = isForm ? t.type || "Form" : t.status || "Active";
              const count = isForm
                ? `${t.questions.length} questions`
                : `${t.items.length} items`;
              return (
                <div
                  key={t.recordId}
                  className="programTableRow"
                  onClick={() => openItem(t)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTemplateMenu({
                      kind,
                      recordId: t.recordId,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                >
                  <span className="programTableTitle">
                    <span className="programTableBadge">{initials}</span>
                    <span className="programTableName">
                      <strong>{name}</strong>
                    </span>
                  </span>
                  <span className="programTableCell">{type}</span>
                  <span className="programTableCell">{count}</span>
                  <span className="programTableCell">
                    {t.coach || t.createdBy || "—"}
                  </span>
                  <span
                    className="programTableActions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="iconActionButton"
                      title="Edit"
                      onClick={() => openItem(t)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="iconActionButton dangerMenuItem"
                      title="Delete"
                      onClick={() =>
                        isForm
                          ? deleteSavedFormTemplate(t)
                          : deleteSavedTestTemplate(t)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const createContentAssignment = async (
    overrides: Partial<{
      assignmentType: string;
      assignmentTemplateId: string;
      assignmentClientId: string;
      assignmentDueDate: string;
    }> = {}
  ) => {
    const nextAssignmentType = overrides.assignmentType || assignmentType;
    const nextTemplateId = overrides.assignmentTemplateId || assignmentTemplateId;
    const nextClientId = overrides.assignmentClientId || assignmentClientId;
    const nextDueDate = normalizeDate(
      overrides.assignmentDueDate || assignmentDueDate
    );
    const client =
      clients.find((item) => item.id === nextClientId) || selectedClient;
    const selectedAssignmentTemplate = assignmentTemplateOptions.find(
      (option) => option.id === nextTemplateId
    );

    if (!client) {
      notify("Please select a client.", "error");
      return;
    }

    if (!nextTemplateId) {
      notify("Please select a saved item to assign.", "error");
      return;
    }

    if (nextAssignmentType === "Program") {
      const program = programs.find((item) => item.programId === nextTemplateId);

      setSelectedSavedProgramId(nextTemplateId);
      setSavedAssignClientId(client.id);
      setWorkoutPageTab("Saved Programs");
      notify(
        `Program selected: ${program?.programName || "Saved Program"}. Load sessions there to assign workout dates.`
      );
      return;
    }

    setCreatingAssignment(true);

    try {
      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: nextAssignmentType,
          templateId: nextTemplateId,
          templateName: selectedAssignmentTemplate?.label || "",
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: dateToInputValue(new Date()),
          dueDate: nextDueDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not create assignment.", "error");
        return;
      }

      if (selectedClient?.id === client.id) {
        await loadContentAssignments(client);
      }

      setCalendarAnchorDate(nextDueDate);
      setAssignmentDueDate(dateToInputValue(new Date()));
      notify(`${nextAssignmentType} assigned to ${client.name}.`, "success");
      setShowAssignmentDrawer(false);
    } catch (error) {
      console.error(error);
      notify("Could not create assignment.", "error");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const savedProgramSessions = Array.from(
    savedProgramTemplates
      .reduce((sessions, template) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!sessions.has(key)) {
          sessions.set(key, {
            localId: key,
            week: String(template.week),
            day: String(template.day),
            sessionName: template.sessionName,
            sessionType: template.sessionType || "Strength",
            sessionGoal: template.sessionGoal || "",
            estimatedDuration: template.estimatedDuration || "",
            intensity: template.intensity || "Moderate",
            isSingleWorkout: Boolean(template.isSingleWorkout),
            exercises: [] as ProgramExercise[],
          });
        }

        const baseExercise: ProgramExercise = {
          exerciseRecordId: "",
          exerciseId: template.exerciseId,
          exerciseName: template.exerciseName,
          order: template.order,
          sectionName: "Main",
          exerciseLabel: makeExerciseLabel(
            sessions.get(key)?.exercises.length || 0
          ),
          sets: "",
          reps: "",
          load: "",
          tempo: "",
          rest: "",
          coachingNotes: "",
          trackingType: "Weight",
          isUnilateral: false,
          groupType: "Straight",
          groupName: "",
        };

        sessions.get(key)?.exercises.push(withNormalizedSetFields(baseExercise));

        return sessions;
      }, new Map<string, ProgramSession>())
      .values()
  ).sort((a, b) => {
    if (Number(a.week) !== Number(b.week)) return Number(a.week) - Number(b.week);
    return Number(a.day) - Number(b.day);
  });

  const loadSavedProgramTemplates = async (programId: string) => {
    if (!programId) return;

    setSavedTemplatesLoading(true);
    setSavedProgramTemplates([]);
    setSavedAssignableWorkouts([]);

    try {
      const recordId =
        programs.find((p) => p.programId === programId)?.recordId || "";
      const response = await fetch(
        `/api/programTemplates?programId=${encodeURIComponent(
          programId
        )}&programRecordId=${encodeURIComponent(recordId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not load saved program templates.");
        return;
      }

      setSavedProgramTemplates(data.templates || []);
    } catch (error) {
      console.error(error);
      notify("Could not load saved program templates.");
    } finally {
      setSavedTemplatesLoading(false);
    }
  };

  const deleteSavedProgram = async (program: Program) => {
    const label = program.programName || "this program";

    if (
      !window.confirm(
        `Delete "${label}" and all of its saved sessions? This cannot be undone.`
      )
    )
      return;

    setDeletingSavedProgramId(program.recordId);

    try {
      // Remove the program's session/template records first so none are orphaned.
      let templates: { recordId?: string }[] = [];
      try {
        const templatesResponse = await fetch(
          `/api/programTemplates?programId=${encodeURIComponent(
            program.programId || program.recordId
          )}&programRecordId=${encodeURIComponent(program.recordId || "")}`
        );
        const templatesData = await templatesResponse.json();
        if (templatesResponse.ok) {
          templates = templatesData.templates || [];
        }
      } catch (templateError) {
        console.warn("Could not load templates for deletion", templateError);
      }

      for (const template of templates) {
        if (!template.recordId) continue;
        await fetch("/api/deleteRecord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resource: "workoutTemplate",
            recordId: template.recordId,
          }),
        });
      }

      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "program",
          recordId: program.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not delete program.", "error");
        return;
      }

      setPrograms((current) =>
        current.filter((item) => item.recordId !== program.recordId)
      );
      if (selectedSavedProgramId === program.programId) {
        setSelectedSavedProgramId("");
      }
      setSavedProgramTemplates([]);
      notify("Program deleted.", "success");
      void loadPrograms(true);
    } catch (error) {
      console.error(error);
      notify("Could not delete program.", "error");
    } finally {
      setDeletingSavedProgramId("");
    }
  };

  const loadSavedProgramSessionsForAssignment = async () => {
    if (!selectedSavedProgram) {
      notify("Please select a program.");
      return;
    }

    if (!savedAssignStartDate) {
      notify("Please choose a start date.");
      return;
    }

    setSavedAssignLoading(true);

    try {
      // Always fetch the currently-selected program's sessions — never reuse
      // whatever is in state, which could belong to a previously-viewed
      // program and would assign the wrong sessions.
      const response = await fetch(
        `/api/programTemplates?programId=${encodeURIComponent(
          selectedSavedProgram.programId
        )}&programRecordId=${encodeURIComponent(
          selectedSavedProgram.recordId || ""
        )}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        notify("Could not load program templates.");
        return;
      }

      const templates: typeof savedProgramTemplates = data.templates || [];
      setSavedProgramTemplates(templates);

      if (templates.length === 0) {
        setSavedAssignableWorkouts([]);
        notify("This program has no sessions to assign.", "error");
        return;
      }

      const uniqueSessionsMap = new Map<string, AssignableWorkout>();

      templates.forEach((template) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!uniqueSessionsMap.has(key)) {
          const offsetDays =
            (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

          uniqueSessionsMap.set(key, {
            localId: key,
            week: Number(template.week),
            day: Number(template.day),
            sessionName: template.sessionName,
            sessionType: template.sessionType || "Strength",
            sessionGoal: template.sessionGoal || "",
            estimatedDuration: template.estimatedDuration || "",
            intensity: template.intensity || "Moderate",
            scheduledDate: addDays(savedAssignStartDate, offsetDays),
          });
        }
      });

      setSavedAssignableWorkouts(Array.from(uniqueSessionsMap.values()));
    } catch (error) {
      console.error(error);
      notify("Could not load program sessions.");
    } finally {
      setSavedAssignLoading(false);
    }
  };

  const updateSavedAssignableWorkoutDate = (
    localId: string,
    scheduledDate: string
  ) => {
    setSavedAssignableWorkouts((prev) =>
      prev.map((workout) =>
        workout.localId === localId ? { ...workout, scheduledDate } : workout
      )
    );
  };

  const assignSavedProgramToClient = async () => {
    const client = clients.find((item) => item.id === savedAssignClientId);

    if (!client || !selectedSavedProgram) {
      notify("Please select a client and program.");
      return;
    }

    if (savedAssignableWorkouts.length === 0) {
      notify("Please load sessions first.");
      return;
    }

    setSavedAssigningProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          programRecordId: selectedSavedProgram.recordId,
          scheduledWorkouts: savedAssignableWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            sessionType: workout.sessionType,
            sessionGoal: workout.sessionGoal,
            estimatedDuration: workout.estimatedDuration,
            intensity: workout.intensity,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign program. Check API response.");
        return;
      }

      notify(`Program assigned to ${client.name}. Workouts created: ${data.recordsCreated}`);
      setSavedAssignableWorkouts([]);
    } catch (error) {
      console.error(error);
      notify("Could not assign program.");
    } finally {
      setSavedAssigningProgram(false);
    }
  };

  // Fetch a saved program's sessions (with exercises) without touching the
  // builder — used by the Session Library so coaches can reuse any day.
  // Group the flat per-exercise template rows into builder sessions. The rows
  // already carry the full prescription (sets/reps/tempo/rest/notes), so this
  // needs no extra round-trips.
  const buildSessionsFromTemplates = (
    templates: SavedProgramTemplate[]
  ): ProgramSession[] => {
    const map = new Map<string, ProgramSession>();
    [...templates]
      .sort(
        (a, b) =>
          (Number(a.week) || 0) - (Number(b.week) || 0) ||
          (Number(a.day) || 0) - (Number(b.day) || 0) ||
          (Number(a.order) || 0) - (Number(b.order) || 0)
      )
      .forEach((t) => {
        const key = `${t.week}-${t.day}-${t.sessionName}`;
        if (!map.has(key)) {
          map.set(key, {
            localId: key,
            week: String(t.week),
            day: String(t.day),
            sessionName: t.sessionName,
            sessionType: t.sessionType || "Strength",
            sessionGoal: t.sessionGoal || "",
            estimatedDuration: t.estimatedDuration || "",
            intensity: t.intensity || "Moderate",
            isSingleWorkout: Boolean(t.isSingleWorkout),
            exercises: [],
          });
        }
        if (!t.exerciseName && !t.exerciseId) return;
        const session = map.get(key)!;
        const index = session.exercises.length;
        const meta = parseExerciseNotes(t.notes || "");
        const baseExercise: ProgramExercise = {
          // The linked library record id (when known) lets saves skip the
          // exercise-library lookup; falls back to exerciseId resolution.
          exerciseRecordId: t.exerciseRecordId || "",
          exerciseId: t.exerciseId,
          exerciseName: t.exerciseName,
          order: Number(t.order) || index + 1,
          sectionName: meta.sectionName || "Main",
          exerciseLabel: meta.exerciseLabel || makeExerciseLabel(index),
          sets: t.sets || "",
          reps: t.reps || "",
          load: "",
          tempo: t.tempo || "",
          rest: t.rest || "",
          coachingNotes: meta.coachingNotes,
          trackingType: meta.trackingType,
          trackingFields: meta.trackingFields,
          isUnilateral: meta.isUnilateral,
          groupType: meta.groupType || "Straight",
          groupName: meta.groupName,
          groupMode: meta.groupMode || "",
          groupMinutes: meta.groupMinutes || "",
          isAccessory: meta.isAccessory,
          accessoryParentLabel: meta.accessoryParentLabel,
          accessoryColor: meta.accessoryColor,
          setPrescriptions: meta.setPrescriptions,
          alternateExercises: meta.alternateExercises,
        };
        session.exercises.push(withNormalizedSetFields(baseExercise));
      });
    return [...map.values()];
  };

  const fetchProgramSessions = async (
    programId: string,
    programRecordId: string
  ): Promise<ProgramSession[]> => {
    const templateResponse = await fetch(
      `/api/programTemplates?programId=${encodeURIComponent(
        programId
      )}&programRecordId=${encodeURIComponent(programRecordId || "")}`
    );
    const templateData = await templateResponse.json();
    if (!templateResponse.ok) return [];
    return buildSessionsFromTemplates(templateData.templates || []);
  };

  // Read-only at-a-glance preview of a saved program (right-click → Preview).
  const openProgramPreview = async (program: Program) => {
    setProgramMenu(null);
    setPreviewLoading(true);
    setPreviewProgram({ program, sessions: [] });
    try {
      const sessions = await fetchProgramSessions(
        program.programId,
        program.recordId || ""
      );
      setPreviewProgram({ program, sessions });
    } catch (error) {
      console.error(error);
      notify("Could not load program preview.");
      setPreviewProgram(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadSessionLibrary = async (program: Program) => {
    setSessionLibProgramId(program.programId);
    setSessionLibLoading(true);
    try {
      const sessions = await fetchProgramSessions(
        program.programId,
        program.recordId || ""
      );
      setSessionLibSessions(sessions);
    } catch (error) {
      console.error(error);
      notify("Could not load sessions for that program.");
      setSessionLibSessions([]);
    } finally {
      setSessionLibLoading(false);
    }
  };

  // Drop a library session onto a calendar cell (copy into that week/day).
  const insertLibrarySessionAtCell = (
    session: ProgramSession,
    week: number,
    day: number
  ) => {
    setProgramSessions((current) => [
      ...current,
      {
        ...session,
        localId: `${Date.now()}-${Math.random()}`,
        week: String(week),
        day: String(day),
        isSingleWorkout: false,
        exercises: session.exercises.map((ex) => ({ ...ex })),
      },
    ]);
    setBuilderSaveStatus("dirty");
    notify(`Inserted "${session.sessionName}" into Week ${week}, Day ${day}.`);
  };

  // Paste a cut/copied session onto a day. A cut removes the original.
  const pasteSessionAtCell = (week: number, day: number) => {
    if (!copiedSession) return;
    const { session, mode } = copiedSession;
    setProgramSessions((current) => {
      const base =
        mode === "cut"
          ? current.filter((s) => s.localId !== session.localId)
          : current;
      return [
        ...base,
        {
          ...session,
          localId: `${Date.now()}-${Math.random()}`,
          week: String(week),
          day: String(day),
          exercises: session.exercises.map((ex) => ({ ...ex })),
        },
      ];
    });
    setBuilderSaveStatus("dirty");
    if (mode === "cut") setCopiedSession(null);
    notify(
      `Pasted "${session.sessionName}" into Week ${week}, Day ${day}.`
    );
  };

  // "Add from Library": one click on a saved session → fetch + insert into the
  // target cell (sessions are single-workout programs, usually one session).
  const insertSessionFromLibrary = async (program: Program) => {
    if (!libPickTarget) return;
    const { w, d } = libPickTarget;
    setLibPickLoadingId(program.programId);
    try {
      const sessions = await fetchProgramSessions(
        program.programId,
        program.recordId || ""
      );
      const session = sessions[0];
      if (!session) {
        notify("That session has no exercises yet.");
        return;
      }
      insertLibrarySessionAtCell(session, w, d);
      setLibPickTarget(null);
    } catch (error) {
      console.error(error);
      notify("Could not load that session.");
    } finally {
      setLibPickLoadingId("");
    }
  };

  const loadSavedProgramIntoBuilder = async (
    programArg?: Program,
    opts?: { edit?: boolean; asCopy?: boolean }
  ) => {
    const sourceProgram = programArg || selectedSavedProgram;
    if (!sourceProgram) {
      notify("Please select a program.");
      return;
    }
    // Edit = update this record on save; Duplicate/open = create a new one.
    if (opts?.edit) {
      setEditProgramId(sourceProgram.programId);
      setEditProgramRecordId(sourceProgram.recordId || "");
    } else {
      setEditProgramId("");
      setEditProgramRecordId("");
    }

    setSavedTemplatesLoading(true);

    try {
      const templateResponse = await fetch(
        `/api/programTemplates?programId=${encodeURIComponent(
          sourceProgram.programId
        )}&programRecordId=${encodeURIComponent(
          sourceProgram.recordId || ""
        )}`
      );
      const templateData = await templateResponse.json();

      if (!templateResponse.ok) {
        console.error(templateData);
        notify("Could not load program templates.");
        return;
      }

      // Single call: the template rows already carry the full prescription, so
      // the whole program is built without per-day /api/workoutDetails fetches.
      const sessions = buildSessionsFromTemplates(
        templateData.templates || []
      );

      setBuilderMode(
        sourceProgram.productType === "Single Workout"
          ? "Single Workout"
          : "Program"
      );
      setProgramName(
        opts?.asCopy
          ? `${sourceProgram.programName} Copy`
          : sourceProgram.programName
      );
      setProgramGoal(sourceProgram.goal);
      setProgramSport(sourceProgram.sport);
      setProgramLevel(sourceProgram.level);
      setProgramDurationWeeks(sourceProgram.durationWeeks || "4");
      setProgramPhase(sourceProgram.phase);
      setProgramSessionsPerWeek(sourceProgram.sessionsPerWeek || "3");
      setProgramCoach(sourceProgram.coach || "Kent Bastell");
      setProgramProductType(sourceProgram.productType || "Digital Program");
      setProgramPrice(sourceProgram.price || "");
      setProgramCurrency(sourceProgram.currency || "CNY");
      setProgramPublicStoreVisible(Boolean(sourceProgram.publicStoreVisible));
      setProgramPurchaseLink(sourceProgram.purchaseLink || "");
      setProgramDefaultIntakeFormId(sourceProgram.defaultIntakeFormId || "");
      setProgramAccessLengthDays(sourceProgram.accessLengthDays || "42");
      setProgramProductStatus(sourceProgram.productStatus || "Draft");
      setProgramSalesDescription(sourceProgram.salesDescription || "");
      // Carry the original "built for" tag so the coach can re-point the copy
      // at a new client/team before saving.
      setProgramBuiltForClient(sourceProgram.builtForClient || "");
      setProgramBuiltForTeam(sourceProgram.builtForTeam || "");
      setProgramBuiltForMode(
        sourceProgram.builtForClient
          ? "client"
          : sourceProgram.builtForTeam
          ? "team"
          : "internal"
      );
      setProgramStoreCategory(sourceProgram.storeCategory || "");
      setProgramStoreCategoryCn(sourceProgram.storeCategoryCn || "");
      setProgramBundleIds(
        (sourceProgram.bundleProgramIds || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
      setProgramSessions(sessions);
      setSelectedProgramExercises([]);
      setProgramWeek("1");
      setProgramDay("1");
      setSessionName("");
      setWorkoutPageTab("Program Builder");

      notify(
        opts?.edit
          ? "Editing in builder. Saving updates this program."
          : opts?.asCopy
          ? "Duplicated into builder. Saving creates a new program."
          : "Opened in builder. Saving creates a new program version."
      );
    } catch (error) {
      console.error(error);
      notify("Could not load program into builder.");
    } finally {
      setSavedTemplatesLoading(false);
    }
  };

  // Programming landing "Create Program" → seed a blank multi-day builder
  // from the details modal, then jump into the builder.
  const startProgramFromDraft = () => {
    setProgramProductType(createDraft.productType);
    setProgramName(createDraft.name.trim() || "Untitled Program");
    setProgramGoal(createDraft.goal.trim());
    setProgramPhase(createDraft.phase.trim());
    setProgramDurationWeeks(
      String(Math.max(1, Number(createDraft.durationWeeks) || 1))
    );
    // Sessions/week dropped from the UI; keep a sane default for the schema.
    setProgramSessionsPerWeek("3");
    setProgramBuiltForMode("internal");
    setProgramBuiltForClient("");
    setProgramBuiltForTeam("");
    // Commerce/store fields must not leak from a previously loaded product
    // into a fresh program (it could publish with the old price/copy).
    setProgramPrice("");
    setProgramCurrency("CNY");
    setProgramPublicStoreVisible(false);
    setProgramPurchaseLink("");
    setProgramDefaultIntakeFormId("");
    setProgramAccessLengthDays("42");
    setProgramProductStatus("Draft");
    setProgramSalesDescription("");
    setProgramStoreCategory("");
    setProgramStoreCategoryCn("");
    setProgramBundleIds([]);
    // Fresh canvas. Clearing the edit target is critical: leftover ids from a
    // previously edited program would make saveProgram overwrite that program.
    setEditProgramId("");
    setEditProgramRecordId("");
    setProgramSessions([]);
    setSelectedProgramExercises([]);
    setProgramWeek("1");
    setProgramDay("1");
    setSessionName("");
    setBuilderMode("Program");
    setBuilderSubTab("build");
    setCreateProgramOpen(false);
    setWorkoutPageTab("Program Builder");
    // Fresh defaults next time the Create Program modal opens.
    setCreateDraft({
      productType: "Digital Program",
      name: "",
      goal: "",
      phase: "Foundation",
      durationWeeks: "4",
    });
  };

  // Sessions tab "Create Session" → a fresh single-workout builder.
  const startNewSession = () => {
    setEditProgramId("");
    setEditProgramRecordId("");
    setProgramName("");
    setProgramGoal("");
    setProgramProductType("Single Workout");
    setProgramSessions([]);
    setSelectedProgramExercises([]);
    setProgramWeek("1");
    setProgramDay("1");
    setSessionName("");
    setEditingProgramSessionId("");
    setBuilderMode("Single Workout");
    setBuilderSubTab("build");
    setMobileBuilderStep("editor");
    setWorkoutPageTab("Program Builder");
  };

  // Forms/Tests "Create" → reset the builder and switch to builder view.
  const startNewForm = () => {
    setFormTemplateName("");
    setFormTemplateType("Questionnaire");
    setEditingFormTemplate(null);
    setFormQuestions([
      { id: "Q1", label: "New question", questionType: "Text", required: false },
    ]);
    setFormView("builder");
  };

  const startNewTest = () => {
    setTestTemplateName("");
    setTestTemplateCategory("Other");
    setEditingTestTemplate(null);
    setTestItems([
      {
        id: "T1",
        testName: "New Test",
        metricType: "Weight",
        unit: "kg",
        createsMetric: false,
        metricName: "",
        metricUnit: "",
        calculationMethod: "Direct Value",
        inputUnit: "",
      },
    ]);
    setTestView("builder");
  };

  // The Tests library page lives on its own nav tab; the Physical Test
  // Builder still lives inside the Programming page. These handlers hop
  // between the two so create/edit/duplicate from the Tests page lands in
  // the builder, and the builder's back link returns to the Tests page.
  const openTestFromTestsPage = (test?: SavedTestTemplate) => {
    if (test) {
      setSelectedSavedTestId(test.testTemplateId);
      loadSavedTestIntoBuilder(test);
      setTestView("builder");
    } else {
      startNewTest();
    }
    setWorkoutPageTab("Tests");
    setActivePage("Workouts");
  };

  const duplicateTestFromTestsPage = (test: SavedTestTemplate) => {
    duplicateSavedTestIntoBuilder(test);
    setTestView("builder");
    setWorkoutPageTab("Tests");
    setActivePage("Workouts");
  };

  const exitTestBuilder = () => {
    setTestView("list");
    setActivePage("Tests");
  };

  const loadProgramSessionsForAssignment = async () => {
    if (!selectedAssignProgram) {
      notify("Please select a program.");
      return;
    }

    if (!assignStartDate) {
      notify("Please choose a start date.");
      return;
    }

    setAssignLoading(true);

    try {
      const res = await fetch(
        `/api/programTemplates?programId=${encodeURIComponent(
          selectedAssignProgram.programId
        )}&programRecordId=${encodeURIComponent(
          selectedAssignProgram.recordId || ""
        )}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        notify("Could not load program templates.");
        return;
      }

      const templates = data.templates || [];
      const uniqueSessionsMap = new Map<string, AssignableWorkout>();

      templates.forEach((template: any) => {
        const key = `${template.week}-${template.day}-${template.sessionName}`;

        if (!uniqueSessionsMap.has(key)) {
          const offsetDays =
            (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

          uniqueSessionsMap.set(key, {
            localId: key,
            week: Number(template.week),
            day: Number(template.day),
            sessionName: template.sessionName,
            sessionType: template.sessionType || "Strength",
            sessionGoal: template.sessionGoal || "",
            estimatedDuration: template.estimatedDuration || "",
            intensity: template.intensity || "Moderate",
            scheduledDate: addDays(assignStartDate, offsetDays),
          });
        }
      });

      setAssignableWorkouts(Array.from(uniqueSessionsMap.values()));
    } catch (err) {
      console.error(err);
      notify("Could not load program sessions.");
    } finally {
      setAssignLoading(false);
    }
  };

  // ---- Teams ----
  const currentCoachName = coachScope === "All Coaches" ? "" : coachScope;
  const visibleTeams =
    coachScope === "All Coaches"
      ? teams
      : teams.filter((team) => !team.coach || team.coach === coachScope);
  const teamSortValue = (t: Team): string | number => {
    switch (teamSort.key) {
      case "planned":
        return teamPlannedCounts[t.id] ?? 0;
      case "athletes":
        return t.memberCount;
      case "focus":
        return (t.focus || "").toLowerCase();
      case "created":
        return t.createdTime || 0;
      default:
        return t.name.toLowerCase();
    }
  };
  const sortedTeams = [...visibleTeams].sort((a, b) => {
    const av = teamSortValue(a);
    const bv = teamSortValue(b);
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return teamSort.dir === "asc" ? cmp : -cmp;
  });
  const toggleTeamSort = (key: typeof teamSort.key) =>
    setTeamSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir:
              key === "name" || key === "focus" ? "asc" : "desc",
          }
    );
  const teamSortArrow = (key: typeof teamSort.key) =>
    teamSort.key === key ? (teamSort.dir === "asc" ? " ▲" : " ▼") : "";
  const teamVisibleIds = sortedTeams.map((t) => t.id);
  const teamAllSelected =
    teamVisibleIds.length > 0 &&
    teamVisibleIds.every((id) => teamSelectedIds.includes(id));
  const toggleTeamSelectAll = () =>
    setTeamSelectedIds(teamAllSelected ? [] : teamVisibleIds);
  const toggleTeamSelect = (id: string) =>
    setTeamSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  const clearTeamSelection = () => {
    setTeamSelectedIds([]);
    setTeamBulkPanel("");
  };
  // Unique athletes across all selected squads (an athlete in two picked squads
  // is only scheduled once).
  const teamBulkMemberIds = Array.from(
    new Set(
      teams
        .filter((t) => teamSelectedIds.includes(t.id))
        .flatMap((t) => t.memberIds)
    )
  );
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

  const openNewTeam = () => {
    setSelectedTeamId("");
    setTeamDraft({
      name: "",
      notes: "",
      focus: "",
      memberIds: [],
      positions: {},
      groups: [],
    });
    setTeamGroupInput("");
    setEditingTeam(true);
  };

  const openTeamEditor = (team: Team) => {
    setSelectedTeamId(team.id);
    setTeamDraft({
      name: team.name,
      notes: team.notes,
      focus: team.focus || "",
      memberIds: [...team.memberIds],
      positions: { ...team.positions },
      groups: [...(team.groups || [])],
    });
    setTeamGroupInput("");
    setEditingTeam(true);
  };

  const addTeamGroup = () => {
    const v = teamGroupInput.trim();
    if (!v) return;
    setTeamDraft((d) =>
      d.groups.includes(v) ? d : { ...d, groups: [...d.groups, v] }
    );
    setTeamGroupInput("");
  };
  const removeTeamGroup = (label: string) => {
    setTeamDraft((d) => {
      const positions = { ...d.positions };
      // clear any member assigned to the removed group
      Object.keys(positions).forEach((mid) => {
        if (positions[mid] === label) delete positions[mid];
      });
      return {
        ...d,
        groups: d.groups.filter((g) => g !== label),
        positions,
      };
    });
  };

  const toggleTeamMember = (clientRecordId: string) => {
    setTeamDraft((draft) => {
      const isMember = draft.memberIds.includes(clientRecordId);
      const positions = { ...draft.positions };
      if (isMember) delete positions[clientRecordId]; // drop position when removed
      return {
        ...draft,
        memberIds: isMember
          ? draft.memberIds.filter((id) => id !== clientRecordId)
          : [...draft.memberIds, clientRecordId],
        positions,
      };
    });
  };

  const setMemberPosition = (clientRecordId: string, position: string) => {
    setTeamDraft((draft) => {
      const positions = { ...draft.positions };
      const clean = position.trim();
      if (clean) positions[clientRecordId] = clean;
      else delete positions[clientRecordId];
      return { ...draft, positions };
    });
  };

  const saveTeam = async () => {
    if (!teamDraft.name.trim()) {
      notify("Please name the team.");
      return;
    }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/upsertTeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedTeamId || undefined,
          teamName: teamDraft.name.trim(),
          coach: currentCoachName,
          memberRecordIds: teamDraft.memberIds,
          notes: teamDraft.notes.trim(),
          positions: teamDraft.positions,
          focus: teamDraft.focus.trim(),
          groups: teamDraft.groups,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error(data);
        notify("Could not save team.");
        return;
      }

      // Two-way sync: each member's profile Categories reflect their team group.
      // Strip the OLD team's group labels too, and visit members who were just
      // removed — otherwise obsolete squad-group categories stick to profiles.
      const originalTeam = teams.find((t) => t.id === selectedTeamId);
      const groupSet = new Set([
        ...teamDraft.groups,
        ...(originalTeam?.groups || []),
      ]);
      const memberIdsToSync = Array.from(
        new Set([...teamDraft.memberIds, ...(originalTeam?.memberIds || [])])
      );
      const patches: { id: string; categories: string[] }[] = [];
      memberIdsToSync.forEach((mid) => {
        const client = clients.find((c) => c.id === mid);
        if (!client) return;
        const stillMember = teamDraft.memberIds.includes(mid);
        const pos = stillMember ? teamDraft.positions[mid] || "" : "";
        const current = client.categories || [];
        const next = current.filter((cat) => !groupSet.has(cat));
        if (pos) next.push(pos);
        const nextUniq = Array.from(new Set(next));
        if (
          nextUniq.length !== current.length ||
          nextUniq.some((c, i) => c !== current[i])
        ) {
          patches.push({ id: mid, categories: nextUniq });
        }
      });
      if (patches.length) {
        await Promise.all(
          patches.map((p) =>
            fetch("/api/updateClient", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientRecordId: p.id,
                categories: p.categories,
              }),
            })
          )
        );
        setClients((cur) =>
          cur.map((c) => {
            const patch = patches.find((p) => p.id === c.id);
            return patch ? { ...c, categories: patch.categories } : c;
          })
        );
      }

      await loadTeams();
      setSelectedTeamId(data.recordId || selectedTeamId);
      setEditingTeam(false);
      notify("Team saved.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not save team.");
    } finally {
      setSavingTeam(false);
    }
  };

  const deleteTeam = async (team: Team) => {
    if (
      !window.confirm(
        `Delete team "${team.name}"? This removes the team only — the athletes and their workouts stay.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "team", recordId: team.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not delete team.");
        return;
      }
      if (selectedTeamId === team.id) setSelectedTeamId("");
      setTeamSelectedIds((ids) => ids.filter((id) => id !== team.id));
      await loadTeams();
      notify("Team deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete team.");
    }
  };

  const assignProgramToTeamNow = async () => {
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;
    const targetIds = teamAssignSelectedIds.filter((id) =>
      team.memberIds.includes(id)
    );
    if (targetIds.length === 0) {
      notify("Select at least one athlete to assign.");
      return;
    }
    const program = programs.find((p) => p.programId === teamAssignProgramId);
    if (!program) {
      notify("Select a program to assign.");
      return;
    }
    if (!teamAssignStartDate) {
      notify("Choose a start date.");
      return;
    }
    setTeamAssigning(true);
    try {
      const res = await fetch(
        `/api/programTemplates?programId=${encodeURIComponent(
          program.programId
        )}&programRecordId=${encodeURIComponent(program.recordId || "")}`
      );
      const data = await res.json();
      if (!res.ok) {
        notify("Could not load program sessions.");
        return;
      }
      const templates = data.templates || [];
      const map = new Map<string, AssignableWorkout>();
      templates.forEach((tpl: any) => {
        const key = `${tpl.week}-${tpl.day}-${tpl.sessionName}`;
        if (!map.has(key)) {
          const offsetDays =
            (Number(tpl.week) - 1) * 7 + (Number(tpl.day) - 1) * 2;
          map.set(key, {
            localId: key,
            week: Number(tpl.week),
            day: Number(tpl.day),
            sessionName: tpl.sessionName,
            sessionType: tpl.sessionType || "Strength",
            sessionGoal: tpl.sessionGoal || "",
            estimatedDuration: tpl.estimatedDuration || "",
            intensity: tpl.intensity || "Moderate",
            scheduledDate: addDays(teamAssignStartDate, offsetDays),
          });
        }
      });
      const scheduledWorkouts = Array.from(map.values());
      if (scheduledWorkouts.length === 0) {
        notify("This program has no sessions to assign.");
        return;
      }
      const assignRes = await fetch("/api/assignProgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordIds: targetIds,
          programRecordId: program.recordId,
          scheduledWorkouts: scheduledWorkouts.map((w) => ({
            week: w.week,
            day: w.day,
            sessionName: w.sessionName,
            sessionType: w.sessionType,
            sessionGoal: w.sessionGoal,
            estimatedDuration: w.estimatedDuration,
            intensity: w.intensity,
            scheduledDate: w.scheduledDate,
          })),
        }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) {
        console.error(assignData);
        notify("Could not assign program to team.");
        return;
      }
      notify(
        `Assigned ${program.programName} to ${targetIds.length} athlete(s) — ${assignData.recordsCreated} workouts created.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not assign program to team.");
    } finally {
      setTeamAssigning(false);
    }
  };

  // Default the assign-selection to all members whenever the team changes.
  useEffect(() => {
    const team = teams.find((t) => t.id === selectedTeamId);
    setTeamAssignSelectedIds(team ? team.memberIds : []);
    setTeamAssignSubgroup("All");
  }, [selectedTeamId, teams]);

  const toggleAssignAthlete = (clientRecordId: string) => {
    setTeamAssignSubgroup("All"); // manual edit no longer matches a subgroup
    setTeamAssignSelectedIds((ids) =>
      ids.includes(clientRecordId)
        ? ids.filter((id) => id !== clientRecordId)
        : [...ids, clientRecordId]
    );
  };

  // Distinct positions/subgroups defined for the selected team.
  const selectedTeamSubgroups = selectedTeam
    ? Array.from(
        new Set(
          selectedTeam.memberIds
            .map((id) => (selectedTeam.positions[id] || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))
    : [];

  const applyAssignSubgroup = (subgroup: string) => {
    setTeamAssignSubgroup(subgroup);
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;
    if (subgroup === "All") {
      setTeamAssignSelectedIds(team.memberIds);
    } else {
      setTeamAssignSelectedIds(
        team.memberIds.filter(
          (id) => (team.positions[id] || "").trim() === subgroup
        )
      );
    }
  };

  const openAthleteCalendar = (client: Client) => {
    setSelectedClient(client);
    setActivePage("Clients");
    setClientTab("Training");
    setAccountClientId("");
  };

  // ---- Roster helpers (Clients/Teams tables) ----
  const clientTeams = (clientId: string) =>
    teams.filter((t) => t.memberIds.includes(clientId));

  const daysSinceLogin = (lastLogin?: number): number | null => {
    if (!lastLogin) return null;
    return Math.max(0, Math.floor((Date.now() - lastLogin) / 86400000));
  };

  // Shared single/multi program assignment (used by team + account modal).
  const assignProgramByIds = async (
    clientRecordIds: string[],
    programId: string,
    startDate: string
  ): Promise<number> => {
    const program = programs.find((p) => p.programId === programId);
    if (!program) {
      notify("Select a program to assign.");
      return 0;
    }
    if (clientRecordIds.length === 0) {
      notify("No athletes selected.");
      return 0;
    }
    const res = await fetch(
      `/api/programTemplates?programId=${encodeURIComponent(
        program.programId
      )}&programRecordId=${encodeURIComponent(program.recordId || "")}`
    );
    const data = await res.json();
    if (!res.ok) {
      notify("Could not load program sessions.");
      return 0;
    }
    const map = new Map<string, AssignableWorkout>();
    (data.templates || []).forEach((tpl: any) => {
      const key = `${tpl.week}-${tpl.day}-${tpl.sessionName}`;
      if (!map.has(key)) {
        const offsetDays = (Number(tpl.week) - 1) * 7 + (Number(tpl.day) - 1) * 2;
        map.set(key, {
          localId: key,
          week: Number(tpl.week),
          day: Number(tpl.day),
          sessionName: tpl.sessionName,
          sessionType: tpl.sessionType || "Strength",
          sessionGoal: tpl.sessionGoal || "",
          estimatedDuration: tpl.estimatedDuration || "",
          intensity: tpl.intensity || "Moderate",
          scheduledDate: addDays(startDate, offsetDays),
        });
      }
    });
    const scheduledWorkouts = Array.from(map.values());
    if (scheduledWorkouts.length === 0) {
      notify("This program has no sessions to assign.");
      return 0;
    }
    const assignRes = await fetch("/api/assignProgram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRecordIds,
        programRecordId: program.recordId,
        scheduledWorkouts: scheduledWorkouts.map((w) => ({
          week: w.week,
          day: w.day,
          sessionName: w.sessionName,
          sessionType: w.sessionType,
          sessionGoal: w.sessionGoal,
          estimatedDuration: w.estimatedDuration,
          intensity: w.intensity,
          scheduledDate: w.scheduledDate,
        })),
      }),
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok || !assignData.success) {
      console.error(assignData);
      notify("Could not assign program.");
      return 0;
    }
    return assignData.recordsCreated || 0;
  };

  // Quick "assign a program to the whole squad" from the Teams table.
  const quickAssignTeamProgram = async () => {
    const team = teams.find((t) => t.id === teamQuickAssignId);
    if (!team) return;
    if (!teamQuickProgramId) return notify("Select a program to assign.");
    if (team.memberIds.length === 0)
      return notify("This team has no athletes yet.");
    setTeamQuickBusy(true);
    try {
      const created = await assignProgramByIds(
        team.memberIds,
        teamQuickProgramId,
        teamQuickStartDate || dateToInputValue(new Date())
      );
      if (created > 0) {
        notify(
          `Program assigned to ${team.memberIds.length} athlete(s) in ${team.name}.`,
          "success"
        );
        setTeamQuickAssignId("");
        setTeamQuickProgramId("");
      }
    } catch (error) {
      console.error(error);
      notify("Could not assign the program — please try again.", "error");
    } finally {
      setTeamQuickBusy(false);
    }
  };

  // Assign one program across every athlete in the selected squads at once.
  const bulkAssignTeamsProgram = async () => {
    if (!teamBulkProgramId) return notify("Select a program to assign.");
    if (teamBulkMemberIds.length === 0)
      return notify("The selected squads have no athletes yet.");
    setTeamBulkBusy(true);
    try {
      const created = await assignProgramByIds(
        teamBulkMemberIds,
        teamBulkProgramId,
        teamBulkStartDate || dateToInputValue(new Date())
      );
      if (created > 0) {
        notify(
          `Program assigned to ${teamBulkMemberIds.length} athlete(s) across ${teamSelectedIds.length} squad(s).`,
          "success"
        );
        clearTeamSelection();
        setTeamBulkProgramId("");
      }
    } catch (error) {
      console.error(error);
      notify("Could not assign the program — please try again.", "error");
    } finally {
      setTeamBulkBusy(false);
    }
  };

  // ---- Invite Athletes (team) ----
  const openTeamInvite = (team: Team) => {
    setTeamInviteId(team.id);
    setTeamInviteMemberIds([...team.memberIds]);
    setTeamRowMenuId("");
  };
  const toggleInviteMember = (id: string) =>
    setTeamInviteMemberIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  const saveTeamInvite = async () => {
    const team = teams.find((t) => t.id === teamInviteId);
    if (!team) return;
    setSavingTeam(true);
    try {
      const res = await fetch("/api/upsertTeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: team.id,
          memberRecordIds: teamInviteMemberIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not update team roster.");
        return;
      }
      await loadTeams();
      notify("Team roster updated.", "success");
      setTeamInviteId("");
    } catch (error) {
      console.error(error);
      notify("Could not update team roster.");
    } finally {
      setSavingTeam(false);
    }
  };

  // ---- Athlete Account modal ----
  const accountClient = clients.find((c) => c.id === accountClientId) || null;
  const openAccountModal = (client: Client) => {
    setAccountClientId(client.id);
    setAccountDraft({
      tags: [...(client.tags || [])],
      categories: [...(client.categories || [])],
    });
    setAccountTagInput("");
    setAccountCategoryInput("");
    setAccountProgramId("");
    setAccountStartDate(dateToInputValue(new Date()));
    if (programs.length === 0) void loadPrograms();
    if (teams.length === 0) void loadTeams();
    const sub = subscriptions.find((s) => s.clientRecordIds.includes(client.id));
    setSubDraft(
      sub
        ? {
            plan: sub.plan || "Online Coaching",
            price: sub.price ? String(sub.price) : "",
            currency: sub.currency || "CNY",
            billingCycle: sub.billingCycle || "1 Month",
            startDate: sub.startDate || "",
            nextBillingDate: sub.nextBillingDate || "",
            status: sub.status || "Active",
            autoRenew: sub.autoRenew,
            paymentId: sub.paymentId || "",
          }
        : {
            plan: "Online Coaching",
            price: "",
            currency: "CNY",
            billingCycle: "1 Month",
            startDate: dateToInputValue(new Date()),
            nextBillingDate: "",
            status: "Active",
            autoRenew: false,
            paymentId: "",
          }
    );
  };

  const cycleMonths = (label: string): number => {
    if (/1\s*year|annual/i.test(label)) return 12;
    if (/6\s*month/i.test(label)) return 6;
    if (/3\s*month|quarter/i.test(label)) return 3;
    return 1;
  };

  // Derived status: an Active/Trial sub whose next billing date has passed is
  // effectively Past Due, without the coach having to flip it manually.
  const subEffectiveStatus = (s: Subscription): string => {
    if (/cancel|paused/i.test(s.status)) return s.status;
    if (s.nextBillingDate && s.nextBillingDate < todayValue) return "Past Due";
    return s.status || "Active";
  };

  // "in 5d" / "overdue 3d" / "today" from a YYYY-MM-DD date.
  const relativeDue = (dateStr: string): string => {
    if (!dateStr) return "";
    const days = Math.round(
      (new Date(dateStr).getTime() - new Date(todayValue).getTime()) / 86400000
    );
    if (days === 0) return "today";
    if (days > 0) return `in ${days}d`;
    return `overdue ${Math.abs(days)}d`;
  };

  const accountSubscription = accountClient
    ? subscriptions.find((s) => s.clientRecordIds.includes(accountClient.id)) ||
      null
    : null;

  const saveSubscription = async () => {
    if (!accountClient) return;
    setSavingSub(true);
    try {
      // Default the next billing date to start + one cycle if left blank.
      let nextBilling = subDraft.nextBillingDate;
      if (!nextBilling && subDraft.startDate) {
        const d = new Date(subDraft.startDate);
        d.setMonth(d.getMonth() + cycleMonths(subDraft.billingCycle));
        nextBilling = dateToInputValue(d);
      }
      const res = await fetch("/api/upsertSubscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: accountSubscription?.id || undefined,
          clientRecordId: accountClient.id,
          plan: subDraft.plan,
          price: subDraft.price,
          currency: subDraft.currency,
          billingCycle: subDraft.billingCycle,
          startDate: subDraft.startDate,
          nextBillingDate: nextBilling,
          status: subDraft.status,
          coach: currentCoachName,
          autoRenew: subDraft.autoRenew,
          paymentId: subDraft.paymentId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error(data);
        notify("Could not save subscription.");
        return;
      }
      await loadSubscriptions();
      notify("Subscription saved.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not save subscription.");
    } finally {
      setSavingSub(false);
    }
  };

  const deleteSubscription = async () => {
    if (!accountSubscription) return;
    if (!window.confirm("Remove this subscription? This cannot be undone."))
      return;
    setSavingSub(true);
    try {
      const res = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "subscription",
          recordId: accountSubscription.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not remove subscription.");
        return;
      }
      await loadSubscriptions();
      notify("Subscription removed.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not remove subscription.");
    } finally {
      setSavingSub(false);
    }
  };
  const addAccountChip = (kind: "tags" | "categories", value: string) => {
    const v = value.trim();
    if (!v) return;
    setAccountDraft((d) =>
      d[kind].includes(v) ? d : { ...d, [kind]: [...d[kind], v] }
    );
    if (kind === "tags") setAccountTagInput("");
    else setAccountCategoryInput("");
  };
  const removeAccountChip = (kind: "tags" | "categories", value: string) =>
    setAccountDraft((d) => ({ ...d, [kind]: d[kind].filter((x) => x !== value) }));
  const saveAccountTagsCategories = async () => {
    if (!accountClient) return;
    setSavingAccount(true);
    try {
      const res = await fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordId: accountClient.id,
          tags: accountDraft.tags,
          categories: accountDraft.categories,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not save athlete details.");
        return;
      }
      setClients((cur) =>
        cur.map((c) =>
          c.id === accountClient.id
            ? { ...c, tags: accountDraft.tags, categories: accountDraft.categories }
            : c
        )
      );

      // Two-way sync: a category matching a team's group sets that team position.
      const catSet = new Set(accountDraft.categories);
      const teamPatches = teams
        .filter((t) => t.memberIds.includes(accountClient.id))
        .map((t) => {
          const matched = t.groups.find((g) => catSet.has(g)) || "";
          const cur = t.positions[accountClient.id] || "";
          if (matched === cur) return null;
          const positions = { ...t.positions };
          if (matched) positions[accountClient.id] = matched;
          else delete positions[accountClient.id];
          return { id: t.id, positions };
        })
        .filter(Boolean) as { id: string; positions: Record<string, string> }[];
      if (teamPatches.length) {
        await Promise.all(
          teamPatches.map((p) =>
            fetch("/api/upsertTeam", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: p.id, positions: p.positions }),
            })
          )
        );
        await loadTeams();
      }

      notify("Athlete details saved.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not save athlete details.");
    } finally {
      setSavingAccount(false);
    }
  };
  const updateAccountTeamPositionLocal = (teamId: string, value: string) => {
    setTeams((cur) =>
      cur.map((t) => {
        if (t.id !== teamId) return t;
        const positions = { ...t.positions };
        if (value.trim()) positions[accountClientId] = value;
        else delete positions[accountClientId];
        return { ...t, positions };
      })
    );
  };
  const saveAccountTeamPosition = async (teamId: string, value: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const positions = { ...team.positions };
    if (value.trim()) positions[accountClientId] = value.trim();
    else delete positions[accountClientId];
    try {
      await fetch("/api/upsertTeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: teamId, positions }),
      });
    } catch (error) {
      console.error(error);
    }
  };
  const toggleAccountTeam = async (team: Team) => {
    const isMember = team.memberIds.includes(accountClientId);
    const nextMembers = isMember
      ? team.memberIds.filter((id) => id !== accountClientId)
      : [...team.memberIds, accountClientId];
    try {
      const res = await fetch("/api/upsertTeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: team.id, memberRecordIds: nextMembers }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not update team.");
        return;
      }
      await loadTeams();
    } catch (error) {
      console.error(error);
      notify("Could not update team.");
    }
  };
  const assignProgramFromAccount = async () => {
    if (!accountClient) return;
    if (!accountProgramId) {
      notify("Select a program to assign.");
      return;
    }
    setSavingAccount(true);
    try {
      const created = await assignProgramByIds(
        [accountClient.id],
        accountProgramId,
        accountStartDate
      );
      if (created > 0) {
        notify(`Program assigned — ${created} workouts created.`, "success");
        setAccountProgramId("");
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const updateAssignableWorkoutDate = (localId: string, scheduledDate: string) => {
    setAssignableWorkouts((prev) =>
      prev.map((workout) =>
        workout.localId === localId ? { ...workout, scheduledDate } : workout
      )
    );
  };

  const shiftAssignableWorkoutsToStartDate = (scheduledDate: string) => {
    const nextDate = normalizeDate(scheduledDate);

    setAssignStartDate(nextDate);
    setCalendarAnchorDate(nextDate);
    setAssignableWorkouts((current) =>
      current.map((workout) => {
        const offsetDays = (Number(workout.week) - 1) * 7 + (Number(workout.day) - 1) * 2;

        return {
          ...workout,
          scheduledDate: addDays(nextDate, offsetDays),
        };
      })
    );
  };

  const assignProgramToClient = async () => {
    if (!selectedClient || !selectedAssignProgram) {
      notify("Please select a client and program.");
      return;
    }

    if (assignableWorkouts.length === 0) {
      notify("Please load program sessions first.");
      return;
    }

    setAssigningProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          programRecordId: selectedAssignProgram.recordId,
          scheduledWorkouts: assignableWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            sessionType: workout.sessionType,
            sessionGoal: workout.sessionGoal,
            estimatedDuration: workout.estimatedDuration,
            intensity: workout.intensity,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign program. Check API response.");
        return;
      }

      notify(`Program assigned. Workouts created: ${data.recordsCreated}`);
      setAssignableWorkouts([]);
      setShowAssignmentDrawer(false);

      await loadClientWorkouts(selectedClient, true);
    } catch (error) {
      console.error(error);
      notify("Could not assign program.");
    } finally {
      setAssigningProgram(false);
    }
  };

  // Each time the exercise-history modal opens, start fully collapsed.
  useEffect(() => {
    if (historyExerciseName) setExpandedHistoryDates(new Set());
  }, [historyExerciseName]);

  const buildSetLogs = (exercises: ExerciseDetail[]) => {
    const logs: SetLog[] = [];

    exercises.forEach((exercise) => {
      const setCount = Number(exercise.sets) || 1;
      const meta = parseExerciseNotes(exercise.notes);
      const sides: Array<SetLog["side"]> = meta.isUnilateral
        ? ["Left", "Right"]
        : [undefined];

      for (let i = 1; i <= setCount; i++) {
        sides.forEach((side) => {
          const exerciseName = exercise.exerciseName || `Exercise ${exercise.order}`;
          const setPrescription = meta.setPrescriptions?.[i - 1];
          const prescribedLoad = String(setPrescription?.load ?? "").trim();
          const prescribedPercent = String(setPrescription?.percent ?? "").trim();
          const prescribedPercentMas = String(
            setPrescription?.percentMas ?? ""
          ).trim();
          const prescribedIntensityMode = String(
            setPrescription?.intensityMode ?? ""
          ).trim();
          const prescribedIntensityValue = String(
            setPrescription?.intensityValue ?? ""
          ).trim();
          const prescribedRpe = String(setPrescription?.rpe ?? "").trim();
          const prescribedRir = String(setPrescription?.rir ?? "").trim();
          const trackingFields = effectiveTrackingFields(
            meta.trackingType,
            meta.trackingFields
          );

          logs.push({
            exerciseId: exercise.exerciseId,
            occurrenceId: exercise.id,
            exerciseName: side ? `${exerciseName} - ${side}` : exerciseName,
            exerciseOrder: exercise.order,
            setNumber: i,
            side,
            trackingType: meta.trackingType,
            prescribedSets: exercise.sets,
            prescribedReps: exercise.reps,
            prescribedLoad,
            prescribedPercent,
            prescribedPercentMas,
            prescribedIntensityMode,
            prescribedIntensityValue,
            prescribedRpe,
            prescribedRir,
            trackingFields,
            actualReps: meta.trackingType === "Weight" ? exercise.reps : "",
            actualWeight: "",
            actualTime: "",
            actualDistance: "",
            actualRpe: "",
            actualRir: "",
          });
        });
      }
    });

    return logs;
  };

  const getWorkoutDraftKey = (
    workout: Workout | null = selectedWorkout,
    client: Client | null = selectedClient
  ) => {
    if (!workout || !client) return "";

    return `nolimit-workout-draft:${client.id}:${workout.id}`;
  };

  const saveExerciseDraft = (
    exerciseId: string,
    options: { showToast?: boolean } = {}
  ) => {
    const draftKey = getWorkoutDraftKey();

    if (!draftKey) return savedExerciseDraftIds;

    const nextSavedExerciseIds = Array.from(
      new Set([...savedExerciseDraftIds, exerciseId])
    );

    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        logs: setLogs,
        savedExerciseIds: nextSavedExerciseIds,
        updatedAt: new Date().toISOString(),
      })
    );

    setSavedExerciseDraftIds(nextSavedExerciseIds);
    if (options.showToast !== false) {
      notify("Exercise saved. You can come back and keep editing.", "success");
    }
    return nextSavedExerciseIds;
  };

  const openWorkout = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setWorkoutLoggingStarted(false);
    // A leftover start time from an abandoned session would inflate this
    // workout's saved duration — always start the clock fresh.
    workoutStartedAtRef.current = null;
    resetWodState();
    setEditingWorkoutDate(normalizeDate(String(workout.scheduledDate)));
    setDetailsLoading(true);
    setWorkoutDetails([]);
    setSetLogs([]);
    setWorkoutHistoryLogs([]);
    setSavedExerciseDraftIds([]);
    setCheckedWorkoutPageItems([]);
    setWorkoutSubmissionNote("");

    try {
      const [detailsResponse, historyResponse] = await Promise.all([
        fetch(
          `/api/workoutDetails?programId=${workout.programId}&week=${workout.week}&day=${workout.day}`
        ),
        fetch(`/api/workoutHistory?clientId=${selectedClient?.id || ""}`),
      ]);

      const data = await detailsResponse.json();
      const exercises = data.exercises || [];
      const historyData = await historyResponse.json();
      const baseLogs = buildSetLogs(exercises);
      const draftKey = getWorkoutDraftKey(workout, selectedClient);
      const savedDraft = draftKey
        ? window.localStorage.getItem(draftKey)
        : null;

      // Coach opening a completed workout = review mode: overlay the athlete's
      // actual submitted values (from their logs on that date) onto the cards.
      const coachReviewing =
        !isClientPortal && /complete/i.test(workout.completionStatus || "");
      if (coachReviewing) {
        const wDate = normalizeDate(String(workout.scheduledDate));
        const dayLogs = (historyData.logs || []).filter(
          (l: WorkoutHistoryLog) => l.date === wDate
        );
        const reviewLogs = baseLogs.map((bl) => {
          const base = bl.exerciseName.split(" - ")[0].toLowerCase();
          const match = dayLogs.find(
            (l: WorkoutHistoryLog) =>
              l.exerciseName.toLowerCase().startsWith(base) &&
              String(l.setNumber) === String(bl.setNumber)
          );
          return match
            ? {
                ...bl,
                actualReps: match.actualReps || "",
                actualWeight: match.actualWeight || "",
                actualTime: match.actualTime || "",
                actualDistance: match.actualDistance || "",
              }
            : bl;
        });
        setSetLogs(reviewLogs);
        setSavedExerciseDraftIds([]);
        setCheckedWorkoutPageItems([]);
      } else if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          setSetLogs(parsedDraft.logs || baseLogs);
          setSavedExerciseDraftIds(parsedDraft.savedExerciseIds || []);
          setCheckedWorkoutPageItems([]);
        } catch {
          setSetLogs(baseLogs);
          setSavedExerciseDraftIds([]);
          setCheckedWorkoutPageItems([]);
        }
      } else {
        setSetLogs(baseLogs);
        setSavedExerciseDraftIds([]);
        setCheckedWorkoutPageItems([]);
      }

      originalExercisesRef.current = exercises;
      setWorkoutDetails(exercises);
      setWorkoutHistoryLogs(historyData.logs || []);
    } catch {
      setWorkoutDetails([]);
      setSetLogs([]);
      setSavedExerciseDraftIds([]);
      setCheckedWorkoutPageItems([]);
      setWorkoutHistoryLogs([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const parseRestSeconds = (rest: string): number => {
    const s = String(rest || "").toLowerCase();
    const nums = s.match(/\d+/g)?.map(Number) || [];
    if (!nums.length) return 60;
    const base = nums[0];
    return s.includes("min") ? base * 60 : base;
  };

  const restChime = () => {
    const ctx = restAudioRef.current;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 880;
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.start(t0);
      o.stop(t0 + 0.62);
    } catch {
      /* audio not available */
    }
  };

  const startRestTimer = (rest: string, label: string) => {
    try {
      if (!restAudioRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) restAudioRef.current = new Ctx();
      }
      void restAudioRef.current?.resume?.();
    } catch {
      /* audio not available */
    }
    setRestTimer({
      remaining: parseRestSeconds(rest),
      total: parseRestSeconds(rest),
      running: true,
      label,
    });
  };

  useEffect(() => {
    if (!restTimer?.running) return;
    const id = setInterval(() => {
      setRestTimer((rt) => {
        if (!rt || !rt.running) return rt;
        if (rt.remaining <= 1) {
          restChime();
          try {
            (navigator as unknown as { vibrate?: (ms: number) => void }).vibrate?.(400);
          } catch {
            /* vibrate not supported */
          }
          return { ...rt, remaining: 0, running: false };
        }
        return { ...rt, remaining: rt.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer?.running]);

  // The full set of swap choices for an exercise in the player: the originally
  // programmed exercise first, then the coach's alternates.
  const exerciseSwapOptions = (
    target: ExerciseDetail
  ): AlternateExerciseDetail[] => {
    const original = originalExercisesRef.current.find(
      (o) => o.id === target.id
    );
    const originalOption: AlternateExerciseDetail | null = original
      ? {
          exerciseRecordId: "",
          exerciseId: original.exerciseId,
          exerciseName: original.exerciseName,
          exerciseNameCn: original.exerciseNameCn,
          videoUrl: original.videoUrl,
          videoUrlCn: original.videoUrlCn,
          longVideoUrl: original.longVideoUrl,
          category: original.category,
          categoryCn: original.categoryCn,
          equipment: original.equipment,
          equipmentCn: original.equipmentCn,
          movementPattern: original.movementPattern,
          movementPatternCn: original.movementPatternCn,
          technicalInstructionsCn: original.technicalInstructionsCn,
          coachingCuesCn: original.coachingCuesCn,
          commonMistakesCn: original.commonMistakesCn,
          cueNotes: original.cueNotes,
          cueNotesCn: original.cueNotesCn,
        }
      : null;
    const alternates =
      original?.alternateExercises || target.alternateExercises || [];
    return originalOption ? [originalOption, ...alternates] : [...alternates];
  };

  // Swap a programmed exercise for one of its alternates (or back to the
  // original) in the player: replace its display/identity + library cues, keep
  // the prescription, and re-point this exercise's set logs so the saved
  // records (and history) reflect the chosen exercise.
  const swapExerciseOption = (
    target: ExerciseDetail,
    option: AlternateExerciseDetail
  ) => {
    setWorkoutDetails((prev) =>
      prev.map((ex) =>
        ex.id === target.id
          ? {
              ...ex,
              exerciseId: option.exerciseId,
              exerciseName: option.exerciseName,
              exerciseNameCn: option.exerciseNameCn,
              videoUrl: option.videoUrl,
              videoUrlCn: option.videoUrlCn,
              longVideoUrl: option.longVideoUrl,
              category: option.category,
              categoryCn: option.categoryCn,
              equipment: option.equipment,
              equipmentCn: option.equipmentCn,
              movementPattern: option.movementPattern,
              movementPatternCn: option.movementPatternCn,
              technicalInstructionsCn: option.technicalInstructionsCn,
              coachingCuesCn: option.coachingCuesCn,
              commonMistakesCn: option.commonMistakesCn,
              cueNotes: option.cueNotes,
              cueNotesCn: option.cueNotesCn,
            }
          : ex
      )
    );
    // Re-point this exercise's logs (matched by its current id + order) so the
    // saved records and history reflect the chosen exercise name.
    setSetLogs((prev) =>
      prev.map((log) =>
        log.exerciseId === target.exerciseId &&
        log.exerciseOrder === target.order
          ? {
              ...log,
              exerciseId: option.exerciseId,
              exerciseName: log.side
                ? `${option.exerciseName} - ${log.side}`
                : option.exerciseName,
            }
          : log
      )
    );
    setAlternatePickerExercise(null);
  };

  // The athlete's most-recent logged weight for this exercise + set, shown as a
  // greyed placeholder in the player so they know what to beat. Read-only — it
  // never fills the field, only hints.
  const lastLoggedWeight = (log: SetLog): string => {
    const base = log.exerciseName.split(" - ")[0].trim().toLowerCase();
    if (!base) return "";
    const matches = workoutHistoryLogs.filter(
      (h) =>
        h.exerciseName.split(" - ")[0].trim().toLowerCase() === base &&
        String(h.setNumber) === String(log.setNumber) &&
        String(h.actualWeight || "").trim()
    );
    if (!matches.length) return "";
    matches.sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
    return String(matches[0].actualWeight).trim();
  };

  const updateSetLog = (index: number, field: keyof SetLog, value: string) => {
    // Coach is reviewing a completed workout — values are read-only.
    if (coachReviewMode) return;
    const prev = setLogs[index];
    const updated = [...setLogs];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setSetLogs(updated);

    // Light haptic the moment a set's primary value goes from empty to filled.
    if (prev) {
      const primary =
        prev.trackingType === "Time"
          ? "actualTime"
          : prev.trackingType === "Distance"
          ? "actualDistance"
          : "actualReps";
      if (
        field === primary &&
        !String(prev[primary] || "").trim() &&
        String(value).trim()
      ) {
        vibrate(12);
      }
    }
  };

  // Background sync for an optimistically-submitted workout. The athlete sees
  // the celebration card instantly; this races the actual save behind it and
  // flips the card's sync status. On failure the local draft is kept so
  // nothing is ever lost — Retry re-fires the same payload.
  const syncWorkoutSubmission = (
    payload: Record<string, unknown>,
    draftKey: string
  ) => {
    setFailedSubmission(null);
    void (async () => {
      const markFailed = () => {
        // Kept so the athlete can retry even after the celebration is dismissed.
        setFailedSubmission({ payload, draftKey });
        notify(
          paceZh
            ? "同步失败 — 你的训练已保存在本机，可点击重试。"
            : "Sync failed — your workout is saved on this device. Tap retry.",
          "error"
        );
      };
      try {
        const response = await fetch("/api/saveWorkoutLog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          console.error(data);
          markFailed();
          return;
        }
        if (draftKey) {
          try {
            window.localStorage.removeItem(draftKey);
          } catch {
            // storage unavailable — draft simply lingers, harmless
          }
        }
        setFailedSubmission(null);
        if (selectedClient) void loadWorkoutComments(selectedClient);
      } catch (error) {
        console.error(error);
        markFailed();
      }
    })();
  };

  const saveWorkout = () => {
    if (!selectedWorkout || !selectedClient) return;

    // Timed-circuit score (AMRAP rounds / EMOM minutes) rides on the note so
    // the coach sees it with the submission.
    // Prefer the circuit the athlete actually ran the clock on; fall back to
    // the first timed circuit for older submissions without a stamped group.
    const timedExercise =
      (wodTimer.groupId &&
        workoutDetails.find((exercise) => exercise.id === wodTimer.groupId)) ||
      workoutDetails.find((exercise) => {
        const m = parseExerciseNotes(exercise.notes);
        return m.groupType === "Circuit" && m.groupMode;
      });
    const timedMeta = timedExercise
      ? parseExerciseNotes(timedExercise.notes)
      : undefined;
    const wodScoreLine =
      timedMeta && (wodRounds > 0 || wodElapsedMs > 1000)
        ? timedMeta.groupMode === "AMRAP"
          ? `AMRAP ${timedMeta.groupMinutes || "12"}min — ${wodRounds} round${
              wodRounds === 1 ? "" : "s"
            }`
          : `EMOM ${timedMeta.groupMinutes || "12"}min — ${Math.min(
              Number(timedMeta.groupMinutes) || 12,
              Math.floor(wodElapsedMs / 60000)
            )} min completed`
        : "";
    const combinedNote = [workoutSubmissionNote.trim(), wodScoreLine]
      .filter(Boolean)
      .join("\n");

    const payload = {
      clientId: selectedClient.id,
      clientCode: selectedClient.clientCode,
      assignedWorkoutId: selectedWorkout.assignedWorkoutId,
      assignedWorkoutRecordId: selectedWorkout.id,
      programId: selectedWorkout.programId,
      workoutDate: normalizeDate(String(selectedWorkout.scheduledDate)),
      // Per-set truth: the server persists Completed from this flag instead of
      // stamping every prescribed set as done.
      logs: setLogs.map((log) => ({ ...log, completed: isSetComplete(log) })),
      submissionNote: combinedNote,
      sessionRpe: workoutRpe ?? undefined,
      sessionDurationMin: finishDurationMin || undefined,
    };

    // Celebration stats share the app-wide completion rule (✓ or typed value);
    // the finish-screen catch has already resolved untouched sets by now.
    const completedLogs = setLogs.filter(isSetComplete);
    const volumeKg = completedLogs.reduce((sum, log) => {
      const w = Number(log.actualWeight);
      const r = Number(log.actualReps);
      return Number.isFinite(w) && Number.isFinite(r) ? sum + w * r : sum;
    }, 0);
    const exerciseNames = new Set(
      completedLogs.map((log) => log.exerciseName.split(" - ")[0])
    );
    const draftKey = getWorkoutDraftKey() || "";

    // Optimistic UI: celebrate instantly, close the player, mark it done
    // locally, then sync in the background.
    vibrate(24);
    setCelebrationVariant(pickCelebrationVariant());
    setWorkoutCelebration({
      sessionName: localizedWorkoutName(selectedWorkout),
      dateLabel: normalizeDate(String(selectedWorkout.scheduledDate)),
      exercises: exerciseNames.size,
      sets: completedLogs.length,
      volumeKg: Math.round(volumeKg),
      rpe: workoutRpe,
      durationMin: finishDurationMin || 0,
      payload,
      draftKey,
    });
    syncWorkoutSubmission(payload, draftKey);

    workoutStartedAtRef.current = null;
    // A running rest timer would chime out of context after the player closes.
    setRestTimer(null);
    setWorkouts((current) =>
      current.map((workout) =>
        workout.id === selectedWorkout.id
          ? {
              ...workout,
              completionStatus: "Completed",
              clientNotes: combinedNote || workout.clientNotes,
            }
          : workout
      )
    );
    setSelectedWorkout(null);
    setWorkoutLoggingStarted(false);
    setSavedExerciseDraftIds([]);
    setCheckedWorkoutPageItems([]);
    setWorkoutDetails([]);
    setSetLogs([]);
    setWorkoutSubmissionNote("");
    setWorkoutFinishOpen(false);
    setWorkoutRpe(null);
    setFinishDurationMin(0);
    setFinishExpanded({});
    resetWodState();
    setSavingWorkout(false);
  };

  const toggleWorkoutReviewed = async (next: boolean) => {
    if (!selectedWorkout) return;
    const id = selectedWorkout.id;
    setSelectedWorkout((w) => (w ? { ...w, coachReviewed: next } : w));
    setWorkouts((cur) =>
      cur.map((w) => (w.id === id ? { ...w, coachReviewed: next } : w))
    );
    try {
      const res = await fetch("/api/setWorkoutReviewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedWorkoutRecordId: id, reviewed: next }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      notify("Could not update review status.");
      setSelectedWorkout((w) => (w ? { ...w, coachReviewed: !next } : w));
      setWorkouts((cur) =>
        cur.map((w) => (w.id === id ? { ...w, coachReviewed: !next } : w))
      );
    }
  };

  const updateAssignedWorkoutScheduledDate = async (
    assignedWorkoutRecordId: string,
    scheduledDate: string
  ) => {
    const response = await fetch("/api/updateAssignedProgramDate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assignedWorkoutRecordId,
        assignedWorkoutId:
          selectedWorkout?.id === assignedWorkoutRecordId
            ? selectedWorkout.assignedWorkoutId
            : workouts.find((workout) => workout.id === assignedWorkoutRecordId)
                ?.assignedWorkoutId,
        scheduledDate,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error(data);
      throw new Error("Could not update workout date.");
    }

    return data;
  };

  const updateWorkoutDate = async () => {
    if (!selectedWorkout || !selectedClient) return;

    setUpdatingWorkoutDate(true);
    const previousWorkouts = workouts;
    const previousSelectedWorkout = selectedWorkout;
    const nextDate = normalizeDate(editingWorkoutDate);

    setWorkouts((current) =>
      current.map((workout) =>
        workout.id === selectedWorkout.id
          ? { ...workout, scheduledDate: nextDate }
          : workout
      )
    );
    setSelectedWorkout((current) =>
      current ? { ...current, scheduledDate: nextDate } : current
    );

    try {
      await updateAssignedWorkoutScheduledDate(selectedWorkout.id, nextDate);
      notify("Workout date updated.");
    } catch (error) {
      console.error(error);
      setWorkouts(previousWorkouts);
      setSelectedWorkout(previousSelectedWorkout);
      setEditingWorkoutDate(normalizeDate(String(previousSelectedWorkout.scheduledDate)));
      notify("Could not update workout date.");
    } finally {
      setUpdatingWorkoutDate(false);
    }
  };

  const deleteWorkout = async (workout: Workout) => {
    if (!selectedClient) return;
    if (!window.confirm(`Delete ${workout.sessionName || "this workout"}?`)) return;

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "workout",
          recordId: workout.id,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete workout.", "error");
        return;
      }

      setSelectedWorkout(null);
      setWorkoutDetails([]);
      setSetLogs([]);
      const nextWorkouts = workouts.filter((item) => item.id !== workout.id);
      setWorkouts(nextWorkouts);
      cacheClientWorkouts(selectedClient.clientCode, nextWorkouts);
      notify("Workout deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete workout.", "error");
    }
  };

  const deleteContentAssignment = async (assignment: ContentAssignment) => {
    if (!selectedClient) return;
    const name = getAssignmentDisplayName(assignment);

    if (!window.confirm(`Delete ${name} from the calendar?`)) return;

    try {
      const isTest = assignment.assignmentType.toLowerCase().includes("test");
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: isTest ? "assignedTest" : "assignedForm",
          recordId: assignment.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete assigned item.", "error");
        return;
      }

      await loadContentAssignments(selectedClient);
      notify("Assigned item deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete assigned item.", "error");
    }
  };

  const getAssignmentDisplayName = (assignment: ContentAssignment) => {
    const isTest = assignment.assignmentType.toLowerCase().includes("test");
    const savedTemplate = isTest
      ? savedTestTemplates.find(
          (test) =>
            test.testTemplateId === assignment.templateId ||
            test.recordId === assignment.templateId ||
            test.name === assignment.templateName
        )
      : savedFormTemplates.find(
          (form) =>
            form.formId === assignment.templateId ||
            form.recordId === assignment.templateId ||
            form.name === assignment.templateName
        );

    if (isTest && savedTemplate && "name" in savedTemplate) {
      return savedTemplate.name || assignment.templateName || "Physical Test";
    }

    if (!isTest && savedTemplate && "name" in savedTemplate) {
      return savedTemplate.name || assignment.templateName || "Questionnaire";
    }

    return (
      assignment.templateName ||
      assignment.assignmentType ||
      "Assigned item"
    );
  };

  const closeCalendarActionMenu = () => setCalendarActionMenu(null);

  const clearCalendarLongPress = () => {
    if (calendarLongPressTimer.current) {
      clearTimeout(calendarLongPressTimer.current);
      calendarLongPressTimer.current = null;
    }
  };

  const openCalendarActionMenu = (
    x: number,
    y: number,
    menu: CalendarActionMenuPayload
  ) => {
    const menuWidth = 190;
    const menuHeight = 190;
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxY = Math.max(12, window.innerHeight - menuHeight - 12);

    setCalendarActionMenu({
      ...menu,
      x: Math.min(Math.max(12, x), maxX),
      y: Math.min(Math.max(12, y), maxY),
    } as CalendarActionMenuState);
  };

  const startCalendarLongPress = (
    event: TouchEvent,
    menu: CalendarActionMenuPayload
  ) => {
    if (isClientPortal) return;
    clearCalendarLongPress();
    calendarLongPressOpened.current = false;
    const touch = event.touches[0];

    calendarLongPressTimer.current = setTimeout(() => {
      calendarLongPressOpened.current = true;
      openCalendarActionMenu(touch.clientX, touch.clientY, menu);
    }, 520);
  };

  const consumeCalendarLongPressClick = () => {
    if (!calendarLongPressOpened.current) return false;
    calendarLongPressOpened.current = false;
    return true;
  };

  const moveWorkoutToDate = async (workout: Workout, scheduledDate: string) => {
    if (!selectedClient) return;

    const currentDate = normalizeDate(String(workout.scheduledDate));
    const nextDate = normalizeDate(scheduledDate);

    if (!nextDate || currentDate === nextDate) {
      return;
    }

    const moveVersion = (workoutMoveVersions.current[workout.id] || 0) + 1;
    workoutMoveVersions.current[workout.id] = moveVersion;

    const previousWorkouts = workouts;
    const previousWorkoutOrder = clientCalendarWorkoutOrder;
    const previousSelectedWorkout = selectedWorkout;

    pendingWorkoutMoveIds.current.add(workout.id);
    setWorkouts((prev) => {
      const nextWorkouts = prev.map((item) =>
        item.id === workout.id ? { ...item, scheduledDate: nextDate } : item
      );
      cacheClientWorkouts(selectedClient.clientCode, nextWorkouts);
      return nextWorkouts;
    });
    setSelectedWorkout((current) =>
      current?.id === workout.id ? { ...current, scheduledDate: nextDate } : current
    );
    setClientCalendarWorkoutOrder((currentOrder) => {
      const workoutKey = getCalendarWorkoutOrderKey(workout);
      const nextOrder = { ...currentOrder };
      nextOrder[currentDate] = (nextOrder[currentDate] || []).filter(
        (key) => key !== workoutKey
      );
      nextOrder[nextDate] = [
        ...(nextOrder[nextDate] || []).filter((key) => key !== workoutKey),
        workoutKey,
      ];
      persistClientCalendarWorkoutOrder(nextOrder);
      return nextOrder;
    });

    try {
      await updateAssignedWorkoutScheduledDate(workout.id, nextDate);
    } catch (error) {
      console.error(error);
      if (workoutMoveVersions.current[workout.id] === moveVersion) {
        setWorkouts(previousWorkouts);
        cacheClientWorkouts(selectedClient.clientCode, previousWorkouts);
        setSelectedWorkout(previousSelectedWorkout);
        setClientCalendarWorkoutOrder(previousWorkoutOrder);
        persistClientCalendarWorkoutOrder(previousWorkoutOrder);
        notify("Could not move workout. The calendar has been restored.");
      }
    } finally {
      if (workoutMoveVersions.current[workout.id] === moveVersion) {
        delete workoutMoveVersions.current[workout.id];
        pendingWorkoutMoveIds.current.delete(workout.id);
        setDraggingWorkoutId("");
      }
    }
  };

  const moveContentAssignmentToDate = async (
    assignment: ContentAssignment,
    scheduledDate: string
  ) => {
    if (!selectedClient) return;

    const currentDate = normalizeDate(
      String(assignment.dueDate || assignment.assignedDate)
    );
    const nextDate = normalizeDate(scheduledDate);

    if (!nextDate || currentDate === nextDate) {
      return;
    }

    const moveVersion =
      (assignmentMoveVersions.current[assignment.recordId] || 0) + 1;
    assignmentMoveVersions.current[assignment.recordId] = moveVersion;

    const previousAssignments = contentAssignments;

    pendingAssignmentMoveIds.current.add(assignment.recordId);
    setContentAssignments((current) =>
      current.map((item) =>
        item.recordId === assignment.recordId
          ? { ...item, dueDate: nextDate }
          : item
      )
    );

    try {
      const response = await fetch("/api/updateContentAssignmentDate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType: assignment.assignmentType,
          recordId: assignment.recordId,
          scheduledDate: nextDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        throw new Error("Could not move assigned item.");
      }
    } catch (error) {
      console.error(error);
      if (assignmentMoveVersions.current[assignment.recordId] === moveVersion) {
        setContentAssignments(previousAssignments);
        notify(
          "Could not move assigned item. The calendar has been restored.",
          "error"
        );
      }
    } finally {
      if (assignmentMoveVersions.current[assignment.recordId] === moveVersion) {
        delete assignmentMoveVersions.current[assignment.recordId];
        pendingAssignmentMoveIds.current.delete(assignment.recordId);
        setDraggingAssignmentId("");
      }
    }
  };

  const copyCalendarWorkout = (workout: Workout, action: "copy" | "cut") => {
    setCopiedCalendarItem({
      action,
      type: "workout",
      id: workout.id,
      label: localizedWorkoutName(workout),
    });
    notify(
      `${action === "copy" ? "Copied" : "Cut"} ${localizedWorkoutName(
        workout
      )}. Choose Paste on a date.`
    );
  };

  const copyCalendarAssignment = (
    assignment: ContentAssignment,
    action: "copy" | "cut"
  ) => {
    const label = getAssignmentDisplayName(assignment);

    setCopiedCalendarItem({
      action,
      type: "assignment",
      id: assignment.recordId,
      label,
    });
    notify(`${action === "copy" ? "Copied" : "Cut"} ${label}. Choose Paste on a date.`);
  };

  const pasteCalendarItemToDate = async (scheduledDate: string) => {
    if (!copiedCalendarItem) return;

    if (copiedCalendarItem.type === "workout") {
      const workout = workouts.find((item) => item.id === copiedCalendarItem.id);

      if (!workout) {
        notify("Copied workout is no longer available.", "error");
        setCopiedCalendarItem(null);
        return;
      }

      if (copiedCalendarItem.action === "cut") {
        await moveWorkoutToDate(workout, scheduledDate);
      } else {
        const response = await fetch("/api/duplicateAssignedWorkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedWorkoutRecordId: workout.id,
            scheduledDate,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error(data);
          notify("Could not copy workout.", "error");
          return;
        }

        if (selectedClient) {
          await loadClientWorkouts(selectedClient, true);
        }
        notify("Workout copied.", "success");
      }
      setCopiedCalendarItem(null);
      return;
    }

    const assignment = contentAssignments.find(
      (item) => item.recordId === copiedCalendarItem.id
    );

    if (!assignment) {
      notify("Copied assignment is no longer available.", "error");
      setCopiedCalendarItem(null);
      return;
    }

    if (copiedCalendarItem.action === "cut") {
      await moveContentAssignmentToDate(assignment, scheduledDate);
    } else {
      const client =
        selectedClient || clients.find((item) => item.id === assignment.clientId);

      if (!client) {
        notify("Could not find the client for this assignment.", "error");
        return;
      }

      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType: assignment.assignmentType,
          templateId: assignment.templateId,
          templateName: assignment.templateName,
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: dateToInputValue(new Date()),
          dueDate: scheduledDate,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not copy assigned item.", "error");
        return;
      }

      await loadContentAssignments(client);
      notify("Assigned item copied.", "success");
    }
    setCopiedCalendarItem(null);
  };

  const builderSectionOptions = [
    "Warmup",
    "Strength",
    "Power",
    "Accessory",
    "Conditioning",
    "Cardio",
    "Mobility",
    "Skill",
    "Recovery",
    "Climbing",
  ];

  const getBuilderSectionSelectOptions = (currentSection?: string) => {
    const options = new Set<string>();

    [...builderSectionOptions, pendingSectionName, currentSection || ""]
      .map((section) => section.trim())
      .filter(Boolean)
      .forEach((section) => options.add(section));

    selectedProgramExercises
      .map((exercise) => exercise.sectionName.trim())
      .filter(Boolean)
      .forEach((section) => options.add(section));

    return Array.from(options);
  };

  const openBuilderLibrary = (mode: BuilderLibraryMode = "Exercises") => {
    setBuilderLibraryMode(mode);
    setIsBuilderLibraryOpen(true);

    if (mode === "Exercises" && libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
  };

  const setBuilderLibraryModeAndLoad = (mode: BuilderLibraryMode) => {
    setBuilderLibraryMode(mode);

    if (mode === "Exercises" && libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
  };

  const selectBuilderSection = (sectionName: string) => {
    const cleanSectionName = sectionName.trim();

    if (!cleanSectionName) {
      return;
    }

    setPendingSectionName(cleanSectionName);
    setCustomBuilderSectionName("");
    setBuilderLibraryMode("Exercises");
    notify(`Section set to ${cleanSectionName}.`);
  };

  function normalizeBuilderSection(sectionName?: string) {
    return String(sectionName || "Main").trim() || "Main";
  }

  function isWarmupSection(sectionName?: string) {
    const clean = normalizeBuilderSection(sectionName).toLowerCase();
    return clean.includes("warm") || clean.includes("prep");
  }

  // Color the exercise label (A1, B1...) by its SECTION type, with hues that
  // represent each section (cardio = blue, etc.). Only the label badge is
  // colored, never the whole card.
  function getLabelColorClass(_label?: string, sectionName?: string) {
    const clean = normalizeBuilderSection(sectionName).toLowerCase();
    if (clean.includes("warm") || clean.includes("prep")) return "labelWarmup";
    if (
      clean.includes("cardio") ||
      clean.includes("condition") ||
      clean.includes("run") ||
      clean.includes("interval")
    ) {
      return "labelCardio";
    }
    if (
      clean.includes("mobility") ||
      clean.includes("recovery") ||
      clean.includes("stretch") ||
      clean.includes("flex")
    ) {
      return "labelMobility";
    }
    if (
      clean.includes("skill") ||
      clean.includes("climb") ||
      clean.includes("technique")
    ) {
      return "labelSkill";
    }
    if (
      clean.includes("power") ||
      clean.includes("olympic") ||
      clean.includes("plyo") ||
      clean.includes("explos")
    ) {
      return "labelPower";
    }
    if (clean.includes("accessor") || clean.includes("auxiliary")) {
      return "labelAccessory";
    }
    if (clean.includes("strength") || clean.includes("main")) {
      return "labelStrength";
    }
    return "labelDefault";
  }

  // Hex accent per section (matches the label-badge hues) for the workout
  // session's card/heading accents.
  function sectionAccentColor(sectionName?: string) {
    switch (getLabelColorClass(undefined, sectionName)) {
      case "labelWarmup":
        return "#c2671c";
      case "labelCardio":
        return "#3a86ff";
      case "labelMobility":
        return "#2e8b3d";
      case "labelSkill":
        return "#6a4bc9";
      case "labelPower":
        return "#b5731a";
      case "labelAccessory":
        return "#15897a";
      case "labelStrength":
        return "#5b6770";
      default:
        return "#4f5258";
    }
  }

  function renderExerciseLabelBadge(exercise: ProgramExercise, index: number) {
    if (isWarmupSection(exercise.sectionName)) {
      return (
        <span className="exerciseLabelBadge exerciseLabelBadgeWarmup">
          {index + 1}
        </span>
      );
    }

    return (
      <span
        className={`exerciseLabelBadge ${getLabelColorClass(
          exercise.exerciseLabel,
          exercise.sectionName
        )}`}
      >
        {exercise.exerciseLabel || index + 1}
      </span>
    );
  }

  // Build the "at a glance" chain for a program-grid card. Consecutive
  // same-section exercises form a lettered block (A, B, C…) with numbered
  // members (C1, C2…) joined by a line. Warmup exercises are numbered (1, 2…)
  // with no letter and no line. Line segments are tinted blue between a
  // superset/circuit pair and green into an accessory.
  const buildGlanceChain = (exercises: ProgramExercise[]) => {
    const runs: { isWarmup: boolean; exs: ProgramExercise[] }[] = [];
    let cur: { isWarmup: boolean; exs: ProgramExercise[] } | null = null;
    let curKey: string | null = null;
    exercises.forEach((ex) => {
      const sec =
        normalizeBuilderSection(ex.sectionName).toLowerCase() || "main";
      if (cur && curKey === sec) {
        cur.exs.push(ex);
      } else {
        cur = { isWarmup: isWarmupSection(ex.sectionName), exs: [ex] };
        curKey = sec;
        runs.push(cur);
      }
    });

    const relColor = (a: ProgramExercise, b: ProgramExercise) => {
      const aGrouped = a.groupType && a.groupType !== "Straight" && a.groupName;
      const bGrouped = b.groupType && b.groupType !== "Straight" && b.groupName;
      if (aGrouped && bGrouped && a.groupName === b.groupName) return "superset";
      // Green only for the segment leading INTO an accessory (from its parent
      // or a preceding accessory in the same chain), not the one after it.
      if (b.isAccessory) return "accessory";
      return "neutral";
    };

    const items: {
      ex: ProgramExercise;
      display: string;
      colorClass: string;
      linked: boolean;
      isFirst: boolean;
      isLast: boolean;
      lineUpColor: string;
      lineDownColor: string;
    }[] = [];
    let letterIndex = 0;
    let warmIndex = 0;
    runs.forEach((run) => {
      const n = run.exs.length;
      let letter = "";
      if (!run.isWarmup) {
        letter = String.fromCharCode(65 + Math.min(letterIndex, 25));
        letterIndex++;
      }
      run.exs.forEach((ex, pos) => {
        let display: string;
        if (run.isWarmup) {
          warmIndex += 1;
          display = String(warmIndex);
        } else {
          // Mirror the builder's own label (accessories carry their parent's
          // label, e.g. A1/A1); fall back to a computed letter.
          display =
            ex.exerciseLabel || (n > 1 ? `${letter}${pos + 1}` : letter);
        }
        items.push({
          ex,
          display,
          colorClass: run.isWarmup
            ? "exerciseLabelBadgeWarmup"
            : getLabelColorClass(undefined, ex.sectionName),
          linked: !run.isWarmup && n > 1,
          isFirst: pos === 0,
          isLast: pos === n - 1,
          lineUpColor:
            !run.isWarmup && pos > 0 ? relColor(run.exs[pos - 1], ex) : "",
          lineDownColor:
            !run.isWarmup && pos < n - 1 ? relColor(ex, run.exs[pos + 1]) : "",
        });
      });
    });
    return items;
  };

  function relabelProgramExercises(exercises: ProgramExercise[]) {
    const sectionLetters = new Map<string, string>();
    const sectionCounts = new Map<string, number>();
    const lastMainLabelBySection = new Map<string, string>();

    return exercises.map((exercise, index) => {
      const sectionName = normalizeBuilderSection(exercise.sectionName);
      const sectionKey = sectionName.toLowerCase();
      const baseExercise = {
        ...exercise,
        sectionName,
        order: index + 1,
      };

      if (isWarmupSection(sectionName)) {
        return {
          ...baseExercise,
          exerciseLabel: "",
          accessoryParentLabel: "",
        };
      }

      if (!sectionLetters.has(sectionKey)) {
        const letterIndex = sectionLetters.size;
        sectionLetters.set(
          sectionKey,
          String.fromCharCode(65 + Math.min(letterIndex, 25))
        );
      }

      const sectionLetter = sectionLetters.get(sectionKey) || "A";

      if (exercise.isAccessory) {
        const parentLabel =
          lastMainLabelBySection.get(sectionKey) ||
          exercise.accessoryParentLabel ||
          exercise.exerciseLabel ||
          `${sectionLetter}${Math.max(sectionCounts.get(sectionKey) || 1, 1)}`;

        return {
          ...baseExercise,
          exerciseLabel: parentLabel,
          accessoryParentLabel: parentLabel,
        };
      }

      const nextCount = (sectionCounts.get(sectionKey) || 0) + 1;
      const nextLabel = `${sectionLetter}${nextCount}`;
      sectionCounts.set(sectionKey, nextCount);
      lastMainLabelBySection.set(sectionKey, nextLabel);

      return {
        ...baseExercise,
        exerciseLabel: nextLabel,
        accessoryParentLabel: "",
      };
    });
  }

  function makeSetPrescription(
    exercise: ProgramExercise,
    setNumber: number,
    source?: Partial<ExerciseSetPrescription>
  ): ExerciseSetPrescription {
    return {
      setNumber,
      reps: String(source?.reps ?? exercise.reps ?? ""),
      load: String(source?.load ?? exercise.load ?? ""),
      percent: String(source?.percent ?? ""),
      percentMas: String(source?.percentMas ?? ""),
      intensityMode: String(source?.intensityMode ?? ""),
      intensityValue: String(source?.intensityValue ?? ""),
      rpe: String(source?.rpe ?? ""),
      rir: String(source?.rir ?? ""),
      tempo: String(source?.tempo ?? exercise.tempo ?? ""),
      rest: String(source?.rest ?? exercise.rest ?? ""),
    };
  }

  function normalizeExerciseSetPrescriptions(
    exercise: ProgramExercise
  ): ExerciseSetPrescription[] {
    const setCount = Math.max(1, Number(exercise.sets) || 1);
    const existing = Array.isArray(exercise.setPrescriptions)
      ? exercise.setPrescriptions
      : [];

    return Array.from({ length: setCount }, (_, index) => {
      const source = existing[index] || existing[existing.length - 1];
      return makeSetPrescription(exercise, index + 1, source);
    });
  }

  function withNormalizedSetFields(exercise: ProgramExercise) {
    const setPrescriptions = normalizeExerciseSetPrescriptions(exercise);
    const firstSet = setPrescriptions[0];

    return {
      ...exercise,
      sets: String(setPrescriptions.length),
      reps: firstSet?.reps ?? exercise.reps,
      load: firstSet?.load ?? exercise.load,
      tempo: firstSet?.tempo ?? exercise.tempo,
      rest: firstSet?.rest ?? exercise.rest,
      setPrescriptions,
    };
  }

  const toggleBuilderExerciseExpanded = (index: number) => {
    setExpandedBuilderExerciseIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleUsePercent = (index: number) => {
    setUsePercentExerciseIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleTrackingField = (index: number, field: string) => {
    setSelectedProgramExercises((current) =>
      current.map((ex, i) => {
        if (i !== index) return ex;
        const active = effectiveTrackingFields(ex.trackingType, ex.trackingFields);
        let next: string[];
        if (active.includes(field)) {
          next = active.filter((f) => f !== field);
          if (next.length === 0) next = ["Weight"];
        } else {
          if (active.length >= 3) return ex;
          next = [...active, field];
        }
        return { ...ex, trackingFields: next };
      })
    );
  };

  const expandAllBuilderExercises = () => {
    setExpandedBuilderExerciseIndexes(
      new Set(selectedProgramExercises.map((_, index) => index))
    );
  };

  const collapseAllBuilderExercises = () => {
    setExpandedBuilderExerciseIndexes(new Set());
  };

  const scrollLatestBuilderExerciseIntoView = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        latestBuilderExerciseRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        if (!latestBuilderExerciseRef.current) {
          builderModalListRef.current?.scrollTo({
            top: builderModalListRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    });
  };

  const adjustProgramExerciseSets = (index: number, amount: number) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== index) return exercise;

        const normalizedSets = normalizeExerciseSetPrescriptions(exercise);
        const nextSetCount = Math.max(1, normalizedSets.length + amount);
        const nextSets = [...normalizedSets];

        if (amount > 0) {
          const source = normalizedSets[0] || nextSets[nextSets.length - 1];
          for (let setIndex = normalizedSets.length; setIndex < nextSetCount; setIndex += 1) {
            nextSets.push(makeSetPrescription(exercise, setIndex + 1, source));
          }
        } else {
          nextSets.length = nextSetCount;
        }

        return withNormalizedSetFields({
          ...exercise,
          sets: String(nextSetCount),
          setPrescriptions: nextSets.map((set, setIndex) => ({
            ...set,
            setNumber: setIndex + 1,
          })),
        });
      })
    );
  };

  const addMultipleExerciseSets = (index: number, amount: number) => {
    adjustProgramExerciseSets(index, Math.max(1, amount));
  };

  const removeExerciseSet = (exerciseIndex: number, setIndex: number) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== exerciseIndex) return exercise;

        const nextSets = normalizeExerciseSetPrescriptions(exercise)
          .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
          .map((set, currentSetIndex) => ({
            ...set,
            setNumber: currentSetIndex + 1,
          }));

        return withNormalizedSetFields({
          ...exercise,
          sets: String(Math.max(nextSets.length, 1)),
          setPrescriptions:
            nextSets.length > 0
              ? nextSets
              : [makeSetPrescription(exercise, 1)],
        });
      })
    );
  };

  const fillSetColumn = (
    exerciseIndex: number,
    field: keyof Omit<ExerciseSetPrescription, "setNumber">
  ) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== exerciseIndex) return exercise;
        const sets = normalizeExerciseSetPrescriptions(exercise);
        if (sets.length <= 1) return exercise;
        const firstValue = sets[0][field];
        const nextSets = sets.map((set) => ({ ...set, [field]: firstValue }));
        return withNormalizedSetFields({ ...exercise, setPrescriptions: nextSets });
      })
    );
  };

  const updateExerciseSetPrescription = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof Omit<ExerciseSetPrescription, "setNumber">,
    value: string
  ) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== exerciseIndex) return exercise;

        const nextSets = normalizeExerciseSetPrescriptions(exercise).map(
          (set, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...set, [field]: value } : set
        );

        return withNormalizedSetFields({
          ...exercise,
          setPrescriptions: nextSets,
        });
      })
    );
  };

  // Rest input + s/min unit dropdown — shared by cardio and strength sets.
  const renderRestControl = (
    exerciseIndex: number,
    setIndex: number,
    set: ExerciseSetPrescription
  ) => {
    const raw = String(set.rest || "").trim();
    const value = (raw.match(/[\d.]+/) || [""])[0];
    const unitWord = (raw.match(/[a-z]+/i) || [""])[0].toLowerCase();
    const unit = unitWord.startsWith("m") ? "min" : "s";
    const write = (nextValue: string, nextUnit: string) =>
      updateExerciseSetPrescription(
        exerciseIndex,
        setIndex,
        "rest",
        nextValue ? `${nextValue} ${nextUnit}` : ""
      );
    return (
      <div className="builderRestControl">
        <input
          className="miniSearch builderRestValue"
          inputMode="numeric"
          value={value}
          onChange={(event) =>
            write(event.target.value.replace(/[^\d.]/g, ""), unit)
          }
          placeholder="Rest"
        />
        <select
          className="miniSearch builderIntervalUnit"
          value={unit}
          onChange={(event) => write(value, event.target.value)}
        >
          <option value="s">s</option>
          <option value="min">min</option>
        </select>
      </div>
    );
  };

  const renderSetPrescriptionTable = (
    exercise: ProgramExercise,
    exerciseIndex: number
  ) => {
    const setPrescriptions = normalizeExerciseSetPrescriptions(exercise);
    // %1RM is hidden unless the coach turned on "Use %" for this exercise, or it
    // already has percent values (so existing %-based programs still show it).
    const showPercent =
      usePercentExerciseIndexes.has(exerciseIndex) ||
      setPrescriptions.some((s) => String(s.percent || "").trim() !== "");
    const isRunning =
      exercise.trackingType === "Time" ||
      exercise.trackingType === "Distance" ||
      exercise.trackingType === "Pace";
    const isTimeTracked = exercise.trackingType === "Time";
    const isPaceTracked = exercise.trackingType === "Pace";
    const intervalLabel = isTimeTracked
      ? "Time"
      : isPaceTracked
        ? "Pace"
        : "Distance";
    // Treadmill/track/outdoor runs are pace-driven (%MAS); machines (bike, row,
    // erg, etc.) are HR/RPE-driven, so they only need the named zone.
    const isRunExercise = /run|treadmill|track|jog/i.test(
      exercise.exerciseName || ""
    );

    // Customizable strength tracking fields (Weight/Reps/RPE/RIR), default
    // Weight+Reps. Each maps to a set-prescription value + a column.
    const fieldKeyOf: Record<
      string,
      keyof Omit<ExerciseSetPrescription, "setNumber">
    > = {
      Weight: "load",
      Reps: "reps",
      RPE: "rpe",
      RIR: "rir",
    };
    const fieldPlaceholderOf: Record<string, string> = {
      Weight: "kg",
      Reps: "Reps",
      RPE: "1-10",
      RIR: "0-5",
    };
    const trackFields = effectiveTrackingFields(
      exercise.trackingType,
      exercise.trackingFields
    );
    // Dynamic grid template so any field count stays aligned (Set · fields ·
    // %1RM? · Tempo · Rest). Set via a CSS var the .builderSetTableDynamic
    // rule reads with !important.
    const setColsTemplate = [
      "44px",
      ...trackFields.map(() => "minmax(72px, 1fr)"),
      ...(showPercent ? ["minmax(60px, 0.62fr)"] : []),
      "minmax(72px, 0.74fr)",
      "minmax(116px, 0.9fr)",
    ].join(" ");
    const dynStyle = !isRunning
      ? ({ ["--setCols" as string]: setColsTemplate } as React.CSSProperties)
      : undefined;

    return (
      <div
        className={`builderSetPrescriptionBlock${
          isRunning ? " builderSetPrescriptionRunning" : ""
        }`}
      >
        {isRunning && (
          <div className="builderSetTrackingToggle">
            {([
              { tt: "Distance" as TrackingType, label: "Distance" },
              { tt: "Time" as TrackingType, label: "Time" },
            ]).map(({ tt, label }) => (
              <button
                key={tt}
                type="button"
                className={exercise.trackingType === tt ? "active" : ""}
                onClick={() => changeExerciseTrackingType(exerciseIndex, tt)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div
          className={`builderSetTableHeader${
            !isRunning ? " builderSetTableDynamic" : ""
          }`}
          style={dynStyle}
        >
          <span>Set</span>
          {isRunning ? (
            <>
              <span className={isPaceTracked ? "builderPaceSpan" : undefined}>
                {intervalLabel}
                <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "reps")}>↓</button>
              </span>
              {!isPaceTracked && (
                <span>
                  Zone
                  <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "percentMas")}>↓</button>
                </span>
              )}
              <span>
                Rest
                <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "rest")}>↓</button>
              </span>
            </>
          ) : (
            <>
              {trackFields.map((f) => (
                <span key={f}>
                  {f === "Weight" ? "Weight (kg)" : f}
                  <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, fieldKeyOf[f])}>↓</button>
                </span>
              ))}
              {showPercent && (
                <span>
                  %1RM
                  <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "percent")}>↓</button>
                </span>
              )}
              <span>
                Tempo
                <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "tempo")}>↓</button>
              </span>
              <span>
                Rest
                <button className="fillColumnButton" type="button" title="Fill all sets with set 1 value" onClick={() => fillSetColumn(exerciseIndex, "rest")}>↓</button>
              </span>
            </>
          )}
        </div>
        {setPrescriptions.map((set, setIndex) => (
          <div
            className={`builderSetTableRow${
              !isRunning ? " builderSetTableDynamic" : ""
            }`}
            style={dynStyle}
            key={`${exerciseIndex}-set-${setIndex}`}
          >
            <div className="builderSetNumberCell">
              <strong>{set.setNumber}</strong>
              {setPrescriptions.length > 1 && (
                <button
                  className="builderSetRemoveButton"
                  type="button"
                  title={`Remove set ${set.setNumber}`}
                  aria-label={`Remove set ${set.setNumber}`}
                  onClick={() => removeExerciseSet(exerciseIndex, setIndex)}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {isRunning ? (
              <>
                <div
                  className={`builderIntervalCell${
                    isPaceTracked ? " builderPaceSpan" : ""
                  }`}
                >
                  {isPaceTracked
                    ? (() => {
                        // Pace target as mm:ss per km, stored as "M:SS/km".
                        const raw = String(set.reps || "").trim();
                        const match = raw.match(/(\d+):(\d{1,2})/);
                        const minutes = match ? match[1] : "";
                        const seconds = match ? match[2] : "";
                        const writePace = (m: string, s: string) =>
                          updateExerciseSetPrescription(
                            exerciseIndex,
                            setIndex,
                            "reps",
                            m || s
                              ? `${m || "0"}:${String(s || "0").padStart(2, "0")}/km`
                              : ""
                          );
                        return (
                          <>
                            <input
                              className="miniSearch builderTimeValue"
                              inputMode="numeric"
                              value={minutes}
                              onChange={(event) =>
                                writePace(
                                  event.target.value.replace(/\D/g, ""),
                                  seconds
                                )
                              }
                              placeholder="min"
                            />
                            <span className="builderTimeColon">:</span>
                            <input
                              className="miniSearch builderTimeValue"
                              inputMode="numeric"
                              value={seconds}
                              onChange={(event) =>
                                writePace(
                                  minutes,
                                  event.target.value.replace(/\D/g, "").slice(0, 2)
                                )
                              }
                              placeholder="sec"
                            />
                            <span className="builderIntervalUnit builderPaceUnit">
                              /km
                            </span>
                          </>
                        );
                      })()
                    : isTimeTracked
                    ? (() => {
                        const raw = String(set.reps || "").trim();
                        const colon = raw.split(":");
                        const minutes =
                          colon.length >= 2
                            ? colon[0].replace(/\D/g, "")
                            : (raw.match(/\d+/) || [""])[0];
                        const seconds =
                          colon.length >= 2 ? colon[1].replace(/\D/g, "") : "";
                        const writeTime = (m: string, s: string) =>
                          updateExerciseSetPrescription(
                            exerciseIndex,
                            setIndex,
                            "reps",
                            m || s
                              ? `${m || "0"}:${String(s || "0").padStart(2, "0")}`
                              : ""
                          );
                        return (
                          <>
                            <input
                              className="miniSearch builderTimeValue"
                              inputMode="numeric"
                              value={minutes}
                              onChange={(event) =>
                                writeTime(
                                  event.target.value.replace(/\D/g, ""),
                                  seconds
                                )
                              }
                              placeholder="min"
                            />
                            <span className="builderTimeColon">:</span>
                            <input
                              className="miniSearch builderTimeValue"
                              inputMode="numeric"
                              value={seconds}
                              onChange={(event) =>
                                writeTime(
                                  minutes,
                                  event.target.value.replace(/\D/g, "").slice(0, 2)
                                )
                              }
                              placeholder="sec"
                            />
                          </>
                        );
                      })()
                    : (() => {
                        const raw = String(set.reps || "").trim();
                        const value = (raw.match(/[\d.]+/) || [""])[0];
                        const unitWord = (raw.match(/[a-z]+/i) || [""])[0].toLowerCase();
                        const unit = unitWord === "m" ? "m" : "km";
                        const write = (nextValue: string, nextUnit: string) =>
                          updateExerciseSetPrescription(
                            exerciseIndex,
                            setIndex,
                            "reps",
                            nextValue ? `${nextValue} ${nextUnit}` : ""
                          );
                        return (
                          <>
                            <input
                              className="miniSearch builderDistanceValue"
                              inputMode="decimal"
                              value={value}
                              onChange={(event) =>
                                write(
                                  event.target.value.replace(/[^\d.]/g, ""),
                                  unit
                                )
                              }
                              placeholder="Dist"
                            />
                            <select
                              className="miniSearch builderIntervalUnit"
                              value={unit}
                              onChange={(event) => write(value, event.target.value)}
                            >
                              <option value="km">km</option>
                              <option value="m">m</option>
                            </select>
                          </>
                        );
                      })()}
                </div>
                {!isPaceTracked && (
                <div className="builderZoneCell">
                  {(() => {
                    const mode = set.intensityMode || "";
                    const setField = (
                      field: keyof Omit<ExerciseSetPrescription, "setNumber">,
                      value: string
                    ) =>
                      updateExerciseSetPrescription(
                        exerciseIndex,
                        setIndex,
                        field,
                        value
                      );

                    // Machine cardio: HR/RPE method + value (no zone).
                    if (!isRunExercise) {
                      const machineMode = mode === "hr" ? "hr" : "rpe";
                      return (
                        <div className="builderIntensityRow">
                          <select
                            className="miniSearch builderIntensityMethod"
                            value={machineMode}
                            onChange={(event) =>
                              setField("intensityMode", event.target.value)
                            }
                          >
                            <option value="rpe">RPE</option>
                            <option value="hr">HR</option>
                          </select>
                          <input
                            className="miniSearch builderIntensityValue"
                            inputMode="numeric"
                            value={set.intensityValue}
                            onChange={(event) =>
                              setField(
                                "intensityValue",
                                event.target.value.replace(/[^\d.\-]/g, "")
                              )
                            }
                            placeholder={machineMode === "hr" ? "bpm" : "RPE"}
                          />
                        </div>
                      );
                    }

                    // Run: direct HR or RPE.
                    if (mode === "hr" || mode === "rpe") {
                      return (
                        <div className="builderIntensityRow">
                          <input
                            className="miniSearch builderIntensityValue"
                            inputMode="numeric"
                            value={set.intensityValue}
                            onChange={(event) =>
                              setField(
                                "intensityValue",
                                event.target.value.replace(/[^\d.\-]/g, "")
                              )
                            }
                            placeholder={mode === "hr" ? "bpm" : "RPE"}
                          />
                          <button
                            type="button"
                            className="builderIntensityRevert"
                            title="Back to zones"
                            onClick={() => {
                              setField("intensityMode", "");
                              setField("intensityValue", "");
                            }}
                          >
                            ↺
                          </button>
                        </div>
                      );
                    }

                    // Run: custom % (fills the main box, no second field).
                    if (mode === "custom") {
                      return (
                        <div className="builderIntensityRow">
                          <input
                            className="miniSearch builderIntensityValue"
                            inputMode="decimal"
                            value={set.percentMas}
                            onChange={(event) =>
                              setField(
                                "percentMas",
                                event.target.value.replace(/[^\d.]/g, "")
                              )
                            }
                            placeholder="% MAS"
                          />
                          <button
                            type="button"
                            className="builderIntensityRevert"
                            title="Back to zones"
                            onClick={() => {
                              setField("intensityMode", "");
                              setField("percentMas", "");
                            }}
                          >
                            ↺
                          </button>
                        </div>
                      );
                    }

                    // Run: custom pace target (mm:ss / km), chosen from the zone
                    // dropdown — the boxes turn into a pace entry.
                    if (mode === "pace") {
                      const raw = String(set.intensityValue || "").trim();
                      const match = raw.match(/(\d+):(\d{1,2})/);
                      const minutes = match ? match[1] : "";
                      const seconds = match ? match[2] : "";
                      const writePace = (m: string, s: string) =>
                        setField(
                          "intensityValue",
                          m || s
                            ? `${m || "0"}:${String(s || "0").padStart(2, "0")}/km`
                            : ""
                        );
                      return (
                        <div className="builderIntensityRow builderPaceRow">
                          <input
                            className="miniSearch builderTimeValue"
                            inputMode="numeric"
                            value={minutes}
                            onChange={(event) =>
                              writePace(
                                event.target.value.replace(/\D/g, ""),
                                seconds
                              )
                            }
                            placeholder="min"
                          />
                          <span className="builderTimeColon">:</span>
                          <input
                            className="miniSearch builderTimeValue"
                            inputMode="numeric"
                            value={seconds}
                            onChange={(event) =>
                              writePace(
                                minutes,
                                event.target.value.replace(/\D/g, "").slice(0, 2)
                              )
                            }
                            placeholder="sec"
                          />
                          <span className="builderIntervalUnit builderPaceUnit">
                            /km
                          </span>
                          <button
                            type="button"
                            className="builderIntensityRevert"
                            title="Back to zones"
                            onClick={() => {
                              setField("intensityMode", "");
                              setField("intensityValue", "");
                            }}
                          >
                            ↺
                          </button>
                        </div>
                      );
                    }

                    // Run: named zone dropdown (default).
                    const matched = RUNNING_ZONE_OPTIONS.find(
                      (zone) => String(zone.percent) === String(set.percentMas)
                    );
                    return (
                      <select
                        className="miniSearch builderZoneSelect"
                        value={matched ? matched.key : set.percentMas ? "custom" : ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "pace") {
                            setField("intensityMode", "pace");
                            return;
                          }
                          if (value === "custom") {
                            setField("intensityMode", "custom");
                            return;
                          }
                          if (value === "hr" || value === "rpe") {
                            setField("intensityMode", value);
                            return;
                          }
                          const zone = RUNNING_ZONE_OPTIONS.find(
                            (option) => option.key === value
                          );
                          setField("percentMas", zone ? String(zone.percent) : "");
                        }}
                      >
                        <option value="">Zone…</option>
                        <option value="pace">Custom Pace (min:sec/km)</option>
                        {RUNNING_ZONE_OPTIONS.map((zone) => (
                          <option key={zone.key} value={zone.key}>
                            {zone.label} ({zone.percent}%)
                          </option>
                        ))}
                        <option value="custom">Custom %</option>
                        <option value="hr">HR (bpm)</option>
                        <option value="rpe">RPE</option>
                      </select>
                    );
                  })()}
                </div>
                )}
                <div className="builderIntervalCell">
                  {renderRestControl(exerciseIndex, setIndex, set)}
                </div>
              </>
            ) : (
              <>
                {trackFields.map((f) => (
                  <label className="builderSetField" key={f}>
                    <span className="builderSetFieldLabel">
                      {f === "Weight" ? "Weight (kg)" : f}
                    </span>
                    <input
                      className="miniSearch"
                      value={String(set[fieldKeyOf[f]] || "")}
                      onChange={(event) =>
                        updateExerciseSetPrescription(
                          exerciseIndex,
                          setIndex,
                          fieldKeyOf[f],
                          event.target.value
                        )
                      }
                      placeholder={fieldPlaceholderOf[f]}
                    />
                  </label>
                ))}
                {showPercent && (
                  <label className="builderSetField">
                    <span className="builderSetFieldLabel">%1RM</span>
                    <input
                      className="miniSearch"
                      inputMode="decimal"
                      value={set.percent}
                      onChange={(event) =>
                        updateExerciseSetPrescription(
                          exerciseIndex,
                          setIndex,
                          "percent",
                          event.target.value.replace(/[^\d.]/g, "")
                        )
                      }
                      placeholder="% 1RM"
                    />
                  </label>
                )}
                <label className="builderSetField">
                  <span className="builderSetFieldLabel">Tempo</span>
                  <input
                    className="miniSearch"
                    value={set.tempo}
                    onChange={(event) =>
                      updateExerciseSetPrescription(
                        exerciseIndex,
                        setIndex,
                        "tempo",
                        event.target.value
                      )
                    }
                    placeholder="Tempo"
                  />
                </label>
                <label className="builderSetField">
                  <span className="builderSetFieldLabel">Rest</span>
                  {renderRestControl(exerciseIndex, setIndex, set)}
                </label>
              </>
            )}
          </div>
        ))}
        <div className="builderSetTableActions">
          <button
            className="outlineButton compactBuilderButton"
            onClick={() => adjustProgramExerciseSets(exerciseIndex, 1)}
            type="button"
          >
            Add Set
          </button>
          <div className="builderSetAddMenu">
            <button className="outlineButton compactBuilderButton" type="button">
              +
            </button>
            <div className="builderSetAddMenuOptions">
              {[2, 3, 4, 5, 6, 7, 8].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => addMultipleExerciseSets(exerciseIndex, amount)}
                >
                  + {amount} Sets
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Pure construction of a ProgramExercise from a library item, given the list
  // it will be appended to. Used by both single-add and the mobile multi-add so
  // sequential adds compose correctly (no stale-state overwrites).
  const buildProgramExerciseFromLibrary = (
    exercise: LibraryExercise,
    baseList: ProgramExercise[],
    parent: ProgramExercise | null
  ): ProgramExercise => {
    const meta = parseExerciseNotes(exercise.notes || "");
    const categoryDefaults = isCardioCategory(exercise.category)
      ? null
      : categoryPrescriptionDefaults(exercise.category);
    // Category-aware fallback: a conditioning/cardio exercise added first into
    // an empty session starts a Conditioning/Cardio section instead of landing
    // in "Warmup" (which made whole WODs render under a WARMUP header).
    const fallbackSection = isCardioCategory(exercise.category)
      ? "Cardio"
      : isConditioningCategory(exercise.category)
        ? "Conditioning"
        : builderSectionOptions[0];
    const exerciseSection =
      pendingSectionName ||
      parent?.sectionName ||
      baseList[baseList.length - 1]?.sectionName ||
      fallbackSection;
    const initialExercise: ProgramExercise = {
      exerciseRecordId: exercise.recordId,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      order: baseList.length + 1,
      sectionName: exerciseSection,
      exerciseLabel: isWarmupSection(exerciseSection)
        ? ""
        : parent?.exerciseLabel || makeExerciseLabel(baseList.length),
      sets: parent ? "2" : categoryDefaults?.sets || "3",
      reps: parent ? "10" : categoryDefaults?.reps || "8",
      load: "",
      // Cardio has no lifting tempo; categories with an explicitly empty tempo
      // (plyo, Olympic, carries, mobility…) stay tempo-free even in supersets.
      tempo: isCardioCategory(exercise.category)
        ? ""
        : categoryDefaults && categoryDefaults.tempo === ""
          ? ""
          : parent?.tempo || categoryDefaults?.tempo || "3-1-1",
      rest: parent ? "45 sec" : categoryDefaults?.rest || "60 sec",
      coachingNotes: "",
      // Cardio exercises default to Distance tracking so the run/Zone layout
      // shows immediately (coach can still toggle to Time/Weight).
      trackingType: isCardioCategory(exercise.category)
        ? "Distance"
        : meta.trackingType,
      // Pure-bodyweight movements (burpees, push-ups) log reps only — no
      // orphan Weight (kg) field. Coach can re-add fields via the toggles.
      trackingFields: /^\s*bodyweight\s*$/i.test(exercise.equipment || "")
        ? ["Reps"]
        : meta.trackingFields,
      isUnilateral: meta.isUnilateral,
      groupType: "Straight",
      groupName: "",
      isAccessory: Boolean(parent),
      accessoryParentLabel: parent?.exerciseLabel || "",
      accessoryColor: parent ? "Green" : "Gold",
      alternateExercises: [],
      targetSource: exercise.usesAutoTarget ? "Athlete Metric" : "",
      targetMetric: exercise.defaultMetric || "",
      targetPercent: "",
      targetAdjustment: "",
      autoTarget: Boolean(exercise.usesAutoTarget),
      displayTarget: "",
    };
    let newExercise = withNormalizedSetFields(initialExercise);

    // Cardio machines (bike, rower, etc.) are HR/RPE-driven, not %MAS — default
    // their sets to an RPE prescription so no zone is required.
    const isCardioMachine =
      isCardioCategory(exercise.category) &&
      !/run|treadmill|track|jog/i.test(exercise.exerciseName || "");
    if (isCardioMachine) {
      newExercise = {
        ...newExercise,
        setPrescriptions: (newExercise.setPrescriptions || []).map((set) => ({
          ...set,
          intensityMode: "rpe",
        })),
      };
    }
    return newExercise;
  };

  const addExerciseToProgram = (exercise: LibraryExercise) => {
    const parent =
      accessoryTargetIndex !== null
        ? selectedProgramExercises[accessoryTargetIndex]
        : null;
    const newExercise = buildProgramExerciseFromLibrary(
      exercise,
      selectedProgramExercises,
      parent
    );

    if (parent && accessoryTargetIndex !== null) {
      const updated = [...selectedProgramExercises];
      updated.splice(accessoryTargetIndex + 1, 0, newExercise);
      setSelectedProgramExercises(relabelProgramExercises(updated));
      setLatestBuilderExerciseIndex(accessoryTargetIndex + 1);
      setExpandedBuilderExerciseIndexes((current) => {
        const next = new Set<number>();
        current.forEach((itemIndex) => {
          next.add(itemIndex > accessoryTargetIndex ? itemIndex + 1 : itemIndex);
        });
        return next;
      });
      setAccessoryTargetIndex(null);
      notify(`Accessory added under ${parent.exerciseLabel || parent.exerciseName}.`);
      scrollLatestBuilderExerciseIntoView();
      return;
    }

    setSelectedProgramExercises(
      relabelProgramExercises([...selectedProgramExercises, newExercise])
    );
    setLatestBuilderExerciseIndex(selectedProgramExercises.length);
    scrollLatestBuilderExerciseIntoView();
  };

  // Append several library exercises in a single state update so they all land
  // (a forEach of addExerciseToProgram would overwrite due to stale state).
  const addExercisesToProgram = (exercises: LibraryExercise[]) => {
    if (exercises.length === 0) return;
    setSelectedProgramExercises((prev) => {
      let list = prev;
      exercises.forEach((exercise) => {
        list = [...list, buildProgramExerciseFromLibrary(exercise, list, null)];
      });
      return relabelProgramExercises(list);
    });
  };

  const updateProgramExercise = (
    index: number,
    field: keyof ProgramExercise,
    value: string | number | boolean
  ) => {
    const updated = [...selectedProgramExercises];

    const nextExercise = {
      ...updated[index],
      [field]: field === "order" ? Number(value) : value,
    };

    const nextExercises =
      field === "sets" || field === "reps" || field === "load" || field === "tempo" || field === "rest"
        ? [
            ...updated.slice(0, index),
            withNormalizedSetFields(nextExercise),
            ...updated.slice(index + 1),
          ]
        : [
            ...updated.slice(0, index),
            nextExercise,
            ...updated.slice(index + 1),
          ];

    setSelectedProgramExercises(
      field === "sectionName" || field === "isAccessory"
        ? relabelProgramExercises(nextExercises)
        : nextExercises
    );
  };

  // Switching cardio tracking type (Distance / Time / Pace) clears the now
  // format-mismatched interval values so no stale number lingers.
  const changeExerciseTrackingType = (index: number, tt: TrackingType) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) =>
        itemIndex === index
          ? {
              ...exercise,
              trackingType: tt,
              reps: "",
              setPrescriptions: (exercise.setPrescriptions || []).map((set) => ({
                ...set,
                reps: "",
              })),
            }
          : exercise
      )
    );
  };

  const getExerciseGroupMoveRange = (
    exercises: ProgramExercise[],
    index: number
  ) => {
    const exercise = exercises[index];

    if (
      !exercise ||
      exercise.groupType === "Straight" ||
      !exercise.groupName.trim()
    ) {
      return { start: index, end: index };
    }

    const groupKey = `${exercise.groupType}:${exercise.groupName.trim().toLowerCase()}`;
    let start = index;
    let end = index;

    while (start > 0) {
      const previous = exercises[start - 1];
      const previousKey = `${previous.groupType}:${previous.groupName
        .trim()
        .toLowerCase()}`;

      if (previous.groupType === "Straight" || previousKey !== groupKey) break;
      start -= 1;
    }

    while (end < exercises.length - 1) {
      const next = exercises[end + 1];
      const nextKey = `${next.groupType}:${next.groupName.trim().toLowerCase()}`;

      if (next.groupType === "Straight" || nextKey !== groupKey) break;
      end += 1;
    }

    return { start, end };
  };

  const getBuilderOrderItems = (exercises: ProgramExercise[]) => {
    const items: Array<{
      key: string;
      start: number;
      end: number;
      exercises: ProgramExercise[];
      isLinkedGroup: boolean;
    }> = [];

    let index = 0;
    while (index < exercises.length) {
      const range = getExerciseGroupMoveRange(exercises, index);
      const groupExercises = exercises.slice(range.start, range.end + 1);
      const firstExercise = groupExercises[0];
      const isLinkedGroup = range.end > range.start;

      items.push({
        key: isLinkedGroup
          ? `${firstExercise.groupType}-${firstExercise.groupName}-${range.start}-${range.end}`
          : `${firstExercise.exerciseRecordId || firstExercise.exerciseName}-${index}`,
        start: range.start,
        end: range.end,
        exercises: groupExercises,
        isLinkedGroup,
      });

      index = range.end + 1;
    }

    return items;
  };

  const reorderProgramExercise = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= selectedProgramExercises.length ||
      targetIndex >= selectedProgramExercises.length
    ) {
      return;
    }

    const updated = [...selectedProgramExercises];
    const sourceRange = getExerciseGroupMoveRange(updated, sourceIndex);

    if (targetIndex >= sourceRange.start && targetIndex <= sourceRange.end) {
      return;
    }

    const targetRange = getExerciseGroupMoveRange(updated, targetIndex);
    const insertIndex =
      targetIndex > sourceIndex ? targetRange.end + 1 : targetRange.start;
    const movedExercises = updated.splice(
      sourceRange.start,
      sourceRange.end - sourceRange.start + 1
    );
    const adjustedInsertIndex =
      insertIndex > sourceRange.start
        ? insertIndex - movedExercises.length
        : insertIndex;

    updated.splice(adjustedInsertIndex, 0, ...movedExercises);
    setSelectedProgramExercises(relabelProgramExercises(updated));
  };

  const updateExerciseGrouping = (
    index: number,
    groupType: ProgramExercise["groupType"],
    groupName: string
  ) => {
    const updated = [...selectedProgramExercises];

    updated[index] = {
      ...updated[index],
      groupType,
      groupName: groupType === "Straight" ? "" : groupName,
    };

    setSelectedProgramExercises(updated);
  };

  const findLibraryExerciseForProgramExercise = (exercise: ProgramExercise) =>
    libraryExercises.find(
      (item) =>
        item.recordId === exercise.exerciseRecordId ||
        item.exerciseId === exercise.exerciseId ||
        item.exerciseName === exercise.exerciseName
    );

  const viewProgramExercise = (exercise: ProgramExercise) => {
    const libraryExercise = findLibraryExerciseForProgramExercise(exercise);

    setTechnicalCueExercise(
      libraryExercise || {
        recordId: exercise.exerciseRecordId,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        videoUrl: "",
        notes: exercise.coachingNotes,
        status: "Active",
      }
    );
    setBuilderExerciseOptionsIndex(null);
  };

  const duplicateProgramExercise = (index: number) => {
    const source = selectedProgramExercises[index];
    if (!source) return;

    const duplicate: ProgramExercise = {
      ...source,
      order: source.order + 1,
      alternateExercises: source.alternateExercises
        ? [...source.alternateExercises]
        : [],
      setPrescriptions: normalizeExerciseSetPrescriptions(source).map((set) => ({
        ...set,
      })),
    };

    const updated = [...selectedProgramExercises];
    updated.splice(index + 1, 0, duplicate);
    setSelectedProgramExercises(relabelProgramExercises(updated));
    setExpandedBuilderExerciseIndexes((current) => {
      const next = new Set<number>();
      current.forEach((itemIndex) => {
        next.add(itemIndex > index ? itemIndex + 1 : itemIndex);
      });
      next.add(index + 1);
      return next;
    });
    setBuilderExerciseOptionsIndex(null);
  };

  const openAlternateExerciseEditor = (index: number) => {
    setAlternateEditorExerciseIndex(index);
    setAlternateSearch("");
    setBuilderExerciseOptionsIndex(null);
  };

  const addAlternateExercise = (
    exerciseIndex: number,
    alternate: LibraryExercise
  ) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== exerciseIndex) return exercise;

        const currentAlternates = exercise.alternateExercises || [];
        const alreadyAdded = currentAlternates.some(
          (item) =>
            item.exerciseRecordId === alternate.recordId ||
            item.exerciseId === alternate.exerciseId ||
            item.exerciseName === alternate.exerciseName
        );

        if (alreadyAdded) return exercise;

        return {
          ...exercise,
          alternateExercises: [
            ...currentAlternates,
            {
              exerciseRecordId: alternate.recordId,
              exerciseId: alternate.exerciseId,
              exerciseName: alternate.exerciseName,
            },
          ],
        };
      })
    );
  };

  const removeAlternateExercise = (exerciseIndex: number, alternateIndex: number) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) =>
        itemIndex === exerciseIndex
          ? {
              ...exercise,
              alternateExercises: (exercise.alternateExercises || []).filter(
                (_, itemAlternateIndex) => itemAlternateIndex !== alternateIndex
              ),
            }
          : exercise
      )
    );
  };

  const reorderAlternateExercise = (
    exerciseIndex: number,
    sourceIndex: number,
    targetIndex: number
  ) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;

    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) => {
        if (itemIndex !== exerciseIndex) return exercise;

        const alternates = [...(exercise.alternateExercises || [])];
        if (
          sourceIndex >= alternates.length ||
          targetIndex >= alternates.length
        ) {
          return exercise;
        }

        const [movedAlternate] = alternates.splice(sourceIndex, 1);
        alternates.splice(targetIndex, 0, movedAlternate);

        return {
          ...exercise,
          alternateExercises: alternates,
        };
      })
    );
  };

  const clearAlternateExercises = (exerciseIndex: number) => {
    setSelectedProgramExercises((current) =>
      current.map((exercise, itemIndex) =>
        itemIndex === exerciseIndex
          ? { ...exercise, alternateExercises: [] }
          : exercise
      )
    );
  };

  const renderAlternateExerciseEditor = (
    exercise: ProgramExercise,
    index: number
  ) => {
    if (alternateEditorExerciseIndex !== index) return null;

    const alternates = exercise.alternateExercises || [];
    const normalizedSearch = alternateSearch.trim().toLowerCase();
    const availableAlternates = libraryExercises
      .filter((libraryExercise) => {
        const isCurrentExercise =
          libraryExercise.recordId === exercise.exerciseRecordId ||
          libraryExercise.exerciseId === exercise.exerciseId ||
          libraryExercise.exerciseName === exercise.exerciseName;
        const isAlreadyAdded = alternates.some(
          (alternate) =>
            alternate.exerciseRecordId === libraryExercise.recordId ||
            alternate.exerciseId === libraryExercise.exerciseId ||
            alternate.exerciseName === libraryExercise.exerciseName
        );
        const matchesSearch =
          !normalizedSearch ||
          [
            libraryExercise.exerciseName,
            libraryExercise.equipment,
            libraryExercise.movementPattern,
            libraryExercise.category,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        return !isCurrentExercise && !isAlreadyAdded && matchesSearch;
      })
      .slice(0, 8);

    return (
      <div className="alternateExerciseEditor">
        <div className="alternateEditorHeader">
          <div>
            <span className="eyebrow">Alternate Exercises</span>
            <strong>Edit alternate exercises</strong>
          </div>
          <button
            className="iconButton compactIconButton"
            type="button"
            aria-label="Close alternate exercise editor"
            onClick={() => setAlternateEditorExerciseIndex(null)}
          >
            <X size={15} />
          </button>
        </div>

        <input
          className="miniSearch alternateSearchInput"
          value={alternateSearch}
          onChange={(event) => setAlternateSearch(event.target.value)}
          placeholder="Search exercise library..."
        />

        <div className="alternateExerciseEditorBody">
          <div className="alternateSelectedList">
            {alternates.length === 0 ? (
              <p>No alternate exercises added yet.</p>
            ) : (
              alternates.map((alternate, alternateIndex) => (
                <div
                  className={`alternateSelectedItem${
                    alternateDragIndex === alternateIndex ? " isDragging" : ""
                  }`}
                  key={`${alternate.exerciseRecordId || alternate.exerciseId}-${alternateIndex}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setAlternateDragIndex(alternateIndex);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (alternateDragIndex !== null) {
                      reorderAlternateExercise(
                        index,
                        alternateDragIndex,
                        alternateIndex
                      );
                    }
                    setAlternateDragIndex(null);
                  }}
                  onDragEnd={() => setAlternateDragIndex(null)}
                >
                  <span className="alternateOrderNumber">
                    {alternateIndex + 1}.
                  </span>
                  <span>{alternate.exerciseName}</span>
                  <GripVertical size={16} className="alternateDragHandle" />
                  <button
                    className="alternateRemoveButton"
                    type="button"
                    aria-label={`Remove ${alternate.exerciseName}`}
                    title={`Remove ${alternate.exerciseName}`}
                    onClick={() => removeAlternateExercise(index, alternateIndex)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="alternateLibraryList">
            <span className="eyebrow">Add from library</span>
            {availableAlternates.map((alternate) => (
              <button
                type="button"
                key={alternate.recordId || alternate.exerciseId}
                onClick={() => addAlternateExercise(index, alternate)}
              >
                <Plus size={14} />
                <span>{alternate.exerciseName}</span>
              </button>
            ))}
            {availableAlternates.length === 0 && (
              <p>No matching exercises available.</p>
            )}
          </div>
        </div>

        <div className="alternateEditorFooter">
          <button
            className="textButton"
            type="button"
            onClick={() => clearAlternateExercises(index)}
          >
            Remove All
          </button>
          <button
            className="outlineButton compactBuilderButton"
            type="button"
            onClick={() => setAlternateEditorExerciseIndex(null)}
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  const linkExerciseWithPrevious = (
    index: number,
    groupType: "Superset" | "Circuit"
  ) => {
    if (index === 0) {
      notify(`Add another exercise above this before creating a ${groupType.toLowerCase()}.`);
      return;
    }

    const groupName =
      selectedProgramExercises[index - 1].groupName ||
      `${groupType} ${String.fromCharCode(65 + index - 1)}`;
    const updated = [...selectedProgramExercises];

    updated[index - 1] = {
      ...updated[index - 1],
      groupType,
      groupName,
    };
    updated[index] = {
      ...updated[index],
      groupType,
      groupName,
    };

    setSelectedProgramExercises(relabelProgramExercises(updated));
  };

  const isExerciseLinkedWithPrevious = (index: number) => {
    if (index <= 0) return false;

    const current = selectedProgramExercises[index];
    const previous = selectedProgramExercises[index - 1];

    return Boolean(
      current &&
        previous &&
        current.groupType !== "Straight" &&
        current.groupType === previous.groupType &&
        current.groupName &&
        current.groupName === previous.groupName
    );
  };

  const unlinkExerciseGroup = (index: number) => {
    const exercise = selectedProgramExercises[index];

    if (!exercise || exercise.groupType === "Straight" || !exercise.groupName) {
      return;
    }

    const groupKey = `${exercise.groupType}:${exercise.groupName}`.toLowerCase();
    const updated = selectedProgramExercises.map((item) => {
      const itemKey = `${item.groupType}:${item.groupName}`.toLowerCase();

      if (item.groupType !== "Straight" && itemKey === groupKey) {
        return {
          ...item,
          groupType: "Straight" as const,
          groupName: "",
        };
      }

      return item;
    });

    setSelectedProgramExercises(relabelProgramExercises(updated));
  };

  const toggleBuilderSupersetLink = (index: number) => {
    if (isExerciseLinkedWithPrevious(index)) {
      unlinkExerciseGroup(index);
      return;
    }

    linkExerciseWithPrevious(index, "Superset");
  };

  const toggleBuilderCircuitLink = (index: number) => {
    if (isExerciseLinkedWithPrevious(index)) {
      unlinkExerciseGroup(index);
      return;
    }

    linkExerciseWithPrevious(index, "Circuit");
  };

  // Circuit rounds are simply each member's set count kept in sync — one round
  // = one set of every exercise in the circuit. The focus player already
  // cycles grouped exercises per set, so no separate rounds field is needed.
  const setCircuitGroupRounds = (index: number, roundsRaw: string) => {
    const exercise = selectedProgramExercises[index];
    if (!exercise || exercise.groupType !== "Circuit" || !exercise.groupName) {
      return;
    }
    const rounds = Math.max(1, Math.min(20, Number(roundsRaw) || 1));
    const groupKey = `${exercise.groupType}:${exercise.groupName}`.toLowerCase();

    setSelectedProgramExercises((current) =>
      current.map((item) => {
        const itemKey = `${item.groupType}:${item.groupName}`.toLowerCase();
        if (item.groupType !== "Circuit" || itemKey !== groupKey) return item;
        return withNormalizedSetFields({ ...item, sets: String(rounds) });
      })
    );
  };

  // Switch a circuit group between plain rounds and timed schemes. Timed
  // modes force one set row per member (the clock, not sets, drives volume).
  const setCircuitGroupMode = (
    index: number,
    mode: "" | "AMRAP" | "EMOM",
    minutes?: string
  ) => {
    const exercise = selectedProgramExercises[index];
    if (!exercise || exercise.groupType !== "Circuit" || !exercise.groupName) {
      return;
    }
    const groupKey = `${exercise.groupType}:${exercise.groupName}`.toLowerCase();
    setSelectedProgramExercises((current) =>
      current.map((item) => {
        const itemKey = `${item.groupType}:${item.groupName}`.toLowerCase();
        if (item.groupType !== "Circuit" || itemKey !== groupKey) return item;
        return withNormalizedSetFields({
          ...item,
          groupMode: mode,
          groupMinutes:
            minutes !== undefined
              ? minutes
              : mode
                ? item.groupMinutes || "12"
                : "",
          sets: mode ? "1" : item.sets,
        });
      })
    );
  };

  // First member of a circuit group (where the rounds control renders).
  const isCircuitGroupStart = (index: number) => {
    const exercise = selectedProgramExercises[index];
    if (!exercise || exercise.groupType !== "Circuit" || !exercise.groupName) {
      return false;
    }
    const previous = selectedProgramExercises[index - 1];
    return (
      !previous ||
      previous.groupType !== "Circuit" ||
      previous.groupName !== exercise.groupName
    );
  };

  const buildExerciseCoachingNotes = (exercise: ProgramExercise) => {
    const meta = [
      exercise.sectionName ? `Section: ${exercise.sectionName}` : "",
      exercise.exerciseLabel ? `Label: ${exercise.exerciseLabel}` : "",
      `Tracking: ${exercise.trackingType || "Weight"}`,
      exercise.trackingFields && exercise.trackingFields.length > 0
        ? `Fields: ${exercise.trackingFields.join(", ")}`
        : "",
      `Unilateral: ${exercise.isUnilateral ? "Yes" : "No"}`,
      exercise.groupType !== "Straight" && exercise.groupName
        ? `${exercise.groupType}: ${exercise.groupName}`
        : "",
      exercise.groupType === "Circuit" && exercise.groupMode
        ? `Circuit Mode: ${exercise.groupMode}`
        : "",
      exercise.groupType === "Circuit" &&
      exercise.groupMode &&
      exercise.groupMinutes
        ? `Circuit Minutes: ${exercise.groupMinutes}`
        : "",
      exercise.isAccessory ? "Accessory: Yes" : "",
      exercise.accessoryParentLabel
        ? `Accessory Parent: ${exercise.accessoryParentLabel}`
        : "",
      exercise.accessoryColor ? `Accessory Color: ${exercise.accessoryColor}` : "",
      `Set Prescriptions: ${JSON.stringify(
        normalizeExerciseSetPrescriptions(exercise)
      )}`,
      (exercise.alternateExercises || []).length > 0
        ? `Alternate Exercises: ${JSON.stringify(exercise.alternateExercises)}`
        : "",
    ].filter(Boolean);

    return [...meta, exercise.coachingNotes].filter(Boolean).join("\n\n");
  };

  const removeProgramExercise = (index: number) => {
    const updated = relabelProgramExercises(
      selectedProgramExercises.filter((_, itemIndex) => itemIndex !== index)
    );

    setSelectedProgramExercises(updated);
    setBuilderExerciseOptionsIndex(null);
    if (alternateEditorExerciseIndex === index) {
      setAlternateEditorExerciseIndex(null);
    }
  };

  const renderBuilderExerciseOptionsMenu = (
    exercise: ProgramExercise,
    index: number
  ) => (
    <div className="builderExerciseOptions">
      <button
        className={`builderExerciseOptionsButton${
          builderExerciseOptionsIndex === index ? " active" : ""
        }`}
        type="button"
        title="More options"
        aria-label={`More options for ${exercise.exerciseName}`}
        onClick={(event) => {
          event.stopPropagation();
          setBuilderExerciseOptionsIndex((current) =>
            current === index ? null : index
          );
        }}
      >
        <MoreVertical size={18} />
      </button>

      {builderExerciseOptionsIndex === index && (
        <div className="builderExerciseOptionsMenu">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              viewProgramExercise(exercise);
            }}
          >
            <Eye size={16} />
            View exercise
          </button>
          {exercise.trackingType === "Weight" && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setBuilderExerciseOptionsIndex(null);
                setCustomizeFieldsIndex(index);
              }}
            >
              <Settings size={16} />
              Customize fields
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openAlternateExerciseEditor(index);
            }}
          >
            <Shuffle size={16} />
            Add alternate exercise
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              duplicateProgramExercise(index);
            }}
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            className="dangerMenuItem"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeProgramExercise(index);
            }}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const buildCurrentProgramSession = (localId?: string): ProgramSession | null => {
    const singleWorkoutMode = builderMode === "Single Workout";
    const effectiveWeek = singleWorkoutMode ? "1" : programWeek;
    const effectiveDay = singleWorkoutMode ? "1" : programDay;
    const effectiveSessionName = singleWorkoutMode
      ? programName.trim() || sessionName.trim() || "Single Workout"
      : sessionName.trim();

    if (!effectiveWeek || !effectiveDay || !effectiveSessionName) {
      return null;
    }

    if (selectedProgramExercises.length === 0) {
      return null;
    }

    return {
      localId: localId || `${Date.now()}-${Math.random()}`,
      week: effectiveWeek,
      day: effectiveDay,
      sessionName: effectiveSessionName,
      sessionNameCn: sessionNameCn.trim() || undefined,
      sessionType,
      sessionGoal,
      estimatedDuration: sessionEstimatedDuration,
      intensity: sessionIntensity,
      isSingleWorkout: builderMode === "Single Workout",
      exercises: selectedProgramExercises.map((exercise, index) => ({
        ...withNormalizedSetFields(exercise),
        order: Number(exercise.order) || index + 1,
      })),
    };
  };

  const renumberProgramSessionsByWeek = (sessions: ProgramSession[]) => {
    const dayCounters: Record<string, number> = {};

    return sessions.map((session) => {
      const week = String(Number(session.week) || 1);
      const nextDay = (dayCounters[week] || 0) + 1;
      dayCounters[week] = nextDay;

      return {
        ...session,
        week,
        day: String(nextDay),
      };
    });
  };

  const clearCurrentProgramSession = (advanceDay = true) => {
    const nextDay = String((Number(programDay) || 1) + 1);
    const singleWorkoutMode = builderMode === "Single Workout";

    setSelectedProgramExercises([]);
    setEditingProgramSessionId("");
    setProgramDay(singleWorkoutMode ? "1" : advanceDay ? nextDay : "1");
    setSessionName(singleWorkoutMode ? sessionName : "");
    setSessionNameCn("");
    setSessionNotes("");
    setSessionGoal("");
    setSessionEstimatedDuration("");
    setSessionType("Strength");
    setSessionIntensity("Moderate");
    setAccessoryTargetIndex(null);
  };

  const saveCurrentSessionToProgram = (
    closeAfterSave = false,
    advanceAfterClose = true
  ) => {
    const singleWorkoutMode = builderMode === "Single Workout";

    if (singleWorkoutMode && !programName.trim()) {
      notify("Please fill Workout Name.");
      return;
    }

    if (!singleWorkoutMode && (!programWeek || !programDay || !sessionName)) {
      notify("Please fill Week, Day, and Session Name.");
      return;
    }

    if (selectedProgramExercises.length === 0) {
      notify("Please add at least one exercise to this session.");
      return;
    }

    const localId = editingProgramSessionId || `${Date.now()}-${Math.random()}`;
    const savedSession = buildCurrentProgramSession(localId);

    if (!savedSession) return;

    setProgramSessions((current) => {
      const hasExisting = current.some((session) => session.localId === localId);
      const nextSessions = hasExisting
        ? current.map((session) =>
            session.localId === localId ? savedSession : session
          )
        : [...current, savedSession];

      // Multi-day uses fixed Week × Day-1-7 slots, so keep the explicit day.
      // Single-workout still collapses to a clean sequence.
      return singleWorkoutMode
        ? renumberProgramSessionsByWeek(nextSessions)
        : nextSessions;
    });

    setEditingProgramSessionId(closeAfterSave ? "" : localId);

    if (closeAfterSave) {
      clearCurrentProgramSession(advanceAfterClose);
      // "Save Day" (no advance) returns to the calendar; "Save & Next" keeps
      // the drawer open for the next day.
      if (!advanceAfterClose && !singleWorkoutMode) {
        setSessionEditorOpen(false);
      }
    }

    notify(
      singleWorkoutMode
        ? "Workout saved."
        : closeAfterSave && advanceAfterClose
        ? "Day saved. Ready for the next day."
        : "Day saved."
    );

    window.setTimeout(() => setBuilderSaveStatus("saved"), 0);
  };

  const addCurrentSessionToProgram = () => {
    saveCurrentSessionToProgram(true, builderMode !== "Single Workout");
  };

  const reorderProgramSession = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setProgramSessions((current) => {
      const sourceIndex = current.findIndex(
        (session) => session.localId === sourceId
      );
      const targetIndex = current.findIndex(
        (session) => session.localId === targetId
      );

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const nextSessions = [...current];
      const [movedSession] = nextSessions.splice(sourceIndex, 1);
      nextSessions.splice(targetIndex, 0, movedSession);

      return renumberProgramSessionsByWeek(nextSessions);
    });
  };

  const removeProgramSession = (localId: string) => {
    setProgramSessions(programSessions.filter((session) => session.localId !== localId));

    if (editingProgramSessionId === localId) {
      clearCurrentProgramSession(false);
    }
  };

  const duplicateProgramSession = (session: ProgramSession) => {
    const newSession: ProgramSession = {
      ...session,
      localId: Date.now().toString(),
      week: String(Number(session.week) + 1),
    };
    setProgramSessions([...programSessions, newSession]);
  };

  // Calendar: move a day card to another cell (fixed week + Day 1-7 slot).
  const moveSessionToCell = (localId: string, week: number, day: number) => {
    setProgramSessions((current) =>
      current.map((session) =>
        session.localId === localId
          ? { ...session, week: String(week), day: String(day) }
          : session
      )
    );
  };

  // Bump a numeric load by a percent (leaves BW / % / blanks untouched).
  const progressLoad = (value: string, pct: number) => {
    if (!pct) return value;
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return value;
    return String(Math.round(n * (1 + pct / 100) * 100) / 100);
  };

  const progressExercise = (ex: ProgramExercise, pct: number): ProgramExercise => {
    if (!pct) return { ...ex };
    return {
      ...ex,
      load: progressLoad(ex.load, pct),
      setPrescriptions: ex.setPrescriptions?.map((sp) => ({
        ...sp,
        load: progressLoad(sp.load, pct),
      })),
    };
  };

  // Calendar: overwrite a target week with copies of a source week's sessions
  // (optionally progressing loads by a percent).
  const duplicateWeek = (fromWeek: number, toWeeks: number[], pct: number) => {
    setProgramSessions((current) => {
      const source = current.filter((s) => s.week === String(fromWeek));
      const targetSet = new Set(toWeeks.map(String));
      const kept = current.filter((s) => !targetSet.has(s.week));
      const copies: ProgramSession[] = [];
      toWeeks.forEach((toWeek) => {
        source.forEach((s) => {
          copies.push({
            ...s,
            localId: `${Date.now()}-${Math.random()}`,
            week: String(toWeek),
            exercises: s.exercises.map((ex) => progressExercise(ex, pct)),
          });
        });
      });
      return [...kept, ...copies];
    });
    setWeekDupMenu(null);
    setBuilderSaveStatus("dirty");
    notify(
      toWeeks.length > 1
        ? `Week ${fromWeek} copied to ${toWeeks.length} weeks${
            pct ? ` (+${pct}% load)` : ""
          }.`
        : `Week ${fromWeek} copied to Week ${toWeeks[0]}${
            pct ? ` (+${pct}% load)` : ""
          }.`
    );
  };

  // At-a-glance training volume for a week (days, total sets, total exercises).
  const weekVolume = (week: number) => {
    const sessions = programSessions.filter((s) => s.week === String(week));
    let sets = 0;
    let exercises = 0;
    sessions.forEach((s) =>
      s.exercises.forEach((ex) => {
        exercises += 1;
        sets += Number(ex.sets) || 0;
      })
    );
    return { days: sessions.length, sets, exercises };
  };

  // Rough session length from the prescription: ~40s work per strength set
  // plus its rest; timed sets use their mm:ss. Rounded to 5 minutes.
  const estimateSessionMinutes = (exercises: ProgramExercise[]) => {
    let seconds = 0;
    for (const ex of exercises) {
      const sets = Math.max(1, Number(ex.sets) || 1);
      const restMatch = String(ex.rest || "").match(/(\d+)/);
      const restRaw = restMatch ? Number(restMatch[1]) : 60;
      const restSec = /min/i.test(String(ex.rest || "")) ? restRaw * 60 : restRaw;
      if (ex.trackingType === "Time") {
        const t = String(ex.reps || "").match(/(\d+):(\d+)/);
        const workSec = t ? Number(t[1]) * 60 + Number(t[2]) : 600;
        seconds += sets * (workSec + restSec);
      } else {
        seconds += sets * (40 + restSec);
      }
    }
    return Math.max(5, Math.round(seconds / 60 / 5) * 5);
  };

  // Desktop: drop a saved session's exercises into the session being built.
  const insertSavedSessionExercises = (session: ProgramSession) => {
    setSelectedProgramExercises(session.exercises.map((ex) => ({ ...ex })));
    setSessionName((prev) => prev || session.sessionName);
    setSessionType(session.sessionType || "Strength");
    setSessionIntensity(session.intensity || "Moderate");
    notify(`Loaded "${session.sessionName}" into this session.`);
  };

  // Bulk prescription editing: tick exercises, apply sets/reps/rest at once.
  const applyBulkPrescription = () => {
    if (bulkSelectedIdx.size === 0) return;
    setSelectedProgramExercises((current) =>
      current.map((ex, i) => {
        if (!bulkSelectedIdx.has(i)) return ex;
        return withNormalizedSetFields({
          ...ex,
          sets: bulkSets.trim() || ex.sets,
          reps: bulkReps.trim() || ex.reps,
          rest: bulkRest.trim() || ex.rest,
        });
      })
    );
    notify(`Updated ${bulkSelectedIdx.size} exercise(s).`, "success");
    setBulkSelectedIdx(new Set());
    setBulkEditMode(false);
  };

  // Calendar: start building a brand-new session in a specific week/day cell.
  const startSessionForCell = (week: number, day: number) => {
    setSelectedProgramExercises([]);
    setEditingProgramSessionId("");
    setSessionName("");
    setSessionNameCn("");
    setSessionNotes("");
    setSessionGoal("");
    setSessionEstimatedDuration("");
    setSessionType("Strength");
    setSessionIntensity("Moderate");
    setAccessoryTargetIndex(null);
    setProgramWeek(String(week));
    setProgramDay(String(day));
    setBuilderMode("Program");
    setSessionEditorOpen(true);
    setBuilderLibraryMode("Exercises");
    if (libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
  };

  const loadSessionForEditing = (session: ProgramSession) => {
    setProgramWeek(session.week);
    setProgramDay(session.day);
    setSessionName(session.sessionName);
    setSessionNameCn(session.sessionNameCn || "");
    setSessionNotes((session as any).sessionNotes || "");
    setSessionType(session.sessionType || "Strength");
    setSessionGoal(session.sessionGoal || "");
    setSessionEstimatedDuration(session.estimatedDuration || "");
    setSessionIntensity(session.intensity || "Moderate");
    setBuilderMode(session.isSingleWorkout ? "Single Workout" : "Program");
    setSelectedProgramExercises(session.exercises);
    setExpandedBuilderExerciseIndexes(new Set());
    setEditingProgramSessionId(session.localId);
    if (!session.isSingleWorkout) setSessionEditorOpen(true);
    else setIsBuilderLibraryOpen(true);
    setBuilderLibraryMode("Exercises");
    if (libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
  };

  const saveFullProgram = async () => {
    const singleWorkoutMode = builderMode === "Single Workout";
    const digitalProductProgram =
      !singleWorkoutMode &&
      (programProductType === "Digital Program" ||
        programProductType === "Digital Add-on" ||
        programProductType === "Digital Bundle");
    // "Built for" client/team only applies to coached (Online / In-Person) programs.
    const coachedProgramType =
      programProductType === "Online Coaching" ||
      programProductType === "In-Person Training";
    // Add-ons and bundles are inherently store products — always store-visible.
    const inherentStoreProduct =
      programProductType === "Digital Add-on" ||
      programProductType === "Digital Bundle";
    const effectiveStoreVisible =
      programPublicStoreVisible || inherentStoreProduct;

    if (!programName.trim()) {
      notify(singleWorkoutMode ? "Please fill Workout Name." : "Please fill Program Name.");
      return;
    }

    if (programSessions.length === 0 && selectedProgramExercises.length === 0) {
      notify("Please add at least one session.");
      return;
    }

    let sessionsToSave = [...programSessions];

    if (selectedProgramExercises.length > 0) {
      if (!singleWorkoutMode && (!programWeek || !programDay || !sessionName)) {
        notify("Current session has exercises but is missing Week, Day, or Session Name.");
        return;
      }

      const currentSession = buildCurrentProgramSession(
        editingProgramSessionId || `${Date.now()}-${Math.random()}`
      );

      if (!currentSession) {
        notify("Current session could not be saved.");
        return;
      }

      sessionsToSave = sessionsToSave.some(
        (session) => session.localId === currentSession.localId
      )
        ? sessionsToSave.map((session) =>
            session.localId === currentSession.localId ? currentSession : session
          )
        : [...sessionsToSave, currentSession];
    }

    sessionsToSave = renumberProgramSessionsByWeek(sessionsToSave);

    setSavingTemplate(true);

    const inPlaceEdit = Boolean(editProgramRecordId) && !singleWorkoutMode;

    try {
      const programPayload = {
        programName,
        goal: singleWorkoutMode ? "Single Workout" : programGoal,
        sport: programSport,
        level: programLevel,
        durationWeeks: singleWorkoutMode ? 1 : Number(programDurationWeeks),
        phase: singleWorkoutMode ? "Single Day" : programPhase,
        sessionsPerWeek: singleWorkoutMode ? 1 : Number(programSessionsPerWeek),
        coach: programCoach,
        status: "Active",
        productType: singleWorkoutMode ? "Single Workout" : programProductType,
        price: digitalProductProgram ? programPrice : "",
        currency: digitalProductProgram ? programCurrency : "",
        publicStoreVisible: digitalProductProgram ? effectiveStoreVisible : false,
        purchaseLink: digitalProductProgram ? programPurchaseLink : "",
        defaultIntakeFormId: digitalProductProgram ? programDefaultIntakeFormId : "",
        accessLengthDays: digitalProductProgram ? programAccessLengthDays : "",
        productStatus: digitalProductProgram ? programProductStatus : "Draft",
        salesDescription: digitalProductProgram ? programSalesDescription : "",
        builtForClient:
          coachedProgramType || singleWorkoutMode ? programBuiltForClient : "",
        builtForTeam:
          coachedProgramType || singleWorkoutMode ? programBuiltForTeam : "",
        storeCategory: effectiveStoreVisible ? programStoreCategory : "",
        storeCategoryCn: effectiveStoreVisible ? programStoreCategoryCn : "",
        // Listing type is derived from the product type.
        storeListingType: !effectiveStoreVisible
          ? ""
          : programProductType === "Digital Add-on"
          ? "Add-on"
          : programProductType === "Digital Bundle"
          ? "Bundle"
          : "Main",
        bundleProgramIds:
          programProductType === "Digital Bundle"
            ? programBundleIds.join(",")
            : "",
      };

      let programData: any;
      let oldTemplateRecordIds: string[] = [];

      if (inPlaceEdit) {
        // Capture the existing session/template records so they can be
        // removed after the new ones are written (no data loss on failure).
        try {
          const tRes = await fetch(
            `/api/programTemplates?programId=${encodeURIComponent(
              editProgramId
            )}&programRecordId=${encodeURIComponent(editProgramRecordId)}`
          );
          const tData = await tRes.json();
          if (tRes.ok) {
            oldTemplateRecordIds = (tData.templates || [])
              .map((t: any) => t.recordId)
              .filter(Boolean);
          }
        } catch (templateError) {
          console.warn("Could not list existing templates", templateError);
        }

        const updRes = await fetch("/api/updateProgram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programRecordId: editProgramRecordId,
            ...programPayload,
          }),
        });
        const updData = await updRes.json();
        if (!updRes.ok || !updData.success) {
          console.error(updData);
          notify("Could not update program. Check API response.");
          return;
        }
        programData = {
          success: true,
          programId: editProgramId,
          programRecordId: editProgramRecordId,
        };
      } else {
        const programResponse = await fetch("/api/createProgram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(programPayload),
        });
        programData = await programResponse.json();
        if (!programResponse.ok || !programData.success) {
          console.error(programData);
          notify("Could not create program. Check API response.");
          return;
        }
      }

      let totalRecordsCreated = 0;

      // Save sessions in parallel (bounded) instead of one-at-a-time.
      const saveResults = await mapWithConcurrency(
        sessionsToSave,
        6,
        async (session) => {
          const templateResponse = await fetch("/api/createWorkoutTemplate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              programId: programData.programId,
              programRecordId: programData.programRecordId,
              week: Number(session.week),
              day: Number(session.day),
              sessionName: session.sessionName,
              sessionNameCn: session.sessionNameCn || "",
              sessionType: session.sessionType,
              sessionGoal: session.sessionGoal,
              estimatedDuration: session.estimatedDuration,
              intensity: session.intensity,
              isSingleWorkout: session.isSingleWorkout,
              exercises: session.exercises.map((exercise, index) => ({
                ...exercise,
                order: Number(exercise.order) || index + 1,
                sets: Number(exercise.sets) || 1,
                coachingNotes: buildExerciseCoachingNotes(exercise),
                status: "Active",
              })),
            }),
          });
          const templateData = await templateResponse.json();
          return {
            ok: templateResponse.ok && templateData.success,
            session,
            templateData,
            recordsCreated: Number(templateData.recordsCreated || 0),
          };
        }
      );

      const failed = saveResults.find((r) => !r.ok);
      if (failed) {
        console.error(failed.templateData);
        notify(
          `Program was saved, but session "${failed.session.sessionName}" failed. Check API response.`
        );
        return;
      }
      totalRecordsCreated = saveResults.reduce(
        (sum, r) => sum + r.recordsCreated,
        0
      );

      // In-place edit: the new sessions are written, so remove the old ones.
      if (inPlaceEdit && oldTemplateRecordIds.length > 0) {
        await mapWithConcurrency(oldTemplateRecordIds, 8, (recordId) =>
          fetch("/api/deleteRecord", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resource: "workoutTemplate",
              recordId,
            }),
          }).then(() => undefined)
        );
      }

      notify(
        inPlaceEdit
          ? `Program updated. ${sessionsToSave.length} session${
              sessionsToSave.length === 1 ? "" : "s"
            } saved.`
          : `Program saved. Sessions: ${sessionsToSave.length}. Template records created: ${totalRecordsCreated}`
      );

      setEditProgramId("");
      setEditProgramRecordId("");
      setProgramSessions([]);
      setSelectedProgramExercises([]);
      setProgramName("");
      setProgramGoal("");
      setProgramSport("");
      setProgramLevel("");
      setProgramDurationWeeks("4");
      setProgramPhase("");
      setProgramSessionsPerWeek("3");
      setProgramProductType("Digital Program");
      setProgramPrice("");
      setProgramCurrency("CNY");
      setProgramPublicStoreVisible(false);
      setProgramPurchaseLink("");
      setProgramDefaultIntakeFormId("");
      setProgramAccessLengthDays("42");
      setProgramProductStatus("Draft");
      setProgramSalesDescription("");
      setSessionName("");
      setProgramWeek("1");
      setProgramDay("1");
      window.setTimeout(() => setBuilderSaveStatus("saved"), 0);
      void loadPrograms(true);
    } catch (error) {
      console.error(error);
      notify("Could not save full program.");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Distinct categories present in the library, for the filter dropdown.
  const libraryCategoryOptions = Array.from(
    new Set(
      libraryExercises
        .filter((e) => !String(e.notes || "").startsWith("[Archived]"))
        .map((e) => String(e.category || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredLibraryExercises = libraryExercises.filter((exercise) => {
    if (String(exercise.notes || "").startsWith("[Archived]")) {
      return false;
    }

    if (
      libraryCategoryFilter !== "All" &&
      String(exercise.category || "").trim() !== libraryCategoryFilter
    ) {
      return false;
    }

    const search = librarySearch.toLowerCase();

    return (
      exercise.exerciseName?.toLowerCase().includes(search) ||
      exercise.exerciseId?.toLowerCase().includes(search) ||
      exercise.category?.toLowerCase().includes(search) ||
      exercise.equipment?.toLowerCase().includes(search) ||
      exercise.movementPattern?.toLowerCase().includes(search)
    );
  });

  // Group the filtered exercises by category so the main library page shows all
  // squats together, hinges together, etc. Uncategorized exercises sort last.
  const groupedLibraryExercises = (() => {
    const groups = new Map<string, LibraryExercise[]>();
    filteredLibraryExercises.forEach((exercise) => {
      const category = String(exercise.category || "").trim() || "Uncategorized";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(exercise);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  })();

  const cardioSectionActive = isCardioSectionName(pendingSectionName);
  const builderExercises = libraryExercises.filter((exercise) => {
    const search = builderSearch.toLowerCase();
    const matchesSearch =
      exercise.exerciseName?.toLowerCase().includes(search) ||
      exercise.exerciseId?.toLowerCase().includes(search) ||
      exercise.category?.toLowerCase().includes(search) ||
      exercise.equipment?.toLowerCase().includes(search) ||
      exercise.movementPattern?.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    if (
      builderEquipFilter &&
      !String(exercise.equipment || "")
        .toLowerCase()
        .includes(builderEquipFilter.toLowerCase())
    ) {
      return false;
    }

    // Cardio/conditioning sections show cardio + conditioning exercises. Other
    // sections hide pure cardio but keep conditioning available (burpees or
    // wall balls as a strength-session finisher is normal programming).
    return cardioSectionActive
      ? isCardioCategory(exercise.category) ||
          isConditioningCategory(exercise.category)
      : !isCardioCategory(exercise.category);
  });

  // ---- Mobile builder helpers (only used by the mobile render branch) ----
  const openMobilePicker = () => {
    setAccessoryTargetIndex(null);
    if (libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
    setMobilePickerSelected(new Set());
    setMobileBuilderStep("picker");
  };

  const toggleMobilePick = (key: string) => {
    setMobilePickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const commitMobilePicker = () => {
    const chosen = builderExercises.filter((exercise) =>
      mobilePickerSelected.has(exercise.recordId || exercise.exerciseId)
    );
    addExercisesToProgram(chosen);
    setMobilePickerSelected(new Set());
    setMobileBuilderStep("editor");
  };

  // Drag operates on arrange *items* (a single exercise OR a whole superset
  // group), so linked exercises move together and stay linked.
  const startMobileDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    itemIndex: number
  ) => {
    event.preventDefault();
    mobileDragIndexRef.current = itemIndex;
    mobileDragOverIndexRef.current = itemIndex;
    setMobileDragIndex(itemIndex);
    setMobileDragOverIndex(itemIndex);

    const onMove = (moveEvent: PointerEvent) => {
      const y = moveEvent.clientY;
      const rows = mobileArrangeRefs.current.filter(Boolean) as HTMLDivElement[];
      let over = mobileDragIndexRef.current ?? itemIndex;
      let matched = false;
      mobileArrangeRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          over = i;
          matched = true;
        }
      });
      // Clamp to the ends when dragged past the first/last row.
      if (!matched && rows.length > 0) {
        const firstRect = rows[0].getBoundingClientRect();
        const lastRect = rows[rows.length - 1].getBoundingClientRect();
        if (y < firstRect.top) over = 0;
        else if (y > lastRect.bottom) {
          over = mobileArrangeRefs.current.length - 1;
        }
      }
      mobileDragOverIndexRef.current = over;
      setMobileDragOverIndex(over);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const fromItem = mobileDragIndexRef.current;
      const toItem = mobileDragOverIndexRef.current;
      const items = mobileArrangeItemsRef.current;
      if (
        fromItem !== null &&
        toItem !== null &&
        fromItem !== toItem &&
        items[fromItem] &&
        items[toItem]
      ) {
        // Map item rows back to their first exercise index; reorder is
        // group-aware and moves the entire group.
        reorderProgramExercise(items[fromItem].start, items[toItem].start);
      }
      mobileDragIndexRef.current = null;
      mobileDragOverIndexRef.current = null;
      setMobileDragIndex(null);
      setMobileDragOverIndex(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const saveMobileWorkout = async () => {
    await saveFullProgram();
    setMobileBuilderStep("details");
  };

  const saveMobileProgramDay = () => {
    saveCurrentSessionToProgram(true, true);
    setMobileBuilderStep("overview");
  };

  // Mobile: start a fresh day in a given week (next open Day slot), then go to
  // the details screen to name it.
  const addMobileDayToWeek = (week: number) => {
    const daysInWeek = programSessions
      .filter((s) => s.week === String(week))
      .map((s) => Number(s.day));
    const nextDay = (daysInWeek.length ? Math.max(...daysInWeek) : 0) + 1;
    setSelectedProgramExercises([]);
    setEditingProgramSessionId("");
    setSessionName("");
    setSessionNameCn("");
    setSessionGoal("");
    setSessionType("Strength");
    setSessionIntensity("Moderate");
    setProgramWeek(String(week));
    setProgramDay(String(nextDay));
    setMobileBuilderStep("details");
  };

  // Mobile: open the saved-session library picker for the current day.
  const openMobileLibPick = () => {
    if (programs.length === 0) void loadPrograms();
    setMobileBuilderStep("libpick");
  };

  // Mobile: fill the day being edited with a saved session's exercises.
  const insertLibSessionIntoCurrentDay = (session: ProgramSession) => {
    setSelectedProgramExercises(session.exercises.map((ex) => ({ ...ex })));
    setSessionName((prev) => prev || session.sessionName);
    setSessionType(session.sessionType || "Strength");
    setSessionIntensity(session.intensity || "Moderate");
    setMobileBuilderStep("editor");
    notify(`Loaded "${session.sessionName}" into this day.`);
  };

  const finishMobileProgram = async () => {
    await saveFullProgram();
    setMobileBuilderStep("details");
  };

  const focusReviewColumn = (columnId: string) => {
    const el = document.getElementById(columnId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setReviewFlashColumn(columnId);
    window.setTimeout(
      () => setReviewFlashColumn((current) => (current === columnId ? null : current)),
      1200
    );
  };

  const openMobileAlternate = (index: number) => {
    if (libraryExercises.length === 0 && !libraryLoading) {
      void loadExerciseLibrary();
    }
    setAlternateSearch("");
    setMobileMenuIndex(null);
    setMobileAlternateIndex(index);
  };

  // Top nav for the programming area: Programs | Sessions | Tests | Forms.
  // The multi-day builder ("Program Builder") is reached from Programs, not a
  // tab. Assignments now happens from the Programs table, so it's off the bar.
  // Tests moved to its own nav tab (CoachTestsPage); the "Tests" value stays
  // in WorkoutPageTab because the Physical Test Builder still renders under it.
  const workoutTabList: { value: WorkoutPageTab; label: string }[] = [
    { value: "Saved Programs", label: "Programs" },
    { value: "Sessions", label: "Sessions" },
    { value: "Forms", label: "Forms" },
  ];

  // The builder is entered from Programs (calendar) or Sessions (single
  // workout), so highlight the tab it came from while building.
  const activeWorkoutTabValue: WorkoutPageTab =
    workoutPageTab === "Program Builder"
      ? builderMode === "Single Workout"
        ? "Sessions"
        : "Saved Programs"
      : workoutPageTab;

  // Unsaved work = builder open with content not yet persisted (a successful
  // "Save Full Program" clears these). Used to guard against losing a build.
  const hasUnsavedBuilderWork = () =>
    workoutPageTab === "Program Builder" &&
    (selectedProgramExercises.length > 0 || programSessions.length > 0);

  // Clear the builder back to a blank state (used after a discard, so a
  // re-opened builder doesn't show the abandoned program).
  const resetBuilder = () => {
    setProgramSessions([]);
    setSelectedProgramExercises([]);
    setProgramName("");
    setProgramGoal("");
    setProgramPhase("");
    setProgramDurationWeeks("4");
    setProgramSessionsPerWeek("3");
    setProgramProductType("Digital Program");
    setProgramBuiltForMode("internal");
    setProgramBuiltForClient("");
    setProgramBuiltForTeam("");
    // Commerce/store fields must not leak from a previously loaded product
    // into a fresh program (it could publish with the old price/copy).
    setProgramPrice("");
    setProgramCurrency("CNY");
    setProgramPublicStoreVisible(false);
    setProgramPurchaseLink("");
    setProgramDefaultIntakeFormId("");
    setProgramAccessLengthDays("42");
    setProgramProductStatus("Draft");
    setProgramSalesDescription("");
    setProgramStoreCategory("");
    setProgramStoreCategoryCn("");
    setProgramBundleIds([]);
    setEditProgramId("");
    setEditProgramRecordId("");
    setEditingProgramSessionId("");
    setSessionName("");
    setSessionEditorOpen(false);
    setBuilderSubTab("build");
    setProgramDetailsOpen(true);
    setBuilderSaveStatus("saved");
    setCopiedSession(null);
  };

  const confirmLeaveBuilder = () => {
    if (!hasUnsavedBuilderWork()) return true;
    if (
      window.confirm(
        "You have unsaved changes in the builder. Leave without saving? Use “Save Full Program” first to keep them."
      )
    ) {
      resetBuilder();
      return true;
    }
    return false;
  };

  const selectWorkoutTab = (tab: WorkoutPageTab) => {
    if (tab !== workoutPageTab && !confirmLeaveBuilder()) return;
    setWorkoutPageTab(tab);
    if (tab === "Saved Programs" || tab === "Sessions") loadPrograms(true);
    if (tab === "Forms") {
      loadFormTemplates(true);
      setFormView("list");
    }
    if (tab === "Tests") {
      loadTestTemplates(true);
      setTestView("list");
    }
    if (tab === "Assignments") {
      loadPrograms();
      loadFormTemplates();
      loadTestTemplates();
      setAssignmentTemplateId("");
    }
  };

  // Compact Everfit-style set table for the mobile card. The full editor
  // (%1RM, tempo, cardio zones) lives behind the card's ⋯ "Details" sheet,
  // which reuses renderSetPrescriptionTable.
  const renderMobileSetTable = (
    exercise: ProgramExercise,
    exerciseIndex: number
  ) => {
    const sets = normalizeExerciseSetPrescriptions(exercise);
    const isRunning =
      exercise.trackingType === "Time" ||
      exercise.trackingType === "Distance" ||
      exercise.trackingType === "Pace";
    const isTime = exercise.trackingType === "Time";
    return (
      <div className="mbSetTable">
        <div className="mbSetHead">
          <span>Set</span>
          <span>{isRunning ? (isTime ? "Time" : "Dist") : "Kg"}</span>
          <span>{isRunning ? "Zone" : "Reps"}</span>
          <span>Rest</span>
          <span />
        </div>
        {sets.map((set, setIndex) => (
          <div className="mbSetRow" key={setIndex}>
            <span className="mbSetNum">{set.setNumber}</span>
            <input
              className="mbSetInput"
              value={isRunning ? set.reps : set.load}
              placeholder="–"
              onChange={(e) =>
                updateExerciseSetPrescription(
                  exerciseIndex,
                  setIndex,
                  isRunning ? "reps" : "load",
                  e.target.value
                )
              }
            />
            <input
              className="mbSetInput"
              value={isRunning ? set.percentMas : set.reps}
              placeholder="–"
              inputMode={isRunning ? "decimal" : "numeric"}
              onChange={(e) =>
                updateExerciseSetPrescription(
                  exerciseIndex,
                  setIndex,
                  isRunning ? "percentMas" : "reps",
                  e.target.value
                )
              }
            />
            <input
              className="mbSetInput"
              value={set.rest}
              placeholder="0:00"
              onChange={(e) =>
                updateExerciseSetPrescription(
                  exerciseIndex,
                  setIndex,
                  "rest",
                  e.target.value
                )
              }
            />
            {sets.length > 1 ? (
              <button
                className="mbSetDel"
                aria-label={`Remove set ${set.setNumber}`}
                onClick={() => removeExerciseSet(exerciseIndex, setIndex)}
              >
                <X size={14} />
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!builderSaveStatusReadyRef.current) {
      builderSaveStatusReadyRef.current = true;
      return;
    }

    setBuilderSaveStatus("dirty");
  }, [
    builderMode,
    programName,
    programGoal,
    programDurationWeeks,
    programPhase,
    programSessionsPerWeek,
    programProductType,
    programPrice,
    programCurrency,
    programPublicStoreVisible,
    programPurchaseLink,
    programDefaultIntakeFormId,
    programAccessLengthDays,
    programProductStatus,
    programSalesDescription,
    programWeek,
    programDay,
    sessionName,
    sessionNameCn,
    sessionNotes,
    sessionType,
    sessionGoal,
    sessionEstimatedDuration,
    sessionIntensity,
    pendingSectionName,
    selectedProgramExercises,
    programSessions,
  ]);

  // Unambiguous-alphabet payment note code (no 0/O/1/I) — buyer writes it in
  // the WeChat transfer note; coach one-tap verifies the order against it.
  const makePaymentCode = () => {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `NL-${code}`;
  };

  const registerForProgram = async (
    program: Program,
    addonList: Program[] = [],
    bundleMembers: Program[] = []
  ) => {
    if (!storeRegName.trim() || !storeRegPhone.trim()) {
      notify(
        storeLang === "zh"
          ? "请输入姓名和微信号。"
          : "Please enter your name and WeChat ID.",
        "error"
      );
      return;
    }
    setStoreRegistering(true);
    // Staged progress mirroring the real server steps (client → order →
    // intake) so the several-second activation reads as motion, not a hang.
    setStoreRegStage(1);
    const stageTimers = [
      window.setTimeout(() => setStoreRegStage(2), 2800),
      window.setTimeout(() => setStoreRegStage(3), 5600),
    ];
    try {
      const res = await fetch("/api/activateDigitalOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: storeRegName.trim(),
          phone: storeRegPhone.trim(),
          programId: program.programId,
          programRecordId: program.recordId,
          programName: program.programName,
          amount: Number(program.price) || undefined,
          currency: program.currency || "CNY",
          defaultIntakeFormId: program.defaultIntakeFormId || "",
          paymentCode: storePaymentCode,
          languagePreference: storeLang === "zh" ? "Chinese" : "English",
          addons: addonList.map((addon) => ({
            programId: addon.programId,
            programRecordId: addon.recordId,
            programName: addon.programName,
            amount: Number(addon.price) || undefined,
          })),
          // Bundle members are fulfilled (an order each so the client actually
          // owns every included program) but carry no amount — the bundle's own
          // price is the single charge, so members must not double-bill.
          bundleItems: bundleMembers.map((member) => ({
            programId: member.programId,
            programRecordId: member.recordId,
            programName: member.programName,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Registration failed");
      setStoreRegisteredCode(data.clientCode);
      setStoreRegisteredOrderId(data.orderId || "");
      // This code is now attached to a submitted order — never reuse it.
      setStorePaymentCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      notify(msg, "error");
    } finally {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      setStoreRegStage(0);
      setStoreRegistering(false);
    }
  };

  const findMyPortal = async () => {
    // The store modal is localized by storeLang, not the portal i18n instance.
    const zh = storeLang === "zh";
    if (!findPortalName.trim() || !findPortalPhone.trim()) {
      setFindPortalError(
        zh ? "请输入姓名和微信号/手机号。" : "Please enter your name and WeChat/phone."
      );
      return;
    }
    setFindPortalBusy(true);
    setFindPortalError("");
    try {
      const res = await fetch("/api/findMyPortal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: findPortalName.trim(),
          phone: findPortalPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientCode) {
        setFindPortalError(
          zh
            ? "未找到匹配的客户端，请核对信息或联系教练。"
            : "No portal found — check your details or contact your coach."
        );
        return;
      }
      window.location.href = `/?portal=client&client=${encodeURIComponent(data.clientCode)}`;
    } catch {
      setFindPortalError(zh ? "查询失败，请稍后再试。" : "Lookup failed — try again.");
    } finally {
      setFindPortalBusy(false);
    }
  };

  const addFormQuestion = () => {
    setFormQuestions((current) => [
      ...current,
      {
        id: `Q${current.length + 1}`,
        label: "",
        questionType: "Text",
        required: false,
      },
    ]);
  };

  const updateFormQuestion = (
    index: number,
    field: keyof (typeof formQuestions)[number],
    value: string | boolean
  ) => {
    setFormQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question
      )
    );
  };

  const removeFormQuestion = (index: number) => {
    setFormQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
    );
  };

  const addTestItem = () => {
    setTestItems((current) => [
      ...current,
      {
        id: `T${current.length + 1}`,
        testName: "",
        metricType: "Weight",
        unit: "kg",
        createsMetric: false,
        metricName: "",
        metricUnit: "",
        calculationMethod: "Direct Value",
        inputUnit: "",
      },
    ]);
  };

  const updateTestItem = (
    index: number,
    field: keyof (typeof testItems)[number],
    value: string | boolean
  ) => {
    setTestItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeTestItem = (index: number) => {
    setTestItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const getCheckInAgeDays = (client: Client) => {
    if (!client.activity || client.activity === "--") return null;

    const checkInDate = new Date(`${normalizeDate(client.activity)}T00:00:00`);

    if (Number.isNaN(checkInDate.getTime())) return null;

    const today = new Date(`${dateToInputValue(new Date())}T00:00:00`);
    return Math.max(
      0,
      Math.floor((today.getTime() - checkInDate.getTime()) / 86400000)
    );
  };

  const clientNeedsCheckIn = (client: Client) => {
    const ageDays = getCheckInAgeDays(client);
    return ageDays === null || ageDays >= 7;
  };

  const clientBelongsToCoachScope = (client: Client) => {
    if (coachScope === "All Coaches") return true;

    const scopedCoach = activeCoaches.find((coach) => coach.name === coachScope);
    const coachValues = [
      client.coach,
      client.primaryCoach,
      client.secondaryCoach,
    ]
      .filter(Boolean)
      .map((value) => getCoachDisplayName(String(value)).toLowerCase());

    return coachValues.some(
      (value) =>
        value === coachScope.toLowerCase() ||
        value === scopedCoach?.recordId.toLowerCase() ||
        value === scopedCoach?.coachId.toLowerCase()
    );
  };

  const coachVisibleClients = clients.filter(clientBelongsToCoachScope);

  // Resolve a client id / client code / record id to a readable name; never
  // surface a raw Feishu record id (recXXXX) in the UI.
  const clientLabel = (value?: string) => {
    const v = String(value || "").trim();
    if (!v) return "Client";
    const match = clients.find(
      (client) =>
        client.id === v || client.clientCode === v || client.name === v
    );
    if (match) return match.name || match.clientCode || "Client";
    // Guard against unresolved Feishu link/record blobs leaking into the UI
    // (e.g. {"record_ids":null,"table_id":"tbl...","type":"text"} or a raw recXX: id).
    if (
      /^rec[A-Za-z0-9]{6,}$/.test(v) ||
      v.startsWith("{") ||
      v.includes("record_ids") ||
      v.includes("table_id")
    ) {
      return "Client";
    }
    return v;
  };

  const checkInStats = {
    due: coachVisibleClients.filter(clientNeedsCheckIn).length,
    recent: coachVisibleClients.filter((client) => {
      const ageDays = getCheckInAgeDays(client);
      return ageDays !== null && ageDays < 7;
    }).length,
    missing: coachVisibleClients.filter((client) => getCheckInAgeDays(client) === null).length,
  };

  // Navigate to a top-level page and trigger any data the page needs. Shared by
  // the grouped sidebar menu and any other in-app navigation.
  const goToPage = (page: Page) => {
    if (page !== activePage && activePage === "Workouts" && !confirmLeaveBuilder())
      return;
    setSelectedClient(null);
    setSelectedWorkout(null);
    setWorkoutDetails([]);
    setSetLogs([]);
    setSavedExerciseDraftIds([]);
    setActivePage(page);

    if (page === "Library" || page === "Workouts") {
      loadExerciseLibrary();
    }
    if (page === "Workouts") {
      loadPrograms();
    }
    if (page === "Teams") {
      void loadTeams();
      loadPrograms();
    }
    if (page === "Revenue") {
      void loadSubscriptions();
      loadProductOrders(true);
    }
    if (page === "Orders") {
      loadProductOrders(true);
      loadPrograms();
      loadFormTemplates();
    }
    if (page === "Review") {
      void loadCoachReviewQueue(true);
      loadPrograms();
      loadFormTemplates();
    }
  };

  const newEnquiries = coachReviewEnquiries.filter(
    (e) => (e.status || "New").toLowerCase() === "new"
  );
  const reviewQueueCount =
    coachReviewComments.filter((comment) => !comment.reviewed).length +
    coachReviewResponses.length +
    coachReviewCheckIns.length +
    newEnquiries.length +
    productOrders.length;

  type NavLeaf = {
    name: Page;
    label: string;
    mobileLabel?: string;
    count: number;
    icon: LucideIcon;
    attention?: boolean;
  };
  type NavGroup = {
    key: string;
    label: string;
    icon: LucideIcon;
    items: NavLeaf[];
  };

  // Single-item entries render as direct nav buttons; multi-item entries get a
  // hover/tap flyout. This keeps the rail short without over-nesting.
  const navGroups: NavGroup[] = [
    {
      key: "clients",
      label: "Clients",
      icon: Users,
      items: [
        {
          name: "Clients",
          label: "Clients",
          count: coachVisibleClients.length,
          icon: Users,
        },
      ],
    },
    {
      key: "teams",
      label: "Teams",
      icon: Shield,
      items: [
        {
          name: "Teams",
          label: "Teams",
          count: teams.length,
          icon: Shield,
        },
      ],
    },
    {
      key: "library",
      label: "Library",
      icon: BookOpen,
      items: [
        {
          name: "Library",
          label: "Library",
          count: libraryExercises.length,
          icon: BookOpen,
        },
        {
          name: "Workouts",
          label: "Programming",
          mobileLabel: "Build",
          count: workouts.length,
          icon: Dumbbell,
        },
        {
          name: "Tests",
          label: "Tests",
          mobileLabel: "Tests",
          count: savedTestTemplates.length,
          icon: ClipboardList,
        },
      ],
    },
    {
      key: "review",
      label: "Review",
      icon: Bell,
      items: [
        {
          name: "Review",
          label: "Review",
          count: reviewQueueCount,
          icon: Bell,
          attention: true,
        },
      ],
    },
    {
      key: "admin",
      label: "Admin",
      icon: canManageCoaches ? UserCog : ClipboardList,
      items: [
        ...(canManageCoaches
          ? [
              {
                name: "Coaches" as Page,
                label: "Coaches",
                count: allCoaches.length,
                icon: UserCog,
              },
            ]
          : []),
        {
          name: "Orders",
          label: "Orders",
          count: productOrders.length,
          icon: ClipboardList,
          attention: true,
        },
        {
          name: "Revenue",
          label: "Revenue",
          count: 0,
          icon: TrendingUp,
        },
      ],
    },
  ];

  useEffect(() => {
    if (activePage === "Coaches" && !canManageCoaches) {
      setActivePage("Clients");
    }
  }, [activePage, canManageCoaches]);

  // Close any open nav menu when tapping/clicking outside the sidebar nav.
  useEffect(() => {
    if (!openNavGroup) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest(".navGroup")) {
        setOpenNavGroup(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openNavGroup]);

  useEffect(() => {
    if (!coachMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest(".coachBoxWrap")) {
        setCoachMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [coachMenuOpen]);

  // Stamp the athlete's last login once when their portal loads.
  const loginStampedRef = useRef("");
  useEffect(() => {
    if (!isClientPortal || !selectedClient) return;
    const key = selectedClient.clientCode || selectedClient.id;
    if (!key || loginStampedRef.current === key) return;
    loginStampedRef.current = key;
    void fetch("/api/recordLogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRecordId: selectedClient.id,
        clientCode: selectedClient.clientCode,
      }),
    }).catch(() => {});
  }, [isClientPortal, selectedClient]);

  // Load the athlete's workload self-report logs (portal + coach viewing a client).
  const loadWorkloadLogs = async (clientCode: string) => {
    if (!clientCode) return;
    try {
      const res = await fetch(
        `/api/workloadLogs?clientId=${encodeURIComponent(clientCode)}`
      );
      const data = await res.json();
      setWorkloadLogs((data.logs || []) as WorkloadLog[]);
    } catch {
      setWorkloadLogs([]);
    }
  };

  useEffect(() => {
    const code = selectedClient?.clientCode;
    if (!code) {
      setWorkloadLogs([]);
      return;
    }
    void loadWorkloadLogs(code);
    if (!workloadDay) setWorkloadDay(dateToInputValue(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.clientCode]);

  // Reset the store cart/step whenever the open store program changes.
  // A handler (e.g. preview's "Get this program") can request a specific
  // landing step via storeStepIntentRef — otherwise this effect would
  // clobber its step-jump back to 1 on the same render.
  useEffect(() => {
    setStoreSelectedAddonIds([]);
    setStoreStep(storeStepIntentRef.current ?? 1);
    storeStepIntentRef.current = null;
    setStorePaymentCode("");
  }, [storeSelectedProgram?.recordId]);

  // When the selected workload day (or its saved log) changes, refill the draft.
  useEffect(() => {
    if (!workloadDay) return;
    const log = workloadLogs.find((l) => l.dateKey === workloadDay);
    setWorkloadDraft({
      techAmRpe: log?.techAmRpe ? String(log.techAmRpe) : "",
      techAmMin: log?.techAmMin ? String(log.techAmMin) : "",
      techPmRpe: log?.techPmRpe ? String(log.techPmRpe) : "",
      techPmMin: log?.techPmMin ? String(log.techPmMin) : "",
      cardioRpe: log?.cardioRpe ? String(log.cardioRpe) : "",
      cardioMin: log?.cardioMin ? String(log.cardioMin) : "",
      notes: log?.notes || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workloadDay, workloadLogs]);

  // sRPE load of an athlete-reported workload row (technical AM + PM + extra cardio).
  const workloadLogLoad = (l: WorkloadLog) =>
    l.techAmRpe * l.techAmMin +
    l.techPmRpe * l.techPmMin +
    l.cardioRpe * l.cardioMin;

  // Map of athlete-reported (technical + extra cardio) load per day, to fold
  // into the coach load dashboard alongside in-app physical/cardio load.
  const workloadLoadByDate = () => {
    const m = new Map<string, number>();
    for (const l of workloadLogs) {
      const load = workloadLogLoad(l);
      if (!load) continue;
      m.set(l.dateKey, (m.get(l.dateKey) || 0) + load);
    }
    return m;
  };

  // In-app physical (strength) and auto cardio load logged on a given day.
  const dayPhysicalCardio = (dateStr: string) => {
    let physical = 0;
    let autoCardio = 0;
    for (const w of workouts) {
      if (!/complete/i.test(w.completionStatus || "")) continue;
      if (normalizeDate(String(w.scheduledDate)) !== dateStr) continue;
      const load =
        Number(w.sessionLoad) ||
        Number(w.sessionRpe) * Number(w.sessionDuration) ||
        0;
      if (!load) continue;
      if (/cardio|conditioning/i.test(w.sessionType || "")) autoCardio += load;
      else physical += load;
    }
    return { physical: Math.round(physical), autoCardio: Math.round(autoCardio) };
  };

  // Total load for a day = in-app physical + auto cardio + reported workload.
  const workloadDayTotal = (dateStr: string) => {
    const { physical, autoCardio } = dayPhysicalCardio(dateStr);
    const log = workloadLogs.find((l) => l.dateKey === dateStr);
    return physical + autoCardio + (log ? workloadLogLoad(log) : 0);
  };

  const saveWorkload = async () => {
    if (!selectedClient?.clientCode || !workloadDay) return;
    setWorkloadSaving(true);
    try {
      const res = await fetch("/api/saveWorkloadLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.clientCode,
          date: workloadDay,
          techAmRpe: Number(workloadDraft.techAmRpe) || 0,
          techAmMin: Number(workloadDraft.techAmMin) || 0,
          techPmRpe: Number(workloadDraft.techPmRpe) || 0,
          techPmMin: Number(workloadDraft.techPmMin) || 0,
          cardioRpe: Number(workloadDraft.cardioRpe) || 0,
          cardioMin: Number(workloadDraft.cardioMin) || 0,
          notes: workloadDraft.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not save workload.");
        return;
      }
      notify(paceZh ? "已保存训练负荷" : "Workload saved");
      await loadWorkloadLogs(selectedClient.clientCode);
    } catch {
      notify("Could not save workload.");
    } finally {
      setWorkloadSaving(false);
    }
  };

  // Workload self-report is a premium feature for online / in-person athletes.
  const isWorkloadMonitored = /online coaching|in[-\s]?person/i.test(
    selectedClient?.clientType || ""
  );

  // Coach opening a completed workout reviews it (read-only) rather than logging.
  const coachReviewMode =
    !isClientPortal &&
    /complete/i.test(selectedWorkout?.completionStatus || "");

  const renderWorkloadTab = () => {
    const today = new Date(`${todayValue}T00:00:00`);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(dateToInputValue(d));
    }
    const weekTotal = days.reduce((a, d) => a + workloadDayTotal(d), 0);
    const sel = workloadDay || todayValue;
    const { physical, autoCardio } = dayPhysicalCardio(sel);
    const dr = workloadDraft;
    const ld = (rpe: string, min: string) =>
      (Number(rpe) || 0) * (Number(min) || 0);
    const techAmLoad = ld(dr.techAmRpe, dr.techAmMin);
    const techPmLoad = ld(dr.techPmRpe, dr.techPmMin);
    const manualCardioLoad = ld(dr.cardioRpe, dr.cardioMin);
    const dayTotal =
      physical + autoCardio + techAmLoad + techPmLoad + manualCardioLoad;

    const rows: {
      label: string;
      rpeKey: keyof typeof dr;
      minKey: keyof typeof dr;
    }[] = [
      {
        label: paceZh ? "技术课 · 早上" : "Technical · Morning",
        rpeKey: "techAmRpe",
        minKey: "techAmMin",
      },
      {
        label: paceZh ? "技术课 · 下午/晚上" : "Technical · Afternoon / Evening",
        rpeKey: "techPmRpe",
        minKey: "techPmMin",
      },
      {
        label: paceZh ? "额外有氧" : "Extra cardio",
        rpeKey: "cardioRpe",
        minKey: "cardioMin",
      },
    ];

    return (
      <section className="clientHomePanel workloadPanel">
        <div className="clientHomePanelHeader">
          <div>
            <span>{paceZh ? "每周监控" : "Weekly monitoring"}</span>
            <h2>{paceZh ? "训练负荷" : "Workload"}</h2>
          </div>
        </div>
        <p className="workloadIntro">
          {paceZh
            ? "记录线下技术课和额外有氧，结合 App 内训练，算出你一周的总负荷。"
            : "Log your off-app technical sessions and any extra cardio — combined with your in-app training, this captures your full weekly load."}
        </p>

        <div className="workloadWeekStrip">
          {days.map((d) => {
            const total = workloadDayTotal(d);
            const dd = new Date(`${d}T00:00:00`);
            return (
              <button
                key={d}
                type="button"
                className={`workloadDayBtn${
                  d === sel ? " workloadDayActive" : ""
                }`}
                onClick={() => setWorkloadDay(d)}
              >
                <span className="workloadDow">
                  {dd.toLocaleDateString(clientLocale, { weekday: "short" })}
                </span>
                <span className="workloadDom">{dd.getDate()}</span>
                <span className="workloadDayTotal">{total || ""}</span>
              </button>
            );
          })}
        </div>
        <div className="workloadWeekSum">
          {paceZh ? "本周总负荷" : "Week total load"}{" "}
          <strong>{Math.round(weekTotal).toLocaleString()}</strong>
        </div>

        <div className="workloadEditor">
          {rows.map((row) => {
            const load = ld(dr[row.rpeKey], dr[row.minKey]);
            return (
              <div className="workloadRow" key={row.label}>
                <span className="workloadRowLabel">{row.label}</span>
                <label className="workloadField">
                  <input
                    inputMode="numeric"
                    placeholder="RPE"
                    value={dr[row.rpeKey]}
                    onChange={(e) =>
                      setWorkloadDraft((s) => ({
                        ...s,
                        [row.rpeKey]: e.target.value,
                      }))
                    }
                  />
                  <span>RPE</span>
                </label>
                <label className="workloadField">
                  <input
                    inputMode="numeric"
                    placeholder={paceZh ? "分钟" : "min"}
                    value={dr[row.minKey]}
                    onChange={(e) =>
                      setWorkloadDraft((s) => ({
                        ...s,
                        [row.minKey]: e.target.value,
                      }))
                    }
                  />
                  <span>{paceZh ? "分" : "min"}</span>
                </label>
                <span className="workloadRowLoad">{load || "--"}</span>
              </div>
            );
          })}

          <div className="workloadAutoRow">
            <span className="workloadRowLabel">
              {paceZh ? "力量训练 (App内)" : "Physical (from workouts)"}
            </span>
            <span className="workloadAutoVal">{physical || 0}</span>
          </div>
          {autoCardio > 0 && (
            <div className="workloadAutoRow">
              <span className="workloadRowLabel">
                {paceZh ? "有氧 (App内)" : "Cardio (from workouts)"}
              </span>
              <span className="workloadAutoVal">{autoCardio}</span>
            </div>
          )}

          <label className="workloadNotesField">
            <span>{paceZh ? "备注" : "Notes"}</span>
            <textarea
              value={dr.notes}
              placeholder={
                paceZh ? "今天感觉如何？" : "How did the day feel?"
              }
              onChange={(e) =>
                setWorkloadDraft((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </label>

          <div className="workloadDayTotalRow">
            <span>{paceZh ? "当天总负荷" : "Day total load"}</span>
            <strong>{Math.round(dayTotal).toLocaleString()}</strong>
          </div>

          <button
            className="goldButton workloadSaveButton"
            onClick={saveWorkload}
            disabled={workloadSaving}
          >
            {workloadSaving
              ? paceZh
                ? "保存中…"
                : "Saving…"
              : paceZh
              ? "保存当天"
              : "Save day"}
          </button>
        </div>
      </section>
    );
  };

  // Compute each team's upcoming planned-session count from members' workouts.
  useEffect(() => {
    if (activePage !== "Teams" || teams.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await (await fetch("/api/workouts")).json();
        if (cancelled) return;
        const workoutList = data.workouts || [];
        const today = dateToInputValue(new Date());
        const counts: Record<string, number> = {};
        teams.forEach((team) => {
          const codes = new Set(
            team.memberIds
              .map((id) => clients.find((c) => c.id === id)?.clientCode)
              .filter(Boolean)
          );
          counts[team.id] = workoutList.filter(
            (w: any) =>
              codes.has(w.clientId) &&
              normalizeDate(String(w.scheduledDate)) >= today &&
              normalizeTaskStatus(w.completionStatus) === "Scheduled"
          ).length;
        });
        setTeamPlannedCounts(counts);
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePage, teams, clients]);

  // Load every athlete's assigned workouts for the coach Clients load watch +
  // per-row risk badges.
  useEffect(() => {
    if (isClientPortal || activePage !== "Clients") return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllAssignedWorkouts();
        if (!cancelled) setRosterLoadWorkouts(list);
      } catch {
        /* non-fatal: the watch just stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isClientPortal, activePage]);

  const clientStatusOptions = Array.from(
    new Set(coachVisibleClients.map((client) => client.status).filter(Boolean))
  );

  const clientNeedsProgramming = (client: Client) =>
    !client.program || client.program === "--";
  const clientNeedsContact = (client: Client) => !client.email && !client.phone;
  const clientIsArchived = (client: Client) =>
    client.status.toLowerCase().includes("archived");
  const clientMatchesBucket = (client: Client, bucket: ClientBucket) => {
    const status = client.status.toLowerCase();

    if (bucket === "All Clients") return true;
    if (bucket === "Active") return status.includes("active");
    if (bucket === "Premium") return status.includes("premium");
    if (bucket === "Online Coaching") return status.includes("online");
    if (bucket === "Paused") return status.includes("paused");
    if (bucket === "Needs Contact") return clientNeedsContact(client);
    if (bucket === "Needs Programming") return clientNeedsProgramming(client);
    if (bucket === "Archived") return clientIsArchived(client);

    return true;
  };

  const clientBuckets: { name: ClientBucket; count: number }[] = [
    { name: "All Clients", count: coachVisibleClients.length },
    {
      name: "Active",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Active"))
        .length,
    },
    {
      name: "Premium",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Premium"))
        .length,
    },
    {
      name: "Online Coaching",
      count: coachVisibleClients.filter((client) =>
        clientMatchesBucket(client, "Online Coaching")
      ).length,
    },
    {
      name: "Paused",
      count: coachVisibleClients.filter((client) => clientMatchesBucket(client, "Paused"))
        .length,
    },
    {
      name: "Needs Contact",
      count: coachVisibleClients.filter(clientNeedsContact).length,
    },
    {
      name: "Needs Programming",
      count: coachVisibleClients.filter(clientNeedsProgramming).length,
    },
    {
      name: "Archived",
      count: coachVisibleClients.filter(clientIsArchived).length,
    },
  ];

  const filteredClients = coachVisibleClients.filter((client) => {
    const search = clientSearch.toLowerCase();
    const matchesSearch =
      client.name.toLowerCase().includes(search) ||
      client.clientCode.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search);
    const matchesStatus =
      clientStatusFilter === "All" || client.status === clientStatusFilter;
    const matchesBucket = clientMatchesBucket(client, clientBucket);

    return matchesSearch && matchesStatus && matchesBucket;
  });

  // ---- Roster triage (attention filters) ----
  const matchesTriage = (
    client: Client,
    key: Exclude<typeof rosterTriage, "">
  ): boolean => {
    if (key === "needsProgram") return clientNeedsProgramming(client);
    if (key === "needsContact") return clientNeedsContact(client);
    if (key === "needsCheckIn") return clientNeedsCheckIn(client);
    const d = daysSinceLogin(client.lastLogin); // inactive = 7d+ or never
    return d === null || d >= 7;
  };
  const triageDefs: { key: Exclude<typeof rosterTriage, "">; label: string }[] =
    [
      { key: "needsProgram", label: "Needs program" },
      { key: "needsContact", label: "No contact" },
      { key: "needsCheckIn", label: "Needs check-in" },
      { key: "inactive", label: "Inactive 7d+" },
    ];
  const triageCounts = Object.fromEntries(
    triageDefs.map((d) => [
      d.key,
      filteredClients.filter((c) => matchesTriage(c, d.key)).length,
    ])
  ) as Record<Exclude<typeof rosterTriage, "">, number>;
  // The displayed roster = base filters, then the active triage chip (if any).
  const rosterClients = rosterTriage
    ? filteredClients.filter((c) => matchesTriage(c, rosterTriage))
    : filteredClients;

  // Per-athlete engagement for the roster: most-recent completed session +
  // this-week adherence (completed ÷ sessions that were due Mon..today). Kept
  // self-contained (own week window) so it can run during the roster sort, which
  // is computed before the render-scope date consts exist.
  const clientEngagement = (client: Client) => {
    const code = client.clientCode;
    if (!code)
      return { lastCompleted: null as string | null, compliance: null as number | null };
    const today = dateToInputValue(new Date());
    const ws = new Date();
    ws.setHours(0, 0, 0, 0);
    ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7)); // back to Monday
    const weekStart = dateToInputValue(ws);
    const isDone = (w: Workout) =>
      normalizeTaskStatus(w.completionStatus) === "Completed";

    let lastCompleted: string | null = null;
    let due = 0;
    let done = 0;
    for (const w of rosterLoadWorkouts) {
      if (!(w.clientId || "").includes(code)) continue;
      const d = normalizeDate(String(w.scheduledDate));
      if (!d) continue;
      if (isDone(w) && (!lastCompleted || d > lastCompleted)) lastCompleted = d;
      if (d >= weekStart && d <= today) {
        due += 1;
        if (isDone(w)) done += 1;
      }
    }
    const compliance = due > 0 ? Math.round((done / due) * 100) : null;
    return { lastCompleted, compliance };
  };

  // ---- Roster sort + group-by ----
  const rosterSortValue = (client: Client): string | number => {
    switch (rosterSort.key) {
      case "type":
        return (client.clientType || "").toLowerCase();
      case "lastLogin":
        return client.lastLogin || 0;
      case "teams":
        return clientTeams(client.id).length;
      case "engagement":
        // No sessions due this week → sort last (ascending) / treat as -1.
        return clientEngagement(client).compliance ?? -1;
      default:
        return client.name.toLowerCase();
    }
  };
  const sortedRoster = [...rosterClients].sort((a, b) => {
    const av = rosterSortValue(a);
    const bv = rosterSortValue(b);
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return rosterSort.dir === "asc" ? cmp : -cmp;
  });
  const toggleRosterSort = (key: typeof rosterSort.key) =>
    setRosterSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "lastLogin" || key === "engagement" ? "desc" : "asc",
          }
    );
  const rosterSortArrow = (key: typeof rosterSort.key) =>
    rosterSort.key === key ? (rosterSort.dir === "asc" ? " ▲" : " ▼") : "";

  // Group the sorted roster. A client with several teams/tags/categories shows
  // under each matching group; an empty value lands in a "No …" bucket.
  const rosterGroups: { key: string; label: string; clients: Client[] }[] =
    (() => {
      if (rosterGroupBy === "none") {
        return [{ key: "all", label: "", clients: sortedRoster }];
      }
      const groups = new Map<string, Client[]>();
      const push = (key: string, client: Client) => {
        const list = groups.get(key);
        if (list) list.push(client);
        else groups.set(key, [client]);
      };
      for (const client of sortedRoster) {
        if (rosterGroupBy === "type") {
          push(client.clientType || "No type", client);
        } else if (rosterGroupBy === "team") {
          const ts = clientTeams(client.id);
          if (ts.length === 0) push("No team", client);
          else ts.forEach((t) => push(t.name, client));
        } else if (rosterGroupBy === "tag") {
          const tags = client.tags || [];
          if (tags.length === 0) push("No tags", client);
          else tags.forEach((t) => push(t, client));
        } else {
          const cats = client.categories || [];
          if (cats.length === 0) push("No category", client);
          else cats.forEach((c) => push(c, client));
        }
      }
      return [...groups.entries()]
        .sort((a, b) => {
          // Keep the "No …" bucket last; everything else alphabetical.
          const aEmpty = /^No /.test(a[0]);
          const bEmpty = /^No /.test(b[0]);
          if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
          return a[0].localeCompare(b[0]);
        })
        .map(([label, clients]) => ({ key: label, label, clients }));
    })();

  // ---- Roster multi-select + bulk actions ----
  const rosterVisibleIds = rosterClients.map((c) => c.id);
  const rosterAllSelected =
    rosterVisibleIds.length > 0 &&
    rosterVisibleIds.every((id) => rosterSelectedIds.includes(id));
  const toggleRosterSelectAll = () =>
    setRosterSelectedIds(rosterAllSelected ? [] : rosterVisibleIds);
  const toggleRosterSelect = (id: string) =>
    setRosterSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  const clearRosterSelection = () => {
    setRosterSelectedIds([]);
    setBulkPanel("");
  };

  const bulkAssignProgram = async () => {
    if (!bulkProgramId) return notify("Select a program to assign.");
    setBulkBusy(true);
    try {
      const start = bulkStartDate || new Date().toISOString().split("T")[0];
      const created = await assignProgramByIds(
        rosterSelectedIds,
        bulkProgramId,
        start
      );
      if (created > 0) {
        notify(
          `Program assigned to ${rosterSelectedIds.length} athlete(s).`,
          "success"
        );
        clearRosterSelection();
        setBulkProgramId("");
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkAddToTeam = async () => {
    const team = teams.find((t) => t.id === bulkTeamId);
    if (!team) return notify("Select a team.");
    setBulkBusy(true);
    try {
      const merged = Array.from(
        new Set([...team.memberIds, ...rosterSelectedIds])
      );
      const res = await fetch("/api/upsertTeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: team.id, memberRecordIds: merged }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not update the team roster.");
        return;
      }
      await loadTeams();
      notify(
        `Added ${rosterSelectedIds.length} athlete(s) to ${team.name}.`,
        "success"
      );
      clearRosterSelection();
      setBulkTeamId("");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkAddTag = async () => {
    const tag = bulkTag.trim();
    if (!tag) return notify("Enter a tag.");
    setBulkBusy(true);
    try {
      const targets = clients.filter((c) => rosterSelectedIds.includes(c.id));
      const results = await Promise.all(
        targets.map((c) => {
          const nextTags = Array.from(new Set([...(c.tags || []), tag]));
          return fetch("/api/updateClient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientRecordId: c.id,
              tags: nextTags,
              categories: c.categories || [],
            }),
          })
            .then((r) => r.json())
            .then((d) => Boolean(d?.success))
            .catch(() => false);
        })
      );
      const ok = results.filter(Boolean).length;
      setClients((cur) =>
        cur.map((c) =>
          rosterSelectedIds.includes(c.id)
            ? { ...c, tags: Array.from(new Set([...(c.tags || []), tag])) }
            : c
        )
      );
      notify(`Tagged ${ok} athlete(s) "${tag}".`, "success");
      clearRosterSelection();
      setBulkTag("");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkCopyLinks = () => {
    const links = clients
      .filter((c) => rosterSelectedIds.includes(c.id))
      .map((c) => `${c.name}: ${buildClientPortalLink(c)}`)
      .join("\n");
    void copyToClipboard(links, `${rosterSelectedIds.length} portal links`);
  };

  const filteredCheckInClients = coachVisibleClients.filter((client) => {
    const search = checkInSearch.toLowerCase();
    const ageDays = getCheckInAgeDays(client);
    const matchesSearch =
      client.name.toLowerCase().includes(search) ||
      client.clientCode.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search);
    const matchesFilter =
      checkInFilter === "All" ||
      (checkInFilter === "Due" && clientNeedsCheckIn(client)) ||
      (checkInFilter === "Recent" && ageDays !== null && ageDays < 7) ||
      (checkInFilter === "No Check-in" && ageDays === null);

    return matchesSearch && matchesFilter;
  });

  const refreshSelectedClient = (updatedClients: Client[]) => {
    if (!selectedClient) return;

    const updatedSelectedClient = updatedClients.find(
      (client) => client.id === selectedClient.id
    );

    if (updatedSelectedClient) {
      setSelectedClient(updatedSelectedClient);
    }
  };

  const selectedClientOrders = selectedClient
    ? productOrders.filter(
        (order) =>
          lookupTextMatches(order.clientId, selectedClient.id) ||
          lookupTextMatches(order.clientId, selectedClient.clientCode) ||
          lookupTextMatches(order.clientId, selectedClient.name) ||
          lookupTextMatches(order.clientName, selectedClient.name) ||
          lookupTextMatches(order.clientName, selectedClient.clientCode)
      )
    : [];
  const selectedClientLatestOrder = selectedClientOrders[0];
  const todayInputValue = dateToInputValue(new Date());
  const getOrderClient = (order: ProductOrder) =>
    clients.find((client) => {
      return (
        lookupTextMatches(order.clientId, client.id) ||
        lookupTextMatches(order.clientId, client.clientCode) ||
        lookupTextMatches(order.clientId, client.name) ||
        lookupTextMatches(order.clientName, client.name) ||
        lookupTextMatches(order.clientName, client.clientCode)
      );
    });
  const getOrderProgram = (order: ProductOrder, sourcePrograms = programs) =>
    sourcePrograms.find((program) => {
      return (
        lookupTextMatches(order.programId, program.programId) ||
        lookupTextMatches(order.programId, program.recordId) ||
        lookupTextMatches(order.programId, program.programName) ||
        lookupTextMatches(order.productName, program.programName) ||
        lookupTextMatches(order.productName, program.programId)
      );
    });
  const getOrderStartDate = (order: ProductOrder) =>
    normalizeDate(
      orderStartDates[order.recordId] ||
        order.accessStartDate ||
        order.purchasedAt ||
        todayInputValue
    );
  const updateProductOrder = async (
    order: ProductOrder,
    updates: Record<string, string | undefined>
  ) => {
    try {
      const response = await fetch("/api/updateProductOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: order.recordId,
          ...updates,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.warn("Product order pipeline update skipped", data);
        return false;
      }

      if (data.omittedFields?.length) {
        console.info("Optional product order columns not found", data.omittedFields);
      }

      await loadProductOrders(true);
      return true;
    } catch (error) {
      console.warn("Product order pipeline update failed", error);
      return false;
    }
  };

  const deleteProductOrder = async (order: ProductOrder) => {
    const label = order.orderId || order.productName || "this order";

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setOrderProcessingId(order.recordId);

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "productOrder",
          recordId: order.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(
          data.message || data.error || "Could not delete product order.",
          "error"
        );
        return;
      }

      setProductOrders((current) => {
        const nextOrders = current.filter((item) => item.recordId !== order.recordId);
        productOrdersCacheRef.current = { data: nextOrders, timestamp: Date.now() };
        writePersistentCache(CACHE_KEYS.productOrders, nextOrders);
        return nextOrders;
      });
      setOrderStartDates((current) => {
        const next = { ...current };
        delete next[order.recordId];
        return next;
      });
      if (orderReviewOrder?.recordId === order.recordId) {
        setOrderReviewOrder(null);
        setOrderReviewResponses([]);
      }
      notify("Product order deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete product order.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };

  const getOrderPipelineStatus = (order: ProductOrder) => {
    const statusText = `${order.onboardingStatus || ""} ${
      order.fulfillmentStatus || ""
    }`.toLowerCase();
    const intakeStatus = String(order.intakeStatus || "").toLowerCase();

    if (
      statusText.includes("program loaded") ||
      statusText.includes("fulfilled")
    ) {
      return "Program Loaded";
    }

    if (statusText.includes("program ready") || intakeStatus.includes("reviewed")) {
      return "Program Ready";
    }

    if (intakeStatus.includes("submitted")) return "Intake Submitted";
    if (
      statusText.includes("intake sent") ||
      // guard against "Not Sent" — `includes("sent")` matches it otherwise,
      // mislabelling a brand-new order as already sent.
      (intakeStatus.includes("sent") && !intakeStatus.includes("not sent")) ||
      intakeStatus.includes("assigned")
    ) {
      return "Intake Sent";
    }

    if (statusText.includes("client created") || getOrderClient(order)) {
      return "Client Created";
    }

    return order.onboardingStatus || "New Order";
  };
  const orderPipelineStages = [
    "New Order",
    "Client Created",
    "Intake Sent",
    "Intake Submitted",
    "Program Ready",
    "Program Loaded",
  ];
  const getOrderStageIndex = (order: ProductOrder) =>
    Math.max(0, orderPipelineStages.indexOf(getOrderPipelineStatus(order)));
  const getOrderClientType = (order: ProductOrder) => {
    const type = `${order.productType} ${order.productName}`.toLowerCase();

    if (type.includes("in-person") || type.includes("personal")) {
      return "In-Person Training";
    }

    if (type.includes("online") || type.includes("coaching")) {
      return "Online Coaching";
    }

    return "Digital Program";
  };
  const getOrderPrimaryCoach = (order: ProductOrder) => {
    const assignedCoach = getCoachDisplayName(order.assignedCoach || "");

    if (assignedCoach) return assignedCoach;
    if (currentScopedCoach) return currentScopedCoach.name;
    return "Kent Bastell";
  };
  const getOrderIntakeTemplate = (order: ProductOrder) => {
    const program = getOrderProgram(order);
    const defaultFormId = program?.defaultIntakeFormId || "";
    const activeForms = savedFormTemplates.filter(
      (form) => form.status !== "Archived"
    );

    return (
      activeForms.find((form) => form.formId === defaultFormId) ||
      activeForms.find((form) => {
        const text = `${form.name} ${form.type} ${form.description}`.toLowerCase();
        return (
          text.includes("intake") ||
          text.includes("onboarding") ||
          text.includes("readiness")
        );
      })
    );
  };
  const orderBelongsToCoachScope = (order: ProductOrder) => {
    if (coachScope === "All Coaches") return true;

    const matchedClient = getOrderClient(order);

    if (matchedClient) return clientBelongsToCoachScope(matchedClient);

    return getCoachDisplayName(order.assignedCoach || "").toLowerCase() ===
      coachScope.toLowerCase();
  };
  const coachScopedProductOrders = productOrders.filter(orderBelongsToCoachScope);
  const visibleProductOrders = coachScopedProductOrders.filter((order) => {
      const search = orderSearch.toLowerCase();

      if (!search) return true;

      return [
        order.orderId,
        order.clientName,
        order.productName,
        order.productType,
      order.paymentStatus,
      order.intakeStatus,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
  const openOrdersCount = visibleProductOrders.filter(
    (order) => getOrderPipelineStatus(order) !== "Program Loaded"
  ).length;
  const readyOrdersCount = visibleProductOrders.filter(
    (order) => getOrderPipelineStatus(order) === "Program Ready"
  ).length;
  const reviewQueueOrders = visibleProductOrders.filter((order) => {
    const status = getOrderPipelineStatus(order);
    return (
      status === "Intake Sent" ||
      status === "Intake Submitted" ||
      status === "Program Ready"
    );
  });
  const globalReviewOrders = coachScopedProductOrders.filter((order) => {
    const status = getOrderPipelineStatus(order);
    return (
      status === "Intake Sent" ||
      status === "Intake Submitted" ||
      status === "Program Ready"
    );
  });
  const newOrdersQueue = visibleProductOrders.filter(
    (order) => getOrderPipelineStatus(order) === "New Order"
  );
  const getResponseGroups = (
    responses: ContentResponse[],
    assignments = contentAssignments
  ) =>
    Object.values(
      responses.reduce<Record<string, ContentResponseGroup>>((groups, response) => {
        const key =
          response.assignmentRecordId ||
          response.assignmentId ||
          `${response.templateId}-${response.submittedAt}`;
        const matchingAssignment = assignments.find(
          (assignment) =>
            assignment.recordId === response.assignmentRecordId ||
            assignment.assignmentId === response.assignmentId ||
            assignment.templateId === response.templateId
        );
        const templateTitle = matchingAssignment
          ? getAssignmentDisplayName(matchingAssignment)
          : response.responseType;

        if (!groups[key]) {
          groups[key] = {
            key,
            responseType: response.responseType,
            title: templateTitle,
            submittedAt: response.submittedAt,
            answers: [],
          };
        }

        groups[key].answers.push(response);

        if (response.submittedAt > groups[key].submittedAt) {
          groups[key].submittedAt = response.submittedAt;
        }

        return groups;
      }, {})
    ).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const findClientForReviewItem = (clientId?: string, clientName?: string) =>
    clients.find(
      (client) =>
        lookupTextMatches(client.id, clientId || "") ||
        lookupTextMatches(client.clientCode, clientId || "") ||
        lookupTextMatches(client.name, clientName || "")
    );

  const reviewItemBelongsToCoachScope = (
    clientId?: string,
    clientName?: string
  ) => {
    if (coachScope === "All Coaches") return true;
    const matchedClient = findClientForReviewItem(clientId, clientName);
    return matchedClient ? clientBelongsToCoachScope(matchedClient) : true;
  };

  // The Review board's check-in and form-video queues honor coach scope like
  // their sibling queues (comments/submissions/missed).
  const scopedReviewCheckIns = coachReviewCheckIns.filter((checkIn) =>
    reviewItemBelongsToCoachScope(checkIn.clientId, checkIn.clientName)
  );
  const scopedReviewFormVideos = reviewFormVideos.filter((video) =>
    reviewItemBelongsToCoachScope(video.clientId, video.clientName)
  );

  const globalReviewResponseGroups = getResponseGroups(
    coachReviewResponses,
    []
  );
  const globalReviewSubmissionItems = globalReviewResponseGroups
    .filter((group) => {
      const first = group.answers[0];
      return reviewItemBelongsToCoachScope(first?.clientId, first?.clientName);
    })
    .slice(0, 18);

  const globalUnreviewedWorkoutComments = coachReviewComments
    .filter(
      (comment) =>
        !comment.reviewed &&
        reviewItemBelongsToCoachScope(comment.clientId, comment.clientName)
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 18);

  const globalMissedWorkouts = coachReviewWorkouts
    .filter(
      (workout) =>
        reviewItemBelongsToCoachScope(workout.clientId, "") &&
        getDisplayTaskStatus(
          workout.completionStatus,
          workout.scheduledDate
        ) === "Missed"
    )
    .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""))
    .slice(0, 18);

  const openReviewClient = (clientId?: string, clientName?: string) => {
    const client = findClientForReviewItem(clientId, clientName);

    if (!client) {
      notify("Could not match this review item to a client.", "info");
      return;
    }

    setSelectedClient(client);
    setSelectedWorkout(null);
    setActivePage("Clients");
    setClientTab("Home");
  };

  const openReviewWorkout = (workout: Workout) => {
    const client = findClientForReviewItem(workout.clientId, "");

    if (!client) {
      notify("Could not match this workout to a client.", "info");
      return;
    }

    setSelectedClient(client);
    setSelectedWorkout(workout);
    setActivePage("Clients");
    setClientTab("Training");
  };

  const openOrderReview = async (order: ProductOrder) => {
    const client = getOrderClient(order) || (await createClientFromOrder(order));

    if (!client) {
      notify("Create or match the client before reviewing intake.", "error");
      return;
    }

    setOrderReviewOrder(order);
    setOrderReviewLoading(true);

    try {
      const assignments = await loadContentAssignments(client);
      const responses = await loadContentResponses(client);
      const intakeTemplate = getOrderIntakeTemplate(order);
      const groups = getResponseGroups(responses, assignments).filter((group) => {
        if (!intakeTemplate) {
          return group.responseType.toLowerCase().includes("question");
        }

        return (
          group.title === intakeTemplate.name ||
          group.answers.some(
            (answer) =>
              answer.templateId === intakeTemplate.formId ||
              answer.templateId === intakeTemplate.recordId
          )
        );
      });

      setOrderReviewResponses(groups);

      if (groups.length === 0) {
        notify("No intake submission found yet for this order.", "info");
      } else if (!String(order.intakeStatus || "").toLowerCase().includes("submitted")) {
        await updateProductOrder(order, {
          intakeStatus: "Submitted",
          onboardingStatus: "Intake Submitted",
        });
      }
    } catch (error) {
      console.error(error);
      notify("Could not load intake review.", "error");
    } finally {
      setOrderReviewLoading(false);
    }
  };

  const createClientFromOrder = async (order: ProductOrder) => {
    const existingClient = getOrderClient(order);

    if (existingClient) return existingClient;

    const primaryCoachName = getOrderPrimaryCoach(order);
    const primaryCoachId = getCoachRecordIdByName(primaryCoachName);
    const program = getOrderProgram(order);

    setOrderProcessingId(order.recordId);

    try {
      const response = await fetch("/api/createClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: order.clientName || `Order ${order.orderId}`,
          email: order.email || "",
          phone: order.phone || "",
          coach: primaryCoachName,
          primaryCoachId,
          clientType: getOrderClientType(order),
          packageType: "Active",
          packageName: order.productName || order.productType || "Purchased Program",
          subscriptionStatus: "Active",
          intakeStatus: order.intakeStatus || "Not Sent",
          paymentStatus: order.paymentStatus || "Paid",
          purchasedProgramId: program?.programId || order.programId,
          accessStartDate: order.accessStartDate || getOrderStartDate(order),
          accessEndDate: order.accessEndDate || "",
          source: "Product Order",
          paymentId: order.orderId,
          startDate: getOrderStartDate(order),
          notes: `Created from product order ${order.orderId}.`,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not create client from order.", "error");
        return null;
      }

      const refreshedClients = await loadClients(true);

      const createdClient =
        refreshedClients.find((client: Client) => client.id === data.recordId) ||
        refreshedClients.find(
          (client: Client) =>
            client.clientCode === data.clientId ||
            client.name.toLowerCase() === String(order.clientName).toLowerCase()
        );

      await updateProductOrder(order, {
        clientRecordId: createdClient?.id || data.recordId,
        clientCode: createdClient?.clientCode || data.clientId,
        clientName: createdClient?.name || order.clientName,
        onboardingStatus: "Client Created",
        paymentStatus: order.paymentStatus || "Paid",
        programId: program?.programId || order.programId,
        programName: program?.programName || order.productName,
      });
      notify(`Client created from order: ${order.clientName}.`, "success");
      return createdClient || null;
    } catch (error) {
      console.error(error);
      notify("Could not create client from order.", "error");
      return null;
    } finally {
      setOrderProcessingId("");
    }
  };

  const assignOrderIntake = async (order: ProductOrder) => {
    if (savedFormTemplates.length === 0 && !formTemplatesLoading) {
      await loadFormTemplates();
    }

    const client = getOrderClient(order) || (await createClientFromOrder(order));
    const intakeTemplate = getOrderIntakeTemplate(order);

    if (!client) {
      notify("Create or match the client before sending intake.", "error");
      return;
    }

    if (!intakeTemplate) {
      notify("No intake form found. Create one or set a default intake form.", "error");
      return;
    }

    setOrderProcessingId(order.recordId);

    try {
      const assignmentType = intakeTemplate.type
        .toLowerCase()
        .includes("check")
        ? "Check-in"
        : "Questionnaire";
      const response = await fetch("/api/assignContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentType,
          templateId: intakeTemplate.formId,
          templateName: intakeTemplate.name,
          clientId: client.id,
          clientCode: client.clientCode,
          clientName: client.name,
          assignedDate: todayInputValue,
          dueDate: getOrderStartDate(order),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not assign intake.", "error");
        return;
      }

      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          intakeStatus: "Sent",
          paymentStatus: order.paymentStatus || client.paymentStatus || "Paid",
          purchasedProgramId: getOrderProgram(order)?.programId || order.programId,
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        intakeAssignmentId: data.recordId,
        intakeStatus: "Sent",
        onboardingStatus: "Intake Sent",
        paymentStatus: order.paymentStatus || "Paid",
        programId: getOrderProgram(order)?.programId || order.programId,
        programName: getOrderProgram(order)?.programName || order.productName,
      });
      await loadClients(true);
      setActivationClientName(client.name);
      setActivationPortalLink(buildClientPortalLink(client));
      notify(`Intake assigned to ${client.name}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not assign intake.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };

  const markOrderIntakeReviewed = async (order: ProductOrder) => {
    const client = getOrderClient(order);

    if (!client) {
      notify("Create or match the client before reviewing intake.", "error");
      return false;
    }

    setOrderProcessingId(order.recordId);

    try {
      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          intakeStatus: "Reviewed",
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        intakeStatus: "Reviewed",
        onboardingStatus: "Program Ready",
      });
      await loadClients(true);
      notify(`${client.name}'s intake is marked reviewed.`, "success");
      return true;
    } catch (error) {
      console.error(error);
      notify("Could not mark intake reviewed.", "error");
      return false;
    } finally {
      setOrderProcessingId("");
    }
  };

  const buildProgramWorkoutsForOrder = async (program: Program, startDate: string) => {
    const response = await fetch(
      `/api/programTemplates?programId=${encodeURIComponent(
        program.programId
      )}&programRecordId=${encodeURIComponent(program.recordId || "")}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Could not load program sessions.");
    }

    const sessions = new Map<string, AssignableWorkout>();

    (data.templates || []).forEach((template: any) => {
      const key = `${template.week}-${template.day}-${template.sessionName}`;

      if (!sessions.has(key)) {
        const offsetDays =
          (Number(template.week) - 1) * 7 + (Number(template.day) - 1) * 2;

        sessions.set(key, {
          localId: key,
          week: Number(template.week),
          day: Number(template.day),
          sessionName: template.sessionName,
          sessionNameCn: template.sessionNameCn,
          sessionType: template.sessionType || "Strength",
          sessionGoal: template.sessionGoal || "",
          estimatedDuration: template.estimatedDuration || "",
          intensity: template.intensity || "Moderate",
          scheduledDate: addDays(startDate, offsetDays),
        });
      }
    });

    return Array.from(sessions.values());
  };

  const selectedClientPurchasedPrograms = selectedClient
    ? programs.filter((program) => {
        const directClientProgramMatch =
          lookupTextMatches(selectedClient.purchasedProgramId, program.programId) ||
          lookupTextMatches(selectedClient.purchasedProgramId, program.recordId) ||
          lookupTextMatches(selectedClient.purchasedProgramId, program.programName);
        const orderMatch = selectedClientOrders.some((order) => {
          return (
            lookupTextMatches(order.programId, program.programId) ||
            lookupTextMatches(order.programId, program.recordId) ||
            lookupTextMatches(order.programId, program.programName) ||
            lookupTextMatches(order.productName, program.programName) ||
            lookupTextMatches(order.productName, program.programId)
          );
        });

        return directClientProgramMatch || orderMatch;
      })
    : [];
  const selectedClientPurchasedOrderPrograms = selectedClientOrders
    .filter((order) => {
      const paymentStatus = normalizeLookupText(order.paymentStatus);
      const productText = normalizeLookupText(
        `${order.productType} ${order.productName}`
      );

      return (
        (!paymentStatus || paymentStatus.includes("paid")) &&
        (!productText ||
          productText.includes("digital") ||
          productText.includes("program"))
      );
    })
    .map((order) => {
      const matchedProgram = getOrderProgram(order);

      if (matchedProgram) return matchedProgram;

      return {
        recordId: `order-${order.recordId}`,
        programId: order.programId || order.orderId,
        programName: order.productName || order.programId || "Purchased Program",
        goal: "",
        sport: "",
        level: "",
        durationWeeks: "",
        phase: "",
        sessionsPerWeek: "",
        coach: getCoachDisplayName(order.assignedCoach || ""),
        status: order.paymentStatus || "Paid",
        productType: order.productType || "Digital Program",
        price: order.amount,
        currency: order.currency,
        productStatus: order.intakeStatus,
        sourceOrderId: order.recordId,
        isOrderPlaceholder: true,
      } satisfies Program;
    });
  const uniqueClientPurchasedPrograms = Array.from(
    new Map(
      [...selectedClientPurchasedPrograms, ...selectedClientPurchasedOrderPrograms].map(
        (program) => [program.programId || program.recordId, program]
      )
    ).values()
  );
  const selectedClientProgram =
    uniqueClientPurchasedPrograms.find(
      (program) => program.recordId === selectedClientProgramId
    ) || uniqueClientPurchasedPrograms[0];
  const localizedProgramName = (program: Program) => {
    const programNameCn =
      (program as Program & { programNameCn?: string; nameCn?: string })
        .programNameCn ||
      (program as Program & { programNameCn?: string; nameCn?: string }).nameCn;

    return useChineseClientText && programNameCn ? programNameCn : program.programName;
  };

  const programProductChecklist = [
    {
      label: "Digital product type",
      complete: programProductType === "Digital Program",
    },
    {
      label: "Price set",
      complete: Number(programPrice) > 0 && Boolean(programCurrency),
    },
    {
      label: "Access window set",
      complete: Number(programAccessLengthDays) > 0,
    },
    {
      label: "Default intake attached",
      complete: Boolean(programDefaultIntakeFormId),
    },
    {
      label: "Store visibility decided",
      complete: Boolean(programPublicStoreVisible || programProductStatus !== "Active"),
    },
    {
      label: "Sales description written",
      complete: Boolean(programSalesDescription.trim()),
    },
    {
      label: "Workout days saved",
      complete: programSessions.length > 0,
    },
  ];
  const programProductReadyCount = programProductChecklist.filter(
    (item) => item.complete
  ).length;
  const programProductReadyForSale =
    programProductChecklist.length > 0 &&
    programProductReadyCount === programProductChecklist.length;
  const isSingleWorkoutBuilder = builderMode === "Single Workout";
  const showDigitalProductSettings =
    !isSingleWorkoutBuilder &&
    (programProductType === "Digital Program" ||
      programProductType === "Digital Add-on" ||
      programProductType === "Digital Bundle");
  // Add-ons / bundles are always store products, so their store fields show
  // without needing the "Show in digital store" toggle.
  const programInherentStoreProduct =
    programProductType === "Digital Add-on" ||
    programProductType === "Digital Bundle";
  const programStoreFieldsVisible =
    programPublicStoreVisible || programInherentStoreProduct;

  const getClientProgramScheduledWorkouts = (
    sessions = clientProgramSessions
  ) => {
    const scheduleStart = normalizeDate(clientProgramStartDate || todayInputValue);

    return sessions.map((session) => {
      const defaultDate = addDays(
        scheduleStart,
        (Number(session.week) - 1) * 7 + (Number(session.day) - 1) * 2
      );
      const scheduledDate =
        clientProgramScheduleMode === "Day"
          ? clientProgramDayDates[session.localId] || defaultDate
          : clientProgramScheduleMode === "Week"
            ? addDays(
                clientProgramWeekStarts[String(session.week)] ||
                  addDays(scheduleStart, (Number(session.week) - 1) * 7),
                (Number(session.day) - 1) * 2
              )
            : defaultDate;

      return {
        ...session,
        scheduledDate: normalizeDate(scheduledDate || defaultDate),
      };
    });
  };

  const getClientProgramCalendarWorkouts = (program = selectedClientProgram) => {
    if (!selectedClient || !program) return [];

    return workouts.filter((workout) => {
      const clientMatch =
        lookupTextMatches(workout.clientId, selectedClient.clientCode) ||
        lookupTextMatches(workout.clientId, selectedClient.id) ||
        lookupTextMatches(workout.clientId, selectedClient.name);
      const programMatch =
        lookupTextMatches(workout.programId, program.programId) ||
        lookupTextMatches(workout.programId, program.recordId) ||
        lookupTextMatches(workout.programId, program.programName);

      return clientMatch && programMatch;
    });
  };

  // Per-program status for the redesigned My Programs list. There is no status
  // field on a program — it's derived from the real calendar workouts: none on
  // the calendar = not started; all complete = completed; otherwise in progress.
  const clientProgramStatuses: Record<
    string,
    {
      status: "in-progress" | "not-started" | "completed";
      done: number;
      total: number;
      currentWeek: number;
      totalWeeks: number;
    }
  > = {};
  for (const program of uniqueClientPurchasedPrograms) {
    const cal = getClientProgramCalendarWorkouts(program);
    const total = cal.length;
    const done = cal.filter((w) =>
      /complete/i.test(w.completionStatus || "")
    ).length;
    const weekNums = cal.map((w) => Number(w.week) || 0);
    const totalWeeks = weekNums.length
      ? Math.max(...weekNums)
      : Number(program.durationWeeks) || 0;
    const nextUp = cal
      .filter((w) => !/complete/i.test(w.completionStatus || ""))
      .sort((a, b) =>
        String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""))
      )[0];
    const currentWeek = nextUp ? Number(nextUp.week) || 1 : totalWeeks;
    const status: "in-progress" | "not-started" | "completed" =
      total === 0 ? "not-started" : done >= total ? "completed" : "in-progress";
    clientProgramStatuses[program.recordId] = {
      status,
      done,
      total,
      currentWeek,
      totalWeeks,
    };
  }

  // Reschedule one already-loaded calendar workout (client Edit Workouts modal).
  const rescheduleClientWorkout = async (
    workoutId: string,
    scheduledDate: string
  ) => {
    const nextDate = normalizeDate(scheduledDate);
    const previous = workouts;
    setWorkouts((cur) =>
      cur.map((w) => (w.id === workoutId ? { ...w, scheduledDate: nextDate } : w))
    );
    try {
      await updateAssignedWorkoutScheduledDate(workoutId, nextDate);
    } catch (error) {
      console.error(error);
      setWorkouts(previous);
      notify("Could not update workout date.", "error");
    }
  };

  // Restart a program: delete its calendar workouts so it can be re-scheduled.
  // Caller confirms first (destructive — clears logged progress on this program).
  const restartClientProgram = async (program = selectedClientProgram) => {
    if (!selectedClient || !program) return false;
    const cal = getClientProgramCalendarWorkouts(program);
    if (cal.length === 0) return true;
    let allOk = true;
    for (const workout of cal) {
      try {
        const res = await fetch("/api/deleteRecord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "workout", recordId: workout.id }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) allOk = false;
      } catch (error) {
        console.error(error);
        allOk = false;
      }
    }
    await loadClientWorkouts(selectedClient, true);
    setClientProgramSessions([]);
    setClientProgramDayDates({});
    setClientProgramWeekStarts({});
    notify(
      allOk
        ? "Program reset — choose new dates to reschedule."
        : "Some sessions could not be removed. Please retry.",
      allOk ? "success" : "error"
    );
    return allOk;
  };

  const loadClientProgramSessions = async (program = selectedClientProgram) => {
    if (!program) return;

    setLoadingClientProgramSessions(true);

    try {
      const startDate = normalizeDate(
        clientProgramStartDate ||
          selectedClient?.accessStartDate ||
          selectedClientLatestOrder?.accessStartDate ||
          todayInputValue
      );
      const sessions = await buildProgramWorkoutsForOrder(program, startDate);
      const weekStarts = sessions.reduce<Record<string, string>>((weeks, session) => {
        const weekKey = String(session.week);
        if (!weeks[weekKey]) {
          weeks[weekKey] = addDays(startDate, (Number(session.week) - 1) * 7);
        }
        return weeks;
      }, {});
      const dayDates = sessions.reduce<Record<string, string>>((dates, session) => {
        dates[session.localId] = session.scheduledDate;
        return dates;
      }, {});

      setClientProgramStartDate(startDate);
      setClientProgramSessions(sessions);
      setClientProgramWeekStarts(weekStarts);
      setClientProgramDayDates(dayDates);

      if (sessions.length === 0) {
        notify("No saved sessions found for this program.", "info");
      }
    } catch (error) {
      console.error(error);
      notify("Could not load this program schedule.", "error");
    } finally {
      setLoadingClientProgramSessions(false);
    }
  };

  const populateClientProgramCalendar = async () => {
    if (!selectedClient || !selectedClientProgram) {
      notify("Please select a program first.", "error");
      return;
    }

    const programForAssignment =
      programs.find(
        (program) =>
          lookupTextMatches(selectedClientProgram.programId, program.programId) ||
          lookupTextMatches(selectedClientProgram.programId, program.recordId) ||
          lookupTextMatches(selectedClientProgram.programName, program.programName)
      ) || selectedClientProgram;

    if (selectedClientProgram.isOrderPlaceholder || programForAssignment.isOrderPlaceholder) {
      notify(
        "This order is visible, but it needs to match a saved Program record before it can populate the calendar.",
        "error"
      );
      return;
    }

    const scheduledWorkouts = getClientProgramScheduledWorkouts();

    if (scheduledWorkouts.length === 0) {
      notify("Please preview this program schedule first.", "error");
      return;
    }

    const existingCalendarWorkouts =
      getClientProgramCalendarWorkouts(programForAssignment);

    if (existingCalendarWorkouts.length > 0) {
      notify(
        "This program is already loaded in your calendar. Open Calendar to edit dates.",
        "info"
      );
      setClientTab("Training");
      return;
    }

    setPopulatingClientProgram(true);

    try {
      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          programRecordId: programForAssignment.recordId,
          scheduledWorkouts: scheduledWorkouts.map((workout) => ({
            week: workout.week,
            day: workout.day,
            sessionName: workout.sessionName,
            sessionNameCn: workout.sessionNameCn,
            scheduledDate: workout.scheduledDate,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not populate your calendar.", "error");
        return;
      }

      notify("Program added to your calendar.", "success");
      await loadClientWorkouts(selectedClient, true);
      setClientTab("Training");
    } catch (error) {
      console.error(error);
      notify("Could not populate your calendar.", "error");
    } finally {
      setPopulatingClientProgram(false);
    }
  };

  const clientProgramScheduledWorkouts = getClientProgramScheduledWorkouts();
  const clientProgramWeekNumbers = Array.from(
    new Set(clientProgramSessions.map((session) => Number(session.week)))
  ).sort((a, b) => a - b);
  const selectedClientProgramCalendarWorkouts =
    getClientProgramCalendarWorkouts(selectedClientProgram);
  const selectedClientProgramAlreadyLoaded =
    selectedClientProgramCalendarWorkouts.length > 0;
  const selectedClientProgramFirstDate =
    selectedClientProgramCalendarWorkouts
      .map((workout) => normalizeDate(String(workout.scheduledDate)))
      .filter(Boolean)
      .sort()[0] || "";
  const selectedClientProgramSortedDates = selectedClientProgramCalendarWorkouts
    .map((workout) => normalizeDate(String(workout.scheduledDate)))
    .filter(Boolean)
    .sort();
  const selectedClientProgramLastDate =
    selectedClientProgramSortedDates[selectedClientProgramSortedDates.length - 1] || "";

  // Compact in-progress dashboard data for the selected program — all real,
  // derived from its calendar workouts + logged history (no hardcoding).
  const clientProgramDashboard = (() => {
    const cal = selectedClientProgramCalendarWorkouts;
    if (!selectedClientProgram || cal.length === 0) return null;
    const isDone = (w: Workout) => /complete/i.test(w.completionStatus || "");
    const total = cal.length;
    const done = cal.filter(isDone).length;
    const pct = Math.round((done / total) * 100);
    const incomplete = cal
      .filter((w) => !isDone(w))
      .sort((a, b) =>
        String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""))
      );
    const next = incomplete[0] || null;
    const weekNums = cal.map((w) => Number(w.week) || 0);
    const maxWeek = weekNums.length ? Math.max(...weekNums) : 0;
    const currentWeek = next ? Number(next.week) || 1 : maxWeek;
    const todayKey = dateToInputValue(new Date());
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const weekChips = cal
      .filter((w) => Number(w.week) === currentWeek)
      .sort((a, b) => Number(a.day) - Number(b.day))
      .map((w) => {
        const key = normalizeDate(String(w.scheduledDate || ""));
        const d = new Date(`${key}T00:00:00`);
        const label = isNaN(d.getTime()) ? `D${w.day}` : dayNames[d.getDay()];
        const state = isDone(w) ? "done" : key === todayKey ? "today" : "planned";
        return { label, state, id: w.id };
      });
    const due = cal.filter(
      (w) => normalizeDate(String(w.scheduledDate || "")) <= todayKey
    );
    const adherence = due.length
      ? Math.round((due.filter(isDone).length / due.length) * 100)
      : 100;
    // Consecutive-day training streak from logged history.
    const trained = new Set(
      workoutHistoryLogs
        .map((l) => normalizeDate(String(l.date || "")))
        .filter(Boolean)
    );
    let dayStreak = 0;
    if (trained.size) {
      const cursor = new Date(`${todayKey}T00:00:00`);
      if (!trained.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
      while (trained.has(dateToInputValue(cursor))) {
        dayStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    // PRs: exercises whose best weight set a new max on/after the program start.
    const programFirst = selectedClientProgramFirstDate;
    const byExercise: Record<string, { date: string; w: number }[]> = {};
    for (const log of workoutHistoryLogs) {
      const w = Number(log.actualWeight);
      if (!Number.isFinite(w) || w <= 0) continue;
      const name = String(log.exerciseName || "").split(" - ")[0].trim();
      if (!name) continue;
      (byExercise[name] = byExercise[name] || []).push({
        date: normalizeDate(String(log.date || "")),
        w,
      });
    }
    let prCount = 0;
    for (const name of Object.keys(byExercise)) {
      const logs = byExercise[name].sort((a, b) => a.date.localeCompare(b.date));
      let priorMax = 0;
      let isPr = false;
      for (const e of logs) {
        if (e.w > priorMax) {
          if (programFirst && e.date >= programFirst) isPr = true;
          priorMax = e.w;
        }
      }
      if (isPr) prCount += 1;
    }
    return {
      pct,
      done,
      total,
      currentWeek,
      maxWeek,
      next,
      remaining: incomplete,
      weekChips,
      adherence,
      dayStreak,
      prCount,
    };
  })();

  // Draw the shareable finisher card to a canvas and return a PNG data URL.
  // Pure Canvas (no html2canvas dependency); the monogram is same-origin so the
  // canvas stays untainted and exports cleanly.
  const buildFinisherCard = (payload: {
    programName: string;
    weeks: number;
    sessions: number;
    prs: { name: string; weight: number }[];
    coachName: string;
  }): Promise<string> =>
    new Promise((resolve) => {
      const W = 1080;
      const H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      const gold = "#d4af37";
      const ink = "#0d0d0d";
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, W, H);
      // Gold border frame
      ctx.strokeStyle = gold;
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, W - 96, H - 96);

      const center = W / 2;
      const draw = () => {
        ctx.textAlign = "center";
        // Eyebrow
        ctx.fillStyle = gold;
        ctx.font = "700 34px Georgia, serif";
        ctx.fillText(
          paceZh ? "计 划 完 成" : "P R O G R A M   C O M P L E T E",
          center,
          560
        );
        // Program name (wrap to 2 lines if long)
        ctx.fillStyle = "#ffffff";
        const name = payload.programName || "Program";
        const fitName = (size: number) => {
          ctx.font = `800 ${size}px Georgia, serif`;
          return ctx.measureText(name).width;
        };
        let size = 84;
        while (size > 48 && fitName(size) > W - 200) size -= 4;
        ctx.font = `800 ${size}px Georgia, serif`;
        if (fitName(size) > W - 160) {
          const words = name.split(" ");
          const mid = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, mid).join(" "), center, 660);
          ctx.fillText(words.slice(mid).join(" "), center, 660 + size + 8);
        } else {
          ctx.fillText(name, center, 670);
        }
        // Checkmark seal
        ctx.beginPath();
        ctx.arc(center, 800, 46, 0, Math.PI * 2);
        ctx.fillStyle = gold;
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(center - 20, 800);
        ctx.lineTo(center - 6, 816);
        ctx.lineTo(center + 22, 784);
        ctx.stroke();

        // Stats row
        const stats: [string, string][] = [
          [String(payload.weeks), paceZh ? "周" : "WEEKS"],
          [String(payload.sessions), paceZh ? "节训练" : "SESSIONS"],
          [
            String(payload.prs.length),
            paceZh ? "个纪录" : payload.prs.length === 1 ? "PR" : "PRs",
          ],
        ];
        const colW = (W - 200) / 3;
        stats.forEach(([big, small], i) => {
          const cx = 100 + colW * i + colW / 2;
          ctx.fillStyle = gold;
          ctx.font = "800 76px Georgia, serif";
          ctx.fillText(big, cx, 960);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "700 26px Georgia, serif";
          ctx.fillText(small, cx, 1000);
        });

        // PR lines
        let y = 1080;
        if (payload.prs.length) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "700 26px Georgia, serif";
          ctx.fillText(paceZh ? "个人纪录" : "PERSONAL RECORDS", center, y);
          y += 46;
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 32px Georgia, serif";
          payload.prs.slice(0, 3).forEach((pr) => {
            ctx.fillText(
              `🏆 ${pr.name} — ${pr.weight}${paceZh ? "公斤" : "kg"}`,
              center,
              y
            );
            y += 44;
          });
        }

        // Footer
        ctx.fillStyle = gold;
        ctx.font = "700 32px Georgia, serif";
        ctx.fillText("NoLimit Training", center, H - 110);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "500 24px Georgia, serif";
        ctx.fillText(
          `${payload.coachName} · ${new Date().toLocaleDateString(
            paceZh ? "zh-CN" : "en-US",
            { year: "numeric", month: "short", day: "numeric" }
          )}`,
          center,
          H - 70
        );
        resolve(canvas.toDataURL("image/png"));
      };

      // Monogram at the top, then draw the rest.
      const logo = new Image();
      logo.onload = () => {
        const lw = 200;
        const lh = (logo.height / logo.width) * lw || 200;
        ctx.drawImage(logo, center - lw / 2, 180, lw, lh);
        draw();
      };
      logo.onerror = () => draw();
      logo.src = "/nl_monogram_clean.png";
    });

  const openFinisherCard = async (payload: {
    programName: string;
    weeks: number;
    sessions: number;
    prs: { name: string; weight: number }[];
    coachName: string;
  }) => {
    setFinisherBusy(true);
    try {
      const url = await buildFinisherCard(payload);
      if (!url) {
        notify(
          paceZh ? "无法生成图片。" : "Could not generate the image.",
          "error"
        );
        return;
      }
      setFinisherUrl(url);
      setFinisherOpen(true);
      vibrate(40);
    } finally {
      setFinisherBusy(false);
    }
  };

  const shareFinisherCard = async () => {
    if (!finisherUrl) return;
    try {
      const blob = await (await fetch(finisherUrl)).blob();
      const file = new File([blob], "nolimit-finish.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "NoLimit Training",
        } as ShareData);
        return;
      }
    } catch {
      /* fall back to download */
    }
    const a = document.createElement("a");
    a.href = finisherUrl;
    a.download = "nolimit-finish.png";
    a.click();
  };

  const openProgramReview = (programId: string, programName: string) => {
    setReviewProgram({ programId, programName });
    setReviewRating(0);
    setReviewQuote("");
    setReviewShowStore(true);
    setReviewOpen(true);
  };

  const submitProgramReview = async () => {
    if (!selectedClient || !reviewProgram || !reviewRating) return;
    setReviewSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.clientCode || selectedClient.id,
          clientName: selectedClient.name,
          programId: reviewProgram.programId,
          programName: reviewProgram.programName,
          rating: reviewRating,
          quote: reviewQuote.trim(),
          showOnStore: reviewShowStore,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error(data);
        notify(
          paceZh ? "提交失败，请重试。" : "Could not submit your rating.",
          "error"
        );
        return;
      }
      // Optimistically record it so the prompt flips to "rated" immediately.
      setClientReviews((prev) => [
        {
          recordId: data.recordId || `local-${Date.now()}`,
          reviewId: "",
          clientId: selectedClient.clientCode || selectedClient.id,
          clientName: selectedClient.name,
          programId: reviewProgram.programId,
          programName: reviewProgram.programName,
          rating: reviewRating,
          quote: reviewQuote.trim(),
          showOnStore: reviewShowStore,
          approved: false,
          submittedDate: dateToInputValue(new Date()),
        },
        ...prev,
      ]);
      setReviewOpen(false);
      vibrate(40);
      notify(paceZh ? "谢谢你的反馈！" : "Thanks for the feedback!", "success");
    } finally {
      setReviewSaving(false);
    }
  };

  const loadCoachReviews = async () => {
    try {
      const data = await (await fetch("/api/reviews")).json();
      setCoachReviews(data.reviews || []);
    } catch {
      setCoachReviews([]);
    }
  };

  const toggleReviewApproved = async (review: ProgramReview) => {
    setReviewUpdatingId(review.recordId);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: review.recordId,
          approved: !review.approved,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notify("Could not update review.", "error");
        return;
      }
      setCoachReviews((prev) =>
        prev.map((r) =>
          r.recordId === review.recordId ? { ...r, approved: !r.approved } : r
        )
      );
    } finally {
      setReviewUpdatingId("");
    }
  };

  // Coach moderation + at-a-glance ratings per program.
  const renderCoachReviews = () => {
    if (coachReviews.length === 0) return null;
    const byProgram = new Map<string, { sum: number; n: number }>();
    for (const r of coachReviews) {
      const key = r.programName || r.programId || "—";
      const agg = byProgram.get(key) || { sum: 0, n: 0 };
      agg.sum += r.rating;
      agg.n += 1;
      byProgram.set(key, agg);
    }
    return (
      <div className="coachReviewsPanel">
        <div className="loadWatchHeader" style={{ marginBottom: 10 }}>
          <strong>Program Reviews</strong>
          <span className="loadPremiumTag">
            {coachReviews.filter((r) => r.showOnStore && r.approved).length} live
          </span>
        </div>
        <div className="loadStatRow" style={{ marginBottom: 12 }}>
          {[...byProgram.entries()].slice(0, 4).map(([name, agg]) => (
            <div className="loadStat" key={name}>
              <span>{name}</span>
              <strong>
                {(agg.sum / agg.n).toFixed(1)}★
              </strong>
              <small>{agg.n} rating{agg.n === 1 ? "" : "s"}</small>
            </div>
          ))}
        </div>
        {coachReviews.map((r) => (
          <div className="coachReviewRow" key={r.recordId}>
            <div className="coachReviewBody">
              <span className="stars">
                {"★".repeat(r.rating)}
                {"☆".repeat(Math.max(0, 5 - r.rating))}
              </span>
              {r.quote && <p className="quote">“{r.quote}”</p>}
              <span className="meta">
                {r.clientName || "Client"} · {r.programName || r.programId}
                {r.showOnStore ? " · opted in" : " · private"}
                {r.submittedDate ? ` · ${r.submittedDate}` : ""}
              </span>
            </div>
            {r.showOnStore && (
              <button
                type="button"
                className={`coachReviewApprove ${r.approved ? "on" : ""}`}
                disabled={reviewUpdatingId === r.recordId}
                onClick={() => toggleReviewApproved(r)}
              >
                {r.approved ? "On store ✓" : "Approve"}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Submit the daily wellness check-in. Readiness is derived from the five
  // 1–10 scales (soreness and stress are inverted — higher = worse).
  const submitWellness = async () => {
    if (!selectedClient) return;
    const today = dateToInputValue(new Date());
    const { sleep, energy, soreness, mood, stress } = wellnessForm;
    const readiness = Math.round(
      ((sleep + energy + (11 - soreness) + mood + (11 - stress)) / 50) * 100
    );
    setWellnessSaving(true);
    try {
      const res = await fetch("/api/checkIns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.clientCode || selectedClient.id,
          clientRecordId: selectedClient.id,
          submittedDate: today,
          sleepQuality: sleep || undefined,
          sleepHours: wellnessForm.sleepHours || undefined,
          energy: energy || undefined,
          soreness: soreness || undefined,
          mood: mood || undefined,
          stress: stress || undefined,
          bodyWeight: wellnessForm.bodyWeight || undefined,
          clientNotes: wellnessForm.notes,
          readinessScore: readiness || undefined,
          status: "Daily",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error(data);
        notify(
          paceZh ? "提交失败，请重试。" : "Could not submit your check-in.",
          "error"
        );
        return;
      }
      // Keep the coach's "due" status fresh.
      fetch("/api/updateClient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          lastCheckInDate: today,
        }),
      }).catch(() => {});
      // Optimistically show the submission immediately — Bitable reads are
      // eventually consistent, so a refetch right now may not include it yet.
      const optimistic: PortalCheckIn = {
        recordId: data.recordId || `local-${Date.now()}`,
        checkInId: "",
        clientId: selectedClient.clientCode || selectedClient.id,
        submittedDate: today,
        bodyWeight: wellnessForm.bodyWeight,
        sleepHours: wellnessForm.sleepHours,
        sleepQuality: String(sleep),
        energy: String(energy),
        mood: String(mood),
        stress: String(stress),
        soreness: String(soreness),
        readinessScore: String(readiness),
        nutritionNotes: "",
        trainingNotes: "",
        wins: "",
        problemsPain: "",
        clientNotes: wellnessForm.notes,
        coachResponse: "",
        coachReviewed: false,
        reviewedDate: "",
        status: "Daily",
      };
      setClientCheckIns((prev) => [
        optimistic,
        ...prev.filter((c) => c.recordId !== optimistic.recordId),
      ]);
      setWellnessOpen(false);
      vibrate(40);
      setWellnessThanks(true);
      window.setTimeout(() => setWellnessThanks(false), 2600);
      // Reconcile with the server shortly after (keeps optimistic if not indexed yet).
      setTimeout(() => {
        fetch(
          `/api/checkIns?clientId=${selectedClient.clientCode || selectedClient.id}`
        )
          .then((r) => r.json())
          .then((refreshed) => {
            const server: PortalCheckIn[] = refreshed.checkIns || [];
            setClientCheckIns(
              server.some((c) => c.recordId === optimistic.recordId)
                ? server
                : [optimistic, ...server]
            );
          })
          .catch(() => {});
      }, 1500);
    } finally {
      setWellnessSaving(false);
    }
  };

  // Daily wellness card on the portal Home (coached clients only).
  const renderDailyCheckIn = () => {
    if (!isClientPortal || !selectedClient) return null;
    const type = selectedClient.clientType || "";
    const isCoached = /online|in-?person|coaching/i.test(type);
    if (!isCoached) return null;

    const today = dateToInputValue(new Date());
    const todayCheckIn = clientCheckIns.find((c) => c.submittedDate === today);

    // Daily check-in streak (consecutive days ending today/yesterday).
    const dates = new Set(clientCheckIns.map((c) => c.submittedDate));
    let streak = 0;
    const cur = new Date();
    if (!dates.has(dateToInputValue(cur))) cur.setDate(cur.getDate() - 1);
    while (dates.has(dateToInputValue(cur))) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    const openForm = () => {
      setWellnessForm({
        sleep: 0,
        sleepHours: "8",
        energy: 0,
        soreness: 0,
        mood: 0,
        stress: 0,
        bodyWeight: "",
        notes: "",
      });
      setWellnessOpen(true);
    };

    const collapsed = !!todayCheckIn;
    const scaleRows: {
      key: keyof typeof wellnessForm;
      label: string;
      low: string;
      high: string;
    }[] = [
      {
        key: "sleep",
        label: paceZh ? "睡眠质量" : "Sleep Quality",
        low: paceZh ? "差" : "Poor",
        high: paceZh ? "极好" : "Excellent",
      },
      {
        key: "energy",
        label: paceZh ? "精力" : "Energy",
        low: paceZh ? "差" : "Poor",
        high: paceZh ? "极好" : "Excellent",
      },
      {
        key: "soreness",
        label: paceZh ? "酸痛" : "Soreness",
        low: paceZh ? "无" : "None",
        high: paceZh ? "很多" : "A lot",
      },
      {
        key: "mood",
        label: paceZh ? "心情" : "Mood",
        low: paceZh ? "低落" : "Low",
        high: paceZh ? "极好" : "Excellent",
      },
      {
        key: "stress",
        label: paceZh ? "压力" : "Stress",
        low: paceZh ? "低" : "Low",
        high: paceZh ? "高" : "High",
      },
    ];

    return (
      <>
        <div className={`wellnessCard ${collapsed ? "done" : ""}`}>
          {collapsed ? (
            <div className="wellnessDoneRow">
              <strong>
                {paceZh ? "✓ 今天已打卡" : "✓ Checked in today"}
              </strong>
              {streak > 1 && (
                <span className="wellnessStreak">🔥 {streak}</span>
              )}
            </div>
          ) : (
            <>
              <div className="wellnessPrompt">
                <strong>
                  {paceZh ? "今天感觉如何？" : "How are you feeling today?"}
                </strong>
                <span>
                  {paceZh
                    ? "每日打卡，教练会看到你的状态趋势。"
                    : "A quick daily check-in — your coach tracks your trends."}
                </span>
              </div>
              <button type="button" className="wellnessCta" onClick={openForm}>
                {paceZh ? "开始打卡 →" : "Check in →"}
              </button>
              {streak > 1 && (
                <span className="wellnessStreakInline">
                  🔥 {paceZh ? `连续 ${streak} 天` : `${streak}-day streak`}
                </span>
              )}
            </>
          )}
        </div>

        {wellnessOpen && (
          <div className="wellnessOverlay" onClick={() => setWellnessOpen(false)}>
            <div
              className="wellnessModal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{paceZh ? "今日状态" : "Daily check-in"}</h3>
              {scaleRows.map(({ key, label, low, high }) => (
                <div className="wellnessRow10" key={key}>
                  <span className="wellnessRowLabel">
                    {label}
                    {Number(wellnessForm[key]) > 0 && (
                      <em className="wellnessRowValue">
                        {Number(wellnessForm[key])}/10
                      </em>
                    )}
                  </span>
                  <div className="wellnessScale10">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={`wellnessDot10 ${
                          Number(wellnessForm[key]) >= n ? "on" : ""
                        }`}
                        onClick={() =>
                          setWellnessForm((f) => ({ ...f, [key]: n }))
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="wellnessAnchors">
                    <span>{low}</span>
                    <span>{high}</span>
                  </div>
                </div>
              ))}
              <label className="wellnessField wellnessSliderField">
                <span>
                  {paceZh ? "睡眠时长" : "Sleep duration"}
                  <em className="wellnessRowValue">
                    {wellnessForm.sleepHours || 0} {paceZh ? "小时" : "h"}
                  </em>
                </span>
                <input
                  type="range"
                  className="wellnessSlider"
                  min="0"
                  max="16"
                  step="0.5"
                  value={wellnessForm.sleepHours || "0"}
                  onChange={(e) =>
                    setWellnessForm((f) => ({ ...f, sleepHours: e.target.value }))
                  }
                />
                <div className="wellnessAnchors">
                  <span>0h</span>
                  <span>16h</span>
                </div>
              </label>
              <label className="wellnessField">
                <span>{paceZh ? "体重 (kg)" : "Body weight (kg)"}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={wellnessForm.bodyWeight}
                  onChange={(e) =>
                    setWellnessForm((f) => ({ ...f, bodyWeight: e.target.value }))
                  }
                />
              </label>
              <label className="wellnessField">
                <span>{paceZh ? "备注" : "Notes"}</span>
                <textarea
                  rows={2}
                  value={wellnessForm.notes}
                  placeholder={paceZh ? "今天感觉怎么样？" : "How did today feel?"}
                  onChange={(e) =>
                    setWellnessForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              <div className="wellnessActions">
                <button
                  type="button"
                  className="wellnessSubmit"
                  disabled={
                    wellnessSaving ||
                    !wellnessForm.sleep ||
                    !wellnessForm.energy ||
                    !wellnessForm.soreness ||
                    !wellnessForm.mood ||
                    !wellnessForm.stress
                  }
                  onClick={submitWellness}
                >
                  {wellnessSaving
                    ? paceZh
                      ? "提交中…"
                      : "Submitting…"
                    : paceZh
                      ? "提交"
                      : "Submit"}
                </button>
                <button
                  type="button"
                  className="wellnessCancel"
                  onClick={() => setWellnessOpen(false)}
                >
                  {paceZh ? "取消" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {wellnessThanks && (
          <div className="wellnessThanksOverlay">
            <div className="wellnessThanksCard">
              <span className="wellnessThanksEmoji">🎉</span>
              <strong className="wellnessThanksText">
                {paceZh ? "感谢打卡！" : "Thanks for submitting!"}
              </strong>
            </div>
          </div>
        )}
      </>
    );
  };

  // Coach: trend chart of a selected daily-wellness metric for the viewed client.
  const renderWellnessTrends = () => {
    if (clientCheckIns.length === 0) {
      return (
        <p className="homeEmptyText">
          {paceZh ? "暂无每日打卡数据。" : "No daily check-ins logged yet."}
        </p>
      );
    }
    const metrics: {
      key: typeof wellnessMetric;
      label: string;
      unit: string;
      get: (c: PortalCheckIn) => number;
    }[] = [
      { key: "readiness", label: paceZh ? "状态" : "Readiness", unit: "", get: (c) => Number(c.readinessScore) || 0 },
      { key: "sleep", label: paceZh ? "睡眠质量" : "Sleep Quality", unit: "", get: (c) => Number(c.sleepQuality) || 0 },
      { key: "sleepHours", label: paceZh ? "睡眠时长" : "Sleep Duration", unit: "h", get: (c) => Number(c.sleepHours) || 0 },
      { key: "energy", label: paceZh ? "精力" : "Energy", unit: "", get: (c) => Number(c.energy) || 0 },
      { key: "soreness", label: paceZh ? "酸痛" : "Soreness", unit: "", get: (c) => Number(c.soreness) || 0 },
      { key: "mood", label: paceZh ? "心情" : "Mood", unit: "", get: (c) => Number(c.mood) || 0 },
      { key: "stress", label: paceZh ? "压力" : "Stress", unit: "", get: (c) => Number(c.stress) || 0 },
      { key: "bodyWeight", label: paceZh ? "体重" : "Weight", unit: "kg", get: (c) => Number(c.bodyWeight) || 0 },
    ];
    const cfg = metrics.find((m) => m.key === wellnessMetric) || metrics[0];
    const raw = clientCheckIns
      .slice()
      .sort((a, b) => a.submittedDate.localeCompare(b.submittedDate))
      .map((c) => ({ date: c.submittedDate, value: cfg.get(c) }))
      .filter((p) => p.value > 0)
      .slice(-30);
    // Daily values + a trailing 7-day ("weekly") moving average overlay.
    const points = raw.map((p, i) => {
      const win = raw.slice(Math.max(0, i - 6), i + 1);
      const avg =
        Math.round((win.reduce((a, x) => a + x.value, 0) / win.length) * 10) / 10;
      return { date: p.date, value: p.value, avg };
    });
    const latest = points[points.length - 1];
    const weeklyAvg = latest ? latest.avg : 0;
    return (
      <div className="wellnessTrends">
        <div className="wellnessMetricToggle">
          {metrics.map((m) => (
            <button
              key={m.key}
              type="button"
              className={wellnessMetric === m.key ? "active" : ""}
              onClick={() => setWellnessMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {points.length > 0 ? (
          <>
            <div className="progressChartSummary">
              <div>
                <span>{paceZh ? "最新" : "Latest"}</span>
                <strong>
                  {latest.value}
                  {cfg.unit}
                </strong>
              </div>
              <div>
                <span>{paceZh ? "周均" : "Weekly avg"}</span>
                <strong>
                  {weeklyAvg}
                  {cfg.unit}
                </strong>
              </div>
            </div>
            <Suspense fallback={<div className="chartLoading">{t("loading")}</div>}>
              <WellnessChart
                points={points}
                locale={clientLocale}
                unit={cfg.unit}
                dailyLabel={paceZh ? "当日" : "Daily"}
                avgLabel={paceZh ? "周均" : "Weekly avg"}
              />
            </Suspense>
          </>
        ) : (
          <p className="homeEmptyText">
            {paceZh ? "该指标暂无数据。" : "No data for this metric yet."}
          </p>
        )}
      </div>
    );
  };

  // Lifetime "trophy case" — badges that accumulate across all of the athlete's
  // training history (independent of any single program). Pure client-side.
  const renderTrophyCase = () => {
    const trainedDates = new Set(
      workoutHistoryLogs.map((l) => (l.date || "").slice(0, 10)).filter(Boolean)
    );
    const totalDays = trainedDates.size;
    const maxWeight = workoutHistoryLogs.reduce((m, l) => {
      const w = parseFloat(l.actualWeight);
      return !Number.isNaN(w) && w > m ? w : m;
    }, 0);
    const distinctExercises = new Set(
      workoutHistoryLogs
        .map((l) => (l.exerciseName || "").split(" - ")[0])
        .filter(Boolean)
    ).size;
    // Lifetime PR count (exercises where a later session beat an earlier best).
    const prByEx = new Map<string, { w: number; date: string }[]>();
    for (const l of workoutHistoryLogs) {
      const w = parseFloat(l.actualWeight);
      if (Number.isNaN(w) || w <= 0) continue;
      const base = (l.exerciseName || "").split(" - ")[0];
      if (!base) continue;
      if (!prByEx.has(base)) prByEx.set(base, []);
      prByEx.get(base)!.push({ w, date: (l.date || "").slice(0, 10) });
    }
    let prCount = 0;
    for (const [, logs] of prByEx) {
      let best = 0;
      let bestDate = "";
      for (const e of logs)
        if (e.w > best) {
          best = e.w;
          bestDate = e.date;
        }
      const prior = logs
        .filter((e) => e.date < bestDate)
        .reduce((m, e) => (e.w > m ? e.w : m), 0);
      if (best > prior && prior > 0) prCount++;
    }
    // Longest run of consecutive Mon–Sun weeks with a training day.
    const mondayOf = (d: Date) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      return dateToInputValue(dt);
    };
    const weekStarts = [
      ...new Set([...trainedDates].map((d) => mondayOf(new Date(`${d}T00:00:00`)))),
    ].sort();
    let bestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const wk of weekStarts) {
      if (prev === null) run = 1;
      else {
        const diff = Math.round(
          (new Date(wk).getTime() - new Date(prev).getTime()) / (7 * 86400000)
        );
        run = diff === 1 ? run + 1 : 1;
      }
      bestStreak = Math.max(bestStreak, run);
      prev = wk;
    }

    type Badge = {
      icon: string;
      en: string;
      zh: string;
      earned: boolean;
      remain?: string;
    };
    const sessionRemain = (n: number) =>
      totalDays < n
        ? paceZh
          ? `还差 ${n - totalDays} 节`
          : `${n - totalDays} to go`
        : undefined;
    const badges: Badge[] = [
      { icon: "🎯", en: "First session", zh: "首次训练", earned: totalDays >= 1 },
      { icon: "🥉", en: "10 sessions", zh: "10 节训练", earned: totalDays >= 10, remain: sessionRemain(10) },
      { icon: "🥈", en: "25 sessions", zh: "25 节训练", earned: totalDays >= 25, remain: sessionRemain(25) },
      { icon: "🥇", en: "50 sessions", zh: "50 节训练", earned: totalDays >= 50, remain: sessionRemain(50) },
      { icon: "🏆", en: "100 sessions", zh: "100 节训练", earned: totalDays >= 100, remain: sessionRemain(100) },
      { icon: "💪", en: "First 50kg", zh: "首次 50 公斤", earned: maxWeight >= 50 },
      { icon: "🦾", en: "100kg club", zh: "100 公斤俱乐部", earned: maxWeight >= 100 },
      { icon: "⭐", en: "5 PRs", zh: "5 个纪录", earned: prCount >= 5, remain: prCount < 5 ? (paceZh ? `还差 ${5 - prCount}` : `${5 - prCount} to go`) : undefined },
      { icon: "🌟", en: "10 PRs", zh: "10 个纪录", earned: prCount >= 10, remain: prCount < 10 ? (paceZh ? `还差 ${10 - prCount}` : `${10 - prCount} to go`) : undefined },
      { icon: "🔥", en: "4-week streak", zh: "连续 4 周", earned: bestStreak >= 4, remain: bestStreak < 4 ? (paceZh ? `最佳 ${bestStreak} 周` : `best ${bestStreak} wk`) : undefined },
      { icon: "🧭", en: "15 exercises", zh: "15 个动作", earned: distinctExercises >= 15, remain: distinctExercises < 15 ? (paceZh ? `还差 ${15 - distinctExercises}` : `${15 - distinctExercises} to go`) : undefined },
    ];
    const earnedCount = badges.filter((b) => b.earned).length;

    return (
      <div className="trophyCase">
        <div className="trophyCaseHead">
          <h4>{paceZh ? "🏆 你的奖杯" : "🏆 Your trophies"}</h4>
          <span>
            {earnedCount}/{badges.length} {paceZh ? "已解锁" : "unlocked"}
          </span>
        </div>
        <div className="trophyGrid">
          {badges.map((b, i) => (
            <div
              className={`trophyBadge ${b.earned ? "earned" : "locked"}`}
              key={i}
            >
              <span className="trophyIcon">{b.earned ? b.icon : "🔒"}</span>
              <span className="trophyLabel">{paceZh ? b.zh : b.en}</span>
              {!b.earned && b.remain && (
                <span className="trophyRemain">{b.remain}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const dismissStartHere = (pid: string) => {
    setStartHereForcedPid("");
    setStartHereDismissed((prev) => {
      const next = prev.includes(pid) ? prev : [...prev, pid];
      try {
        localStorage.setItem("nl_starthere_dismissed", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // "Program home" — progress, next workout, and the week-by-week syllabus for
  // the selected purchased program (shown once it's loaded onto the calendar).
  const renderProgramHome = () => {
    const isDone = (w: Workout) => /complete/i.test(w.completionStatus || "");
    const sessions = [...selectedClientProgramCalendarWorkouts].sort((a, b) => {
      const wa = Number(a.week) || 0;
      const wb = Number(b.week) || 0;
      if (wa !== wb) return wa - wb;
      return (Number(a.day) || 0) - (Number(b.day) || 0);
    });
    if (sessions.length === 0) return null;
    const total = sessions.length;
    const completed = sessions.filter(isDone).length;
    const pct = Math.round((completed / total) * 100);
    const incomplete = sessions.filter((w) => !isDone(w));
    const next =
      [...incomplete].sort((a, b) =>
        (normalizeDate(String(a.scheduledDate)) || "9999-99-99").localeCompare(
          normalizeDate(String(b.scheduledDate)) || "9999-99-99"
        )
      )[0] || null;
    const weekMap = new Map<number, Workout[]>();
    for (const w of sessions) {
      const wk = Number(w.week) || 1;
      if (!weekMap.has(wk)) weekMap.set(wk, []);
      weekMap.get(wk)!.push(w);
    }
    const weeks = [...weekMap.entries()].sort((a, b) => a[0] - b[0]);
    const maxWeek = weeks[weeks.length - 1]?.[0] || 1;
    const currentWeek = next ? Number(next.week) || 1 : maxWeek;
    const allDone = completed === total;

    // ----- Momentum: streak + consistency calendar (real training days) -----
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const trainedDates = new Set(
      workoutHistoryLogs.map((l) => (l.date || "").slice(0, 10)).filter(Boolean)
    );
    const todayKey = dateToInputValue(new Date());
    const trainedToday = trainedDates.has(todayKey);
    const todaySession = sessions.find(
      (s) => normalizeDate(String(s.scheduledDate)) === todayKey
    );
    // Week streak: consecutive Mon–Sun weeks with at least one trained day,
    // counting back from this week (this week is forgiven if not started yet).
    const mondayOf = (d: Date) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      return dateToInputValue(dt);
    };
    const trainedWeeks = new Set(
      [...trainedDates].map((d) => mondayOf(new Date(`${d}T00:00:00`)))
    );
    let streakWeeks = 0;
    const probe = new Date();
    if (!trainedWeeks.has(mondayOf(probe))) probe.setDate(probe.getDate() - 7);
    while (trainedWeeks.has(mondayOf(probe))) {
      streakWeeks++;
      probe.setDate(probe.getDate() - 7);
    }
    // Current-month calendar grid (Mon-first), dots on trained days.
    const calNow = new Date();
    const calYear = calNow.getFullYear();
    const calMonth = calNow.getMonth();
    const calLead = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
    const calDays = new Date(calYear, calMonth + 1, 0).getDate();
    const calCells: (string | null)[] = [];
    for (let i = 0; i < calLead; i++) calCells.push(null);
    for (let d = 1; d <= calDays; d++)
      calCells.push(`${calYear}-${pad2(calMonth + 1)}-${pad2(d)}`);
    const trainedThisMonth = calCells.filter(
      (k) => k && trainedDates.has(k)
    ).length;
    const monthLabel = paceZh
      ? `${calMonth + 1}月`
      : calNow.toLocaleString("en-US", { month: "long" });
    const dayHeads = paceZh
      ? ["一", "二", "三", "四", "五", "六", "日"]
      : ["M", "T", "W", "T", "F", "S", "S"];

    // ----- PR moments earned during this program's date window -----
    const programFirst = selectedClientProgramFirstDate;
    const prByExercise = new Map<string, { w: number; date: string }[]>();
    for (const l of workoutHistoryLogs) {
      const w = parseFloat(l.actualWeight);
      if (Number.isNaN(w) || w <= 0) continue;
      const base = (l.exerciseName || "").split(" - ")[0];
      if (!base) continue;
      if (!prByExercise.has(base)) prByExercise.set(base, []);
      prByExercise.get(base)!.push({ w, date: (l.date || "").slice(0, 10) });
    }
    const prMoments: { name: string; weight: number }[] = [];
    for (const [name, logs] of prByExercise) {
      let best = 0;
      let bestDate = "";
      for (const e of logs)
        if (e.w > best) {
          best = e.w;
          bestDate = e.date;
        }
      const priorMax = logs
        .filter((e) => e.date < bestDate)
        .reduce((m, e) => (e.w > m ? e.w : m), 0);
      if (best > priorMax && priorMax > 0 && (!programFirst || bestDate >= programFirst))
        prMoments.push({ name, weight: best });
    }
    prMoments.sort((a, b) => b.weight - a.weight);

    // ----- Milestone badges from program progress -----
    const completedWeekNums = weeks
      .filter(([, items]) => items.every(isDone))
      .map(([wk]) => wk);
    const lastCompletedWeek = completedWeekNums.length
      ? Math.max(...completedWeekNums)
      : 0;
    const milestones: string[] = [];
    if (completed === 1)
      milestones.push(paceZh ? "首次训练完成 🎉" : "First session done 🎉");
    if (lastCompletedWeek > 0)
      milestones.push(
        paceZh ? `第 ${lastCompletedWeek} 周完成 ✅` : `Week ${lastCompletedWeek} complete ✅`
      );
    if (pct >= 50 && pct < 80)
      milestones.push(paceZh ? "已过半 🎯" : "Halfway there 🎯");
    if (pct >= 80 && pct < 100)
      milestones.push(paceZh ? "就快完成 🔥" : "Almost there 🔥");

    // ----- Coach presence -----
    const coachName = (selectedClientProgram?.coach || "Kent Bastell").trim();
    const coachInitials =
      coachName
        .split(/\s+/)
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "NL";
    const coachMsg = allDone
      ? paceZh
        ? "干得漂亮，全部完成了！"
        : "Incredible work finishing this block."
      : pct >= 50
        ? paceZh
          ? "已经过半，保持节奏！"
          : "You're past halfway — keep the rhythm going."
        : completed > 0
          ? paceZh
            ? "开局不错，保持稳定。"
            : "Strong start — consistency is everything."
          : paceZh
            ? "我们开始吧，第一节训练在等你。"
            : "Let's get to work — your first session awaits.";

    const nextIsToday =
      !!next && normalizeDate(String(next.scheduledDate)) === todayKey;

    return (
      <div className="programHome">
        {(() => {
          const pid = selectedClientProgram?.programId || "";
          if (!pid) return null;
          const show =
            (completed === 0 && !startHereDismissed.includes(pid)) ||
            startHereForcedPid === pid;
          if (!show) return null;
          const perWeek =
            Number(selectedClientProgram?.sessionsPerWeek) ||
            (maxWeek ? Math.round(total / maxWeek) : total);
          const expect =
            (paceZh &&
              (selectedClientProgram?.goalCn ||
                selectedClientProgram?.salesDescriptionCn ||
                selectedClientProgram?.storeDescriptionCn)) ||
            selectedClientProgram?.goal ||
            selectedClientProgram?.salesDescription ||
            selectedClientProgram?.storeDescription ||
            "";
          const weeksCount = Number(selectedClientProgram?.durationWeeks) || maxWeek;
          const metaParts = [
            `${weeksCount} ${paceZh ? "周" : weeksCount === 1 ? "week" : "weeks"}`,
            paceZh ? `每周 ${perWeek} 次` : `${perWeek}/week`,
            selectedClientProgram?.level || "",
          ].filter(Boolean);
          const tips = paceZh
            ? [
                "点击下方训练，再点「开始」，逐组引导你完成。",
                "训练时逐组记录，数据会自动保存。",
                "在「编辑」标签里可自由调整每周训练安排。",
                "完成打卡，连续天数和奖杯都会随之增长。",
              ]
            : [
                "Tap a session below, then Start for guided, set-by-set training.",
                "Log each set as you go — your numbers save automatically.",
                "Use the Edit tab to rearrange sessions around your week.",
                "Tick sessions off and watch your streak and trophies grow.",
              ];
          return (
            <div className="programStartHere">
              <span className="startHereEyebrow">
                {paceZh ? "从这里开始" : "Start here"}
              </span>
              <strong className="startHereTitle">
                {paceZh ? "欢迎来到 " : "Welcome to "}
                {localizedProgramName(selectedClientProgram)}
              </strong>
              <div className="startHereMeta">{metaParts.join(" · ")}</div>
              {expect && <p className="startHereExpect">{expect}</p>}
              <ul className="startHereTips">
                {tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
              <div className="startHereActions">
                {next && (
                  <button
                    type="button"
                    className="startHereStart"
                    onClick={() => {
                      dismissStartHere(pid);
                      openWorkout(next);
                    }}
                  >
                    {paceZh
                      ? `开始第 ${next.week} 周 →`
                      : `Start week ${next.week} →`}
                  </button>
                )}
                <button
                  type="button"
                  className="startHereDismiss"
                  onClick={() => dismissStartHere(pid)}
                >
                  {paceZh ? "知道了" : "Got it"}
                </button>
              </div>
            </div>
          );
        })()}

        <div className="programCoachCard">
          <span className="programCoachAvatar">{coachInitials}</span>
          <div className="programCoachBody">
            <span className="programCoachName">
              {coachName} · {paceZh ? "你的教练" : "your coach"}
            </span>
            <strong className="programCoachMsg">{coachMsg}</strong>
          </div>
        </div>

        <div
          className={`programStatusPill ${
            trainedToday
              ? "trained"
              : todaySession && !isDone(todaySession)
                ? "training"
                : "rest"
          }`}
        >
          {trainedToday
            ? paceZh
              ? "✓ 今天已训练"
              : "✓ Trained today"
            : todaySession && !isDone(todaySession)
              ? paceZh
                ? "今天 · 训练日"
                : "Today · training day"
              : paceZh
                ? "休息日 · 好好恢复"
                : "Rest day · recover well"}
        </div>

        <div className="programProgressCard">
          <div
            className="programProgressRing"
            style={{
              background: `conic-gradient(#d4af37 ${pct * 3.6}deg, rgba(212,175,55,0.18) 0deg)`,
            }}
          >
            <span>{pct}%</span>
          </div>
          <div className="programProgressMeta">
            <strong>
              {completed}/{total}{" "}
              {paceZh ? "节训练完成" : completed === 1 ? "session done" : "sessions done"}
            </strong>
            <span>
              {paceZh
                ? `第 ${currentWeek} 周 / 共 ${maxWeek} 周`
                : `Week ${currentWeek} of ${maxWeek}`}
            </span>
          </div>
        </div>

        {next ? (
          <button
            type="button"
            className={`programNextCard ${nextIsToday ? "today" : ""}`}
            onClick={() => openWorkout(next)}
          >
            <span className="programNextLabel">
              {nextIsToday
                ? paceZh
                  ? "今天的训练"
                  : "Today's session"
                : paceZh
                  ? "下一节训练"
                  : "Up next"}
            </span>
            <strong>{localizedWorkoutName(next)}</strong>
            <small>
              {paceZh
                ? `第 ${next.week} 周 · 第 ${next.day} 天`
                : `Week ${next.week} · Day ${next.day}`}
              {next.scheduledDate
                ? ` · ${localizedCalendarLabel(
                    normalizeDate(String(next.scheduledDate))
                  )}`
                : ""}
            </small>
            <em className="programNextStart">{paceZh ? "开始 →" : "Start →"}</em>
          </button>
        ) : (
          allDone && (
            <div className="programDoneCard">
              <strong>{paceZh ? "全部完成 🎉" : "Program complete 🎉"}</strong>
              <span>
                {paceZh
                  ? "你已完成本计划的所有训练。"
                  : "You've finished every session in this program."}
              </span>
              <button
                type="button"
                className="programShareBtn"
                disabled={finisherBusy}
                onClick={() =>
                  openFinisherCard({
                    programName: localizedProgramName(selectedClientProgram),
                    weeks: maxWeek,
                    sessions: total,
                    prs: prMoments,
                    coachName: coachName,
                  })
                }
              >
                {finisherBusy
                  ? paceZh
                    ? "生成中…"
                    : "Creating…"
                  : paceZh
                    ? "分享我的成绩 📤"
                    : "Share my finish 📤"}
              </button>
              {(() => {
                const pid = selectedClientProgram?.programId || "";
                const mine = clientReviews.find((r) => r.programId === pid);
                if (mine) {
                  return (
                    <div className="programRatedRow">
                      {paceZh ? "你的评分" : "Your rating"}{" "}
                      <span className="programRatedStars">
                        {"★".repeat(mine.rating)}
                        {"☆".repeat(Math.max(0, 5 - mine.rating))}
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    type="button"
                    className="programRateBtn"
                    onClick={() =>
                      openProgramReview(
                        pid,
                        localizedProgramName(selectedClientProgram)
                      )
                    }
                  >
                    {paceZh ? "★ 评价这个计划" : "★ Rate this program"}
                  </button>
                );
              })()}
              {(() => {
                const owned = new Set(
                  uniqueClientPurchasedPrograms.map((p) => p.programId)
                );
                const moreToBuy = programs.some(
                  (p) =>
                    p.publicStoreVisible &&
                    p.status !== "Archived" &&
                    !owned.has(p.programId)
                );
                if (!moreToBuy) return null;
                return (
                  <button
                    type="button"
                    className="programDoneCta"
                    onClick={() => setProgramsTab("store")}
                  >
                    {paceZh ? "看看下一步 →" : "See what's next →"}
                  </button>
                );
              })()}
            </div>
          )
        )}

        <div className="programStreakCard">
          <div className="programStreakHead">
            <div className="programStreak">
              <span className="programStreakFlame">🔥</span>
              <strong>{streakWeeks}</strong>
              <span className="programStreakUnit">
                {paceZh
                  ? "周连续"
                  : streakWeeks === 1
                    ? "week streak"
                    : "week streak"}
              </span>
            </div>
            <span className="programStreakMonth">
              {monthLabel} · {trainedThisMonth}{" "}
              {paceZh ? "天训练" : trainedThisMonth === 1 ? "day" : "days"}
            </span>
          </div>
          <div className="programCalHeads">
            {dayHeads.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="programCalGrid">
            {calCells.map((k, i) =>
              k === null ? (
                <span key={i} className="programCalCell empty" />
              ) : (
                <span
                  key={i}
                  className={`programCalCell ${
                    trainedDates.has(k) ? "trained" : ""
                  } ${k === todayKey ? "today" : ""}`}
                >
                  {Number(k.slice(-2))}
                </span>
              )
            )}
          </div>
        </div>

        {(milestones.length > 0 || prMoments.length > 0) && (
          <div className="programMomentCard">
            <h4>{paceZh ? "你的高光时刻" : "Your wins"}</h4>
            <div className="programMomentChips">
              {milestones.map((m, i) => (
                <span className="programMomentChip" key={`m${i}`}>
                  {m}
                </span>
              ))}
              {prMoments.slice(0, 4).map((pr, i) => (
                <span className="programMomentChip pr" key={`p${i}`}>
                  🏆 {pr.name} {pr.weight}
                  {paceZh ? "公斤" : "kg"}
                </span>
              ))}
            </div>
            {prMoments.length > 0 && (
              <span className="programMomentSub">
                {paceZh
                  ? `本计划期间打破了 ${prMoments.length} 项个人纪录`
                  : `${prMoments.length} personal record${
                      prMoments.length === 1 ? "" : "s"
                    } set during this program`}
              </span>
            )}
          </div>
        )}

        <div className="programSyllabus">
          <div className="programSyllabusHead">
            <h4>{paceZh ? "训练安排" : "Your plan"}</h4>
            <button
              type="button"
              className="programGuideLink"
              onClick={() =>
                setStartHereForcedPid(selectedClientProgram?.programId || "")
              }
            >
              {paceZh ? "ⓘ 计划指南" : "ⓘ Program guide"}
            </button>
          </div>
          {weeks.map(([wk, items]) => {
            const wkDone = items.filter(isDone).length;
            return (
              <div className="programWeek" key={wk}>
                <div className="programWeekHead">
                  <strong>{paceZh ? `第 ${wk} 周` : `Week ${wk}`}</strong>
                  <span>
                    {wkDone}/{items.length}
                  </span>
                </div>
                {items
                  .slice()
                  .sort((a, b) => (Number(a.day) || 0) - (Number(b.day) || 0))
                  .map((w) => (
                    <button
                      type="button"
                      className={`programSession ${isDone(w) ? "done" : ""}`}
                      key={w.id}
                      onClick={() => openWorkout(w)}
                    >
                      <span className="programSessionTick">
                        {isDone(w) ? "✓" : ""}
                      </span>
                      <span className="programSessionName">
                        {localizedWorkoutName(w)}
                      </span>
                      <span className="programSessionMeta">
                        {paceZh ? `第 ${w.day} 天` : `Day ${w.day}`}
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>

        {finisherOpen && (
          <div
            className="finisherOverlay"
            onClick={() => setFinisherOpen(false)}
          >
            <div
              className="finisherModal"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className="finisherImg"
                src={finisherUrl}
                alt={paceZh ? "完成证书" : "Finisher card"}
              />
              <p className="finisherHint">
                {paceZh
                  ? "长按图片即可保存，分享到朋友圈 🎉"
                  : "Long-press the image to save, then share it 🎉"}
              </p>
              <div className="finisherActions">
                <button
                  type="button"
                  className="finisherShare"
                  onClick={shareFinisherCard}
                >
                  {paceZh ? "保存 / 分享" : "Save / Share"}
                </button>
                <button
                  type="button"
                  className="finisherClose"
                  onClick={() => setFinisherOpen(false)}
                >
                  {paceZh ? "关闭" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}

        {reviewOpen && reviewProgram && (
          <div className="wellnessOverlay" onClick={() => setReviewOpen(false)}>
            <div className="wellnessModal" onClick={(e) => e.stopPropagation()}>
              <h3>{paceZh ? "评价这个计划" : "Rate this program"}</h3>
              <p className="reviewProgLabel">{reviewProgram.programName}</p>
              <div className="reviewStars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`reviewStar ${reviewRating >= n ? "on" : ""}`}
                    onClick={() => setReviewRating(n)}
                    aria-label={`${n} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <label className="wellnessField">
                <span>
                  {paceZh
                    ? "想说点什么吗？（可选）"
                    : "Anything you'd like to add? (optional)"}
                </span>
                <textarea
                  rows={3}
                  value={reviewQuote}
                  placeholder={
                    paceZh
                      ? "这个计划对你有什么帮助？"
                      : "What did this program do for you?"
                  }
                  onChange={(e) => setReviewQuote(e.target.value)}
                />
              </label>
              <label className="reviewConsent">
                <input
                  type="checkbox"
                  checked={reviewShowStore}
                  onChange={(e) => setReviewShowStore(e.target.checked)}
                />
                <span>
                  {paceZh
                    ? "可以在商店展示我的评价（仅名字首字）"
                    : "Let my review appear on the store (first name only)"}
                </span>
              </label>
              <div className="wellnessActions">
                <button
                  type="button"
                  className="wellnessSubmit"
                  disabled={reviewSaving || !reviewRating}
                  onClick={submitProgramReview}
                >
                  {reviewSaving
                    ? paceZh
                      ? "提交中…"
                      : "Submitting…"
                    : paceZh
                      ? "提交评价"
                      : "Submit rating"}
                </button>
                <button
                  type="button"
                  className="wellnessCancel"
                  onClick={() => setReviewOpen(false)}
                >
                  {paceZh ? "取消" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Cross-sell: store programs/add-ons/bundles the athlete doesn't already own.
  const renderProgramStore = () => {
    const owned = new Set(
      uniqueClientPurchasedPrograms.map((p) => p.programId)
    );
    const forSale = programs.filter(
      (p) =>
        p.publicStoreVisible &&
        p.status !== "Archived" &&
        !owned.has(p.programId)
    );
    if (forSale.length === 0) {
      return (
        <div className="clientProgramEmpty">
          <p>
            {paceZh
              ? "暂时没有更多可购买的计划。"
              : "No other programs available right now."}
          </p>
        </div>
      );
    }
    return (
      <div className="programStoreList">
        <p className="programStoreHint">
          {paceZh
            ? "探索更多训练计划、套餐和加购模块。"
            : "Explore more programs, bundles, and add-ons."}
        </p>
        {forSale.map((p) => (
          <a
            className="programStoreItem"
            key={p.recordId}
            href="/?page=store"
          >
            <div>
              <strong>{localizedProgramName(p)}</strong>
              <span>
                {localizedProductType(p.productType)}
                {p.storeCategory ? ` · ${p.storeCategory}` : ""}
              </span>
            </div>
            <span className="programStorePrice">
              {p.price ? `${p.currency || "CNY"} ${p.price}` : ""}
            </span>
          </a>
        ))}
        <a className="outlineButton programStoreBrowse" href="/?page=store">
          {paceZh ? "打开商店" : "Open store"}
        </a>
      </div>
    );
  };

  const assignOrderProgram = async (order: ProductOrder) => {
    const availablePrograms = programs.length > 0 ? programs : await loadPrograms();

    const client = getOrderClient(order) || (await createClientFromOrder(order));
    const program = getOrderProgram(order, availablePrograms);

    if (!client) {
      notify("Create or match the client before loading the program.", "error");
      return;
    }

    if (!program) {
      notify("No saved program matches this order.", "error");
      return;
    }

    setOrderProcessingId(order.recordId);

    try {
      const scheduledWorkouts = await buildProgramWorkoutsForOrder(
        program,
        getOrderStartDate(order)
      );

      if (scheduledWorkouts.length === 0) {
        notify("This program has no saved workout sessions.", "error");
        return;
      }

      const response = await fetch("/api/assignProgram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          programRecordId: program.recordId,
          scheduledWorkouts,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not load program from order.", "error");
        return;
      }

      await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          program: program.programName,
          purchasedProgramId: program.programId,
          paymentStatus: order.paymentStatus || client.paymentStatus || "Paid",
          accessStartDate: order.accessStartDate || getOrderStartDate(order),
          accessEndDate: order.accessEndDate || client.accessEndDate || "",
        }),
      });
      await updateProductOrder(order, {
        clientRecordId: client.id,
        clientCode: client.clientCode,
        clientName: client.name,
        onboardingStatus: "Program Loaded",
        fulfillmentStatus: "Fulfilled",
        fulfilledAt: todayInputValue,
        programId: program.programId,
        programName: program.programName,
        paymentStatus: order.paymentStatus || "Paid",
        accessStartDate: order.accessStartDate || getOrderStartDate(order),
        accessEndDate: order.accessEndDate || client.accessEndDate || "",
      });
      await loadClients(true);
      notify(
        `${program.programName} loaded for ${client.name}. Workouts created: ${data.recordsCreated}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not load program from order.", "error");
    } finally {
      setOrderProcessingId("");
    }
  };

  const reviewAndLoadProgram = async (order: ProductOrder) => {
    if (!getOrderClient(order)) {
      notify("Create or match the client before loading.", "error");
      return;
    }
    if (!getOrderProgram(order)) {
      notify("No saved program matches this order.", "error");
      return;
    }
    const reviewSaved = await markOrderIntakeReviewed(order);
    if (!reviewSaved) return;

    const refreshed = await loadProductOrders(true);
    const updatedOrder =
      (refreshed as ProductOrder[]).find((o) => o.recordId === order.recordId) || order;
    await assignOrderProgram(updatedOrder);
  };

  const saveClientForm = async () => {
    if (!newClient.name.trim()) {
      notify("Please enter a client name.", "error");
      return;
    }

    setSavingClient(true);

    try {
      const primaryCoachId =
        newClient.primaryCoachId || getCoachRecordIdByName(newClient.coach);
      const selectedPrimaryCoach =
        activeCoaches.find((coach) => coach.recordId === primaryCoachId)?.name ||
        newClient.coach;
      const clientPayload = {
        ...newClient,
        coach: selectedPrimaryCoach,
        primaryCoachId,
      };
      const response = await fetch(
        editingClient ? "/api/updateClient" : "/api/createClient",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify(
            editingClient
              ? { ...clientPayload, clientRecordId: editingClient.id }
              : clientPayload
          ),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not save client. Check API response.", "error");
        return;
      }

      const refreshedClients = await loadClients(true);
      refreshSelectedClient(refreshedClients);
      closeClientForm();
      notify(
        editingClient ? "Client updated." : `Client created: ${data.clientId}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      notify("Could not save client.", "error");
    } finally {
      setSavingClient(false);
    }
  };

  const updateClientPackage = async (client: Client, packageType: string) => {
    setUpdatingClientStatus(true);

    try {
      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          packageType,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update client status.", "error");
        return;
      }

      const refreshedClients = await loadClients(true);
      refreshSelectedClient(refreshedClients);
      notify(`Client marked ${packageType}.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update client status.", "error");
    } finally {
      setUpdatingClientStatus(false);
    }
  };

  const deleteClient = async (client: Client) => {
    if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "client",
          recordId: client.id,
          clientCode: client.clientCode,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete client.", "error");
        return;
      }

      setSelectedClient(null);
      await loadClients(true);
      notify("Client deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete client.", "error");
    }
  };

  const deleteExercise = async (exercise: LibraryExercise) => {
    if (!window.confirm(`Delete ${exercise.exerciseName}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch("/api/deleteRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: "exercise",
          recordId: exercise.recordId,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not delete exercise.", "error");
        return;
      }

      await loadExerciseLibrary(true);
      notify("Exercise deleted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not delete exercise.", "error");
    }
  };

  const markClientCheckedInToday = async (client: Client) => {
    const today = dateToInputValue(new Date());

    setSavingCheckInClientId(client.id);

    try {
      const checkInResponse = await fetch("/api/checkIns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: client.clientCode || client.id,
          clientRecordId: client.id,
          submittedDate: today,
          status: "Submitted",
          coachReviewed: false,
        }),
      });
      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok || !checkInData.success) {
        console.error(checkInData);
        notify("Could not create check-in record.", "error");
        return;
      }

      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: client.id,
          lastCheckInDate: today,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Could not update check-in.", "error");
        return;
      }

      const refreshedClients = await loadClients(true);
      refreshSelectedClient(refreshedClients);
      notify(`${client.name} checked in today.`, "success");
    } catch (error) {
      console.error(error);
      notify("Could not update check-in.", "error");
    } finally {
      setSavingCheckInClientId("");
    }
  };

  const openCheckInQuestionnaire = (client: Client) => {
    setCheckInFormClient(client);
    setCheckInForm({
      bodyWeight: "",
      sleepQuality: "",
      energy: "",
      mood: "",
      stress: "",
      soreness: "",
      nutritionNotes: "",
      trainingNotes: "",
      wins: "",
      problemsPain: "",
    });
  };

  const submitCheckInQuestionnaire = async () => {
    if (!checkInFormClient) return;

    const today = dateToInputValue(new Date());

    setSavingCheckInClientId(checkInFormClient.id);

    try {
      const checkInResponse = await fetch("/api/checkIns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: checkInFormClient.clientCode || checkInFormClient.id,
          clientRecordId: checkInFormClient.id,
          submittedDate: today,
          status: "Submitted",
          coachReviewed: false,
          ...checkInForm,
        }),
      });
      const checkInData = await checkInResponse.json();

      if (!checkInResponse.ok || !checkInData.success) {
        console.error(checkInData);
        notify("Could not submit check-in.", "error");
        return;
      }

      const response = await fetch("/api/updateClient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientRecordId: checkInFormClient.id,
          lastCheckInDate: today,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify("Check-in saved, but client date did not update.", "error");
      }

      const refreshedClients = await loadClients(true);
      refreshSelectedClient(refreshedClients);
      setCheckInFormClient(null);
      notify("Check-in questionnaire submitted.", "success");
    } catch (error) {
      console.error(error);
      notify("Could not submit check-in.", "error");
    } finally {
      setSavingCheckInClientId("");
    }
  };

  const calendarDates =
    calendarView === "Week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(getMondayStart(calendarAnchorDate), index)
        )
      : getMonthDates(calendarAnchorDate);
  const clientWeekStripDates = Array.from({ length: 7 }, (_, index) =>
    addDays(clientWeekStartDate, index)
  );
  const clientMonthCalendarDates = getMonthCalendarDates(clientMonthAnchorDate);
  const coachMonthCalendarDates = getMonthCalendarDates(calendarAnchorDate);
  const clientWeekRangeLabel = `${localizedCalendarLabel(
    clientWeekStartDate
  )} - ${localizedCalendarLabel(addDays(clientWeekStartDate, 6))}`;

  const calendarRangeLabel = formatCalendarRangeLabel(
    calendarView,
    calendarAnchorDate,
    clientLocale
  );

  const moveCalendarRange = (direction: -1 | 1) => {
    if (isClientPortal && clientCalendarStyle === "Week") {
      const nextWeekStart = addDays(clientWeekStartDate, direction * 7);

      setClientWeekStartDate(nextWeekStart);
      setCalendarAnchorDate(nextWeekStart);
      return;
    }

    if (isClientPortal && clientCalendarStyle === "Month") {
      moveClientMonth(direction);
      return;
    }

    if (isClientPortal && clientCalendarStyle === "Full") {
      const nextMonth = addMonths(calendarAnchorDate, direction);

      setCalendarAnchorDate(nextMonth);
      setClientMonthAnchorDate(nextMonth);
      setClientWeekStartDate(getMondayStart(nextMonth));
      return;
    }

    if (calendarView === "Week") {
      setCalendarAnchorDate(addDays(calendarAnchorDate, direction * 7));
      return;
    }

    setCalendarAnchorDate(addMonths(calendarAnchorDate, direction));
  };

  const selectClientCalendarDate = (date: string, syncWeek = true) => {
    setCalendarAnchorDate(date);
    if (syncWeek) {
      setClientWeekStartDate(getMondayStart(date));
    }
    setClientMonthAnchorDate(date);
  };

  const jumpClientCalendarToToday = () => {
    const today = dateToInputValue(new Date());

    selectClientCalendarDate(today);
  };

  // Client calendar "+" → add a full program or a single session to a day.
  const openAddAssign = (kind: "program" | "session", date: string) => {
    setCalAddMenu(null);
    setAssignProgramKind(kind);
    const first = programs.find((p) =>
      kind === "session"
        ? p.productType === "Single Workout"
        : p.productType !== "Single Workout"
    );
    setSelectedAssignProgramId(first ? first.programId : "");
    setAssignableWorkouts([]);
    openAssignmentHubFromCalendar("Program", date);
  };

  const openAssignmentHubFromCalendar = (
    type: "Program" | "Check-in" | "Questionnaire" | "Physical Test" = "Program",
    date: string = calendarAnchorDate
  ) => {
    if (selectedClient) {
      setAssignmentClientId(selectedClient.id);
    }

    setAssignmentType(type);
    if (type === "Program") {
      setAssignmentTemplateId("");
    } else if (type === "Physical Test") {
      const activeTests = savedTestTemplates.filter(
        (test) => test.status !== "Archived"
      );

      setAssignmentTemplateId(
        activeTests.length === 1 ? activeTests[0].testTemplateId : ""
      );
    } else {
      const formsForType = savedFormTemplates.filter((form) => {
        const formType = form.type.toLowerCase();
        return (
          form.status !== "Archived" &&
          (type === "Check-in"
            ? formType.includes("check") || formType.includes("readiness")
            : true)
        );
      });

      setAssignmentTemplateId(formsForType.length === 1 ? formsForType[0].formId : "");
    }
    setAssignmentDueDate(date);
    setAssignStartDate(date);
    setSelectedWorkout(null);
    setShowCalendarActionMenu(false);
    setShowAssignmentDrawer(true);
  };

  const closeAssignmentDrawer = () => {
    setShowAssignmentDrawer(false);
    setAssignableWorkouts([]);
  };

  const moveClientMonth = (direction: -1 | 1) => {
    setClientMonthAnchorDate((current) => addMonths(current, direction));
  };

  function getClientCalendarWorkoutOrderStorageKey(client: Client) {
    return `nolimit-client-calendar-workout-order-${
      client.clientCode || client.id
    }`;
  }

  function getCalendarWorkoutOrderKey(workout: Workout) {
    return `workout:${workout.id}`;
  }

  function persistClientCalendarWorkoutOrder(nextOrder: Record<string, string[]>) {
    if (!selectedClient) return;

    try {
      window.localStorage.setItem(
        getClientCalendarWorkoutOrderStorageKey(selectedClient),
        JSON.stringify(nextOrder)
      );
    } catch {
      // Local ordering is a convenience layer; failing to persist should not block training.
    }
  }

  function orderWorkoutsForDate(
    dateString: string,
    dayWorkouts: Workout[],
    orderMap: Record<string, string[]> = clientCalendarWorkoutOrder
  ) {
    const savedOrder = orderMap[dateString] || [];

    return dayWorkouts
      .map((workout, originalIndex) => ({ workout, originalIndex }))
      .sort((a, b) => {
        const aIndex = savedOrder.indexOf(getCalendarWorkoutOrderKey(a.workout));
        const bIndex = savedOrder.indexOf(getCalendarWorkoutOrderKey(b.workout));
        const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        return normalizedAIndex - normalizedBIndex || a.originalIndex - b.originalIndex;
      })
      .map(({ workout }) => workout);
  }

  function getWorkoutsForDate(dateString: string) {
    const dayWorkouts = workouts.filter(
      (workout) => normalizeDate(String(workout.scheduledDate)) === dateString
    );

    return orderWorkoutsForDate(dateString, dayWorkouts);
  }

  function getAssignmentsForDate(dateString: string) {
    return contentAssignments.filter(
      (assignment) =>
        normalizeDate(String(assignment.dueDate || assignment.assignedDate)) ===
        dateString
    );
  }

  function getCalendarItemCountForDate(dateString: string) {
    return getWorkoutsForDate(dateString).length + getAssignmentsForDate(dateString).length;
  }

  function reorderClientCalendarWorkout(
    dateString: string,
    sourceWorkoutId: string,
    targetWorkoutId: string
  ) {
    if (!isClientPortal || !dateString || sourceWorkoutId === targetWorkoutId) return;

    setClientCalendarWorkoutOrder((currentOrder) => {
      const dayWorkouts = workouts.filter(
        (workout) => normalizeDate(String(workout.scheduledDate)) === dateString
      );
      const validKeys = dayWorkouts.map(getCalendarWorkoutOrderKey);
      const baseOrder = [
        ...(currentOrder[dateString] || []).filter((key) => validKeys.includes(key)),
        ...validKeys.filter((key) => !(currentOrder[dateString] || []).includes(key)),
      ];
      const sourceKey = `workout:${sourceWorkoutId}`;
      const targetKey = `workout:${targetWorkoutId}`;
      const sourceIndex = baseOrder.indexOf(sourceKey);
      const targetIndex = baseOrder.indexOf(targetKey);

      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return currentOrder;
      }

      const nextDayOrder = [...baseOrder];
      const [movedKey] = nextDayOrder.splice(sourceIndex, 1);
      nextDayOrder.splice(targetIndex, 0, movedKey);

      const nextOrder = { ...currentOrder, [dateString]: nextDayOrder };
      persistClientCalendarWorkoutOrder(nextOrder);
      return nextOrder;
    });
  }

  function handleClientCalendarWorkoutDrop(
    event: DragEvent<HTMLElement>,
    targetWorkout: Workout,
    targetDate: string
  ) {
    if (!isClientPortal) return;

    const sourceWorkoutId =
      event.dataTransfer.getData("text/plain") || draggingWorkoutId;

    if (!sourceWorkoutId || sourceWorkoutId === targetWorkout.id) return;

    event.preventDefault();
    event.stopPropagation();
    setCalendarDropWorkoutId("");

    const sourceWorkout = workouts.find((workout) => workout.id === sourceWorkoutId);
    const sourceDate = normalizeDate(String(sourceWorkout?.scheduledDate || ""));

    if (sourceWorkout && sourceDate && sourceDate !== targetDate) {
      void moveWorkoutToDate(sourceWorkout, targetDate);
      return;
    }

    reorderClientCalendarWorkout(targetDate, sourceWorkoutId, targetWorkout.id);
    setDraggingWorkoutId("");
  }

  function startClientCalendarWorkoutTouch(
    event: TouchEvent<HTMLElement>,
    workout: Workout,
    dateString: string
  ) {
    if (!isClientPortal) return;

    const touch = event.touches[0];
    clientCalendarTouchDrag.current = {
      workoutId: workout.id,
      date: dateString,
      startY: touch.clientY,
      moved: false,
    };
    setDraggingWorkoutId(workout.id);
  }

  function moveClientCalendarWorkoutTouch(event: TouchEvent<HTMLElement>) {
    const touchDrag = clientCalendarTouchDrag.current;
    if (!touchDrag) return;

    const touch = event.touches[0];
    if (Math.abs(touch.clientY - touchDrag.startY) > 10) {
      touchDrag.moved = true;
      event.preventDefault();

      const targetElement = document
        .elementFromPoint(touch.clientX, touch.clientY)
        ?.closest("[data-client-calendar-workout-id]") as HTMLElement | null;
      const targetWorkoutId = targetElement?.dataset.clientCalendarWorkoutId || "";
      setCalendarDropWorkoutId(
        targetWorkoutId && targetWorkoutId !== touchDrag.workoutId
          ? targetWorkoutId
          : ""
      );
    }
  }

  function endClientCalendarWorkoutTouch(event: TouchEvent<HTMLElement>) {
    const touchDrag = clientCalendarTouchDrag.current;
    clientCalendarTouchDrag.current = null;
    setDraggingWorkoutId("");
    setCalendarDropWorkoutId("");

    if (!touchDrag?.moved) return;

    suppressClientCalendarTouchClick.current = true;
    window.setTimeout(() => {
      suppressClientCalendarTouchClick.current = false;
    }, 0);

    const touch = event.changedTouches[0];
    const targetElement = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest("[data-client-calendar-workout-id]") as HTMLElement | null;
    const targetWorkoutId = targetElement?.dataset.clientCalendarWorkoutId;
    const targetDate = targetElement?.dataset.clientCalendarDate;

    if (!targetWorkoutId || !targetDate || targetWorkoutId === touchDrag.workoutId) {
      return;
    }

    const sourceWorkout = workouts.find(
      (workout) => workout.id === touchDrag.workoutId
    );

    if (sourceWorkout && touchDrag.date !== targetDate) {
      void moveWorkoutToDate(sourceWorkout, targetDate);
      return;
    }

    reorderClientCalendarWorkout(targetDate, touchDrag.workoutId, targetWorkoutId);
  }

  const handleOpenContentAssignment = async (assignment: ContentAssignment) => {
    if (!isClientPortal && !window.confirm("Open this assigned item?")) {
      return;
    }

    const assignmentType = assignment.assignmentType.toLowerCase();
    const isTest = assignmentType.includes("test");
    const availableForms: SavedFormTemplate[] =
      !isTest && savedFormTemplates.length === 0
        ? await loadFormTemplates()
        : savedFormTemplates;
    const availableTests: SavedTestTemplate[] =
      isTest && savedTestTemplates.length === 0
        ? await loadTestTemplates()
        : savedTestTemplates;
    const template = isTest
      ? availableTests.find(
          (test) =>
            test.testTemplateId === assignment.templateId ||
            test.name === assignment.templateName
        )
      : availableForms.find(
          (form) =>
            form.formId === assignment.templateId || form.name === assignment.templateName
        );

    if (!template) {
      notify("Could not find the saved template for this assignment.", "error");
      return;
    }

    setActiveContentAssignment(assignment);
    setContentAssignmentAnswers({});
    setContentAssignmentComment("");
  };

  // Load the purchased program(s) starting on the chosen date. Called from the
  // post-intake start-date chooser.
  const loadProgramFromDate = async (startDate: string) => {
    if (!selectedClient) return;
    setPortalStartPicker(false);
    setPortalAutoLoading(true);
    try {
      const loadRes = await fetch("/api/autoLoadProgram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRecordId: selectedClient.id,
          startDate: startDate || undefined,
        }),
      });
      const loadData = await loadRes.json();
      if (loadData.success && loadData.programName && !loadData.alreadyLoaded) {
        setPortalLoadedProgram(loadData.programName);
        // Land on the calendar so the "Next Workout — Start" card is the
        // first thing the new client sees after their plan loads.
        setClientTab("Training");
      }
      void loadContentAssignments(selectedClient);
    } catch {
      // Silent — program loading can be retried by coach
    } finally {
      setPortalAutoLoading(false);
    }
  };

  const activeAssignmentIsTest =
    !!activeContentAssignment &&
    activeContentAssignment.assignmentType.toLowerCase().includes("test");
  const activeFormTemplate =
    activeContentAssignment && !activeAssignmentIsTest
      ? savedFormTemplates.find(
          (form) =>
            form.formId === activeContentAssignment.templateId ||
            form.name === activeContentAssignment.templateName
        )
      : undefined;
  const activeTestTemplate =
    activeContentAssignment && activeAssignmentIsTest
      ? savedTestTemplates.find(
          (test) =>
            test.testTemplateId === activeContentAssignment.templateId ||
            test.name === activeContentAssignment.templateName
        )
      : undefined;

  const getTestAnswerKey = (item: SavedTestItem, suffix?: string) =>
    suffix ? `${item.testItemId}__${suffix}` : item.testItemId;

  const getTestInputMode = (
    item: SavedTestItem
  ): "weightReps" | "distanceTime" | "single" => {
    const descriptor = [
      item.testName,
      item.metricType,
      item.unit,
      item.inputUnit,
      item.calculationMethod,
      item.metricName,
      item.metricUnit,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      descriptor.includes("epley") ||
      descriptor.includes("brzycki") ||
      descriptor.includes("1rm") ||
      descriptor.includes("3rm") ||
      descriptor.includes("5rm") ||
      descriptor.includes("weight x reps") ||
      descriptor.includes("weight/reps")
    ) {
      return "weightReps";
    }

    if (
      descriptor.includes("2km") ||
      descriptor.includes("2000") ||
      descriptor.includes("aerobic") ||
      descriptor.includes("mas") ||
      descriptor.includes("threshold") ||
      descriptor.includes("time") ||
      descriptor.includes("duration") ||
      descriptor.includes("minute") ||
      descriptor.includes("second") ||
      descriptor.includes("distance") ||
      descriptor.includes("meter") ||
      descriptor.includes("metre")
    ) {
      return "distanceTime";
    }

    return "single";
  };

  const isTwoKilometerTest = (item: SavedTestItem) => {
    const descriptor = [
      item.testName,
      item.metricType,
      item.inputUnit,
      item.calculationMethod,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return descriptor.includes("2km") || descriptor.includes("2000");
  };

  const buildStructuredTestValue = (item: SavedTestItem) => {
    const mode = getTestInputMode(item);

    if (mode === "weightReps") {
      const weight = contentAssignmentAnswers[getTestAnswerKey(item, "weight")] || "";
      const reps = contentAssignmentAnswers[getTestAnswerKey(item, "reps")] || "";
      const unit = item.inputUnit || item.unit || "kg";
      return weight && reps ? `${weight} ${unit} x ${reps} reps` : "";
    }

    if (mode === "distanceTime") {
      const defaultDistance = isTwoKilometerTest(item) ? "2000" : "";
      const distance =
        contentAssignmentAnswers[getTestAnswerKey(item, "distance")] ||
        defaultDistance;
      const minutes = contentAssignmentAnswers[getTestAnswerKey(item, "minutes")] || "0";
      const secondsRaw = contentAssignmentAnswers[getTestAnswerKey(item, "seconds")] || "";
      const seconds = secondsRaw ? secondsRaw.padStart(2, "0") : "00";
      return distance && (minutes !== "0" || secondsRaw)
        ? `${distance} m in ${minutes}:${seconds}`
        : "";
    }

    return contentAssignmentAnswers[item.testItemId] || "";
  };

  const isStructuredTestComplete = (item: SavedTestItem) => {
    const mode = getTestInputMode(item);

    if (mode === "weightReps") {
      return Boolean(
        contentAssignmentAnswers[getTestAnswerKey(item, "weight")] &&
          contentAssignmentAnswers[getTestAnswerKey(item, "reps")]
      );
    }

    if (mode === "distanceTime") {
      const hasDistance =
        Boolean(contentAssignmentAnswers[getTestAnswerKey(item, "distance")]) ||
        isTwoKilometerTest(item);
      const hasTime = Boolean(
        contentAssignmentAnswers[getTestAnswerKey(item, "minutes")] ||
          contentAssignmentAnswers[getTestAnswerKey(item, "seconds")]
      );
      return hasDistance && hasTime;
    }

    return Boolean(contentAssignmentAnswers[item.testItemId]);
  };

  const submitActiveContentAssignment = async () => {
    if (!activeContentAssignment || !selectedClient) return;

    const clientComment = contentAssignmentComment.trim();
    const responses = activeAssignmentIsTest
      ? [
          ...(activeTestTemplate?.items || []).map((item) => ({
          itemId: item.testItemId,
          label: localizeText(item.testName, item.testNameCn),
          unit: item.unit,
          value: buildStructuredTestValue(item),
          notes: contentAssignmentAnswers[`${item.testItemId}__notes`] || "",
          })),
          ...(clientComment
            ? [
                {
                  itemId: "__client_comment",
                  label: "Client Comment",
                  unit: "",
                  value: clientComment,
                  notes: "",
                },
              ]
            : []),
        ]
      : [
          ...(activeFormTemplate?.questions || []).map((question) => ({
          questionId: question.questionId,
          label: localizeText(question.label, question.labelCn),
          value: contentAssignmentAnswers[question.questionId] || "",
          })),
          ...(clientComment
            ? [
                {
                  questionId: "__client_comment",
                  label: "Client Comment",
                  value: clientComment,
                },
              ]
            : []),
        ];

    const missingRequired = activeAssignmentIsTest
      ? (activeTestTemplate?.items || []).filter(
          (item) => !isStructuredTestComplete(item)
        )
      : (activeFormTemplate?.questions || []).filter(
          (question) =>
            question.required && !contentAssignmentAnswers[question.questionId]
        );

    if (missingRequired.length > 0) {
      notify(
        activeAssignmentIsTest
          ? "Please enter a result for each test item."
          : "Please answer all required questions.",
        "error"
      );
      return;
    }

    setSubmittingContentAssignment(true);

    try {
      const response = await fetch("/api/submitContentResponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: activeContentAssignment.assignmentType,
          assignmentId: activeContentAssignment.assignmentId,
          assignmentRecordId: activeContentAssignment.recordId,
          templateId: activeContentAssignment.templateId,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          responses,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data);
        notify(data.message || data.error || "Could not submit assignment.", "error");
        return;
      }

      setContentAssignments((current) =>
        current.map((assignment) =>
          assignment.recordId === activeContentAssignment.recordId
            ? { ...assignment, status: "Completed" }
            : assignment
        )
      );
      void loadContentAssignments(selectedClient);
      void loadContentResponses(selectedClient);
      setActiveContentAssignment(null);
      setContentAssignmentAnswers({});
      setContentAssignmentComment("");

      // Intake submitted in the portal: let the client choose their program
      // start date, then load. (Previously loading always started "today".)
      const isIntake = activeContentAssignment.assignmentType === "Questionnaire";
      if (isClientPortal && isIntake && selectedClient) {
        setPortalPostIntake(true);
        setPortalStartPicker(true);
      } else {
        notify("Assignment submitted.", "success");
      }
    } catch (error) {
      console.error(error);
      notify("Could not submit assignment.", "error");
    } finally {
      setSubmittingContentAssignment(false);
    }
  };

  const todayValue = dateToInputValue(new Date());
  const selectedCalendarDateWorkouts = getWorkoutsForDate(calendarAnchorDate);
  const selectedCalendarDateAssignments = getAssignmentsForDate(calendarAnchorDate);
  const selectedCalendarDateItemCount =
    selectedCalendarDateWorkouts.length + selectedCalendarDateAssignments.length;
  const clientPortalUpcomingWorkouts = workouts
    .filter(
      (workout) =>
        normalizeDate(String(workout.scheduledDate)) >= todayValue &&
        normalizeTaskStatus(workout.completionStatus) !== "Completed"
    )
    .sort(
      (a, b) =>
        normalizeDate(String(a.scheduledDate)).localeCompare(
          normalizeDate(String(b.scheduledDate))
        ) || Number(a.week) - Number(b.week) || Number(a.day) - Number(b.day)
    )
    .slice(0, 5);
  const clientPortalUpcomingAssignments = contentAssignments
    .filter(
      (assignment) =>
        normalizeDate(String(assignment.dueDate || assignment.assignedDate)) >=
          todayValue &&
        normalizeTaskStatus(assignment.status) !== "Completed"
    )
    .sort((a, b) =>
      normalizeDate(String(a.dueDate || a.assignedDate)).localeCompare(
        normalizeDate(String(b.dueDate || b.assignedDate))
      )
    );
  const clientPortalUpcomingTasks = [
    ...clientPortalUpcomingWorkouts.map((workout) => ({
      type: "workout" as const,
      id: workout.id,
      date: normalizeDate(String(workout.scheduledDate)),
      title: localizedWorkoutName(workout),
      kindLabel: t("workout"),
      colorClass: getWorkoutColorClass(workout.sessionName, workout.sessionType),
      meta: `${t("week")} ${workout.week} - ${t("day")} ${workout.day}`,
      status: getDisplayTaskStatus(workout.completionStatus, workout.scheduledDate),
      hasProgress: Boolean(String(workout.workoutLogs || workout.clientNotes || "").trim()),
      open: () => openWorkout(workout),
    })),
    ...clientPortalUpcomingAssignments.map((assignment) => ({
      type: "assignment" as const,
      id: assignment.recordId,
      date: normalizeDate(String(assignment.dueDate || assignment.assignedDate)),
      title: getAssignmentDisplayName(assignment),
      kindLabel: assignment.assignmentType || t("questionnaire"),
      colorClass: getAssignmentColorClass(assignment.assignmentType),
      meta: assignment.assignmentType || "Questionnaire",
      status: getDisplayTaskStatus(
        assignment.status,
        assignment.dueDate || assignment.assignedDate
      ),
      hasProgress: normalizeTaskStatus(assignment.status) !== "Scheduled",
      open: () => handleOpenContentAssignment(assignment),
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const localizeTaskStatus = (status: SimpleTaskStatus) => {
    if (status === "Completed") return t("completed");
    if (status === "Missed") return t("missed");
    return t("scheduled");
  };
  const getTaskActionLabel = (status: SimpleTaskStatus, hasProgress = false) => {
    if (status === "Completed") return t("view");
    if (hasProgress) return t("continueTask");
    return t("start");
  };
  const localizeAssignmentKind = (assignmentType?: string) => {
    const clean = String(assignmentType || "").toLowerCase();
    if (clean.includes("question") || clean.includes("intake") || clean.includes("survey"))
      return t("questionnaire");
    if (clean.includes("physical") || clean.includes("test")) return t("physicalTest");
    if (clean.includes("check")) return t("checkIn");
    if (clean.includes("program")) return t("program");
    return assignmentType || t("questionnaire");
  };
  const getTaskTone = (status: SimpleTaskStatus) => {
    if (status === "Completed") return "completed";
    if (status === "Missed") return "missed";
    return "scheduled";
  };
  const recentWorkoutSubmissions = workouts
    .filter((workout) => {
      const status = normalizeTaskStatus(workout.completionStatus);
      return (
        status === "Completed" ||
        String(workout.workoutLogs || "").trim()
      );
    })
    .sort((a, b) =>
      normalizeDate(String(b.scheduledDate)).localeCompare(
        normalizeDate(String(a.scheduledDate))
      )
    )
    .slice(0, 4);
  // Client comments left on workouts (the note submitted with a session), and
  // completed workouts still awaiting coach review.
  const clientComments = [
    ...workouts
      .filter((w) => String(w.clientNotes || "").trim())
      .map((w) => ({
        key: `wn-${w.id}`,
        workoutName: localizedWorkoutName(w),
        note: w.clientNotes,
        date: normalizeDate(String(w.scheduledDate)),
        open: () => openWorkout(w),
      })),
    ...workoutComments
      .filter((c) => (c.noteEn || c.note || "").trim())
      .map((c) => ({
        key: `wc-${c.key}`,
        workoutName: c.workoutName || c.exerciseNames[0] || "Workout",
        note: c.noteEn || c.note,
        date: c.date || "",
        open: () => {
          const w = workouts.find(
            (workout) =>
              lookupTextMatches(c.assignedWorkoutId, workout.id) ||
              lookupTextMatches(c.assignedWorkoutId, workout.assignedWorkoutId)
          );
          if (w) openWorkout(w);
        },
      })),
  ]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 12);
  const toReviewWorkouts = workouts
    .filter((w) => /complete/i.test(w.completionStatus || "") && !w.coachReviewed)
    .sort((a, b) =>
      normalizeDate(String(b.scheduledDate)).localeCompare(
        normalizeDate(String(a.scheduledDate))
      )
    )
    .slice(0, 12);

  const getContentResponseLabel = (response: ContentResponse) => {
    if (response.label) return response.label;

    const matchingTest = savedTestTemplates.find(
      (test) => test.testTemplateId === response.templateId
    );
    const matchingItem = matchingTest?.items.find(
      (item) => item.testItemId === response.itemId
    );

    if (matchingItem) {
      return localizeText(matchingItem.testName, matchingItem.testNameCn);
    }

    return response.responseType === "Physical Test" ? t("testResult") : t("answer");
  };

  const getAthleteMetricTimestamp = (metric: AthleteMetric) => {
    const raw = String(metric.measuredAt || "").trim();
    // Feishu date fields return epoch milliseconds; parse those directly so the
    // newest metric (and its unit) sorts first instead of tying at 0.
    if (/^\d{10,}$/.test(raw)) {
      const ms = Number(raw);
      return Number.isFinite(ms) ? ms : 0;
    }
    const normalizedDate = normalizeDate(raw);
    const parsedDate = normalizedDate ? Date.parse(`${normalizedDate}T00:00:00`) : 0;

    return Number.isFinite(parsedDate) ? parsedDate : 0;
  };
  const sortedAthleteMetrics = [...athleteMetrics].sort(
    (a, b) => getAthleteMetricTimestamp(b) - getAthleteMetricTimestamp(a)
  );
  // Auto-prescription: turn a "% 1RM" load into an actual weight for THIS client.
  // One program template -> individualized per client at view time.
  const roundToLoadIncrement = (value: number, increment = 2.5) =>
    Number.isFinite(value) && increment > 0
      ? Math.round(value / increment) * increment
      : value;
  const resolvePrescribedLoad = (
    rawPercent: string,
    rawLoad: string,
    exerciseName: string
  ) => {
    const load = String(rawLoad || "").trim();
    // Accept a percent from its own column, or a legacy "80%" typed in load.
    const percentRaw = String(rawPercent || "").trim();
    const legacyPctMatch = !percentRaw && load.match(/^(\d+(?:\.\d+)?)\s*%$/);
    const pct = percentRaw
      ? parseFloat(percentRaw)
      : legacyPctMatch
        ? parseFloat(legacyPctMatch[1])
        : NaN;

    if (!Number.isFinite(pct)) {
      // No percent target — show the manually entered load (kg/RPE) if any.
      return { display: load, resolved: false, isPercent: false };
    }

    const oneRepMaxMetrics = sortedAthleteMetrics.filter((metric) =>
      /1\s*rm|one rep max|1 rep max|rep max/.test(
        `${metric.metricType} ${metric.metricName} ${metric.calculationMethod}`.toLowerCase()
      )
    );
    const exerciseTokens = exerciseName
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);
    const metric =
      oneRepMaxMetrics.find((candidate) => {
        const haystack = `${candidate.metricName} ${candidate.sourceTestName}`.toLowerCase();
        return exerciseTokens.some((token) => haystack.includes(token));
      }) || oneRepMaxMetrics[0];

    // Fallback base: best estimated 1RM from this exercise's logged training
    // (Exercise Results), in kg. Lets %1RM prescriptions resolve for athletes
    // who train but have no formal 1RM test on file.
    const bestTrainingOneRepMaxKg = (() => {
      const target = exerciseName.toLowerCase().trim();
      if (!target) return NaN;
      let best = NaN;
      for (const result of exerciseResults) {
        const name = String(result.exerciseName || "").toLowerCase().trim();
        if (!name) continue;
        const matches =
          name === target || name.startsWith(target) || target.startsWith(name);
        if (!matches) continue;
        const estimate = Number(result.estimatedOneRepMax);
        if (
          Number.isFinite(estimate) &&
          estimate > 0 &&
          (!Number.isFinite(best) || estimate > best)
        ) {
          best = estimate;
        }
      }
      return best;
    })();

    const base = metric
      ? parseFloat(String(metric.metricValue).replace(/[^\d.]/g, ""))
      : NaN;
    if (!metric || !Number.isFinite(base) || base <= 0) {
      // No test-based 1RM — try the training-based estimate (always kg).
      if (Number.isFinite(bestTrainingOneRepMaxKg) && bestTrainingOneRepMaxKg > 0) {
        const weightKg = roundToLoadIncrement(
          (bestTrainingOneRepMaxKg * pct) / 100
        );
        const displayValue =
          weightUnit === "lb"
            ? (weightKg * KG_TO_LB).toFixed(1)
            : Number.isInteger(weightKg)
              ? String(weightKg)
              : weightKg.toFixed(1);
        return {
          display: `${displayValue} ${weightUnit} (${pct}%)`,
          resolved: true,
          isPercent: true,
        };
      }
      return { display: `${pct}% 1RM`, resolved: false, isPercent: true };
    }

    const metricUnit = String(metric.metricUnit || "kg").trim() || "kg";
    const weightKg = roundToLoadIncrement((base * pct) / 100);
    // 1RM metrics are stored in kg; convert to the coach/athlete's chosen unit.
    const isKgMetric = /^kg$/i.test(metricUnit);
    const displayUnit = isKgMetric ? weightUnit : metricUnit;
    const displayValue =
      isKgMetric && weightUnit === "lb"
        ? (weightKg * KG_TO_LB).toFixed(1)
        : Number.isInteger(weightKg)
          ? String(weightKg)
          : weightKg.toFixed(1);
    return {
      display: `${displayValue} ${displayUnit} (${pct}%)`,
      resolved: true,
      isPercent: true,
    };
  };
  const findLatestAthleteMetric = (tokens: string[]) =>
    sortedAthleteMetrics.find((metric) => {
      const searchableMetric = `${metric.metricType} ${metric.metricName} ${metric.sourceTestName}`.toLowerCase();

      return tokens.some((token) => searchableMetric.includes(token));
    });
  const latestMasMetric = findLatestAthleteMetric([
    "mas",
    "maximum aerobic speed",
  ]);
  // --- Running paces from MAS (the running analog of % 1RM -> weight) ---
  const getMasKmh = (metric?: AthleteMetric) => {
    if (!metric) return NaN;
    const raw = parseFloat(String(metric.metricValue).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(raw) || raw <= 0) return NaN;
    // Speed metrics are stored km/h by default; convert m/s, or a pace (min/km).
    const unit = String(metric.metricUnit || "").toLowerCase();
    if (unit.includes("m/s")) return raw * 3.6;
    if (unit.includes("min/km") || unit.includes("/km")) return 60 / raw;
    return raw;
  };
  const formatPace = (speedKmh: number) => {
    if (!Number.isFinite(speedKmh) || speedKmh <= 0) return "--";
    const secPerKm = Math.round(3600 / speedKmh);
    const minutes = Math.floor(secPerKm / 60);
    const seconds = secPerKm % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
  };
  const resolvePrescribedPace = (rawPercentMas: string, exerciseName: string) => {
    const pct = parseFloat(String(rawPercentMas || "").trim());
    if (!Number.isFinite(pct) || pct <= 0)
      return { display: "", resolved: false, speedKmh: NaN };

    const masMetrics = sortedAthleteMetrics.filter((metric) =>
      /mas|aerobic/.test(
        `${metric.metricType} ${metric.metricName} ${metric.calculationMethod}`.toLowerCase()
      )
    );
    const exerciseTokens = exerciseName
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);
    const metric =
      masMetrics.find((candidate) => {
        const haystack = `${candidate.metricName} ${candidate.sourceTestName}`.toLowerCase();
        return exerciseTokens.some((token) => haystack.includes(token));
      }) ||
      masMetrics[0] ||
      latestMasMetric;

    // A manual per-client MAS override is the source of truth when set.
    const masKmh = Number.isFinite(masOverride)
      ? masOverride
      : getMasKmh(metric);
    if (!Number.isFinite(masKmh))
      return { display: `${pct}% MAS`, resolved: false, speedKmh: NaN };

    const speedKmh = masKmh * (pct / 100);
    return {
      display: `${formatPace(speedKmh)} (${pct}% MAS)`,
      resolved: true,
      speedKmh,
    };
  };
  const paceZh = i18n.language === "zh";
  // Localize the default English section names (Main/Warmup/etc.) when the
  // coach hasn't provided a Chinese section name. Custom names pass through.
  const localizeDefaultSection = (name: string) => {
    if (!paceZh) return name;
    const map: Record<string, string> = {
      main: "主要训练",
      "main set": "主要训练",
      warmup: "热身",
      "warm up": "热身",
      "warm-up": "热身",
      cooldown: "放松",
      "cool down": "放松",
      "cool-down": "放松",
      accessory: "辅助训练",
      conditioning: "体能训练",
      core: "核心训练",
      mobility: "灵活性训练",
      strength: "力量训练",
      finisher: "收尾训练",
    };
    return map[name.trim().toLowerCase()] || name;
  };
  // Localize free-text rest/duration unit suffixes for display (data is stored
  // in English like "60 sec"). Only swaps the unit words, leaves numbers alone.
  const localizeRestValue = (value: string) => {
    if (!paceZh) return value;
    return String(value)
      .replace(/\bsec(onds?)?\b/gi, "秒")
      .replace(/\bmins?\b|\bminutes?\b/gi, "分钟");
  };
  // Parse a manual override string ("" / "--" => not set).
  const parseOverride = (raw?: string) => {
    const value = parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(value) && value > 0 ? value : NaN;
  };
  const masOverride = parseOverride(selectedClient?.masKmhOverride);
  const hrMaxOverride = parseOverride(selectedClient?.hrMaxOverride);
  const restingHrOverride = parseOverride(selectedClient?.restingHrOverride);
  const zonePctOverride = (raw?: string) => parseOverride(raw);
  // Each zone: %MAS drives pace; %HRR drives Karvonen HR; %LT drives the pace
  // from a measured lactate-threshold speed (% of threshold speed). The 5K/10K/
  // Threshold/Easy %MAS can be overridden per client.
  const PACE_ZONE_DEFS = [
    { key: "mas", label: "MAS", percent: 100, hrrLow: 95, hrrHigh: 100, ltPercent: 112, rpe: 10 },
    {
      key: "5k",
      label: paceZh ? "5公里配速" : "5K",
      percent: zonePctOverride(selectedClient?.zone5kPct) || 95,
      hrrLow: 90,
      hrrHigh: 95,
      ltPercent: 106,
      rpe: 9,
    },
    {
      key: "10k",
      label: paceZh ? "10公里配速" : "10K",
      percent: zonePctOverride(selectedClient?.zone10kPct) || 91,
      hrrLow: 85,
      hrrHigh: 90,
      ltPercent: 102,
      rpe: 8,
    },
    {
      key: "threshold",
      label: paceZh ? "阈值" : "Threshold",
      percent: zonePctOverride(selectedClient?.zoneThresholdPct) || 85,
      hrrLow: 80,
      hrrHigh: 85,
      ltPercent: 100,
      rpe: 7,
    },
    {
      key: "easy",
      label: paceZh ? "轻松" : "Easy",
      percent: zonePctOverride(selectedClient?.zoneEasyPct) || 70,
      hrrLow: 60,
      hrrHigh: 70,
      ltPercent: 80,
      rpe: 4,
    },
  ];
  // Heart-rate metrics for Karvonen zones (HR = RHR + (HRmax - RHR) * %HRR).
  // A manual HRmax / Resting HR override wins over the test-derived value.
  const parseBpm = (metric?: AthleteMetric) =>
    metric
      ? parseFloat(String(metric.metricValue).replace(/[^\d.]/g, ""))
      : NaN;
  const hrMaxMetric = sortedAthleteMetrics.find((metric) =>
    /hr\s*max|max\s*hr|maximum heart|max heart/.test(
      `${metric.metricName} ${metric.sourceTestName}`.toLowerCase()
    )
  );
  const restingHrMetric = sortedAthleteMetrics.find((metric) =>
    /resting|\brhr\b/.test(
      `${metric.metricName} ${metric.sourceTestName}`.toLowerCase()
    )
  );
  const hrMaxValue = Number.isFinite(hrMaxOverride)
    ? hrMaxOverride
    : parseBpm(hrMaxMetric);
  const restingHrValue = Number.isFinite(restingHrOverride)
    ? restingHrOverride
    : parseBpm(restingHrMetric);
  const hasKarvonenHr =
    Number.isFinite(hrMaxValue) &&
    Number.isFinite(restingHrValue) &&
    hrMaxValue > restingHrValue;
  const karvonenHr = (hrrPercent: number) =>
    Math.round(restingHrValue + (hrMaxValue - restingHrValue) * (hrrPercent / 100));
  // Lactate-threshold pace metric (a speed; % of it gives each zone's LT pace).
  const ltMetric = sortedAthleteMetrics.find((metric) =>
    /lactate|threshold|\blt\b/.test(
      `${metric.metricName} ${metric.sourceTestName} ${metric.calculationMethod}`.toLowerCase()
    )
  );
  const ltSpeedKmh = getMasKmh(ltMetric);
  const hasLtPace = Number.isFinite(ltSpeedKmh);
  const masKmhForZones = Number.isFinite(masOverride)
    ? masOverride
    : getMasKmh(latestMasMetric);
  const paceZones = PACE_ZONE_DEFS.map((zone) => {
    const speedKmh = masKmhForZones * (zone.percent / 100);
    const ltZoneSpeed = ltSpeedKmh * (zone.ltPercent / 100);
    return {
      ...zone,
      speed: Number.isFinite(speedKmh) ? `${speedKmh.toFixed(1)} km/h` : "--",
      pace: formatPace(speedKmh),
      ltPace: hasLtPace ? formatPace(ltZoneSpeed) : "--",
      hrr: `${zone.hrrLow}–${zone.hrrHigh}%`,
      hr: hasKarvonenHr
        ? `${karvonenHr(zone.hrrLow)}–${karvonenHr(zone.hrrHigh)} bpm`
        : "--",
    };
  });
  const hasMasForZones = Number.isFinite(masKmhForZones);
  // Performance metrics + training zones, reused on the client home (no %)
  // and the coach client profile (with %MAS/%HRR).
  const renderPerformanceMetrics = (showPercents: boolean) => {
    // showPercents marks the coach view: always include the weekly-load cards
    // there. The athlete portal only shows the ones relevant to that athlete.
    const metricsToShow = [
      ...clientPerformanceMetrics,
      ...(showPercents || hasTrainingVolume ? [weeklyVolumeCard] : []),
      ...(showPercents || hasRunningHistory ? [runWeekCard, runMonthCard] : []),
    ];

    return (
    <>
      <div className="homeFocusGrid performanceMetricGrid">
        {metricsToShow.map((metric) => (
          <div className="performanceMetricCard" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{athleteMetricsLoading ? "..." : metric.value}</strong>
            <small>
              {athleteMetricsLoading ? t("loadingMetrics") : metric.meta}
            </small>
          </div>
        ))}
      </div>
      {(hasMasForZones || hasKarvonenHr) && (
        <div className="runningPacesCard">
          <div className="runningPacesHeader">
            <span className="eyebrow">
              {paceZh ? "训练区间" : "Training Zones"}
            </span>
            <small>
              {`${paceZh ? "来源" : "From"} ${["MAS", hasKarvonenHr ? "HR" : ""]
                .filter(Boolean)
                .join(" + ")}`}
            </small>
          </div>
          <table className="runningPacesTable">
            <thead>
              <tr>
                <th>{paceZh ? "区间" : "Zone"}</th>
                {showPercents && <th>%MAS</th>}
                <th>{paceZh ? "配速" : "Pace"}</th>
                {showPercents && hasKarvonenHr && <th>%HRR</th>}
                {hasKarvonenHr && <th>{paceZh ? "心率" : "HR"}</th>}
              </tr>
            </thead>
            <tbody>
              {paceZones.map((zone) => (
                <tr key={zone.key}>
                  <td>{zone.label}</td>
                  {showPercents && <td>{zone.percent}%</td>}
                  <td>
                    <strong>{zone.pace}</strong>
                  </td>
                  {showPercents && hasKarvonenHr && <td>{zone.hrr}</td>}
                  {hasKarvonenHr && (
                    <td>
                      <strong>{zone.hr}</strong>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {hasKarvonenHr && (
            <small className="runningPacesFootnote">
              {paceZh ? "卡尔沃宁公式" : "Karvonen"}: HRmax{" "}
              {Math.round(hrMaxValue)} · {paceZh ? "静息" : "Rest"}{" "}
              {Math.round(restingHrValue)} bpm
            </small>
          )}
        </div>
      )}
    </>
    );
  };
  // For a %MAS prescription, map to the nearest zone and return its Karvonen HR range.
  const resolvePrescribedHr = (rawPercentMas: string) => {
    if (!hasKarvonenHr) return { display: "", resolved: false };
    const pct = parseFloat(String(rawPercentMas || "").trim());
    if (!Number.isFinite(pct) || pct <= 0)
      return { display: "", resolved: false };
    const zone = PACE_ZONE_DEFS.reduce((best, candidate) =>
      Math.abs(candidate.percent - pct) < Math.abs(best.percent - pct)
        ? candidate
        : best
    );
    return {
      display: `${karvonenHr(zone.hrrLow)}–${karvonenHr(zone.hrrHigh)} bpm`,
      resolved: true,
    };
  };
  const formatAthleteMetricValue = (metric?: AthleteMetric) => {
    if (!metric) return "--";

    const value = String(metric.metricValue || "").trim();
    const unit = String(metric.metricUnit || "").trim();

    return value ? `${value}${unit ? ` ${unit}` : ""}` : "--";
  };
  const formatAthleteMetricMeta = (metric?: AthleteMetric) => {
    if (!metric) return t("noTestDataYet");

    const raw = String(metric.measuredAt || "").trim();
    const date = /^\d{10,}$/.test(raw)
      ? new Date(Number(raw)).toISOString().slice(0, 10)
      : normalizeDate(raw);
    const source = metric.sourceTestName || metric.metricName || t("latest");

    return date ? `${source} - ${date}` : source;
  };
  // Running volume from logged distance (stored in metres). Calendar week
  // (Mon–Sun) and calendar month totals, in km.
  const runningHistoryLogs = workoutHistoryLogs.filter(
    (log) =>
      /run|jog|treadmill|track|sprint/i.test(log.exerciseName || "") &&
      Number(log.actualDistance) > 0
  );
  const startOfThisWeek = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return d;
  })();
  const startOfThisMonth = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  })();
  const sumRunningKm = (since: Date) =>
    runningHistoryLogs.reduce((acc, log) => {
      const dt = new Date(`${normalizeDate(log.date)}T00:00:00`);
      return dt >= since
        ? acc + (Number(log.actualDistance) || 0) / 1000
        : acc;
    }, 0);
  const runKmThisWeek = sumRunningKm(startOfThisWeek);
  const runKmThisMonth = sumRunningKm(startOfThisMonth);
  const hasRunningHistory = runningHistoryLogs.length > 0;

  // Weekly strength training volume = Σ(actual weight × actual reps) for sets
  // logged since the start of this calendar week.
  const sumTrainingVolume = (since: Date) =>
    workoutHistoryLogs.reduce((acc, log) => {
      const dt = new Date(`${normalizeDate(log.date)}T00:00:00`);
      if (dt < since) return acc;
      const weight = Number(log.actualWeight) || 0;
      const reps = Number(log.actualReps) || 0;
      return acc + weight * reps;
    }, 0);
  const volumeThisWeek = sumTrainingVolume(startOfThisWeek);
  const hasTrainingVolume = volumeThisWeek > 0;

  const clientPerformanceMetrics = [
    // Note: a test-derived "Estimated 1RM" card used to live here, but it
    // duplicated the per-exercise Est 1RM in Personal Records (which is computed
    // from logged training and is far more useful), so it was removed.
    {
      key: "estimated-mas",
      label: t("estimatedMas"),
      value: Number.isFinite(masOverride)
        ? `${masOverride} km/h`
        : formatAthleteMetricValue(latestMasMetric),
      meta: Number.isFinite(masOverride)
        ? paceZh
          ? "手动设置"
          : "Manual"
        : formatAthleteMetricMeta(latestMasMetric),
    },
  ];
  // Weekly-load cards (current calendar week). On the coach view these always
  // show (0 when no training, so the coach can tell "no data" from "missing");
  // on the athlete portal they appear only when that athlete has matching data.
  const weeklyVolumeCard = {
    key: "volume-week",
    label: paceZh ? "本周训练量" : "Volume This Week",
    value: `${Math.round(volumeThisWeek).toLocaleString()} kg`,
    meta: paceZh ? "重量 × 次数 · 周一至周日" : "weight × reps · Mon–Sun",
  };
  const runWeekCard = {
    key: "run-week",
    label: paceZh ? "本周跑量" : "Run This Week",
    value: `${runKmThisWeek.toFixed(1)} km`,
    meta: paceZh ? "周一至周日" : "Mon–Sun",
  };
  const runMonthCard = {
    key: "run-month",
    label: paceZh ? "本月跑量" : "Run This Month",
    value: `${runKmThisMonth.toFixed(1)} km`,
    meta: paceZh ? "本日历月" : "This month",
  };
  const completedWorkoutCount = workouts.filter(
    (workout) => normalizeTaskStatus(workout.completionStatus) === "Completed"
  ).length;
  const completedAssignmentCount = contentAssignments.filter(
    (assignment) => normalizeTaskStatus(assignment.status) === "Completed"
  ).length;
  const totalTaskCount = workouts.length + contentAssignments.length;
  const completedTaskCount = completedWorkoutCount + completedAssignmentCount;
  const completionRate =
    totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
  const needsAttentionItems = [
    ...workouts.map((workout) => ({
      key: `workout-${workout.id}`,
      type: "Workout",
      title: localizedWorkoutName(workout),
      date: normalizeDate(String(workout.scheduledDate)),
      status: getDisplayTaskStatus(workout.completionStatus, workout.scheduledDate),
      open: () => openWorkout(workout),
    })),
    ...contentAssignments.map((assignment) => ({
      key: `assignment-${assignment.recordId}`,
      type: assignment.assignmentType || "Task",
      title: getAssignmentDisplayName(assignment),
      date: normalizeDate(String(assignment.dueDate || assignment.assignedDate)),
      status: getDisplayTaskStatus(
        assignment.status,
        assignment.dueDate || assignment.assignedDate
      ),
      open: () => handleOpenContentAssignment(assignment),
    })),
  ]
    .filter((item) => item.status === "Missed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);


  const stripSide = (name: string) =>
    name.replace(/\s*-\s*(left|right)\s*$/i, "");
  const progressExerciseOptions = Array.from(
    new Set([
      ...libraryExercises.map((exercise) => exercise.exerciseName).filter(Boolean),
      ...workoutHistoryLogs
        .map((log) => stripSide(log.exerciseName))
        .filter(Boolean),
    ])
  )
    .filter((name) =>
      name.toLowerCase().includes(progressSearch.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));

  // The athlete's headline PR (highest estimated 1RM, else heaviest) — used as
  // the default charted exercise so the history shows real data immediately
  // instead of the first alphabetical library entry (which usually has none).
  const topPrExerciseName = exerciseResults.reduce(
    (best, result) => {
      const value =
        Number(result.estimatedOneRepMax) || Number(result.bestWeight) || 0;
      return value > best.value
        ? { name: result.exerciseName, value }
        : best;
    },
    { name: "", value: 0 }
  ).name;

  const selectedProgressName =
    selectedProgressExercise ||
    topPrExerciseName ||
    workoutHistoryLogs[0]?.exerciseName ||
    progressExerciseOptions[0] ||
    "";
  const visibleProgressExerciseOptions =
    selectedProgressName &&
    !progressExerciseOptions.includes(selectedProgressName)
      ? [selectedProgressName, ...progressExerciseOptions]
      : progressExerciseOptions;
  const getLocalizedProgressExerciseName = (name: string) => {
    const exercise = libraryExercises.find(
      (item) => item.exerciseName.toLowerCase() === name.toLowerCase()
    );

    return exercise ? localizedExerciseName(exercise) : name;
  };

  // Does the selected lift have weight×reps history? Only then do the Est 1RM /
  // Top Set / Volume metrics make sense; pure distance/time work falls back to a
  // single raw line and the metric toggle is hidden.
  const selectedProgressIsWeighted = workoutHistoryLogs.some(
    (log) =>
      log.exerciseName
        .toLowerCase()
        .startsWith(selectedProgressName.toLowerCase()) &&
      Number(log.actualWeight) > 0
  );
  const effectiveTrendMetric = selectedProgressIsWeighted
    ? progressTrendMetric
    : "top";

  // Epley estimated 1RM, capped at 12 reps where the formula loses accuracy.
  const epley1rm = (weight: number, reps: number) =>
    weight * (1 + Math.min(reps, 12) / 30);

  // One point per DAY, not per set — multiple same-day sets would collide on
  // identical x-axis labels and desync the tooltip/active dot. The day's value
  // is the best (or summed, for volume) according to the chosen metric.
  const progressHistoryPoints = (() => {
    const byDate = new Map<string, { date: string; value: number; unit: string }>();
    for (const log of workoutHistoryLogs) {
      if (
        !log.exerciseName
          .toLowerCase()
          .startsWith(selectedProgressName.toLowerCase())
      )
        continue;
      const weight = Number(log.actualWeight);
      const reps = Number(log.actualReps);
      const distance = Number(log.actualDistance);
      const time = Number(log.actualTime);

      let value = 0;
      let unit = "";
      if (selectedProgressIsWeighted && weight > 0) {
        if (effectiveTrendMetric === "e1rm") {
          value = Math.round(epley1rm(weight, reps || 1));
          unit = "kg";
        } else if (effectiveTrendMetric === "volume") {
          value = Math.round(weight * (reps || 1));
          unit = "kg";
        } else {
          value = weight;
          unit = "kg";
        }
      } else {
        value = weight || distance || time || 0;
        unit = weight ? "kg" : distance ? "m" : time ? "sec" : "";
      }
      if (value <= 0) continue;

      const date = normalizeDate(log.date);
      const existing = byDate.get(date);
      if (effectiveTrendMetric === "volume" && selectedProgressIsWeighted) {
        // Volume accumulates across the day's sets rather than taking the best.
        byDate.set(date, {
          date,
          value: (existing?.value || 0) + value,
          unit,
        });
      } else if (!existing || value > existing.value) {
        byDate.set(date, { date, value, unit });
      }
    }
    return [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-8);
  })();

  const progressMaxValue = Math.max(
    1,
    ...progressHistoryPoints.map((point) => point.value)
  );
  const progressUnit = progressHistoryPoints.find((point) => point.unit)?.unit || "";
  const progressLatestValue =
    progressHistoryPoints[progressHistoryPoints.length - 1]?.value || 0;
  const progressFirstValue = progressHistoryPoints[0]?.value || 0;
  // Change across the visible window, and whether the most recent session is a
  // window best (a fresh PR worth flagging to the athlete).
  const progressDelta =
    progressHistoryPoints.length > 1
      ? progressLatestValue - progressFirstValue
      : 0;
  const progressIsNewBest =
    progressHistoryPoints.length > 1 &&
    progressLatestValue >= progressMaxValue;

  // Personal-records leaderboard for the coach Overview: best lift per exercise,
  // ranked by the selected metric (heaviest weight / estimated 1RM / volume).
  const prLeaderboard = (() => {
    const byExercise = new Map<
      string,
      {
        exerciseName: string;
        bestWeight: number;
        bestWeightReps: number;
        bestE1rm: number;
        bestVolume: number;
        latestDate: string;
      }
    >();

    for (const result of exerciseResults) {
      // Unilateral results come in as "Name - Left" / "Name - Right"; merge them
      // into one entry (best across sides) so a single lift = a single PR row.
      const name = (result.exerciseName || "").replace(
        /\s*-\s*(left|right)\s*$/i,
        ""
      );
      if (!name) continue;

      const weight = Number(result.bestWeight) || 0;
      const reps = Number(result.bestReps) || 0;
      const e1rm = Number(result.estimatedOneRepMax) || 0;
      const volume = Number(result.volume) || 0;
      const current = byExercise.get(name) || {
        exerciseName: name,
        bestWeight: 0,
        bestWeightReps: 0,
        bestE1rm: 0,
        bestVolume: 0,
        latestDate: "",
      };

      if (weight > current.bestWeight) {
        current.bestWeight = weight;
        current.bestWeightReps = reps;
      }
      if (e1rm > current.bestE1rm) current.bestE1rm = e1rm;
      if (volume > current.bestVolume) current.bestVolume = volume;
      if (result.date > current.latestDate) current.latestDate = result.date;

      byExercise.set(name, current);
    }

    const metricValue = (row: { bestWeight: number; bestE1rm: number; bestVolume: number }) =>
      prMetric === "weight"
        ? row.bestWeight
        : prMetric === "volume"
        ? row.bestVolume
        : row.bestE1rm;

    return Array.from(byExercise.values())
      .filter((row) => metricValue(row) > 0)
      .sort((a, b) => metricValue(b) - metricValue(a));
  })();

  // Exercise-history controls + progress chart, shared by the athlete Home and
  // the coach Overview's Personal Records card.
  const renderExerciseHistoryBody = () => (
    <>
      <div className="progressControls">
        <input
          value={progressSearch}
          onChange={(e) => setProgressSearch(e.target.value)}
          placeholder={t("searchExercise")}
        />
        <select
          value={selectedProgressName}
          onChange={(e) => setSelectedProgressExercise(e.target.value)}
        >
          {visibleProgressExerciseOptions.length > 0 ? (
            visibleProgressExerciseOptions.map((name) => (
              <option key={name} value={name}>
                {getLocalizedProgressExerciseName(name)}
              </option>
            ))
          ) : (
            <option value="">{t("noExerciseHistory")}</option>
          )}
        </select>
      </div>

      {selectedProgressIsWeighted && (
        <div
          className="prMetricToggle progressMetricToggle"
          role="group"
          aria-label={paceZh ? "趋势指标" : "Trend metric"}
        >
          {([
            ["e1rm", paceZh ? "预估1RM" : "Est 1RM"],
            ["top", paceZh ? "最大单组" : "Top Set"],
            ["volume", paceZh ? "容量" : "Volume"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={progressTrendMetric === key ? "active" : ""}
              onClick={() => setProgressTrendMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="progressChartCard" aria-label="Exercise progress chart">
        {progressHistoryPoints.length > 0 ? (
          <>
            <div className="progressChartSummary">
              <div>
                <span>{t("best")}</span>
                <strong>
                  {progressMaxValue}
                  {progressUnit && ` ${progressUnit}`}
                  {progressIsNewBest && (
                    <em className="progressPrBadge">{paceZh ? "新纪录" : "PR"}</em>
                  )}
                </strong>
              </div>
              <div>
                <span>{t("latest")}</span>
                <strong>
                  {progressLatestValue || "--"}
                  {progressUnit && ` ${progressUnit}`}
                </strong>
              </div>
              {progressDelta !== 0 && (
                <div>
                  <span>{paceZh ? "变化" : "Change"}</span>
                  <strong
                    className={
                      progressDelta > 0 ? "progressDeltaUp" : "progressDeltaDown"
                    }
                  >
                    {progressDelta > 0 ? "+" : ""}
                    {progressDelta}
                    {progressUnit && ` ${progressUnit}`}
                  </strong>
                </div>
              )}
            </div>

            <Suspense fallback={<div className="chartLoading">{t("loading")}</div>}>
              <ProgressChart
                points={progressHistoryPoints}
                locale={clientLocale}
                unit={progressUnit}
              />
            </Suspense>
          </>
        ) : (
          <p className="homeEmptyText">{t("noExerciseHistory")}</p>
        )}
      </div>
    </>
  );

  // Foster's training monotony (weekly mean ÷ SD, rest days = 0) and strain
  // (weekly load × monotony) for the 7-day window ending at `ref`.
  const computeMonotonyStrain = (
    loadByDate: Map<string, number>,
    ref: Date
  ) => {
    const dayLoads: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      dayLoads.push(loadByDate.get(dateToInputValue(d)) || 0);
    }
    const weeklyLoad = Math.round(dayLoads.reduce((a, b) => a + b, 0));
    const mean = weeklyLoad / 7;
    const sd = Math.sqrt(
      dayLoads.reduce((a, b) => a + (b - mean) ** 2, 0) / 7
    );
    const monotony = sd > 0 ? mean / sd : 0;
    return { weeklyLoad, monotony, strain: Math.round(weeklyLoad * monotony) };
  };

  const monotonyZoneOf = (monotony: number, weeklyLoad: number) =>
    weeklyLoad === 0 || monotony === 0
      ? { label: paceZh ? "无数据" : "n/a", cls: "loadZoneNeutral" }
      : monotony < 1.5
      ? { label: paceZh ? "理想" : "Varied", cls: "loadZoneGood" }
      : monotony <= 2
      ? { label: paceZh ? "注意" : "Caution", cls: "loadZoneWarn" }
      : { label: paceZh ? "高风险" : "High risk", cls: "loadZoneRisk" };

  // Build a date→internal-load map for one client's completed workouts.
  const loadByDateForWorkouts = (list: Workout[]) => {
    const map = new Map<string, number>();
    for (const w of list) {
      if (!/complete/i.test(w.completionStatus || "")) continue;
      const d = normalizeDate(String(w.scheduledDate));
      if (!d) continue;
      let load = Number(w.sessionLoad);
      if (!load) {
        const rpe = Number(w.sessionRpe);
        const dur = Number(w.sessionDuration);
        if (rpe && dur) load = rpe * dur;
      }
      if (load) map.set(d, (map.get(d) || 0) + load);
    }
    return map;
  };

  // This-week monotony zone for one athlete (null if no in-week load) — powers
  // the Clients-table risk badge and the roster watch.
  const clientWeekLoadZone = (client: Client) => {
    const code = client.clientCode;
    if (!code) return null;
    const list = rosterLoadWorkouts.filter((w) =>
      (w.clientId || "").includes(code)
    );
    const { weeklyLoad, monotony } = computeMonotonyStrain(
      loadByDateForWorkouts(list),
      new Date(`${todayValue}T00:00:00`)
    );
    if (weeklyLoad === 0) return null;
    return monotonyZoneOf(monotony, weeklyLoad);
  };

  // Coach-only training-load dashboard: internal load (sRPE = RPE x duration)
  // and external load (tonnage), Foster monotony/strain, plus a weekly strain
  // trend. Drives load-management decisions; deliberately hidden from athletes.
  const renderLoadDashboard = () => {
    const tonnageByDate = new Map<string, number>();
    for (const log of workoutHistoryLogs) {
      const w = Number(log.actualWeight);
      const r = Number(log.actualReps);
      if (!w || !r) continue;
      const d = normalizeDate(log.date);
      tonnageByDate.set(d, (tonnageByDate.get(d) || 0) + w * r);
    }
    const loadByDate = loadByDateForWorkouts(workouts);
    // Fold in the athlete's self-reported technical + extra-cardio load.
    for (const [d, v] of workloadLoadByDate()) {
      loadByDate.set(d, (loadByDate.get(d) || 0) + v);
    }

    const dates = [
      ...new Set([...loadByDate.keys(), ...tonnageByDate.keys()]),
    ].sort();
    const series = dates.map((d) => ({
      date: d,
      load: Math.round(loadByDate.get(d) || 0),
      tonnage: Math.round(tonnageByDate.get(d) || 0),
    }));

    if (series.length === 0) {
      return (
        <p className="homeEmptyText">
          {paceZh
            ? "完成训练并记录RPE后，这里会显示负荷趋势。"
            : "Load trends appear once sessions are completed with an RPE."}
        </p>
      );
    }

    // Current-week monotony/strain (rest days = 0) for the headline tiles.
    const ref = new Date(`${todayValue}T00:00:00`);
    let weekTonnage = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      weekTonnage += tonnageByDate.get(dateToInputValue(d)) || 0;
    }
    const { weeklyLoad, monotony, strain } = computeMonotonyStrain(
      loadByDate,
      ref
    );
    const monotonyZone = monotonyZoneOf(monotony, weeklyLoad);
    const maxLoad = Math.max(1, ...series.map((s) => s.load));
    const recent = series.slice(-12);

    // Weekly strain trend — 8 non-overlapping weeks ending today, to spot spikes.
    const weeklyStrain: { label: string; strain: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = new Date(ref);
      end.setDate(end.getDate() - w * 7);
      const r = computeMonotonyStrain(loadByDate, end);
      weeklyStrain.push({
        label: end.toLocaleDateString(clientLocale, {
          month: "numeric",
          day: "numeric",
        }),
        strain: r.strain,
      });
    }
    const maxStrain = Math.max(1, ...weeklyStrain.map((x) => x.strain));
    const hasStrain = weeklyStrain.some((x) => x.strain > 0);

    return (
      <div className="loadDashboard">
        <div className="loadStatRow">
          <div className="loadStat">
            <strong>{weeklyLoad.toLocaleString()}</strong>
            <span>{paceZh ? "周负荷" : "Weekly load"}</span>
          </div>
          <div className={`loadStat ${monotonyZone.cls}`}>
            <strong>{monotony ? monotony.toFixed(2) : "--"}</strong>
            <span>{paceZh ? "单调性" : "Monotony"} · {monotonyZone.label}</span>
          </div>
          <div className="loadStat">
            <strong>{strain ? strain.toLocaleString() : "--"}</strong>
            <span>{paceZh ? "应激" : "Strain"}</span>
          </div>
          <div className="loadStat">
            <strong>{weekTonnage.toLocaleString()}</strong>
            <span>{paceZh ? "7天容量(kg)" : "7-day volume (kg)"}</span>
          </div>
        </div>

        <div className="loadBars">
          {recent.map((s) => (
            <div className="loadBarCol" key={s.date} title={`${s.date}: ${s.load}`}>
              <span className="loadBarValue">{s.load}</span>
              <div
                className="loadBar"
                style={{ height: `${Math.max(4, (s.load / maxLoad) * 100)}%` }}
              />
              <span className="loadBarLabel">
                {new Date(`${s.date}T00:00:00`).toLocaleDateString(clientLocale, {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>

        {hasStrain && (
          <>
            <h4 className="loadSubHeading">
              {paceZh ? "每周应激趋势" : "Weekly strain trend"}
            </h4>
            <div className="loadBars loadStrainBars">
              {weeklyStrain.map((wk) => (
                <div className="loadBarCol" key={wk.label} title={`${wk.label}: ${wk.strain}`}>
                  <span className="loadBarValue">{wk.strain || ""}</span>
                  <div
                    className="loadBar loadStrainBar"
                    style={{ height: `${Math.max(4, (wk.strain / maxStrain) * 100)}%` }}
                  />
                  <span className="loadBarLabel">{wk.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="loadDashboardNote">
          {paceZh
            ? "内部负荷 = RPE × 时长。单调性 = 周均负荷 ÷ 标准差（>2 偏高）；应激 = 周负荷 × 单调性。"
            : "Internal load = RPE × duration. Monotony = weekly mean ÷ SD (>2 is high); Strain = weekly load × monotony."}
        </p>
      </div>
    );
  };


  // PR leaderboard + the progress chart, for the coach Overview's capacity view.
  // PR metric toggle + ranked leaderboard. Clicking a row selects that exercise
  // so any nearby progress chart follows. Shared by coach Overview + portal Home.
  const renderPrLeaderboard = () => (
    <>
      <div className="prLeaderboardControls">
        <div className="prMetricToggle" role="group" aria-label="PR metric">
          {([
            ["e1rm", paceZh ? "预估1RM" : "Est 1RM"],
            ["weight", paceZh ? "最大重量" : "Best Weight"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={prMetric === key ? "active" : ""}
              onClick={() => setPrMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {prLeaderboard.length > 0 ? (
        <div className="prLeaderboard">
          {prLeaderboard.slice(0, 8).map((row, index) => {
            const value =
              prMetric === "weight"
                ? `${row.bestWeight} kg`
                : prMetric === "volume"
                ? `${Math.round(row.bestVolume)}`
                : `${row.bestE1rm} kg`;
            const sub =
              prMetric === "weight"
                ? `× ${row.bestWeightReps} ${paceZh ? "次" : "reps"}`
                : prMetric === "volume"
                ? paceZh
                  ? "总容量"
                  : "total volume"
                : paceZh
                ? `预估 1RM`
                : "estimated 1RM";
            const isActive =
              selectedProgressName.toLowerCase() === row.exerciseName.toLowerCase();

            return (
              <button
                type="button"
                key={row.exerciseName}
                className={`prLeaderboardRow${isActive ? " active" : ""}`}
                onClick={() => setSelectedProgressExercise(row.exerciseName)}
              >
                <span className="prRank">{index + 1}</span>
                <span className="prName">
                  {getLocalizedProgressExerciseName(row.exerciseName)}
                </span>
                <span className="prValue">
                  <strong>{value}</strong>
                  <small>{sub}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="homeEmptyText">
          {paceZh
            ? "暂无个人记录，完成训练后将显示。"
            : "No personal records yet — they appear once workouts are logged."}
        </p>
      )}
    </>
  );

  const renderPersonalRecords = () => (
    <>
      {renderPrLeaderboard()}

      <div className="prChartDivider">
        <span>
          {getLocalizedProgressExerciseName(selectedProgressName) ||
            (paceZh ? "动作趋势" : "Exercise trend")}
        </span>
      </div>
      {renderExerciseHistoryBody()}
    </>
  );

  const openWorkoutExerciseFromGlance = (index: number) => {
    if (isClientPortal) {
      setWorkoutFocusIndex(index);
      setWorkoutFocusSetRound(1);
      setWorkoutLoggingStarted(true);
      if (!workoutStartedAtRef.current) {
        workoutStartedAtRef.current = Date.now();
      }
      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>(
            ".clientWorkoutPlayerModal > .modal-body"
          )
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return;
    }

    window.setTimeout(() => {
      document.getElementById(`workout-exercise-${index}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const getWorkoutGroupIndexes = (index: number) => {
    const focusExercise = workoutDetails[index];
    if (!focusExercise) return [];

    const focusMeta = parseExerciseNotes(focusExercise.notes);
    if (!focusMeta.groupType || !focusMeta.groupName) {
      const sectionKey = (focusMeta.sectionName || "Main").toLowerCase();
      const labelKey = focusMeta.exerciseLabel.trim().toLowerCase();
      if (!labelKey) return [index];

      const linkedByLabel = workoutDetails
        .map((exercise, exerciseIndex) => {
          const meta = parseExerciseNotes(exercise.notes);
          const itemSection = (meta.sectionName || "Main").toLowerCase();
          const itemLabel = meta.exerciseLabel.trim().toLowerCase();
          return itemSection === sectionKey && itemLabel === labelKey
            ? exerciseIndex
            : -1;
        })
        .filter((exerciseIndex) => exerciseIndex >= 0);

      return linkedByLabel.length > 1 ? linkedByLabel : [index];
    }

    const groupKey = `${focusMeta.groupType}:${focusMeta.groupName}`.toLowerCase();
    return workoutDetails
      .map((exercise, exerciseIndex) => {
        const meta = parseExerciseNotes(exercise.notes);
        const itemKey = `${meta.groupType || ""}:${meta.groupName || ""}`.toLowerCase();
        return itemKey === groupKey ? exerciseIndex : -1;
      })
      .filter((exerciseIndex) => exerciseIndex >= 0);
  };

  const getWorkoutGroupBounds = (index: number) => {
    const indexes = getWorkoutGroupIndexes(index);
    if (!indexes.length) return { start: index, end: index, indexes: [index] };

    return {
      start: Math.min(...indexes),
      end: Math.max(...indexes),
      indexes,
    };
  };

  const getWorkoutGroupRoundCount = (indexes: number[]) => {
    const ids = new Set(
      indexes
        .map((index) => workoutDetails[index]?.exerciseId)
        .filter(Boolean)
    );
    const maxSet = setLogs.reduce((max, log) => {
      if (!ids.has(log.exerciseId)) return max;
      return Math.max(max, Number(log.setNumber) || 0);
    }, 0);

    return Math.max(1, maxSet);
  };

  const workoutGroupTitle = (meta: ExerciseNoteMeta) => {
    if (!meta.groupType || !meta.groupName) return "";
    return /superset|circuit/i.test(meta.groupName)
      ? meta.groupName
      : `${meta.groupType} ${meta.groupName}`;
  };

  // Move to a different exercise in the one-at-a-time focus player and bring
  // the new card into view from the top.
  const goToFocusExercise = (index: number, total: number) => {
    const next = Math.max(0, Math.min(total - 1, index));
    setWorkoutFocusIndex(next);
    setWorkoutFocusSetRound(1);
    if (isClientPortal) {
      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>(
            ".clientWorkoutPlayerModal > .modal-body"
          )
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return;
    }
    window.setTimeout(() => {
      document.getElementById(`workout-exercise-${next}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  // Best-effort haptic feedback (no-op where unsupported, e.g. desktop/iOS Safari).
  const vibrate = (ms: number) => {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  };

  // A single set is "complete" once its primary actual value is entered.
  // A set is DONE only when the athlete ticked it ✓ or typed a real value
  // (weight/time/distance/RPE/RIR — reps alone don't count because the plan
  // prefills them). Unchecked and untouched honestly means "skipped"; the
  // finish screen catches forgetful tickers before submit.
  const isSetComplete = (log: SetLog) => {
    if (checkedWorkoutPageItems.includes(workoutSetCheckKey(log))) return true;
    if (log.trackingType === "Time") return !!String(log.actualTime || "").trim();
    if (log.trackingType === "Distance")
      return !!String(log.actualDistance || "").trim();
    if (log.trackingType === "Pace")
      return Boolean(
        String(log.actualDistance || "").trim() ||
          String(log.actualTime || "").trim()
      );
    return Boolean(
      String(log.actualWeight || "").trim() ||
        String(log.actualRpe || "").trim() ||
        String(log.actualRir || "").trim()
    );
  };

  // An exercise counts as "logged" once every one of its set rows is complete.
  const isExerciseFullyLogged = (exerciseId: string) => {
    const sets = setLogs.filter((l) => l.exerciseId === exerciseId);
    if (sets.length === 0) return false;
    return sets.every(isSetComplete);
  };

  // Live session totals for the finish screen — external load (tonnage) plus
  // completed-set and exercise counts, computed from the current setLogs.
  const computeWorkoutStats = () => {
    const completed = setLogs.filter(isSetComplete);
    const exerciseIds = new Set(completed.map((l) => l.exerciseId));
    let volume = 0;
    for (const l of completed) {
      const w = parseFloat(l.actualWeight);
      const r = parseFloat(l.actualReps);
      if (!Number.isNaN(w) && !Number.isNaN(r)) volume += w * r;
    }
    return {
      exercises: exerciseIds.size,
      sets: completed.length,
      volume: Math.round(volume),
    };
  };

  // Personal bests this session: best logged load per exercise vs the athlete's
  // prior history (no history yet = a baseline, not a PR).
  const computeWorkoutPrs = () => {
    const completed = setLogs.filter(isSetComplete);
    const exerciseIds = new Set(completed.map((l) => l.exerciseId));
    const prs: { name: string; weight: number; reps: number }[] = [];
    for (const id of exerciseIds) {
      const exSets = completed.filter(
        (l) => l.exerciseId === id && l.trackingType === "Weight"
      );
      if (!exSets.length) continue;
      const best = exSets.reduce(
        (acc, l) => {
          const w = parseFloat(l.actualWeight);
          return !Number.isNaN(w) && w > acc.weight
            ? { weight: w, reps: parseFloat(l.actualReps) || 0, name: l.exerciseName }
            : acc;
        },
        { weight: 0, reps: 0, name: exSets[0].exerciseName }
      );
      if (best.weight <= 0) continue;
      const base = best.name.split(" - ")[0].toLowerCase();
      const history = workoutHistoryLogs.filter((h) =>
        h.exerciseName.toLowerCase().startsWith(base)
      );
      if (!history.length) continue;
      const histBest = history.reduce((m, h) => {
        const w = parseFloat(h.actualWeight);
        return !Number.isNaN(w) && w > m ? w : m;
      }, 0);
      if (best.weight > histBest && histBest > 0) {
        prs.push({ name: best.name.split(" - ")[0], weight: best.weight, reps: best.reps });
      }
    }
    return prs;
  };

  // Open the finish/review screen: freeze the elapsed duration and celebrate.
  const openWorkoutFinish = () => {
    const dur = workoutStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - workoutStartedAtRef.current) / 60000))
      : 0;
    setFinishDurationMin(dur);
    setWorkoutFinishOpen(true);
    if (computeWorkoutPrs().length) vibrate(40);
  };

  const scrollWorkoutPlayerTop = () => {
    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(".clientWorkoutPlayerModal > .modal-body")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const advanceWorkoutPlayerPage = () => {
    const bounds = getWorkoutGroupBounds(workoutFocusIndex);
    const isGrouped = bounds.indexes.length > 1;
    const roundCount = getWorkoutGroupRoundCount(bounds.indexes);

    if (isGrouped && workoutFocusSetRound < roundCount) {
      setWorkoutFocusSetRound((round) => Math.min(roundCount, round + 1));
      scrollWorkoutPlayerTop();
      return;
    }

    if (bounds.end < workoutDetails.length - 1) {
      goToFocusExercise(bounds.end + 1, workoutDetails.length);
      return;
    }

    openWorkoutFinish();
  };

  const workoutSetCheckKey = (
    log: Pick<SetLog, "exerciseId" | "occurrenceId" | "setNumber" | "side">
  ) =>
    `${log.occurrenceId || log.exerciseId}:set:${log.setNumber}:${
      log.side || "both"
    }`;

  const checkAndSaveWorkoutSet = (log: SetLog, visibleLogs: SetLog[]) => {
    const key = workoutSetCheckKey(log);
    const nextChecked = Array.from(new Set([...checkedWorkoutPageItems, key]));
    setCheckedWorkoutPageItems(nextChecked);
    saveExerciseDraft(log.exerciseId, { showToast: false });
    vibrate(14);

    const allVisibleChecked = visibleLogs
      .filter(Boolean)
      .every((item) => nextChecked.includes(workoutSetCheckKey(item)));

    if (workoutFocusMode && allVisibleChecked) {
      window.setTimeout(advanceWorkoutPlayerPage, 220);
    }
  };

  // Swipe left/right on the focus card to move between exercises. Ignore
  // mostly-vertical drags so scrolling and input taps still work.
  const handleFocusTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    focusTouchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleFocusTouchEnd = (e: React.TouchEvent, total: number) => {
    const start = focusTouchRef.current;
    focusTouchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const bounds = getWorkoutGroupBounds(workoutFocusIndex);
    const roundCount = getWorkoutGroupRoundCount(bounds.indexes);
    const grouped = bounds.indexes.length > 1;

    if (dx < 0) {
      if (grouped && workoutFocusSetRound < roundCount) {
        setWorkoutFocusSetRound((round) => round + 1);
      } else {
        goToFocusExercise(bounds.end + 1, total);
      }
    } else if (grouped && workoutFocusSetRound > 1) {
      setWorkoutFocusSetRound((round) => round - 1);
    } else {
      goToFocusExercise(bounds.start - 1, total);
    }
  };

  // Swipe between the portal Home sub-pages (Workload only for monitored athletes).
  const portalHomeOrder = (
    isWorkloadMonitored
      ? ["tasks", "records", "metrics", "workload"]
      : ["tasks", "records", "metrics"]
  ) as Array<typeof portalHomeTab>;
  const handleHomeTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    homeTouchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleHomeTouchEnd = (e: React.TouchEvent) => {
    const start = homeTouchRef.current;
    homeTouchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = portalHomeOrder.indexOf(portalHomeTab);
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < portalHomeOrder.length) {
      setPortalHomeTab(portalHomeOrder[next]);
    }
  };

  if (isPublicLandingPage) {
    return (
      <LandingPage
        storeLang={storeLang}
        setStoreLang={setStoreLang}
        programs={programs}
        toasts={toasts}
      />
    );
  }

  if (isStorePage) {
    return (
      <StorePage
        clients={clients}
        coaches={coaches}
        programs={programs}
        programsLoading={programsLoading}
        toasts={toasts}
        storeReviews={storeReviews}
        storeLang={storeLang}
        setStoreLang={setStoreLang}
        storeStep={storeStep}
        setStoreStep={setStoreStep}
        storeCategoryFilter={storeCategoryFilter}
        setStoreCategoryFilter={setStoreCategoryFilter}
        storeSeasonFilter={storeSeasonFilter}
        setStoreSeasonFilter={setStoreSeasonFilter}
        storeProgramSearch={storeProgramSearch}
        setStoreProgramSearch={setStoreProgramSearch}
        storeFaqOpen={storeFaqOpen}
        setStoreFaqOpen={setStoreFaqOpen}
        storeSelectedProgram={storeSelectedProgram}
        setStoreSelectedProgram={setStoreSelectedProgram}
        requestStoreStep={(step: number) => {
          storeStepIntentRef.current = step;
        }}
        storeSelectedAddonIds={storeSelectedAddonIds}
        setStoreSelectedAddonIds={setStoreSelectedAddonIds}
        storeLauncherOpen={storeLauncherOpen}
        setStoreLauncherOpen={setStoreLauncherOpen}
        storeLauncherClient={storeLauncherClient}
        setStoreLauncherClient={setStoreLauncherClient}
        storeRegName={storeRegName}
        setStoreRegName={setStoreRegName}
        storeRegPhone={storeRegPhone}
        setStoreRegPhone={setStoreRegPhone}
        storeRegistering={storeRegistering}
        storeRegStage={storeRegStage}
        storeRegisteredCode={storeRegisteredCode}
        setStoreRegisteredCode={setStoreRegisteredCode}
        storeRegisteredOrderId={storeRegisteredOrderId}
        setStoreRegisteredOrderId={setStoreRegisteredOrderId}
        storePaymentCode={storePaymentCode}
        findPortalOpen={findPortalOpen}
        setFindPortalOpen={setFindPortalOpen}
        findPortalName={findPortalName}
        setFindPortalName={setFindPortalName}
        findPortalPhone={findPortalPhone}
        setFindPortalPhone={setFindPortalPhone}
        findPortalBusy={findPortalBusy}
        findPortalError={findPortalError}
        setFindPortalError={setFindPortalError}
        findMyPortal={findMyPortal}
        previewProgram={previewProgram}
        setPreviewProgram={setPreviewProgram}
        previewLoading={previewLoading}
        openProgramPreview={openProgramPreview}
        registerForProgram={registerForProgram}
        buildGlanceChain={buildGlanceChain}
        rememberedPortalCode={rememberedPortalCode}
      />
    );
  }

  if (isInPersonEnquiry) {
    return (
      <InPersonEnquiryPage
        enquiryForm={enquiryForm}
        enquirySubmitted={enquirySubmitted}
        inviteLang={inviteLang}
        setEnquiryForm={setEnquiryForm}
        setInviteLang={setInviteLang}
        submitEnquiry={submitEnquiry}
        submittingEnquiry={submittingEnquiry}
        toasts={toasts}
      />
    );
  }

  if (isClientInvite) {
    return (
      <ClientInvitePage
        copyToClipboard={copyToClipboard}
        inviteClientId={inviteClientId}
        inviteForm={inviteForm}
        inviteLang={inviteLang}
        inviteSubmitted={inviteSubmitted}
        setInviteForm={setInviteForm}
        setInviteLang={setInviteLang}
        submitInviteForm={submitInviteForm}
        submittingInvite={submittingInvite}
        toasts={toasts}
      />
    );
  }

  // Hold authed views behind a brief spinner until their stylesheet loads, so
  // the coach/portal UI never flashes unstyled on first paint.
  if (needsInteriorCss && !interiorCssReady) {
    return <div className="lazyFallback" aria-busy="true" aria-live="polite" />;
  }

  if (isClientPortal && portalPostIntake && selectedClient) {
    return (
      <PortalWelcome
        selectedClient={selectedClient}
        toasts={toasts}
        useChineseClientText={useChineseClientText}
        portalAutoLoading={portalAutoLoading}
        portalLoadedProgram={portalLoadedProgram}
        setPortalPostIntake={setPortalPostIntake}
        copyToClipboard={copyToClipboard}
        setClientTab={setClientTab}
      />
    );
  }

  if (isClientPortal && !selectedClient) {
    const portalMessage = !clientPortalCode
      ? "This client portal link is missing a client code."
      : portalResolveExhausted
      ? "We could not find this client portal."
      : "Loading your training portal...";

    return (
      <div className="clientPortalShell">
        <div className="toastStack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>

        <section className="clientPortalEmpty">
          <div className="brandWordmark brandLogoLockup">
            <img
              src="/nl_wordmark_clean.png"
              alt="NO LIMIT"
              className="brandWordmarkImage"
            />
          </div>
          <h1>Client Portal</h1>
          <p>{portalMessage}</p>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`app ${
        selectedClient ? "clientLayerActive" : "coachLayerActive"
      } ${isClientPortal ? "clientPortalApp" : ""} ${
        useChineseClientText ? "chineseLocaleApp" : ""
      }`}
    >
      {templateMenu && (
        <>
          <div
            className="programCtxBackdrop"
            onClick={() => setTemplateMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setTemplateMenu(null);
            }}
          />
          <div
            className="programCtxMenu"
            style={{
              top: Math.min(templateMenu.y, window.innerHeight - 170),
              left: Math.min(templateMenu.x, window.innerWidth - 200),
            }}
          >
            {(() => {
              const isForm = templateMenu.kind === "form";
              const item: any = (
                isForm ? savedFormTemplates : savedTestTemplates
              ).find((t: any) => t.recordId === templateMenu.recordId);
              if (!item) return null;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateMenu(null);
                      if (isForm) {
                        setSelectedSavedFormId(item.formId);
                        loadSavedFormIntoBuilder(item);
                        setFormView("builder");
                      } else {
                        setSelectedSavedTestId(item.testTemplateId);
                        loadSavedTestIntoBuilder(item);
                        setTestView("builder");
                      }
                    }}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateMenu(null);
                      if (isForm) {
                        duplicateSavedFormIntoBuilder(item);
                        setFormView("builder");
                      } else {
                        duplicateSavedTestIntoBuilder(item);
                        setTestView("builder");
                      }
                    }}
                  >
                    <Copy size={15} /> Duplicate
                  </button>
                  <button
                    type="button"
                    className="dangerMenuItem"
                    onClick={() => {
                      setTemplateMenu(null);
                      if (isForm) deleteSavedFormTemplate(item);
                      else deleteSavedTestTemplate(item);
                    }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {calAddMenu && (
        <>
          <div
            className="programCtxBackdrop"
            onClick={() => setCalAddMenu(null)}
          />
          <div
            className="programCtxMenu"
            style={{
              top: Math.min(calAddMenu.y, window.innerHeight - 130),
              left: Math.min(calAddMenu.x, window.innerWidth - 200),
            }}
          >
            <button
              type="button"
              onClick={() => openAddAssign("program", calAddMenu.date)}
            >
              <CalendarDays size={15} /> Add program
            </button>
            <button
              type="button"
              onClick={() => openAddAssign("session", calAddMenu.date)}
            >
              <BookOpen size={15} /> Add session
            </button>
          </div>
        </>
      )}

      {cellMenu && (
        <>
          <div
            className="programCtxBackdrop"
            onClick={() => setCellMenu(null)}
          />
          <div
            className="programCtxMenu"
            style={{
              top: Math.min(cellMenu.y, window.innerHeight - 170),
              left: Math.min(cellMenu.x, window.innerWidth - 200),
            }}
          >
            {cellMenu.sessionLocalId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const id = cellMenu.sessionLocalId;
                    setCellMenu(null);
                    const s = programSessions.find((x) => x.localId === id);
                    if (s) loadSessionForEditing(s);
                  }}
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = cellMenu.sessionLocalId;
                    setCellMenu(null);
                    const s = programSessions.find((x) => x.localId === id);
                    if (s) {
                      setCopiedSession({ session: s, mode: "copy" });
                      notify(`Copied "${s.sessionName}".`);
                    }
                  }}
                >
                  <Copy size={15} /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = cellMenu.sessionLocalId;
                    setCellMenu(null);
                    const s = programSessions.find((x) => x.localId === id);
                    if (s) {
                      setCopiedSession({ session: s, mode: "cut" });
                      notify(`Cut "${s.sessionName}" — paste it on another day.`);
                    }
                  }}
                >
                  <Scissors size={15} /> Cut
                </button>
              </>
            )}
            {copiedSession && (
              <button
                type="button"
                onClick={() => {
                  const { w, d } = cellMenu;
                  setCellMenu(null);
                  pasteSessionAtCell(w, d);
                }}
              >
                <ClipboardList size={15} /> Paste “
                {copiedSession.session.sessionName}”
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const { w, d } = cellMenu;
                setCellMenu(null);
                startSessionForCell(w, d);
              }}
            >
              <Plus size={15} /> New session
            </button>
            <button
              type="button"
              onClick={() => {
                const { w, d } = cellMenu;
                setCellMenu(null);
                if (programs.length === 0) void loadPrograms();
                setLibPickTarget({ w, d });
              }}
            >
              <BookOpen size={15} /> Add from Library
            </button>
          </div>
        </>
      )}

      {libPickTarget && (
        <div
          className="createProgramOverlay"
          onClick={() => setLibPickTarget(null)}
        >
          <div
            className="createProgramModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="createProgramHeader">
              <div>
                <span className="eyebrow">Add from Library</span>
                <h3>
                  Week {libPickTarget.w} · Day {libPickTarget.d}
                </h3>
              </div>
              <button
                type="button"
                className="iconActionButton"
                title="Close"
                onClick={() => setLibPickTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="createProgramBody">
              {(() => {
                const sessionPrograms = programs.filter(
                  (pp) =>
                    pp.productType === "Single Workout" &&
                    pp.status !== "Archived"
                );
                if (sessionPrograms.length === 0) {
                  return (
                    <p className="mbHint">
                      No saved sessions yet. Create one in the Sessions tab.
                    </p>
                  );
                }
                return sessionPrograms.map((pp) => (
                  <button
                    key={pp.recordId}
                    type="button"
                    className="mobilePickerRow"
                    disabled={Boolean(libPickLoadingId)}
                    onClick={() => insertSessionFromLibrary(pp)}
                  >
                    <span className="mobilePickerInfo">
                      <strong>{pp.programName}</strong>
                      <small>
                        {libPickLoadingId === pp.programId
                          ? "Adding…"
                          : pp.goal || "Session"}
                      </small>
                    </span>
                  </button>
                ));
              })()}
            </div>
            <div className="createProgramFooter">
              <button
                type="button"
                className="outlineButton"
                onClick={() => setLibPickTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {programMenu && (
        <>
          <div
            className="programCtxBackdrop"
            onClick={() => setProgramMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setProgramMenu(null);
            }}
          />
          <div
            className="programCtxMenu"
            style={{
              top: Math.min(programMenu.y, window.innerHeight - 230),
              left: Math.min(programMenu.x, window.innerWidth - 190),
            }}
          >
            <button
              type="button"
              onClick={() => {
                const pr = programMenu.program;
                setProgramMenu(null);
                setSelectedSavedProgramId(pr.programId);
                setSavedAssignableWorkouts([]);
                setShowProgramDetail(true);
              }}
            >
              <UserCircle size={15} /> Assign
            </button>
            <button
              type="button"
              onClick={() => openProgramPreview(programMenu.program)}
            >
              <Eye size={15} /> Preview
            </button>
            <button
              type="button"
              onClick={() => {
                const pr = programMenu.program;
                setProgramMenu(null);
                setSelectedSavedProgramId(pr.programId);
                void loadSavedProgramIntoBuilder(pr, { edit: true });
              }}
            >
              <Pencil size={15} /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                const pr = programMenu.program;
                setProgramMenu(null);
                setSelectedSavedProgramId(pr.programId);
                void loadSavedProgramIntoBuilder(pr, { asCopy: true });
              }}
            >
              <Copy size={15} /> Duplicate
            </button>
            <button
              type="button"
              className="dangerMenuItem"
              onClick={() => {
                const pr = programMenu.program;
                setProgramMenu(null);
                deleteSavedProgram(pr);
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </>
      )}

      {previewProgram && (
        <ProgramPreviewModal
          buildGlanceChain={buildGlanceChain}
          loadSavedProgramIntoBuilder={loadSavedProgramIntoBuilder}
          previewLoading={previewLoading}
          previewProgram={previewProgram}
          setPreviewProgram={setPreviewProgram}
          setSelectedSavedProgramId={setSelectedSavedProgramId}
        />
      )}

      {createProgramOpen && (
        <CreateProgramModal
          createDraft={createDraft}
          setCreateDraft={setCreateDraft}
          setCreateProgramOpen={setCreateProgramOpen}
          startProgramFromDraft={startProgramFromDraft}
        />
      )}

      {customizeFieldsIndex !== null &&
        selectedProgramExercises[customizeFieldsIndex] &&
        (() => {
          const ex = selectedProgramExercises[customizeFieldsIndex];
          const active = effectiveTrackingFields(
            ex.trackingType,
            ex.trackingFields
          );
          return (
            <div
              className="customizeFieldsOverlay"
              onClick={() => setCustomizeFieldsIndex(null)}
            >
              <div
                className="customizeFieldsModal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Customize fields</h3>
                <p className="customizeFieldsHint">
                  Choose up to 3 fields to track for{" "}
                  <strong>{ex.exerciseName}</strong>.
                </p>
                <div className="customizeFieldChips">
                  {STRENGTH_TRACKING_FIELDS.map((f) => {
                    const on = active.includes(f);
                    const disabled = !on && active.length >= 3;
                    return (
                      <button
                        key={f}
                        type="button"
                        className={`customizeFieldChip${on ? " on" : ""}`}
                        disabled={disabled}
                        onClick={() => toggleTrackingField(customizeFieldsIndex, f)}
                      >
                        {on ? `${active.indexOf(f) + 1}. ` : ""}
                        {f === "Weight" ? "Weight (kg)" : f}
                      </button>
                    );
                  })}
                </div>
                <div className="wellnessActions">
                  <button
                    type="button"
                    className="wellnessSubmit"
                    onClick={() => setCustomizeFieldsIndex(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      <aside className="sidebar">
        <div className="brand">
          <div className="brandPlate">
            <img
              src="/nl_wordmark_black.png"
              alt="NoLimit"
              className="brandWordmarkImg"
            />
            <span className="brandTagline">Built for Training</span>
          </div>
          <img
            src="/nl_seal_black.png"
            alt="NoLimit"
            className="brandCollapsedSeal"
          />
        </div>

        <nav>
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const isActiveGroup = group.items.some(
              (leaf) => leaf.name === activePage
            );
            const isOpen = openNavGroup === group.key;
            const hasAttention = group.items.some(
              (leaf) =>
                leaf.attention && leaf.count > 0 && leaf.name !== activePage
            );

            // Single-item entries are direct nav buttons (no flyout).
            if (group.items.length === 1) {
              const leaf = group.items[0];
              const showDot =
                Boolean(leaf.attention) &&
                leaf.count > 0 &&
                activePage !== leaf.name;
              return (
                <div
                  key={group.key}
                  className={`navGroup ${
                    isActiveGroup ? "navGroupActive" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`navItem navGroupTrigger ${
                      isActiveGroup ? "active" : ""
                    }`}
                    title={group.label}
                    aria-label={group.label}
                    onClick={() => goToPage(leaf.name)}
                  >
                    <span className="navItemLabel">
                      <GroupIcon size={20} strokeWidth={2.2} />
                      <span className="desktopNavLabel">{group.label}</span>
                      <span className="mobileNavLabel">{group.label}</span>
                    </span>
                    {leaf.count > 0 && (
                      <span className="badge">{leaf.count}</span>
                    )}
                    {showDot && <span className="navGroupDot" />}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={group.key}
                className={`navGroup ${isActiveGroup ? "navGroupActive" : ""} ${
                  isOpen ? "navGroupOpen" : ""
                }`}
              >
                <button
                  type="button"
                  className={`navItem navGroupTrigger ${
                    isActiveGroup ? "active" : ""
                  }`}
                  title={group.label}
                  aria-label={group.label}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenNavGroup((current) =>
                      current === group.key ? null : group.key
                    )
                  }
                >
                  <span className="navItemLabel">
                    <GroupIcon size={20} strokeWidth={2.2} />
                    <span className="desktopNavLabel">{group.label}</span>
                    <span className="mobileNavLabel">{group.label}</span>
                  </span>
                  <ChevronDown size={15} className="navGroupCaret" />
                  {hasAttention && <span className="navGroupDot" />}
                </button>

                <div className="navFlyout" role="menu">
                  {group.items.map((leaf) => {
                    const LeafIcon = leaf.icon;

                    return (
                      <button
                        key={leaf.name}
                        type="button"
                        role="menuitem"
                        className={`navFlyoutItem ${
                          activePage === leaf.name ? "active" : ""
                        }`}
                        onClick={() => {
                          goToPage(leaf.name);
                          setOpenNavGroup(null);
                        }}
                      >
                        <LeafIcon size={17} strokeWidth={2.2} />
                        <span className="navFlyoutLabel">{leaf.label}</span>
                        <span className="badge">{leaf.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="coachBoxWrap">
          <button
            type="button"
            className="coachBox coachBoxButton"
            aria-haspopup="true"
            aria-expanded={coachMenuOpen}
            onClick={() =>
              !isClientPortal && setCoachMenuOpen((open) => !open)
            }
          >
            <div className="avatar monogramAvatar">
              <img src="/nl_monogram_clean.png" alt="" aria-hidden="true" />
            </div>
            <div className="coachBoxMeta">
              <strong>
                {coachScope === "All Coaches" ? "Admin View" : coachScope}
              </strong>
              <p>{appMode}</p>
            </div>
            {!isClientPortal && (
              <ChevronDown size={16} className="coachBoxCaret" />
            )}
          </button>

          {!isClientPortal && coachMenuOpen && (
            <div className="coachScopeMenu" role="menu">
              <span className="coachScopeMenuLabel">View as</span>
              {["All Coaches", ...activeCoaches.map((c) => c.name)].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    role="menuitemradio"
                    aria-checked={coachScope === name}
                    className={coachScope === name ? "active" : ""}
                    onClick={() => {
                      setCoachScope(name);
                      setCoachMenuOpen(false);
                    }}
                  >
                    {name === "All Coaches" ? "Admin View (All Coaches)" : name}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="toastStack">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.type}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>

        {!selectedClient && (
          <>
            <header className="topbar">
              <div>
                <h1>{activePage}</h1>
                <p>NoLimit Training System</p>
              </div>
              {activePage === "Clients" && (
                <div className="topbarActions">
                  <button
                    className="goldButton"
                    onClick={openNewClientForm}
                  >
                    + Add Client
                  </button>
                  <button
                    className="outlineButton"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite Client
                  </button>
                </div>
              )}

              {activePage === "Coaches" && canManageCoaches && (
                <div className="topbarActions">
                  <button className="goldButton" onClick={openNewCoachForm}>
                    + Add Coach
                  </button>
                </div>
              )}

              {activePage === "Orders" && (
                <div className="topbarActions">
                  <button className="outlineButton" onClick={loadProductOrders}>
                    Reload Orders
                  </button>
                </div>
              )}

              {activePage === "Review" && (
                <div className="topbarActions">
                  <button
                    className="outlineButton"
                    onClick={() => void loadCoachReviewQueue(true)}
                    disabled={coachReviewLoading}
                  >
                    {coachReviewLoading ? "Refreshing..." : "Refresh Queue"}
                  </button>
                </div>
              )}

              {activePage === "Workouts" &&
                workoutPageTab === "Program Builder" && (
                <div className="topbarActions builderTopbarActions">
                  <span
                    className={`builderSaveStatusPill ${
                      builderSaveStatus === "dirty" ? "isDirty" : "isSaved"
                    }`}
                  >
                    {builderSaveStatus === "dirty" ? "Unsaved changes" : "Saved"}
                  </span>
                  <button className="goldButton" onClick={saveFullProgram}>
                    {savingTemplate
                      ? "Saving..."
                      : editProgramRecordId
                      ? "Update Program"
                      : "Save Full Program"}
                  </button>
                </div>
              )}
            </header>

            {activePage === "Clients" && (
              <CoachClientsPage
                loading={loading}
                todayValue={todayValue}
                activeCoaches={activeCoaches}
                buildClientPortalLink={buildClientPortalLink}
                bulkAddTag={bulkAddTag}
                bulkAddToTeam={bulkAddToTeam}
                bulkAssignProgram={bulkAssignProgram}
                bulkBusy={bulkBusy}
                bulkCopyLinks={bulkCopyLinks}
                bulkPanel={bulkPanel}
                bulkProgramId={bulkProgramId}
                bulkStartDate={bulkStartDate}
                bulkTag={bulkTag}
                bulkTeamId={bulkTeamId}
                clearRosterSelection={clearRosterSelection}
                clientBucket={clientBucket}
                clientBuckets={clientBuckets}
                clientEngagement={clientEngagement}
                clientNeedsContact={clientNeedsContact}
                clientNeedsProgramming={clientNeedsProgramming}
                clientSearch={clientSearch}
                clientStatusFilter={clientStatusFilter}
                clientStatusOptions={clientStatusOptions}
                clientTeams={clientTeams}
                clientWeekLoadZone={clientWeekLoadZone}
                coachInviteLink={coachInviteLink}
                coachScope={coachScope}
                copyToClipboard={copyToClipboard}
                daysSinceLogin={daysSinceLogin}
                loadClients={loadClients}
                openAccountModal={openAccountModal}
                paceZh={paceZh}
                programs={programs}
                renderCoachReviews={renderCoachReviews}
                rosterAllSelected={rosterAllSelected}
                rosterClients={rosterClients}
                rosterGroupBy={rosterGroupBy}
                rosterGroups={rosterGroups}
                rosterSelectedIds={rosterSelectedIds}
                rosterSortArrow={rosterSortArrow}
                rosterTriage={rosterTriage}
                setBulkPanel={setBulkPanel}
                setBulkProgramId={setBulkProgramId}
                setBulkStartDate={setBulkStartDate}
                setBulkTag={setBulkTag}
                setBulkTeamId={setBulkTeamId}
                setClientBucket={setClientBucket}
                setClientSearch={setClientSearch}
                setClientStatusFilter={setClientStatusFilter}
                setClientTab={setClientTab}
                setCoachScope={setCoachScope}
                setRosterGroupBy={setRosterGroupBy}
                setRosterTriage={setRosterTriage}
                setSelectedClient={setSelectedClient}
                teams={teams}
                toggleRosterSelect={toggleRosterSelect}
                toggleRosterSelectAll={toggleRosterSelectAll}
                toggleRosterSort={toggleRosterSort}
                triageCounts={triageCounts}
                triageDefs={triageDefs}
              />
            )}

            {activePage === "Revenue" && (
              <CoachRevenuePage
                RevenueChart={RevenueChart}
                t={t}
                clients={clients}
                coachScope={coachScope}
                coachSharePercent={coachSharePercent}
                coachVisibleClients={coachVisibleClients}
                openAccountModal={openAccountModal}
                orderBelongsToCoachScope={orderBelongsToCoachScope}
                productOrders={productOrders}
                relativeDue={relativeDue}
                setCoachSharePercent={setCoachSharePercent}
                subEffectiveStatus={subEffectiveStatus}
                subscriptions={subscriptions}
                todayValue={todayValue}
              />
            )}

            {activePage === "Review" && (
              <ReviewPage
                reviewFlashColumn={reviewFlashColumn}
                checkInReplyDrafts={checkInReplyDrafts}
                checkInReplySaving={checkInReplySaving}
                clientLabel={clientLabel}
                coachReviewCheckIns={scopedReviewCheckIns}
                coachReviewError={coachReviewError}
                focusReviewColumn={focusReviewColumn}
                formVideoReplies={formVideoReplies}
                getOrderPipelineStatus={getOrderPipelineStatus}
                globalMissedWorkouts={globalMissedWorkouts}
                globalReviewOrders={globalReviewOrders}
                globalReviewSubmissionItems={globalReviewSubmissionItems}
                globalUnreviewedWorkoutComments={globalUnreviewedWorkoutComments}
                markGlobalWorkoutCommentReviewed={markGlobalWorkoutCommentReviewed}
                newEnquiries={newEnquiries}
                openOrderReview={openOrderReview}
                openReviewClient={openReviewClient}
                openReviewSections={openReviewSections}
                openReviewWorkout={openReviewWorkout}
                respondToCheckIn={respondToCheckIn}
                reviewFormVideo={reviewFormVideo}
                reviewFormVideos={scopedReviewFormVideos}
                reviewingWorkoutCommentKey={reviewingWorkoutCommentKey}
                setActivePage={setActivePage}
                setCheckInReplyDrafts={setCheckInReplyDrafts}
                setFormVideoReplies={setFormVideoReplies}
                setSelectedContentSubmission={setSelectedContentSubmission}
                toggleReviewSection={toggleReviewSection}
              />
            )}

            {activePage === "Teams" && (
              <CoachTeamsPage
                addTeamGroup={addTeamGroup}
                applyAssignSubgroup={applyAssignSubgroup}
                assignProgramToTeamNow={assignProgramToTeamNow}
                bulkAssignTeamsProgram={bulkAssignTeamsProgram}
                clearTeamSelection={clearTeamSelection}
                clients={clients}
                coachVisibleClients={coachVisibleClients}
                currentCoachName={currentCoachName}
                deleteTeam={deleteTeam}
                editingTeam={editingTeam}
                openAccountModal={openAccountModal}
                openNewTeam={openNewTeam}
                openTeamEditor={openTeamEditor}
                openTeamInvite={openTeamInvite}
                programs={programs}
                quickAssignTeamProgram={quickAssignTeamProgram}
                removeTeamGroup={removeTeamGroup}
                saveTeam={saveTeam}
                savingTeam={savingTeam}
                selectedTeam={selectedTeam}
                selectedTeamId={selectedTeamId}
                selectedTeamSubgroups={selectedTeamSubgroups}
                setEditingTeam={setEditingTeam}
                setMemberPosition={setMemberPosition}
                setSelectedTeamId={setSelectedTeamId}
                setTeamAssignProgramId={setTeamAssignProgramId}
                setTeamAssignStartDate={setTeamAssignStartDate}
                setTeamBulkPanel={setTeamBulkPanel}
                setTeamBulkProgramId={setTeamBulkProgramId}
                setTeamBulkStartDate={setTeamBulkStartDate}
                setTeamDraft={setTeamDraft}
                setTeamGroupInput={setTeamGroupInput}
                setTeamQuickAssignId={setTeamQuickAssignId}
                setTeamQuickProgramId={setTeamQuickProgramId}
                setTeamQuickStartDate={setTeamQuickStartDate}
                setTeamRowMenuId={setTeamRowMenuId}
                sortedTeams={sortedTeams}
                teamAllSelected={teamAllSelected}
                teamAssignProgramId={teamAssignProgramId}
                teamAssignSelectedIds={teamAssignSelectedIds}
                teamAssignStartDate={teamAssignStartDate}
                teamAssignSubgroup={teamAssignSubgroup}
                teamAssigning={teamAssigning}
                teamBulkBusy={teamBulkBusy}
                teamBulkMemberIds={teamBulkMemberIds}
                teamBulkPanel={teamBulkPanel}
                teamBulkProgramId={teamBulkProgramId}
                teamBulkStartDate={teamBulkStartDate}
                teamDraft={teamDraft}
                teamGroupInput={teamGroupInput}
                teamPlannedCounts={teamPlannedCounts}
                teamQuickAssignId={teamQuickAssignId}
                teamQuickBusy={teamQuickBusy}
                teamQuickProgramId={teamQuickProgramId}
                teamQuickStartDate={teamQuickStartDate}
                teamRowMenuId={teamRowMenuId}
                teamSelectedIds={teamSelectedIds}
                teamSortArrow={teamSortArrow}
                teams={teams}
                teamsLoading={teamsLoading}
                toggleAssignAthlete={toggleAssignAthlete}
                toggleTeamMember={toggleTeamMember}
                toggleTeamSelect={toggleTeamSelect}
                toggleTeamSelectAll={toggleTeamSelectAll}
                toggleTeamSort={toggleTeamSort}
                visibleTeams={visibleTeams}
              />
            )}

            {activePage === "Coaches" && canManageCoaches && (
              <CoachesAdminPage
                activeCoaches={activeCoaches}
                allCoaches={allCoaches}
                clientBelongsToCoach={clientBelongsToCoach}
                clients={clients}
                openEditCoachForm={openEditCoachForm}
                savingCoach={savingCoach}
                setActivePage={setActivePage}
                setCoachScope={setCoachScope}
                updateCoachStatus={updateCoachStatus}
              />
            )}

            {activePage === "Orders" && (
              <CoachOrdersPage
                activationClientName={activationClientName}
                activationPortalLink={activationPortalLink}
                activeCoaches={activeCoaches}
                assignOrderIntake={assignOrderIntake}
                assignOrderProgram={assignOrderProgram}
                buildClientPortalLink={buildClientPortalLink}
                copyToClipboard={copyToClipboard}
                createManualProductOrder={createManualProductOrder}
                deleteProductOrder={deleteProductOrder}
                getContentResponseLabel={getContentResponseLabel}
                getOrderClient={getOrderClient}
                getOrderIntakeTemplate={getOrderIntakeTemplate}
                getOrderPipelineStatus={getOrderPipelineStatus}
                getOrderPrimaryCoach={getOrderPrimaryCoach}
                getOrderProgram={getOrderProgram}
                getOrderStageIndex={getOrderStageIndex}
                getOrderStartDate={getOrderStartDate}
                loadProductOrders={loadProductOrders}
                manualOrder={manualOrder}
                markOrderIntakeReviewed={markOrderIntakeReviewed}
                newOrdersQueue={newOrdersQueue}
                openOrderReview={openOrderReview}
                openOrdersCount={openOrdersCount}
                orderPipelineStages={orderPipelineStages}
                orderProcessingId={orderProcessingId}
                orderReviewLoading={orderReviewLoading}
                orderReviewOrder={orderReviewOrder}
                orderReviewResponses={orderReviewResponses}
                orderSearch={orderSearch}
                programs={programs}
                readyOrdersCount={readyOrdersCount}
                resetManualOrderForm={resetManualOrderForm}
                reviewAndLoadProgram={reviewAndLoadProgram}
                reviewQueueOrders={reviewQueueOrders}
                savingManualOrder={savingManualOrder}
                selectManualOrderProgram={selectManualOrderProgram}
                selectedManualOrderProgram={selectedManualOrderProgram}
                setActivationClientName={setActivationClientName}
                setActivationPortalLink={setActivationPortalLink}
                setManualOrder={setManualOrder}
                setOrderSearch={setOrderSearch}
                setOrderStartDates={setOrderStartDates}
                setShowManualOrderForm={setShowManualOrderForm}
                showManualOrderForm={showManualOrderForm}
                updateProductOrder={updateProductOrder}
                visibleProductOrders={visibleProductOrders}
              />
            )}

            {activePage === "Library" && (
              <CoachLibraryPage
                deleteExercise={deleteExercise}
                filteredLibraryExercises={filteredLibraryExercises}
                groupedLibraryExercises={groupedLibraryExercises}
                libraryCategoryFilter={libraryCategoryFilter}
                libraryCategoryOptions={libraryCategoryOptions}
                libraryLoading={libraryLoading}
                librarySearch={librarySearch}
                loadExerciseLibrary={loadExerciseLibrary}
                openEditExerciseForm={openEditExerciseForm}
                openNewExerciseForm={openNewExerciseForm}
                setLibraryCategoryFilter={setLibraryCategoryFilter}
                setLibrarySearch={setLibrarySearch}
                setTechnicalCueExercise={setTechnicalCueExercise}
              />
            )}

            {activePage === "Workouts" && (
              <CoachBuilderPage
                usePercentExerciseIndexes={usePercentExerciseIndexes}
                selectedSavedTestId={selectedSavedTestId}
                selectedSavedProgramId={selectedSavedProgramId}
                selectedSavedFormId={selectedSavedFormId}
                copiedSession={copiedSession}
                accessoryTargetIndex={accessoryTargetIndex}
                mobileDragIndex={mobileDragIndex}
                mobileDragOverIndex={mobileDragOverIndex}
                programSessionDropId={programSessionDropId}
                activeWorkoutTabValue={activeWorkoutTabValue}
                addAlternateExercise={addAlternateExercise}
                addCurrentSessionToProgram={addCurrentSessionToProgram}
                addExerciseToProgram={addExerciseToProgram}
                addFormQuestion={addFormQuestion}
                addMobileDayToWeek={addMobileDayToWeek}
                addTestItem={addTestItem}
                adjustProgramExerciseSets={adjustProgramExerciseSets}
                alternateSearch={alternateSearch}
                applyBulkPrescription={applyBulkPrescription}
                arrangementDragIndex={arrangementDragIndex}
                arrangementDropIndex={arrangementDropIndex}
                assignSavedProgramToClient={assignSavedProgramToClient}
                assignmentClientId={assignmentClientId}
                assignmentDueDate={assignmentDueDate}
                assignmentHubDateInputRef={assignmentHubDateInputRef}
                assignmentTemplateId={assignmentTemplateId}
                assignmentTemplateOptions={assignmentTemplateOptions}
                assignmentType={assignmentType}
                buildGlanceChain={buildGlanceChain}
                builderEquipFilter={builderEquipFilter}
                builderExercises={builderExercises}
                builderLibraryMode={builderLibraryMode}
                builderModalListRef={builderModalListRef}
                builderMode={builderMode}
                builderSaveStatus={builderSaveStatus}
                builderSearch={builderSearch}
                builderSectionOptions={builderSectionOptions}
                builderSubTab={builderSubTab}
                bulkEditMode={bulkEditMode}
                bulkReps={bulkReps}
                bulkRest={bulkRest}
                bulkSelectedIdx={bulkSelectedIdx}
                bulkSets={bulkSets}
                clearCurrentProgramSession={clearCurrentProgramSession}
                clientNameForCode={clientNameForCode}
                clients={clients}
                coachVisibleClients={coachVisibleClients}
                collapseAllBuilderExercises={collapseAllBuilderExercises}
                collapsedDays={collapsedDays}
                commitMobilePicker={commitMobilePicker}
                createContentAssignment={createContentAssignment}
                creatingAssignment={creatingAssignment}
                customBuilderSectionName={customBuilderSectionName}
                deleteSavedFormTemplate={deleteSavedFormTemplate}
                deleteSavedProgram={deleteSavedProgram}
                deleteSavedTestTemplate={deleteSavedTestTemplate}
                deletingSavedProgramId={deletingSavedProgramId}
                draggedLibSessionId={draggedLibSessionId}
                draggedProgramSessionId={draggedProgramSessionId}
                duplicateProgramExercise={duplicateProgramExercise}
                duplicateProgramSession={duplicateProgramSession}
                duplicateSavedFormIntoBuilder={duplicateSavedFormIntoBuilder}
                duplicateSavedProgram={duplicateSavedProgram}
                duplicateSavedTestIntoBuilder={duplicateSavedTestIntoBuilder}
                duplicateWeek={duplicateWeek}
                duplicatingProgramId={duplicatingProgramId}
                editProgramRecordId={editProgramRecordId}
                editingFormTemplate={editingFormTemplate}
                editingProgramSessionId={editingProgramSessionId}
                editingTestTemplate={editingTestTemplate}
                estimateSessionMinutes={estimateSessionMinutes}
                existingStoreCategories={existingStoreCategories}
                expandAllBuilderExercises={expandAllBuilderExercises}
                expandedBuilderExerciseIndexes={expandedBuilderExerciseIndexes}
                finishMobileProgram={finishMobileProgram}
                formQuestions={formQuestions}
                formTemplateName={formTemplateName}
                formTemplateType={formTemplateType}
                formTemplatesLoading={formTemplatesLoading}
                formView={formView}
                getBuilderOrderItems={getBuilderOrderItems}
                getBuilderSectionSelectOptions={getBuilderSectionSelectOptions}
                insertLibSessionIntoCurrentDay={insertLibSessionIntoCurrentDay}
                insertLibrarySessionAtCell={insertLibrarySessionAtCell}
                insertSavedSessionExercises={insertSavedSessionExercises}
                isBuilderLibraryOpen={isBuilderLibraryOpen}
                isBuilderOrderOpen={isBuilderOrderOpen}
                isCircuitGroupStart={isCircuitGroupStart}
                isExerciseLinkedWithPrevious={isExerciseLinkedWithPrevious}
                isSingleWorkoutBuilder={isSingleWorkoutBuilder}
                latestBuilderExerciseIndex={latestBuilderExerciseIndex}
                latestBuilderExerciseRef={latestBuilderExerciseRef}
                libraryExercises={libraryExercises}
                libraryLoading={libraryLoading}
                linkExerciseWithPrevious={linkExerciseWithPrevious}
                loadExerciseLibrary={loadExerciseLibrary}
                loadFormTemplates={loadFormTemplates}
                loadPrograms={loadPrograms}
                loadSavedFormIntoBuilder={loadSavedFormIntoBuilder}
                loadSavedProgramIntoBuilder={loadSavedProgramIntoBuilder}
                loadSavedProgramSessionsForAssignment={loadSavedProgramSessionsForAssignment}
                loadSavedTestIntoBuilder={loadSavedTestIntoBuilder}
                loadSessionForEditing={loadSessionForEditing}
                loadSessionLibrary={loadSessionLibrary}
                loadTestTemplates={loadTestTemplates}
                mobileAlternateIndex={mobileAlternateIndex}
                mobileArrangeItemsRef={mobileArrangeItemsRef}
                mobileArrangeRefs={mobileArrangeRefs}
                mobileBuilderStep={mobileBuilderStep}
                mobileDetailsIndex={mobileDetailsIndex}
                mobileMenuIndex={mobileMenuIndex}
                mobilePickerSelected={mobilePickerSelected}
                moveSessionToCell={moveSessionToCell}
                normalizeBuilderSection={normalizeBuilderSection}
                openBuilderLibrary={openBuilderLibrary}
                openMobileAlternate={openMobileAlternate}
                openMobileLibPick={openMobileLibPick}
                openMobilePicker={openMobilePicker}
                openProgramPreview={openProgramPreview}
                pendingSectionName={pendingSectionName}
                programAccessLengthDays={programAccessLengthDays}
                programBuiltForClient={programBuiltForClient}
                programBuiltForMode={programBuiltForMode}
                programBuiltForTeam={programBuiltForTeam}
                programBundleIds={programBundleIds}
                programBundleSearch={programBundleSearch}
                programCurrency={programCurrency}
                programDay={programDay}
                programDefaultIntakeFormId={programDefaultIntakeFormId}
                programDetailsOpen={programDetailsOpen}
                programDurationWeeks={programDurationWeeks}
                programGoal={programGoal}
                programGridDrop={programGridDrop}
                programInherentStoreProduct={programInherentStoreProduct}
                programName={programName}
                programPhase={programPhase}
                programPrice={programPrice}
                programProductChecklist={programProductChecklist}
                programProductReadyCount={programProductReadyCount}
                programProductReadyForSale={programProductReadyForSale}
                programProductStatus={programProductStatus}
                programProductType={programProductType}
                programPublicStoreVisible={programPublicStoreVisible}
                programPurchaseLink={programPurchaseLink}
                programSalesDescription={programSalesDescription}
                programSessions={programSessions}
                programStoreCategory={programStoreCategory}
                programStoreCategoryCn={programStoreCategoryCn}
                programStoreFieldsVisible={programStoreFieldsVisible}
                programWeek={programWeek}
                programs={programs}
                programsLoading={programsLoading}
                removeAlternateExercise={removeAlternateExercise}
                removeFormQuestion={removeFormQuestion}
                removeProgramExercise={removeProgramExercise}
                removeProgramSession={removeProgramSession}
                removeTestItem={removeTestItem}
                renderAlternateExerciseEditor={renderAlternateExerciseEditor}
                renderBuilderExerciseOptionsMenu={renderBuilderExerciseOptionsMenu}
                renderExerciseLabelBadge={renderExerciseLabelBadge}
                renderMobileSetTable={renderMobileSetTable}
                renderSetPrescriptionTable={renderSetPrescriptionTable}
                renderTemplateLibrary={renderTemplateLibrary}
                reorderAlternateExercise={reorderAlternateExercise}
                reorderProgramExercise={reorderProgramExercise}
                reorderProgramSession={reorderProgramSession}
                saveCurrentSessionToProgram={saveCurrentSessionToProgram}
                saveFormTemplate={saveFormTemplate}
                saveFullProgram={saveFullProgram}
                saveMobileProgramDay={saveMobileProgramDay}
                saveMobileWorkout={saveMobileWorkout}
                saveTestTemplate={saveTestTemplate}
                savedAssignClientId={savedAssignClientId}
                savedAssignLoading={savedAssignLoading}
                savedAssignStartDate={savedAssignStartDate}
                savedAssignableWorkouts={savedAssignableWorkouts}
                savedAssigningProgram={savedAssigningProgram}
                savedFormSearch={savedFormSearch}
                savedFormTemplates={savedFormTemplates}
                savedProgramProductFilter={savedProgramProductFilter}
                savedProgramSearch={savedProgramSearch}
                savedProgramSessions={savedProgramSessions}
                savedTemplatesLoading={savedTemplatesLoading}
                savedTestSearch={savedTestSearch}
                savedTestTemplates={savedTestTemplates}
                savingFormTemplate={savingFormTemplate}
                savingTemplate={savingTemplate}
                savingTestTemplate={savingTestTemplate}
                selectBuilderSection={selectBuilderSection}
                selectWorkoutTab={selectWorkoutTab}
                selectedProgramExercises={selectedProgramExercises}
                selectedSavedProgram={selectedSavedProgram}
                sessionEditorOpen={sessionEditorOpen}
                sessionEstimatedDuration={sessionEstimatedDuration}
                sessionGoal={sessionGoal}
                sessionIntensity={sessionIntensity}
                sessionLibLoading={sessionLibLoading}
                sessionLibProgramId={sessionLibProgramId}
                sessionLibSessions={sessionLibSessions}
                sessionName={sessionName}
                sessionNameCn={sessionNameCn}
                sessionNotes={sessionNotes}
                sessionSetupOpen={sessionSetupOpen}
                sessionType={sessionType}
                setAlternateSearch={setAlternateSearch}
                setArrangementDragIndex={setArrangementDragIndex}
                setArrangementDropIndex={setArrangementDropIndex}
                setAssignmentClientId={setAssignmentClientId}
                setAssignmentDueDate={setAssignmentDueDate}
                setAssignmentTemplateId={setAssignmentTemplateId}
                setAssignmentType={setAssignmentType}
                setBuilderEquipFilter={setBuilderEquipFilter}
                setBuilderLibraryModeAndLoad={setBuilderLibraryModeAndLoad}
                setBuilderMode={setBuilderMode}
                setBuilderSearch={setBuilderSearch}
                setBuilderSubTab={setBuilderSubTab}
                setBulkEditMode={setBulkEditMode}
                setBulkReps={setBulkReps}
                setBulkRest={setBulkRest}
                setBulkSelectedIdx={setBulkSelectedIdx}
                setBulkSets={setBulkSets}
                setCalendarAnchorDate={setCalendarAnchorDate}
                setCellMenu={setCellMenu}
                setCircuitGroupMode={setCircuitGroupMode}
                setCircuitGroupRounds={setCircuitGroupRounds}
                setCollapsedDays={setCollapsedDays}
                setCreateProgramOpen={setCreateProgramOpen}
                setCustomBuilderSectionName={setCustomBuilderSectionName}
                setDraggedLibSessionId={setDraggedLibSessionId}
                setDraggedProgramSessionId={setDraggedProgramSessionId}
                setFormTemplateName={setFormTemplateName}
                setFormTemplateType={setFormTemplateType}
                setFormView={setFormView}
                setIsBuilderLibraryOpen={setIsBuilderLibraryOpen}
                setIsBuilderOrderOpen={setIsBuilderOrderOpen}
                setMobileAlternateIndex={setMobileAlternateIndex}
                setMobileBuilderStep={setMobileBuilderStep}
                setMobileDetailsIndex={setMobileDetailsIndex}
                setMobileMenuIndex={setMobileMenuIndex}
                setMobilePickerSelected={setMobilePickerSelected}
                setPendingSectionName={setPendingSectionName}
                setProgramAccessLengthDays={setProgramAccessLengthDays}
                setProgramBuiltForClient={setProgramBuiltForClient}
                setProgramBuiltForMode={setProgramBuiltForMode}
                setProgramBuiltForTeam={setProgramBuiltForTeam}
                setProgramBundleIds={setProgramBundleIds}
                setProgramBundleSearch={setProgramBundleSearch}
                setProgramCurrency={setProgramCurrency}
                setProgramDay={setProgramDay}
                setProgramDefaultIntakeFormId={setProgramDefaultIntakeFormId}
                setProgramDetailsOpen={setProgramDetailsOpen}
                setProgramDurationWeeks={setProgramDurationWeeks}
                setProgramGoal={setProgramGoal}
                setProgramGridDrop={setProgramGridDrop}
                setProgramMenu={setProgramMenu}
                setProgramName={setProgramName}
                setProgramPhase={setProgramPhase}
                setProgramPrice={setProgramPrice}
                setProgramProductStatus={setProgramProductStatus}
                setProgramProductType={setProgramProductType}
                setProgramPublicStoreVisible={setProgramPublicStoreVisible}
                setProgramPurchaseLink={setProgramPurchaseLink}
                setProgramSalesDescription={setProgramSalesDescription}
                setProgramSessionDropId={setProgramSessionDropId}
                setProgramStoreCategory={setProgramStoreCategory}
                setProgramStoreCategoryCn={setProgramStoreCategoryCn}
                setProgramWeek={setProgramWeek}
                setSavedAssignClientId={setSavedAssignClientId}
                setSavedAssignStartDate={setSavedAssignStartDate}
                setSavedAssignableWorkouts={setSavedAssignableWorkouts}
                setSavedFormSearch={setSavedFormSearch}
                setSavedProgramProductFilter={setSavedProgramProductFilter}
                setSavedProgramSearch={setSavedProgramSearch}
                setSavedTestSearch={setSavedTestSearch}
                setSelectedProgramExercises={setSelectedProgramExercises}
                setSelectedSavedFormId={setSelectedSavedFormId}
                setSelectedSavedProgramId={setSelectedSavedProgramId}
                setSelectedSavedTestId={setSelectedSavedTestId}
                setSessionEditorOpen={setSessionEditorOpen}
                setSessionEstimatedDuration={setSessionEstimatedDuration}
                setSessionGoal={setSessionGoal}
                setSessionIntensity={setSessionIntensity}
                setSessionLibProgramId={setSessionLibProgramId}
                setSessionLibSessions={setSessionLibSessions}
                setSessionName={setSessionName}
                setSessionNameCn={setSessionNameCn}
                setSessionNotes={setSessionNotes}
                setSessionSetupOpen={setSessionSetupOpen}
                setSessionType={setSessionType}
                setShowProgramDetail={setShowProgramDetail}
                setTestTemplateCategory={setTestTemplateCategory}
                setTestTemplateName={setTestTemplateName}
                exitTestBuilder={exitTestBuilder}
                setWeekDupMenu={setWeekDupMenu}
                setWeekDupPct={setWeekDupPct}
                setWorkoutTabsMenuOpen={setWorkoutTabsMenuOpen}
                showDigitalProductSettings={showDigitalProductSettings}
                showProgramDetail={showProgramDetail}
                startMobileDrag={startMobileDrag}
                startNewSession={startNewSession}
                teams={teams}
                testItems={testItems}
                testTemplateCategory={testTemplateCategory}
                testTemplateName={testTemplateName}
                testTemplatesLoading={testTemplatesLoading}
                testView={testView}
                toggleBuilderCircuitLink={toggleBuilderCircuitLink}
                toggleBuilderExerciseExpanded={toggleBuilderExerciseExpanded}
                toggleBuilderSupersetLink={toggleBuilderSupersetLink}
                toggleMobilePick={toggleMobilePick}
                toggleUsePercent={toggleUsePercent}
                unlinkExerciseGroup={unlinkExerciseGroup}
                updateExerciseGrouping={updateExerciseGrouping}
                updateFormQuestion={updateFormQuestion}
                updateProgramExercise={updateProgramExercise}
                updateSavedAssignableWorkoutDate={updateSavedAssignableWorkoutDate}
                updateTestItem={updateTestItem}
                useMobileWorkoutRows={useMobileWorkoutRows}
                visibleProgramsOnly={visibleProgramsOnly}
                visibleSavedForms={visibleSavedForms}
                visibleSavedTests={visibleSavedTests}
                visibleSessionsOnly={visibleSessionsOnly}
                weekDupMenu={weekDupMenu}
                weekDupPct={weekDupPct}
                weekVolume={weekVolume}
                workoutPageTab={workoutPageTab}
                workoutTabList={workoutTabList}
                workoutTabsMenuOpen={workoutTabsMenuOpen}
              />
            )}

            {activePage === "Tests" && (
              <CoachTestsPage
                savedTestTemplates={savedTestTemplates}
                testTemplatesLoading={testTemplatesLoading}
                loadTestTemplates={loadTestTemplates}
                onCreateTest={openTestFromTestsPage}
                onEditTest={openTestFromTestsPage}
                onDuplicateTest={duplicateTestFromTestsPage}
                deleteSavedTestTemplate={deleteSavedTestTemplate}
              />
            )}

            {activePage === "Check-ins" && (
              <CheckInsPage
                checkInFilter={checkInFilter}
                checkInSearch={checkInSearch}
                checkInStats={checkInStats}
                clientNeedsCheckIn={clientNeedsCheckIn}
                filteredCheckInClients={filteredCheckInClients}
                getCheckInAgeDays={getCheckInAgeDays}
                loadClients={loadClients}
                loading={loading}
                markClientCheckedInToday={markClientCheckedInToday}
                openCheckInQuestionnaire={openCheckInQuestionnaire}
                savingCheckInClientId={savingCheckInClientId}
                setCheckInFilter={setCheckInFilter}
                setCheckInSearch={setCheckInSearch}
                setClientTab={setClientTab}
                setSelectedClient={setSelectedClient}
              />
            )}
          </>
        )}

        {selectedClient && (
          <ClientWorkspace
            t={t}
            assignLoading={assignLoading}
            assignProgramToClient={assignProgramToClient}
            assignStartDate={assignStartDate}
            assignableWorkouts={assignableWorkouts}
            assigningProgram={assigningProgram}
            assignmentClientId={assignmentClientId}
            assignmentDueDate={assignmentDueDate}
            assignmentTemplateId={assignmentTemplateId}
            assignmentTemplateOptions={assignmentTemplateOptions}
            assignmentType={assignmentType}
            buildClientPortalLink={buildClientPortalLink}
            calendarAnchorDate={calendarAnchorDate}
            calendarAssignmentDateInputRef={calendarAssignmentDateInputRef}
            calendarDates={calendarDates}
            calendarDropWorkoutId={calendarDropWorkoutId}
            calendarRangeLabel={calendarRangeLabel}
            calendarView={calendarView}
            clearCalendarLongPress={clearCalendarLongPress}
            clientCalendarStyle={clientCalendarStyle}
            clientCalendarTouchDrag={clientCalendarTouchDrag}
            clientComments={clientComments}
            clientMonthAnchorDate={clientMonthAnchorDate}
            clientMonthCalendarDates={clientMonthCalendarDates}
            clientPortalUpcomingTasks={clientPortalUpcomingTasks}
            clientPortalUpcomingWorkouts={clientPortalUpcomingWorkouts}
            clientProgramScheduleMode={clientProgramScheduleMode}
            clientProgramScheduledWorkouts={clientProgramScheduledWorkouts}
            clientProgramSessions={clientProgramSessions}
            clientProgramStartDate={clientProgramStartDate}
            clientProgramWeekNumbers={clientProgramWeekNumbers}
            clientProgramWeekStarts={clientProgramWeekStarts}
            clientTab={clientTab}
            clientWeekRangeLabel={clientWeekRangeLabel}
            clientWeekStripDates={clientWeekStripDates}
            coachDashTab={coachDashTab}
            coachInboxItems={coachInboxItems}
            coachMonthCalendarDates={coachMonthCalendarDates}
            coachNotesDraft={coachNotesDraft}
            completedTaskCount={completedTaskCount}
            completionRate={completionRate}
            consumeCalendarLongPressClick={consumeCalendarLongPressClick}
            contentAssignments={contentAssignments}
            contentResponsesLoading={contentResponsesLoading}
            copiedCalendarItem={copiedCalendarItem}
            copyToClipboard={copyToClipboard}
            createContentAssignment={createContentAssignment}
            creatingAssignment={creatingAssignment}
            deleteClient={deleteClient}
            deleteContentAssignment={deleteContentAssignment}
            draggingAssignmentId={draggingAssignmentId}
            draggingWorkoutId={draggingWorkoutId}
            editingMetrics={editingMetrics}
            endClientCalendarWorkoutTouch={endClientCalendarWorkoutTouch}
            formatPace={formatPace}
            getAssignmentDisplayName={getAssignmentDisplayName}
            getAssignmentsForDate={getAssignmentsForDate}
            getCalendarItemCountForDate={getCalendarItemCountForDate}
            getCoachDisplayName={getCoachDisplayName}
            getMasKmh={getMasKmh}
            getTaskActionLabel={getTaskActionLabel}
            getTaskTone={getTaskTone}
            getWorkoutsForDate={getWorkoutsForDate}
            handleClientCalendarWorkoutDrop={handleClientCalendarWorkoutDrop}
            handleHomeTouchEnd={handleHomeTouchEnd}
            handleHomeTouchStart={handleHomeTouchStart}
            handleOpenContentAssignment={handleOpenContentAssignment}
            hrMaxMetric={hrMaxMetric}
            i18n={i18n}
            inboxSeenAt={inboxSeenAt}
            isClientPortal={isClientPortal}
            isWorkloadMonitored={isWorkloadMonitored}
            jumpClientCalendarToToday={jumpClientCalendarToToday}
            latestMasMetric={latestMasMetric}
            loadClientProgramSessions={loadClientProgramSessions}
            loadContentResponses={loadContentResponses}
            loadProgramSessionsForAssignment={loadProgramSessionsForAssignment}
            loadingClientProgramSessions={loadingClientProgramSessions}
            localizeAssignmentKind={localizeAssignmentKind}
            localizeTaskStatus={localizeTaskStatus}
            localizedAssignableWorkoutName={localizedAssignableWorkoutName}
            localizedCalendarLabel={localizedCalendarLabel}
            localizedMonthTitle={localizedMonthTitle}
            localizedProductType={localizedProductType}
            localizedProgramName={localizedProgramName}
            localizedWeekStripLabel={localizedWeekStripLabel}
            localizedWorkoutName={localizedWorkoutName}
            markInboxSeen={markInboxSeen}
            metricsDraft={metricsDraft}
            moveCalendarRange={moveCalendarRange}
            moveClientCalendarWorkoutTouch={moveClientCalendarWorkoutTouch}
            moveClientMonth={moveClientMonth}
            moveContentAssignmentToDate={moveContentAssignmentToDate}
            moveWorkoutToDate={moveWorkoutToDate}
            movingAssignmentId={movingAssignmentId}
            movingWorkoutId={movingWorkoutId}
            needsAttentionItems={needsAttentionItems}
            openAssignmentHubFromCalendar={openAssignmentHubFromCalendar}
            openCalendarActionMenu={openCalendarActionMenu}
            openEditClientForm={openEditClientForm}
            openMetricsEditor={openMetricsEditor}
            openWorkout={openWorkout}
            overviewDetailsOpen={overviewDetailsOpen}
            paceZh={paceZh}
            parseBpm={parseBpm}
            parseOverride={parseOverride}
            pasteCalendarItemToDate={pasteCalendarItemToDate}
            populateClientProgramCalendar={populateClientProgramCalendar}
            populatingClientProgram={populatingClientProgram}
            portalHomeTab={portalHomeTab}
            programs={programs}
            programsTab={programsTab}
            recentWorkoutSubmissions={recentWorkoutSubmissions}
            renderDailyCheckIn={renderDailyCheckIn}
            renderExerciseHistoryBody={renderExerciseHistoryBody}
            renderLoadDashboard={renderLoadDashboard}
            renderPerformanceMetrics={renderPerformanceMetrics}
            renderPersonalRecords={renderPersonalRecords}
            renderPrLeaderboard={renderPrLeaderboard}
            renderProgramHome={renderProgramHome}
            renderProgramStore={renderProgramStore}
            renderTrophyCase={renderTrophyCase}
            renderWellnessTrends={renderWellnessTrends}
            renderWorkloadTab={renderWorkloadTab}
            restingHrMetric={restingHrMetric}
            saveCoachNotes={saveCoachNotes}
            saveMetricsOverrides={saveMetricsOverrides}
            savingCoachNotes={savingCoachNotes}
            savingMetrics={savingMetrics}
            selectClientCalendarDate={selectClientCalendarDate}
            selectedAssignProgramId={selectedAssignProgramId}
            selectedCalendarDateAssignments={selectedCalendarDateAssignments}
            selectedCalendarDateItemCount={selectedCalendarDateItemCount}
            selectedCalendarDateWorkouts={selectedCalendarDateWorkouts}
            selectedClient={selectedClient}
            selectedClientLatestOrder={selectedClientLatestOrder}
            selectedClientProgram={selectedClientProgram}
            selectedClientProgramAlreadyLoaded={selectedClientProgramAlreadyLoaded}
            selectedClientProgramCalendarWorkouts={selectedClientProgramCalendarWorkouts}
            selectedClientProgramFirstDate={selectedClientProgramFirstDate}
            selectedClientProgramId={selectedClientProgramId}
            selectedClientProgramLastDate={selectedClientProgramLastDate}
            setAssignStartDate={setAssignStartDate}
            setAssignableWorkouts={setAssignableWorkouts}
            setAssignmentClientId={setAssignmentClientId}
            setAssignmentDueDate={setAssignmentDueDate}
            setAssignmentTemplateId={setAssignmentTemplateId}
            setAssignmentType={setAssignmentType}
            setCalAddMenu={setCalAddMenu}
            setCalendarAnchorDate={setCalendarAnchorDate}
            setCalendarDropWorkoutId={setCalendarDropWorkoutId}
            setCalendarView={setCalendarView}
            setClientCalendarStyle={setClientCalendarStyle}
            setClientProgramDayDates={setClientProgramDayDates}
            setClientProgramScheduleMode={setClientProgramScheduleMode}
            setClientProgramSessions={setClientProgramSessions}
            setClientProgramStartDate={setClientProgramStartDate}
            setClientProgramWeekStarts={setClientProgramWeekStarts}
            setClientTab={setClientTab}
            setCoachDashTab={setCoachDashTab}
            setCoachNotesDraft={setCoachNotesDraft}
            setDraggingAssignmentId={setDraggingAssignmentId}
            setDraggingWorkoutId={setDraggingWorkoutId}
            setEditingMetrics={setEditingMetrics}
            setMetricsDraft={setMetricsDraft}
            setOverviewDetailsOpen={setOverviewDetailsOpen}
            setPortalHomeTab={setPortalHomeTab}
            setProgramsTab={setProgramsTab}
            setSavedExerciseDraftIds={setSavedExerciseDraftIds}
            setSelectedAssignProgramId={setSelectedAssignProgramId}
            setSelectedClient={setSelectedClient}
            setSelectedClientProgramId={setSelectedClientProgramId}
            setSelectedWorkout={setSelectedWorkout}
            setSetLogs={setSetLogs}
            setShowCalendarActionMenu={setShowCalendarActionMenu}
            setWeightUnitPref={setWeightUnitPref}
            setWorkoutDetails={setWorkoutDetails}
            shiftAssignableWorkoutsToStartDate={shiftAssignableWorkoutsToStartDate}
            showCalendarActionMenu={showCalendarActionMenu}
            startCalendarLongPress={startCalendarLongPress}
            startClientCalendarWorkoutTouch={startClientCalendarWorkoutTouch}
            suppressClientCalendarTouchClick={suppressClientCalendarTouchClick}
            toReviewWorkouts={toReviewWorkouts}
            todayValue={todayValue}
            totalTaskCount={totalTaskCount}
            uniqueClientPurchasedPrograms={uniqueClientPurchasedPrograms}
            clientProgramStatuses={clientProgramStatuses}
            clientProgramDashboard={clientProgramDashboard}
            rescheduleClientWorkout={rescheduleClientWorkout}
            restartClientProgram={restartClientProgram}
            updateAssignableWorkoutDate={updateAssignableWorkoutDate}
            updateClientLanguagePreference={updateClientLanguagePreference}
            updateClientPackage={updateClientPackage}
            updatingClientStatus={updatingClientStatus}
            useChineseClientText={useChineseClientText}
            weightUnit={weightUnit}
            workouts={workouts}
            workoutsLoading={workoutsLoading}
          />
        )}

        {showAnalyticsModal && (
          <div className="workout-modal-overlay">
            <div className="workout-modal analyticsModal">
              <div className="modal-header">
                <div>
                  <h2>
                    Workout Analytics
                    {selectedClient ? `: ${selectedClient.name}` : ""}
                  </h2>
                  <p>
                    {selectedClient
                      ? "Client-linked training completion and attention view."
                      : "Coach command view for training completion and client attention."}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setShowAnalyticsModal(false)}
                >
                  x
                </button>
              </div>

              {analyticsLoading && <p>Loading analytics...</p>}

              {!analyticsLoading && analytics && (
                <>
                  <section className="analyticsGrid">
                    <div className="analyticsCard">
                      <span>Completion Rate</span>
                      <strong>{analytics.summary.completionRate}%</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Completed Workouts</span>
                      <strong>{analytics.summary.completedWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Upcoming 7d</span>
                      <strong>{analytics.summary.upcomingWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>{t("missed")}</span>
                      <strong>{analytics.summary.overdueWorkouts}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Needs Programming</span>
                      <strong>{analytics.summary.needsProgramming}</strong>
                    </div>
                    <div className="analyticsCard">
                      <span>Needs Contact</span>
                      <strong>{analytics.summary.needsContact}</strong>
                    </div>
                  </section>

                  <section className="analyticsSection">
                    <div className="exerciseTitleRow">
                      <h3>Clients Needing Attention</h3>
                      <button className="outlineButton" onClick={loadAnalytics}>
                        Refresh
                      </button>
                    </div>

                    {analytics.attentionClients.length === 0 && (
                      <p>No attention items right now.</p>
                    )}

                    {analytics.attentionClients.map((client) => (
                      <div className="analyticsClientRow" key={client.clientId}>
                        <div>
                          <strong>{client.name}</strong>
                          <p>{client.clientId || "--"} / {client.status || "--"}</p>
                        </div>
                        <span>{client.overdueWorkouts} overdue</span>
                        <span>
                          {client.completedWorkouts}/{client.totalWorkouts} complete
                        </span>
                        <span className="attentionCell">
                          {client.needsProgram && (
                            <span className="attentionChip">Needs program</span>
                          )}
                          {client.needsContact && (
                            <span className="attentionChip">Needs contact</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        {technicalCueExercise && (
          <div className="workout-modal-overlay technicalCueOverlay">
            <div className="clientFormModal technicalCueModal">
              <div className="modal-header">
                <div>
                  <h2>{localizedExerciseName(technicalCueExercise)}</h2>
                  <p>{t("formInstructions")}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  x
                </button>
              </div>

              <div className="technicalCueBody">
                <div className="exerciseDetailMeta">
                  <span>
                    <strong>Category</strong>
                    {localizeText(
                      technicalCueExercise.category || "--",
                      technicalCueExercise.categoryCn || ""
                    )}
                  </span>
                  <span>
                    <strong>Equipment</strong>
                    {localizeText(
                      technicalCueExercise.equipment || "--",
                      technicalCueExercise.equipmentCn || ""
                    )}
                  </span>
                  <span>
                    <strong>Pattern</strong>
                    {localizeText(
                      technicalCueExercise.movementPattern || "--",
                      technicalCueExercise.movementPatternCn || ""
                    )}
                  </span>
                  <span>
                    <strong>Record</strong>
                    {parseExerciseNotes(technicalCueExercise.notes || "").trackingType}
                  </span>
                  <span>
                    <strong>Limb</strong>
                    {parseExerciseNotes(technicalCueExercise.notes || "").isUnilateral
                      ? "Unilateral"
                      : "Bilateral"}
                  </span>
                </div>

                {parseExerciseCueSections(
                  localizedExerciseNotes(technicalCueExercise)
                ).length > 0 ? (
                  <div className="exerciseCueSections">
                    {parseExerciseCueSections(
                      localizedExerciseNotes(technicalCueExercise)
                    ).map((section) => (
                      <section key={section.title}>
                        <h3>{section.title}</h3>
                        <ul>
                          {section.lines.map((line, index) => (
                            <li key={`${section.title}-${index}`}>{line}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p>{t("noTechnicalCues")}</p>
                )}
              </div>

              <div className="modalActions">
                {!isClientPortal && (
                <button
                  className="outlineButton"
                  onClick={() => {
                    setTechnicalCueExercise(null);
                    openEditExerciseForm(technicalCueExercise);
                  }}
                >
                  {t("editCues")}
                </button>
                )}
                <button
                  className="goldButton"
                  onClick={() => setTechnicalCueExercise(null)}
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </div>
        )}

        {checkInFormClient && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>Check-in</h2>
                  <p>{checkInFormClient.name}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setCheckInFormClient(null)}
                >
                  <X size={28} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>

              <div className="clientFormGrid">
                {[
                  ["Body Weight", "bodyWeight", "kg"],
                  ["Sleep Quality", "sleepQuality", "1-10"],
                  ["Energy", "energy", "1-10"],
                  ["Mood", "mood", "Good, tired, stressed..."],
                  ["Stress", "stress", "1-10"],
                  ["Soreness", "soreness", "1-10"],
                ].map(([label, key, placeholder]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      value={checkInForm[key as keyof typeof checkInForm]}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={placeholder}
                    />
                  </label>
                ))}

                {[
                  ["Nutrition Notes", "nutritionNotes"],
                  ["Training Notes", "trainingNotes"],
                  ["Wins", "wins"],
                  ["Problems / Pain", "problemsPain"],
                ].map(([label, key]) => (
                  <label className="clientNotesField" key={key}>
                    <span>{label}</span>
                    <textarea
                      value={checkInForm[key as keyof typeof checkInForm]}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() => setCheckInFormClient(null)}
                >
                  Cancel
                </button>
                <button
                  className="goldButton"
                  onClick={submitCheckInQuestionnaire}
                  disabled={savingCheckInClientId === checkInFormClient.id}
                >
                  {savingCheckInClientId === checkInFormClient.id
                    ? "Submitting..."
                    : "Submit Check-in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssignmentDrawer && !isClientPortal && selectedClient && (
          <AssignmentDrawer
            assignLoading={assignLoading}
            assignProgramKind={assignProgramKind}
            assignProgramToClient={assignProgramToClient}
            assignStartDate={assignStartDate}
            assignableWorkouts={assignableWorkouts}
            assigningProgram={assigningProgram}
            assignmentDueDate={assignmentDueDate}
            assignmentTemplateId={assignmentTemplateId}
            assignmentTemplateOptions={assignmentTemplateOptions}
            assignmentType={assignmentType}
            calendarAnchorDate={calendarAnchorDate}
            calendarAssignmentDateInputRef={calendarAssignmentDateInputRef}
            closeAssignmentDrawer={closeAssignmentDrawer}
            createContentAssignment={createContentAssignment}
            creatingAssignment={creatingAssignment}
            loadProgramSessionsForAssignment={loadProgramSessionsForAssignment}
            programs={programs}
            savedFormTemplates={savedFormTemplates}
            savedTestTemplates={savedTestTemplates}
            selectedAssignProgramId={selectedAssignProgramId}
            selectedClient={selectedClient}
            setAssignStartDate={setAssignStartDate}
            setAssignableWorkouts={setAssignableWorkouts}
            setAssignmentClientId={setAssignmentClientId}
            setAssignmentDueDate={setAssignmentDueDate}
            setAssignmentTemplateId={setAssignmentTemplateId}
            setAssignmentType={setAssignmentType}
            setCalendarAnchorDate={setCalendarAnchorDate}
            setSelectedAssignProgramId={setSelectedAssignProgramId}
            shiftAssignableWorkoutsToStartDate={shiftAssignableWorkoutsToStartDate}
            updateAssignableWorkoutDate={updateAssignableWorkoutDate}
          />
        )}

        {showExerciseModal && (
          <ExerciseModal
            applyExerciseCueDraft={applyExerciseCueDraft}
            categoryOptions={categoryOptions}
            closeExerciseForm={closeExerciseForm}
            copyExerciseAiPrompt={copyExerciseAiPrompt}
            editingExercise={editingExercise}
            equipmentOptions={equipmentOptions}
            exerciseForm={exerciseForm}
            movementPatternOptions={movementPatternOptions}
            muscleGroupOptions={muscleGroupOptions}
            renderVideoPreview={renderVideoPreview}
            saveExerciseForm={saveExerciseForm}
            savingExercise={savingExercise}
            setExerciseForm={setExerciseForm}
          />
        )}

        {calendarActionMenu && (
          <CalendarActionMenu
            calendarActionMenu={calendarActionMenu}
            closeCalendarActionMenu={closeCalendarActionMenu}
            copiedCalendarItem={copiedCalendarItem}
            copyCalendarAssignment={copyCalendarAssignment}
            copyCalendarWorkout={copyCalendarWorkout}
            deleteContentAssignment={deleteContentAssignment}
            deleteWorkout={deleteWorkout}
            getAssignmentDisplayName={getAssignmentDisplayName}
            localizedWorkoutName={localizedWorkoutName}
            pasteCalendarItemToDate={pasteCalendarItemToDate}
            setCopiedCalendarItem={setCopiedCalendarItem}
          />
        )}

        {teamInviteId &&
          (() => {
            const team = teams.find((t) => t.id === teamInviteId);
            if (!team) return null;
            return (
              <div className="workout-modal-overlay">
                <div className="clientFormModal inviteModal">
                  <div className="modal-header">
                    <div>
                      <h2>Invite Athletes</h2>
                      <p>Team: {team.name}</p>
                    </div>
                    <button
                      className="drawerClose"
                      onClick={() => setTeamInviteId("")}
                    >
                      x
                    </button>
                  </div>

                  <div className="teamInviteBody">
                    <span className="teamPickerLabel">
                      Add existing athletes ({teamInviteMemberIds.length})
                    </span>
                    <div className="teamMemberPickList">
                      {coachVisibleClients.map((client) => (
                        <label
                          key={client.id}
                          className={`teamMemberPickItem ${
                            teamInviteMemberIds.includes(client.id)
                              ? "selected"
                              : ""
                          }`}
                        >
                          <span className="teamPickToggle">
                            <input
                              type="checkbox"
                              checked={teamInviteMemberIds.includes(client.id)}
                              onChange={() => toggleInviteMember(client.id)}
                            />
                            <span className="clientAvatar">
                              {client.initials}
                            </span>
                            <span>{client.name}</span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <label className="clientNotesField teamInviteLink">
                      <span>Or invite by link (send via WeChat or email)</span>
                      <div className="inviteCopyRow">
                        <input value={coachInviteLink} readOnly />
                        <button
                          className="outlineButton"
                          onClick={() =>
                            copyToClipboard(coachInviteLink, "Invite link")
                          }
                        >
                          Copy
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="modalActions">
                    <button
                      className="outlineButton"
                      onClick={() => setTeamInviteId("")}
                    >
                      Cancel
                    </button>
                    <button
                      className="goldButton"
                      onClick={saveTeamInvite}
                      disabled={savingTeam}
                    >
                      {savingTeam ? "Saving…" : "Save Roster"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {accountClient && (
          <AccountModal
            relativeDue={relativeDue}
            accountCategoryInput={accountCategoryInput}
            accountClient={accountClient}
            accountClientId={accountClientId}
            accountDraft={accountDraft}
            accountProgramId={accountProgramId}
            accountStartDate={accountStartDate}
            accountSubscription={accountSubscription}
            accountTagInput={accountTagInput}
            addAccountChip={addAccountChip}
            assignProgramFromAccount={assignProgramFromAccount}
            clients={clients}
            deleteSubscription={deleteSubscription}
            openAthleteCalendar={openAthleteCalendar}
            programs={programs}
            removeAccountChip={removeAccountChip}
            saveAccountTagsCategories={saveAccountTagsCategories}
            saveAccountTeamPosition={saveAccountTeamPosition}
            saveSubscription={saveSubscription}
            savingAccount={savingAccount}
            savingSub={savingSub}
            setAccountCategoryInput={setAccountCategoryInput}
            setAccountClientId={setAccountClientId}
            setAccountProgramId={setAccountProgramId}
            setAccountStartDate={setAccountStartDate}
            setAccountTagInput={setAccountTagInput}
            setSubDraft={setSubDraft}
            subDraft={subDraft}
            subEffectiveStatus={subEffectiveStatus}
            teams={teams}
            toggleAccountTeam={toggleAccountTeam}
            updateAccountTeamPositionLocal={updateAccountTeamPositionLocal}
          />
        )}

        {showInviteModal && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal inviteModal">
              <div className="modal-header">
                <div>
                  <h2>Invite Client</h2>
                  <p>
                    Send a private onboarding link that creates a pending client
                    record when submitted.
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setShowInviteModal(false)}
                >
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Default Status</span>
                  <select
                    value={coachInvitePackage}
                    onChange={(e) => setCoachInvitePackage(e.target.value)}
                  >
                    <option>Pending</option>
                    <option>Active</option>
                    <option>Premium</option>
                    <option>Online Coaching</option>
                  </select>
                </label>

                <label className="clientNotesField">
                  <span>Invite Link</span>
                  <div className="inviteCopyRow">
                    <input value={coachInviteLink} readOnly />
                    <button
                      className="outlineButton"
                      onClick={() =>
                        copyToClipboard(coachInviteLink, "Invite link")
                      }
                    >
                      Copy
                    </button>
                  </div>
                </label>

                <label className="clientNotesField">
                  <span>Message</span>
                  <textarea value={coachInviteMessage} readOnly />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() =>
                    copyToClipboard(coachInviteMessage, "Invite message")
                  }
                >
                  Copy Message
                </button>

                <button
                  className="goldButton"
                  onClick={() =>
                    copyToClipboard(coachInviteLink, "Invite link")
                  }
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddClientModal && (
          <AddClientModal
            t={t}
            activeCoaches={activeCoaches}
            closeClientForm={closeClientForm}
            editingClient={editingClient}
            newClient={newClient}
            saveClientForm={saveClientForm}
            savingClient={savingClient}
            setNewClient={setNewClient}
          />
        )}

        {showCoachModal && (
          <CoachEditModal
            closeCoachForm={closeCoachForm}
            coachForm={coachForm}
            editingCoach={editingCoach}
            saveCoachForm={saveCoachForm}
            savingCoach={savingCoach}
            setCoachForm={setCoachForm}
          />
        )}

        {selectedContentSubmission && (
          <div className="workout-modal-overlay">
            <div className="clientFormModal submissionResultsModal">
              <div className="modal-header">
                <div>
                  <h2>{selectedContentSubmission.title}</h2>
                  <p>
                    {selectedContentSubmission.responseType} submitted on{" "}
                    {selectedContentSubmission.submittedAt || "--"}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setSelectedContentSubmission(null)}
                >
                  x
                </button>
              </div>

              <div className="submissionAnswerGrid submissionResultsGrid">
                {selectedContentSubmission.answers.map((answer) => (
                  <div className="submissionAnswer" key={answer.recordId}>
                    <span>{getContentResponseLabel(answer)}</span>
                    <strong>
                      {answer.answer || "--"}
                      {answer.unit ? ` ${answer.unit}` : ""}
                    </strong>
                    {answer.notes ? <small>{answer.notes}</small> : null}
                  </div>
                ))}
              </div>

              <div className="modalActions">
                <button
                  className="goldButton"
                  onClick={() => setSelectedContentSubmission(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {activeContentAssignment && (
          <ContentAssignmentModal
            t={t}
            activeAssignmentIsTest={activeAssignmentIsTest}
            activeContentAssignment={activeContentAssignment}
            activeFormTemplate={activeFormTemplate}
            activeTestTemplate={activeTestTemplate}
            contentAssignmentAnswers={contentAssignmentAnswers}
            contentAssignmentComment={contentAssignmentComment}
            getAssignmentDisplayName={getAssignmentDisplayName}
            getTestAnswerKey={getTestAnswerKey}
            getTestInputMode={getTestInputMode}
            isTwoKilometerTest={isTwoKilometerTest}
            localizeText={localizeText}
            setActiveContentAssignment={setActiveContentAssignment}
            setContentAssignmentAnswers={setContentAssignmentAnswers}
            setContentAssignmentComment={setContentAssignmentComment}
            submitActiveContentAssignment={submitActiveContentAssignment}
            submittingContentAssignment={submittingContentAssignment}
          />
        )}

        <input
          ref={formVideoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void submitFormVideo(file);
          }}
        />

        {portalStartPicker && isClientPortal && (
          <div className="startPickerOverlay">
            <div className="startPickerCard">
              <h3>{paceZh ? "🎯 什么时候开始？" : "🎯 When do you want to start?"}</h3>
              <p>
                {paceZh
                  ? "你的训练计划会从所选日期开始排入日历。"
                  : "Your program will be scheduled into your calendar from this date."}
              </p>
              <button
                type="button"
                className="primaryButton"
                onClick={() => void loadProgramFromDate(todayValue)}
              >
                {paceZh ? "今天开始" : "Start today"}
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={() => {
                  const d = new Date();
                  const add = ((8 - d.getDay()) % 7) || 7;
                  d.setDate(d.getDate() + add);
                  void loadProgramFromDate(dateToInputValue(d));
                }}
              >
                {paceZh ? "下周一开始" : "Start next Monday"}
              </button>
              <div className="startPickerCustom">
                <input
                  type="date"
                  min={todayValue}
                  value={portalStartCustom}
                  onChange={(e) => setPortalStartCustom(e.target.value)}
                />
                <button
                  type="button"
                  className="outlineButton"
                  disabled={!portalStartCustom}
                  onClick={() => void loadProgramFromDate(portalStartCustom)}
                >
                  {paceZh ? "从这天开始" : "Start on this date"}
                </button>
              </div>
            </div>
          </div>
        )}

        {workoutCelebration &&
          (() => {
            const wc = workoutCelebration;
            const coachName = (
              selectedClientProgram?.coach || "Kent Bastell"
            ).trim();
            const parts: string[] = [];
            if (wc.durationMin > 0) {
              parts.push(paceZh ? `${wc.durationMin} 分钟` : `${wc.durationMin} MIN`);
            }
            parts.push(
              paceZh ? `${wc.exercises} 个动作` : `${wc.exercises} EXERCISES`
            );
            if (wc.rpe) parts.push(`RPE ${wc.rpe}`);
            const statsLine = parts.join(" · ");
            const zhHeadline =
              celebrationVariant === "fistbump"
                ? "干得漂亮"
                : celebrationVariant === "highfive"
                  ? "击掌！"
                  : "太强了";
            const zhMessage =
              celebrationVariant === "fistbump"
                ? "冠军就是这样收尾的，明天见。"
                : celebrationVariant === "highfive"
                  ? "这周太拼了，保持这股劲头。"
                  : "已查看你的训练 — 新标准达成，为你骄傲。";
            const zhKicker =
              celebrationVariant === "thumbsup" ? "教练认可" : "训练完成";
            return (
              <Celebration
                variant={celebrationVariant}
                kicker={paceZh ? zhKicker : undefined}
                headline={paceZh ? zhHeadline : undefined}
                coachName={coachName}
                message={paceZh ? zhMessage : undefined}
                stats={statsLine}
                ctaLabel={paceZh ? "继续" : undefined}
                onDone={() => setWorkoutCelebration(null)}
              />
            );
          })()}

        {failedSubmission && (
          <div className="workoutSyncFailBar" role="alert">
            <span>
              {paceZh
                ? "⚠️ 同步失败 — 数据已保存在本机"
                : "⚠️ Sync failed — your data is saved on this device"}
            </span>
            <button
              type="button"
              onClick={() =>
                syncWorkoutSubmission(
                  failedSubmission.payload,
                  failedSubmission.draftKey
                )
              }
            >
              {paceZh ? "重试" : "Retry"}
            </button>
          </div>
        )}

        {playerTutorialOpen && isClientPortal && selectedWorkout && (
          <div className="playerTutorialOverlay" onClick={dismissPlayerTutorial}>
            <div
              className="playerTutorialCard"
              onClick={(event) => event.stopPropagation()}
            >
              <h3>{paceZh ? "怎么记录训练" : "How to log your workout"}</h3>
              <ol>
                <li>
                  {paceZh
                    ? "每组填写重量和次数（次数已按计划预填）"
                    : "Enter your weight for each set — reps are pre-filled from the plan"}
                </li>
                <li>
                  {paceZh
                    ? "完成一组后勾选 ✓"
                    : "Tick ✓ when you finish a set"}
                </li>
                <li>
                  {paceZh
                    ? "全部完成后点「Finish Workout」提交给教练"
                    : "Tap “Finish Workout” at the end to send it to your coach"}
                </li>
              </ol>
              <button
                type="button"
                className="primaryButton"
                onClick={dismissPlayerTutorial}
              >
                {paceZh ? "明白了" : "Got it"}
              </button>
            </div>
          </div>
        )}

        {selectedWorkout && (
          <WorkoutPlayerModal
            getLabelColorClass={getLabelColorClass}
            t={t}
            checkAndSaveWorkoutSet={checkAndSaveWorkoutSet}
            checkedWorkoutPageItems={checkedWorkoutPageItems}
            coachReviewMode={coachReviewMode}
            deleteWorkout={deleteWorkout}
            detailsLoading={detailsLoading}
            editingWorkoutDate={editingWorkoutDate}
            formVideoBusy={formVideoBusy}
            formVideoInputRef={formVideoInputRef}
            formVideoSentIds={formVideoSentIds}
            getWorkoutGroupBounds={getWorkoutGroupBounds}
            getWorkoutGroupIndexes={getWorkoutGroupIndexes}
            getWorkoutGroupRoundCount={getWorkoutGroupRoundCount}
            goToFocusExercise={goToFocusExercise}
            handleFocusTouchEnd={handleFocusTouchEnd}
            handleFocusTouchStart={handleFocusTouchStart}
            i18n={i18n}
            isClientPortal={isClientPortal}
            isExerciseFullyLogged={isExerciseFullyLogged}
            isPremiumClient={isPremiumClient}
            isSetComplete={isSetComplete}
            isWarmupSection={isWarmupSection}
            lastLoggedWeight={lastLoggedWeight}
            latestReadiness={latestReadiness}
            localizeDefaultSection={localizeDefaultSection}
            localizeRestValue={localizeRestValue}
            localizeText={localizeText}
            localizedExerciseName={localizedExerciseName}
            localizedWorkoutName={localizedWorkoutName}
            openWorkoutActionMenuId={openWorkoutActionMenuId}
            openWorkoutExerciseFromGlance={openWorkoutExerciseFromGlance}
            openWorkoutFinish={openWorkoutFinish}
            originalExercisesRef={originalExercisesRef}
            paceZh={paceZh}
            resetWodState={resetWodState}
            resolvePrescribedHr={resolvePrescribedHr}
            resolvePrescribedLoad={resolvePrescribedLoad}
            resolvePrescribedPace={resolvePrescribedPace}
            restTimer={restTimer}
            saveWorkout={saveWorkout}
            savingWorkout={savingWorkout}
            sectionAccentColor={sectionAccentColor}
            selectedWorkout={selectedWorkout}
            setAlternatePickerExercise={setAlternatePickerExercise}
            setEditingWorkoutDate={setEditingWorkoutDate}
            setFormVideoExercise={setFormVideoExercise}
            setHistoryExerciseName={setHistoryExerciseName}
            setLogs={setLogs}
            setOpenWorkoutActionMenuId={setOpenWorkoutActionMenuId}
            setRestTimer={setRestTimer}
            setSavedExerciseDraftIds={setSavedExerciseDraftIds}
            setSelectedWorkout={setSelectedWorkout}
            setSetLogs={setSetLogs}
            setTechnicalCueExercise={setTechnicalCueExercise}
            setWodRounds={setWodRounds}
            setWodTimer={setWodTimer}
            setWorkoutDetails={setWorkoutDetails}
            setWorkoutFocusMode={setWorkoutFocusMode}
            setWorkoutFocusSetRound={setWorkoutFocusSetRound}
            setWorkoutHistoryLogs={setWorkoutHistoryLogs}
            setWorkoutLoggingStarted={setWorkoutLoggingStarted}
            setWorkoutSubmissionNote={setWorkoutSubmissionNote}
            setWorkoutVideoOverlay={setWorkoutVideoOverlay}
            startRestTimer={startRestTimer}
            toggleWorkoutReviewed={toggleWorkoutReviewed}
            updateSetLog={updateSetLog}
            updateWorkoutDate={updateWorkoutDate}
            updatingWorkoutDate={updatingWorkoutDate}
            useMobileWorkoutRows={useMobileWorkoutRows}
            vibrate={vibrate}
            weightUnit={weightUnit}
            wodElapsedMs={wodElapsedMs}
            wodRounds={wodRounds}
            wodTimer={wodTimer}
            workoutDetails={workoutDetails}
            workoutFocusIndex={workoutFocusIndex}
            workoutFocusMode={workoutFocusMode}
            workoutFocusSetRound={workoutFocusSetRound}
            workoutGroupTitle={workoutGroupTitle}
            workoutLoggingStarted={workoutLoggingStarted}
            workoutSetCheckKey={workoutSetCheckKey}
            workoutSubmissionNote={workoutSubmissionNote}
          />
        )}

        {workoutVideoOverlay &&
          (() => {
            const embedUrl = toYoutubeEmbed(workoutVideoOverlay.url);
            return (
              <div className="workoutVideoModalOverlay">
                <div className="workoutVideoModal">
                  <div className="workoutVideoModalHeader">
                    <h2>{workoutVideoOverlay.title}</h2>
                    <button
                      type="button"
                      className="drawerClose"
                      onClick={() => setWorkoutVideoOverlay(null)}
                      aria-label={t("close")}
                    >
                      <X size={22} />
                    </button>
                  </div>
                  <div className="workoutVideoFrame">
                    <iframe
                      src={embedUrl || workoutVideoOverlay.url}
                      title={workoutVideoOverlay.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <a
                    className="workoutVideoExternalLink"
                    href={workoutVideoOverlay.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {paceZh ? "在新标签页打开" : "Open video in new tab"}
                  </a>
                </div>
              </div>
            );
          })()}

        {workoutFinishOpen &&
          (() => {
            const stats = computeWorkoutStats();
            const prs = computeWorkoutPrs();
            return (
              <div className="workout-modal-overlay workoutSummaryOverlay">
                <div className="workoutSummaryCard workoutFinishCard">
                  <div className="workoutSummaryConfetti" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span key={i} style={{ "--i": i } as React.CSSProperties} />
                    ))}
                  </div>
                  <div className="workoutSummaryCrest">
                    <img src="/nl_monogram_clean.png" alt="" />
                  </div>
                  <h2 className="workoutSummaryTitle">
                    {paceZh ? "训练完成" : "Workout Complete"}
                  </h2>
                  <p className="workoutSummarySub">
                    {paceZh ? "核对、评分，然后保存 💪" : "Review, rate, and save 💪"}
                  </p>

                  <div className="workoutSummaryStats">
                    <div>
                      <strong>{stats.exercises}</strong>
                      <span>{paceZh ? "动作" : "Exercises"}</span>
                    </div>
                    <div>
                      <strong>{stats.sets}</strong>
                      <span>{paceZh ? "组数" : "Sets"}</span>
                    </div>
                    {/* Volume/tonnage is a coach-only metric — see Training Load. */}
                    {finishDurationMin > 0 && (
                      <div>
                        <strong>
                          {finishDurationMin}
                          <em>{paceZh ? "分" : "min"}</em>
                        </strong>
                        <span>{paceZh ? "时长" : "Time"}</span>
                      </div>
                    )}
                  </div>

                  {prs.length > 0 && (
                    <div className="workoutSummaryPrs">
                      <h3>🏆 {paceZh ? "新纪录" : "New Personal Bests"}</h3>
                      {prs.map((pr) => (
                        <div className="workoutSummaryPrRow" key={pr.name}>
                          <span>{pr.name}</span>
                          <strong>
                            {pr.weight} {weightUnit}
                            {pr.reps ? ` × ${pr.reps}` : ""}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Session RPE — internal load (sRPE) to pair with tonnage */}
                  <div className="finishRpeBlock">
                    <h3>{paceZh ? "整体强度 (RPE)" : "Session RPE"}</h3>
                    <p className="finishRpeHint">
                      {paceZh
                        ? "整堂训练有多吃力？(1 轻松 – 10 力竭)"
                        : "How hard was the whole session? (1 easy – 10 max)"}
                    </p>
                    <div className="finishRpeScale">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const n = i + 1;
                        return (
                          <button
                            key={n}
                            type="button"
                            className={`finishRpeBtn${
                              workoutRpe === n ? " finishRpeBtnActive" : ""
                            }`}
                            onClick={() => {
                              setWorkoutRpe(n);
                              vibrate(8);
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    {/* Session load (sRPE) is computed + saved, but shown only
                        to the coach in the Training Load dashboard. */}
                  </div>

                  {/* Expandable, editable exercise list — fix any mis-entry */}
                  <div className="finishExerciseList">
                    <h3>{paceZh ? "动作明细" : "Your exercises"}</h3>
                    {workoutDetails.map((ex, idx) => {
                      const exLogs = setLogs.filter(
                        (l) => l.exerciseId === ex.exerciseId
                      );
                      const label =
                        parseExerciseNotes(ex.notes).exerciseLabel ||
                        String(idx + 1);
                      const open = !!finishExpanded[ex.id];
                      const done =
                        exLogs.length > 0 && exLogs.every(isSetComplete);
                      return (
                        <div className="finishExerciseItem" key={ex.id}>
                          <button
                            type="button"
                            className="finishExerciseHeader"
                            onClick={() =>
                              setFinishExpanded((s) => ({
                                ...s,
                                [ex.id]: !s[ex.id],
                              }))
                            }
                          >
                            <span className="finishExBadge">{label}</span>
                            <span className="finishExName">
                              {localizedExerciseName(ex)}
                            </span>
                            <span className="finishExMeta">
                              {done && (
                                <Check
                                  size={14}
                                  className="finishExDone"
                                  aria-hidden="true"
                                />
                              )}
                              {exLogs.length} {paceZh ? "组" : "sets"}
                            </span>
                            <ChevronDown
                              size={16}
                              className={`finishExCaret${
                                open ? " finishExCaretOpen" : ""
                              }`}
                            />
                          </button>
                          {open && (
                            <div className="finishExSets">
                              {exLogs.map((log) => {
                                const gi = setLogs.findIndex(
                                  (it) =>
                                    it.exerciseId === log.exerciseId &&
                                    (it.occurrenceId || "") ===
                                      (log.occurrenceId || "") &&
                                    it.setNumber === log.setNumber &&
                                    it.side === log.side
                                );
                                const sideAbbr =
                                  log.side === "Right"
                                    ? "R"
                                    : log.side === "Left"
                                    ? "L"
                                    : "";
                                return (
                                  <div
                                    className="finishSetRow"
                                    key={`${log.exerciseId}-${log.setNumber}-${
                                      log.side || "both"
                                    }`}
                                  >
                                    <span className="finishSetNo">
                                      {log.setNumber}
                                      {sideAbbr ? ` ${sideAbbr}` : ""}
                                    </span>
                                    {log.trackingType === "Time" ? (
                                      <label className="finishSetField">
                                        <input
                                          inputMode="numeric"
                                          value={log.actualTime}
                                          onChange={(e) =>
                                            updateSetLog(
                                              gi,
                                              "actualTime",
                                              e.target.value
                                            )
                                          }
                                        />
                                        <span>s</span>
                                      </label>
                                    ) : log.trackingType === "Distance" ? (
                                      <label className="finishSetField">
                                        <input
                                          inputMode="numeric"
                                          value={log.actualDistance}
                                          onChange={(e) =>
                                            updateSetLog(
                                              gi,
                                              "actualDistance",
                                              e.target.value
                                            )
                                          }
                                        />
                                        <span>m</span>
                                      </label>
                                    ) : (
                                      <>
                                        <label className="finishSetField">
                                          <input
                                            inputMode="numeric"
                                            value={log.actualReps}
                                            onChange={(e) =>
                                              updateSetLog(
                                                gi,
                                                "actualReps",
                                                e.target.value
                                              )
                                            }
                                          />
                                          <span>{paceZh ? "次" : "reps"}</span>
                                        </label>
                                        <label className="finishSetField">
                                          <input
                                            inputMode="decimal"
                                            value={log.actualWeight}
                                            placeholder="-"
                                            onChange={(e) =>
                                              updateSetLog(
                                                gi,
                                                "actualWeight",
                                                e.target.value
                                              )
                                            }
                                          />
                                          <span>{weightUnit}</span>
                                        </label>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    // Catch untouched sets at the moment of review: one tap to
                    // claim them done, or leave them recorded as skipped.
                    const unlogged = setLogs.filter((log) => !isSetComplete(log));
                    if (unlogged.length === 0) return null;
                    return (
                      <div className="finishUnloggedCatch">
                        <span>
                          {paceZh
                            ? `${unlogged.length} 组没有记录 — 你做了吗？`
                            : `${unlogged.length} set${
                                unlogged.length === 1 ? " has" : "s have"
                              } nothing logged — did you do them?`}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setCheckedWorkoutPageItems((current) =>
                                Array.from(
                                  new Set([
                                    ...current,
                                    ...unlogged.map(workoutSetCheckKey),
                                  ])
                                )
                              )
                            }
                          >
                            {paceZh ? "都做了，标记完成" : "Yes — mark them done"}
                          </button>
                          <span className="finishUnloggedHint">
                            {paceZh
                              ? "没做的话直接保存，会记录为跳过。"
                              : "If not, just save — they'll be recorded as skipped."}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    className="goldButton workoutSummaryDone"
                    onClick={saveWorkout}
                    disabled={savingWorkout}
                  >
                    {savingWorkout
                      ? paceZh
                        ? "保存中…"
                        : "Saving…"
                      : paceZh
                      ? "保存并完成"
                      : "Save & Finish"}
                  </button>
                  <button
                    type="button"
                    className="workoutFocusToggle"
                    onClick={() => setWorkoutFinishOpen(false)}
                  >
                    {paceZh ? "返回继续编辑" : "Back to workout"}
                  </button>
                </div>
              </div>
            );
          })()}

        {alternatePickerExercise && (
          <div
            className="workout-modal-overlay"
            onClick={() => setAlternatePickerExercise(null)}
          >
            <div
              className="clientFormModal alternatePickerModal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h2>{paceZh ? "替代动作" : "Alternate Exercises"}</h2>
                  <p>
                    {paceZh
                      ? "选择一个动作进行替换"
                      : "Pick an exercise to swap in"}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setAlternatePickerExercise(null)}
                >
                  x
                </button>
              </div>

              <div className="alternatePickerList">
                {exerciseSwapOptions(alternatePickerExercise).map(
                  (option, optionIndex) => {
                    const isActive =
                      option.exerciseId ===
                      alternatePickerExercise.exerciseId;
                    const name =
                      paceZh && option.exerciseNameCn
                        ? option.exerciseNameCn
                        : option.exerciseName;
                    const meta = [option.category, option.equipment]
                      .filter(Boolean)
                      .join(" • ");
                    return (
                      <button
                        key={`${option.exerciseId}-${optionIndex}`}
                        type="button"
                        className={`alternateOptionBtn${
                          isActive ? " alternateOptionBtnActive" : ""
                        }`}
                        onClick={() =>
                          swapExerciseOption(alternatePickerExercise, option)
                        }
                      >
                        <span className="alternateOptionInfo">
                          <span className="alternateOptionName">{name}</span>
                          {(optionIndex === 0 || meta) && (
                            <span className="alternateOptionMeta">
                              {optionIndex === 0
                                ? paceZh
                                  ? meta
                                    ? `原方案 • ${meta}`
                                    : "原方案"
                                  : meta
                                    ? `Programmed • ${meta}`
                                    : "Programmed"
                                : meta}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <Check size={18} aria-hidden="true" />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {historyExerciseName && (
          <ExerciseHistoryModal
            t={t}
            expandedHistoryDates={expandedHistoryDates}
            historyExerciseName={historyExerciseName}
            paceZh={paceZh}
            setExpandedHistoryDates={setExpandedHistoryDates}
            setHistoryExerciseName={setHistoryExerciseName}
            workoutHistoryLogs={workoutHistoryLogs}
          />
        )}

        {showNotificationsPanel && (
          <div className="notificationsPanel">
            <div className="notificationsPanelHeader">
              <h3>Notifications</h3>
              <button
                className="drawerClose"
                onClick={() => setShowNotificationsPanel(false)}
              >
                ×
              </button>
            </div>
            {notificationsLoading ? (
              <div className="notificationsPanelEmpty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notificationsPanelEmpty">
                <Bell size={32} strokeWidth={1.2} />
                <p>No notifications yet.</p>
                <small>
                  When clients are assigned workouts, submit check-ins, or complete programs, notifications will appear here.
                </small>
              </div>
            ) : (
              <div className="notificationsList">
                {notifications
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((n) => (
                    <div
                      className={`notificationItem ${n.read ? "notificationRead" : "notificationUnread"}`}
                      key={n.id}
                    >
                      <div className="notificationItemDot" />
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <small>{new Date(n.createdAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
