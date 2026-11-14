"use client";

import { ArrowRight, Check, ChevronLeft, CircleAlert, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminShellContext } from "@/components/layout/admin-shell-context";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { cn } from "@/lib/utils";
import {
  AiForm,
  AiStatusPane,
  aiBadge,
  appDisplayName,
  type DetectedOffer,
  useAiConnection,
} from "./ai-panel";
import {
  ApiError,
  adoptProduct,
  applyBranding,
  applyEmail,
  assertAcceptedFile,
  type BillingCatalog,
  checkSubdomain,
  createSchool,
  fetchBillingCatalog,
  getOnboarding,
  isHostedCatalog,
  newUploadingFile,
  patchOnboarding,
  publishOffer,
  saveOffer,
  selectSchool,
  startBillingCheckout,
  UPLOAD_TARGETS,
  updateAccountName,
  uploadWizardFile,
} from "./api";
import {
  buildFlow,
  deriveSiteDomain,
  detectLocaleDefaults,
  emptyWizardData,
  type FieldErrors,
  hasUploadsInFlight,
  isPaidOffer,
  isValidSubdomain,
  nextStep,
  type OfferKind,
  offerSharePath,
  offerTitleOr,
  parseDraft,
  previousStep,
  resolveResumeStep,
  resumeRows,
  type SubdomainStatus,
  sanitizeSubdomainInput,
  serializeDraft,
  slugify,
  stepperGroups,
  stepperIndex,
  toServerStep,
  type UploadedFile,
  validateStep,
  type WizardData,
  type WizardStep,
} from "./flow";
import {
  EmailPreview,
  HomePreview,
  PreviewFrame,
  ProductPreview,
  UsesPreview,
  WirePreview,
} from "./previews";
import { ResumeDialog } from "./resume-dialog";
import { markResumePrompted, shouldOfferResume } from "./session";
import {
  AboutStep,
  BrandStep,
  BuildStep,
  EmailStep,
  LiveStep,
  OfferStep,
  PlanStep,
  SchoolStep,
  SetupStep,
  type StepCtx,
  type UploadSlot,
} from "./steps";
import type { RowState } from "./ui";
import { Badge, Spinner } from "./ui";

export type WizardProps = {
  /** `?new=1`: start another school for a user who already has one. */
  isNew: boolean;
  /** `?checkout=return`: back from the CourseLit plan checkout. */
  checkoutReturn: boolean;
  /** `?resume=1`: offer the Resume dialog. */
  resume: boolean;
  /** `?plan=1`: open on the plan step, e.g. to buy a plan during a trial. */
  choosePlan?: boolean;
};

type SchoolInfo = {
  id: string;
  name: string;
  subdomain: string;
  host: string | null;
  origin: string | null;
};

type LiveKey = "site" | "community" | "offer" | "email";
type SaveState = "saved" | "saving";

function uid(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Sign-in names new accounts after the email prefix; that is not a real name. */
function realAccountName(
  account: { name?: string | null; email?: string | null } | null,
) {
  const name = account?.name?.trim() ?? "";
  const prefix = account?.email?.split("@", 1)[0]?.trim().toLowerCase();
  return name && name.toLowerCase() !== prefix ? name : "";
}

export function SetupWizard({
  isNew,
  checkoutReturn,
  resume,
  choosePlan,
}: WizardProps) {
  const router = useRouter();
  const shell = useAdminShellContext();
  const account = shell?.account ?? null;
  const knownSchools = shell?.schools ?? [];

  const localeDefaults = useMemo(
    () =>
      detectLocaleDefaults(
        typeof navigator === "undefined" ? undefined : navigator.language,
      ),
    [],
  );
  const siteDomain = useMemo(
    () =>
      deriveSiteDomain(
        knownSchools,
        typeof window === "undefined" ? "courselit.app" : window.location.hostname,
      ),
    [knownSchools],
  );

  // ----------------------------------------------------------------- state
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [hosted, setHosted] = useState(true);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const [step, setStep] = useState<WizardStep>("about");
  const [data, setData] = useState<WizardData>(() => emptyWizardData(localeDefaults));
  const [accountName, setAccountName] = useState(realAccountName(account));
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [availability, setAvailability] = useState<SubdomainStatus>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createRows, setCreateRows] = useState<Record<string, RowState>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  /** Setup finished; waiting for the creator to press Continue. */
  const [createReady, setCreateReady] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [failed, setFailed] = useState<{ retry: () => void } | null>(null);
  const [planMode, setPlanMode] = useState<"form" | "checkout">("form");
  const [cancelled, setCancelled] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [goingLive, setGoingLive] = useState(false);
  const [liveRows, setLiveRows] = useState<Record<LiveKey, RowState>>({
    site: "wait",
    community: "wait",
    offer: "wait",
    email: "wait",
  });
  const [liveFailed, setLiveFailed] = useState<LiveKey | null>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [resumeStep, setResumeStep] = useState<WizardStep>("offer");

  const dataRef = useRef(data);
  dataRef.current = data;
  const stepRef = useRef(step);
  stepRef.current = step;
  const schoolRef = useRef(school);
  schoolRef.current = school;
  const formRef = useRef<HTMLDivElement>(null);
  const cancelledUploads = useRef(new Set<string>());
  const hydrated = useRef(false);

  const [aiPanel, setAiPanel] = useState(false);
  const aiOpen = aiPanel && (step === "build" || step === "live");
  const ai = useAiConnection({
    active: aiOpen,
    schoolId: school?.id ?? null,
    ownProductId: data.refs.productId,
  });
  const [aiEverConnected, setAiEverConnected] = useState(false);
  useEffect(() => {
    if (ai.status === "connected" || ai.status === "detected") setAiEverConnected(true);
  }, [ai.status]);

  const patch = useCallback((next: Partial<WizardData>) => {
    setData((current) => ({ ...current, ...next }));
    setErrors({});
  }, []);

  const flow = useMemo(
    () => buildFlow({ firstRun, hosted, hasOffer: data.offer !== null }),
    [firstRun, hosted, data.offer],
  );
  const groups = useMemo(() => stepperGroups({ firstRun, hosted }), [firstRun, hosted]);

  // ------------------------------------------------------------- persistence
  const persist = useCallback(
    async (
      stepToStore?: WizardStep,
      extra?: { status?: "in_progress" | "complete" },
    ) => {
      const current = schoolRef.current;
      if (!current) return;
      setSaveState("saving");
      try {
        await patchOnboarding(current.id, {
          step: toServerStep(stepToStore ?? stepRef.current),
          draft: serializeDraft(dataRef.current),
          ...(extra ?? {}),
        });
        setSaveState("saved");
        setFailed(null);
      } catch (error) {
        setSaveState("saved");
        setFailed({ retry: () => void persist(stepToStore, extra) });
        throw error;
      }
    },
    [],
  );

  // Autosave the draft shortly after it changes.
  useEffect(() => {
    if (booting || !schoolRef.current || !hydrated.current || creating || goingLive)
      return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      void persist().catch(() => undefined);
    }, 1200);
    return () => clearTimeout(timer);
  }, [data, booting, creating, goingLive, persist]);

  const goTo = useCallback(
    (next: WizardStep) => {
      setErrors({});
      setFailed(null);
      setPrevOpen(false);
      setStep(next);
      stepRef.current = next;
      formRef.current?.scrollTo({ top: 0 });
      void persist(next).catch(() => undefined);
    },
    [persist],
  );

  // -------------------------------------------------------------- bootstrap
  useEffect(() => {
    let active = true;
    void (async () => {
      let isHosted = true;
      try {
        const loaded = await fetchBillingCatalog();
        if (!active) return;
        setCatalog(loaded);
        isHosted = isHostedCatalog(loaded);
      } catch {
        isHosted = true;
      }
      setHosted(isHosted);

      const existing =
        knownSchools.find((item) => item.selected) ?? knownSchools[0] ?? null;
      const fresh = isNew || !existing;
      if (fresh) {
        setFirstRun(!existing);
        setStep(existing ? "school" : "about");
        setBooting(false);
        hydrated.current = true;
        return;
      }

      // Continue a school that already exists.
      if (existing.isOwner === false) {
        router.replace("/");
        return;
      }
      try {
        const onboarding = await getOnboarding(existing.id);
        if (!active) return;
        if (onboarding.status === "complete" && !checkoutReturn) {
          router.replace("/");
          return;
        }
        const info: SchoolInfo = {
          id: existing.id,
          name: existing.name,
          subdomain: existing.subdomain ?? "",
          host: existing.storefrontHost ?? null,
          origin: existing.storefrontOrigin ?? null,
        };
        const restored = parseDraft(onboarding.draft, localeDefaults);
        restored.school = info.name;
        restored.subdomain = info.subdomain || restored.subdomain;
        restored.subdomainTouched = true;
        if (!restored.email.sender) restored.email.sender = info.name;
        setSchool(info);
        schoolRef.current = info;
        setData(restored);
        dataRef.current = restored;
        setFirstRun(false);
        // Back from checkout: only a paid plan confirms the payment. A running
        // trial is entitled too, but it says nothing about this checkout.
        const paid = onboarding.billing.paid || !onboarding.billing.required;
        setTrialEndsAt(onboarding.billing.paid ? null : onboarding.billing.trialEndsAt);
        const target = resolveResumeStep(onboarding.step, {
          hosted: isHosted,
          hasOffer: restored.offer !== null,
        });
        if (checkoutReturn) {
          if (paid) {
            setStep("plan");
            setPaidConfirmed(true);
            setGoingLive(true);
            setBooting(false);
            hydrated.current = true;
            return;
          }
          setCancelled(true);
          setStep("plan");
        } else if (choosePlan) {
          setPlanMode("form");
          setStep("plan");
        } else {
          setStep(target);
          setResumeStep(target);
          if (resume && shouldOfferResume(onboarding)) setShowResume(true);
        }
        setBooting(false);
        hydrated.current = true;
      } catch (error) {
        if (!active) return;
        setBootError(errorText(error, "We couldn't load your setup. Please refresh."));
        setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
    // Bootstrap runs once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const real = realAccountName(account);
    if (real && !accountName) setAccountName(real);
  }, [account, accountName]);

  // ---------------------------------------------------- subdomain availability
  useEffect(() => {
    if (step !== "school" || creating || school) return;
    const value = data.subdomain;
    if (!value) {
      setAvailability("idle");
      return;
    }
    if (!isValidSubdomain(value)) {
      setAvailability("invalid");
      return;
    }
    setAvailability("checking");
    let active = true;
    const timer = setTimeout(() => {
      checkSubdomain(value)
        .then((result) => {
          if (!active) return;
          setSuggestions(result.suggestions ?? []);
          setAvailability(
            result.available ? "ok" : result.reason === "invalid" ? "invalid" : "taken",
          );
        })
        .catch(() => {
          if (!active) return;
          setAvailability("idle");
        });
    }, 450);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [data.subdomain, step, creating, school]);

  // ----------------------------------------------------------------- derived
  const schoolName = (school?.name ?? data.school.trim()) || "Your school";
  const host = school?.host ?? `${data.subdomain || "your-school"}.${siteDomain}`;
  const siteUrl =
    school?.origin ??
    `https://${school?.host ?? `${data.subdomain || "your-school"}.${siteDomain}`}`;
  const uploadsBusy = hasUploadsInFlight(data);
  const isLast = step === "live";
  const inCreating = step === "school" && creating;
  const inCheckout = step === "plan" && planMode === "checkout";
  const inGoingLive = goingLive;
  const stepIndex = stepperIndex(groups, step);

  // -------------------------------------------------------------- uploads
  const setFile = useCallback(
    (slot: UploadSlot, id: string, fn: (file: UploadedFile) => UploadedFile) => {
      setData((current) => {
        const apply = (file: UploadedFile | null) =>
          file && file.id === id ? fn(file) : file;
        if (slot === "cover")
          return {
            ...current,
            course: { ...current.course, cover: apply(current.course.cover) },
          };
        if (slot === "video")
          return {
            ...current,
            course: { ...current.course, video: apply(current.course.video) },
          };
        if (slot === "logo")
          return {
            ...current,
            brand: { ...current.brand, logo: apply(current.brand.logo) },
          };
        return {
          ...current,
          download: {
            ...current.download,
            files: current.download.files.map((file) =>
              file.id === id ? fn(file) : file,
            ),
          },
        };
      });
    },
    [],
  );

  /** Cover and logo come from the shared image dialog, already uploaded. */
  function selectImage(slot: "cover" | "logo", file: UploadedFile) {
    setData((state) =>
      slot === "cover"
        ? { ...state, course: { ...state.course, cover: file } }
        : { ...state, brand: { ...state.brand, logo: file } },
    );
  }

  function startUpload(slot: UploadSlot, files: File[]) {
    const current = schoolRef.current;
    if (!current) return;
    for (const file of files) {
      const id = uid();
      const placeholder = newUploadingFile(id, file);
      setData((state) => {
        if (slot === "cover")
          return { ...state, course: { ...state.course, cover: placeholder } };
        if (slot === "video")
          return { ...state, course: { ...state.course, video: placeholder } };
        if (slot === "logo")
          return { ...state, brand: { ...state.brand, logo: placeholder } };
        return {
          ...state,
          download: {
            ...state.download,
            files: [...state.download.files, placeholder],
          },
        };
      });
      setErrors({});
      Promise.resolve()
        .then(() => assertAcceptedFile(slot, file))
        .then(() =>
          uploadWizardFile(current.id, UPLOAD_TARGETS[slot], file, id, (pct) => {
            if (!cancelledUploads.current.has(id))
              setFile(slot, id, (item) => ({ ...item, pct }));
          }),
        )
        .then((done) => {
          if (cancelledUploads.current.has(id)) return;
          setFile(slot, id, () => done);
        })
        .catch((error: unknown) => {
          if (cancelledUploads.current.has(id)) return;
          setFile(slot, id, (item) => ({
            ...item,
            status: "error",
            error: errorText(error, "That upload didn't finish. Try again."),
          }));
        });
    }
  }

  function removeUpload(slot: UploadSlot, id?: string) {
    setData((state) => {
      const target =
        slot === "cover"
          ? state.course.cover
          : slot === "video"
            ? state.course.video
            : slot === "logo"
              ? state.brand.logo
              : state.download.files.find((file) => file.id === id);
      if (target?.status === "uploading") cancelledUploads.current.add(target.id);
      if (slot === "cover")
        return { ...state, course: { ...state.course, cover: null } };
      if (slot === "video")
        return { ...state, course: { ...state.course, video: null } };
      if (slot === "logo") return { ...state, brand: { ...state.brand, logo: null } };
      return {
        ...state,
        download: {
          ...state.download,
          files: state.download.files.filter((file) => file.id !== id),
        },
      };
    });
  }

  // ------------------------------------------------------------ school step
  function setSchoolName(value: string) {
    const current = dataRef.current;
    const next: Partial<WizardData> = { school: value };
    if (!current.subdomainTouched) next.subdomain = slugify(value);
    if (!current.email.sender || current.email.sender === current.school) {
      next.email = { ...current.email, sender: value };
    }
    patch(next);
  }

  function setSubdomain(value: string) {
    patch({ subdomain: sanitizeSubdomainInput(value), subdomainTouched: true });
  }

  const createFlow = useCallback(async () => {
    const current = dataRef.current;
    setCreating(true);
    setCreateError(null);
    setCreateReady(false);
    const rows = (
      site: RowState,
      community: RowState,
      email: RowState,
      open: RowState,
    ) => setCreateRows({ site, community, email, open });
    let created = schoolRef.current;
    // The real work takes a fraction of a second. Each row stays on screen for
    // at least a beat, so the creator can read what is being set up.
    const STEP_MS = 1000;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    let stopped = false;
    try {
      if (!created) {
        rows("run", "wait", "wait", "wait");
        const pacing = (async () => {
          await wait(STEP_MS);
          if (stopped) return;
          rows("done", "run", "wait", "wait");
          await wait(STEP_MS);
          if (stopped) return;
          rows("done", "done", "run", "wait");
          await wait(STEP_MS);
        })();
        const result = await createSchool({
          name: current.school.trim(),
          subdomain: current.subdomain,
          locale: current.locale,
          currency: current.currency,
        });
        created = {
          id: result.id,
          name: result.name,
          subdomain: result.subdomain,
          host: result.storefrontHost ?? null,
          origin: result.storefrontOrigin ?? null,
        };
        schoolRef.current = created;
        setSchool(created);
        await pacing;
      }
      rows("done", "done", "done", "run");
      await Promise.all([selectSchool(created.id), wait(STEP_MS)]);
      rows("done", "done", "done", "done");
      // From here on the URL describes the school, not a new one.
      window.history.replaceState(null, "", "/onboarding/setup");
      stepRef.current = "offer";
      await patchOnboarding(created.id, {
        step: "offer",
        draft: serializeDraft({ ...dataRef.current, subdomainTouched: true }),
      }).catch(() => undefined);
      hydrated.current = true;
      // The creator reads the finished list, then presses Continue.
      setCreateReady(true);
    } catch (error) {
      stopped = true;
      if (error instanceof ApiError && error.reason === "subdomain_taken") {
        setCreating(false);
        setAvailability("taken");
        setErrors({ subdomain: "That address is taken. Pick another." });
        return;
      }
      if (!created) {
        rows("fail", "wait", "wait", "wait");
      } else {
        rows("done", "done", "done", "fail");
      }
      setCreateError(
        errorText(error, "We couldn't create your school. Please try again."),
      );
    }
  }, []);

  // -------------------------------------------------------------- going live
  const liveKeys = useMemo<LiveKey[]>(() => {
    const keys: LiveKey[] = ["site", "community"];
    if (data.offer && data.offer !== "community") keys.push("offer");
    keys.push("email");
    return keys;
  }, [data.offer]);

  const runGoingLive = useCallback(
    async (from?: LiveKey) => {
      const current = schoolRef.current;
      if (!current) return;
      const keys = liveKeys;
      const start = from ? Math.max(0, keys.indexOf(from)) : 0;
      setGoingLive(true);
      setLiveReady(false);
      setLiveFailed(null);
      setErrors({});
      if (!from) {
        setLiveRows({ site: "wait", community: "wait", offer: "wait", email: "wait" });
      }
      for (const key of keys.slice(start)) {
        setLiveRows((rows) => ({ ...rows, [key]: "run" }));
        try {
          const state = dataRef.current;
          if (key === "site") {
            await applyBranding(current.id, state, current.name);
          } else if (key === "community") {
            if (state.offer === "community") await publishOffer(current.id, state);
          } else if (key === "offer") {
            await publishOffer(current.id, state);
          } else if (
            key === "email" &&
            !state.email.skipped &&
            !state.refs.emailSaved
          ) {
            await applyEmail(current.id, state);
            setData((s) => ({ ...s, refs: { ...s.refs, emailSaved: true } }));
            dataRef.current = {
              ...dataRef.current,
              refs: { ...dataRef.current.refs, emailSaved: true },
            };
          }
          setLiveRows((rows) => ({ ...rows, [key]: "done" }));
        } catch {
          setLiveRows((rows) => ({ ...rows, [key]: "fail" }));
          setLiveFailed(key);
          return;
        }
      }
      await persist("live").catch(() => undefined);
      setLiveReady(true);
    },
    [liveKeys, persist],
  );

  const autoLiveStarted = useRef(false);
  useEffect(() => {
    if (!booting && goingLive && !autoLiveStarted.current && school) {
      autoLiveStarted.current = true;
      void runGoingLive();
    }
  }, [booting, goingLive, school, runGoingLive]);

  async function enterPlanOrLive() {
    // Hosted: a school that is already covered by a plan goes straight live.
    const current = schoolRef.current;
    if (current && hosted) {
      try {
        const onboarding = await getOnboarding(current.id);
        if (onboarding.billing.entitled || !onboarding.billing.required) {
          setPaidConfirmed(false);
          await runGoingLive();
          return;
        }
      } catch {
        // Fall through to the plan step.
      }
    }
    setPlanMode("form");
    goTo("plan");
  }

  async function openCheckout() {
    const current = schoolRef.current;
    if (!current) return;
    const selected = catalog?.offers.find(
      (offer) => offer.plan === data.plan.plan && offer.interval === data.plan.interval,
    );
    if (!catalog?.catalogRevision || !selected) {
      setCheckoutError("Paid checkout is temporarily unavailable. Please try again.");
      return;
    }
    setSaving(true);
    setCheckoutError(null);
    setPlanMode("checkout");
    try {
      await persist("plan").catch(() => undefined);
      const { checkoutUrl } = await startBillingCheckout(current.id, {
        plan: data.plan.plan,
        interval: data.plan.interval,
        catalogRevision: catalog.catalogRevision,
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setSaving(false);
      setCheckoutError(
        error instanceof ApiError && error.reason === "billing_catalog_changed"
          ? "Prices changed. Go back and pick a plan again."
          : errorText(
              error,
              "Paid checkout is temporarily unavailable. Please try again.",
            ),
      );
    }
  }

  // ----------------------------------------------------------------- actions
  const validate = useCallback(
    (target: WizardStep) =>
      validateStep(target, dataRef.current, { name: accountName, availability }),
    [accountName, availability],
  );

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setFailed(null);
    try {
      await action();
    } catch (error) {
      setFailed({
        retry: () => {
          void run(action);
        },
      });
      if (error instanceof ApiError && error.message) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function continueFrom() {
    const found = validate(step);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    switch (step) {
      case "about":
        void run(async () => {
          await updateAccountName(accountName.trim());
          setStep("school");
          formRef.current?.scrollTo({ top: 0 });
        });
        return;
      case "school":
        // The school already exists when the creator came back to this step.
        if (schoolRef.current) goTo(nextStep(flow, "school"));
        else void createFlow();
        return;
      case "offer":
        goTo(nextStep(flow, "offer"));
        return;
      case "build":
        if (uploadsBusy) return;
        void run(async () => {
          const current = schoolRef.current;
          if (!current) return;
          const refs = await saveOffer(current.id, dataRef.current, (partial) => {
            setData((state) => ({ ...state, refs: { ...state.refs, ...partial } }));
            dataRef.current = {
              ...dataRef.current,
              refs: { ...dataRef.current.refs, ...partial },
            };
          });
          setData((state) => ({ ...state, refs }));
          dataRef.current = { ...dataRef.current, refs };
          toast.success(
            `${offerTitleOr(dataRef.current)} is saved. It goes live with your school`,
          );
          goTo(nextStep(flow, "build"));
        });
        return;
      case "brand":
        if (uploadsBusy) return;
        void run(async () => {
          const current = schoolRef.current;
          if (!current) return;
          await applyBranding(current.id, dataRef.current, current.name);
          goTo("email");
        });
        return;
      case "email":
        void run(async () => {
          const current = schoolRef.current;
          if (!current) return;
          await applyEmail(current.id, dataRef.current);
          setData((state) => ({
            ...state,
            email: { ...state.email, skipped: false },
            refs: { ...state.refs, emailSaved: true },
          }));
          dataRef.current = {
            ...dataRef.current,
            email: { ...dataRef.current.email, skipped: false },
            refs: { ...dataRef.current.refs, emailSaved: true },
          };
          if (hosted) await enterPlanOrLive();
          else await runGoingLive();
        });
        return;
      case "plan":
        void openCheckout();
        return;
      default:
        return;
    }
  }

  function skip() {
    if (step === "offer") {
      patch({ offer: null });
      dataRef.current = { ...dataRef.current, offer: null };
      goTo("brand");
    } else if (step === "build") {
      goTo("brand");
    } else if (step === "brand") {
      goTo("email");
    } else if (step === "email") {
      patch({ email: { ...dataRef.current.email, skipped: true } });
      dataRef.current = {
        ...dataRef.current,
        email: { ...dataRef.current.email, skipped: true },
      };
      void (hosted ? enterPlanOrLive() : runGoingLive());
    }
  }

  function back() {
    if (inCreating) {
      setCreating(false);
      return;
    }
    if (inCheckout) {
      setPlanMode("form");
      setSaving(false);
      return;
    }
    if (step === "brand" && data.offer === null) {
      goTo("offer");
      return;
    }
    goTo(previousStep(flow, step));
  }

  async function finishLater() {
    try {
      if (schoolRef.current) await persist();
    } catch {
      // Leaving anyway: the draft autosaved moments ago.
    }
    window.location.assign(
      schoolRef.current ? "/" : knownSchools.length ? "/" : "/schools",
    );
  }

  async function goToDashboard() {
    setSaving(true);
    try {
      await persist("live", { status: "complete" });
      window.location.assign("/");
    } catch {
      setSaving(false);
    }
  }

  function pickOffer(offer: OfferKind) {
    const current = dataRef.current;
    const name = (school?.name ?? current.school).trim() || "your school";
    const next: Partial<WizardData> = {
      offer,
      refs:
        current.offer === offer
          ? current.refs
          : {
              communityId: current.refs.communityId,
              emailSaved: current.refs.emailSaved,
            },
    };
    if (offer === "community" && !current.community.name) {
      next.community = {
        ...current.community,
        name: `${name} community`,
        description: `A place for ${name} members to share their work, ask questions and learn together.`,
        welcome:
          "Welcome in! Start by saying hello and sharing what you'd like to work on.",
      };
    }
    patch(next);
  }

  async function adoptAiProduct(product: DetectedOffer) {
    const current = schoolRef.current;
    if (!current) return;
    try {
      const refs = await adoptProduct(
        current.id,
        product,
        dataRef.current.refs,
        () => undefined,
      );
      const kind = product.kind;
      const base = dataRef.current;
      const next: WizardData = {
        ...base,
        offer: kind,
        price: "free",
        refs,
        course:
          kind === "course"
            ? {
                ...base.course,
                title: product.title,
                description: product.description.slice(0, 160),
              }
            : base.course,
        download:
          kind === "download"
            ? {
                ...base.download,
                title: product.title,
                description: product.description,
              }
            : base.download,
      };
      setData(next);
      dataRef.current = next;
      setAiPanel(false);
      toast.success(`${product.title} is your first offer`);
      goTo("brand");
    } catch (error) {
      toast.error(errorText(error, "We couldn't use that product. Please try again."));
    }
  }

  // ------------------------------------------------------------- rendering
  const ctx: StepCtx = { data, patch, errors, disabled: saving };

  const stepCtxCreateRows = [
    {
      key: "site",
      name: "Website",
      desc: "Your homepage, plus Terms and Privacy drafts to review",
    },
    { key: "community", name: "Community", desc: "Ready for when you switch it on" },
    { key: "email", name: "Email", desc: "So you can send to your contacts" },
    { key: "open", name: "Opening your school", desc: "Switching you over to it" },
  ].map((row) => ({ ...row, state: createRows[row.key] ?? ("wait" as RowState) }));

  const liveRowViews = liveKeys.map((key) => {
    const base: Record<LiveKey, { name: string; desc: string }> = {
      site: {
        name: "Website",
        desc: "Your homepage, plus Terms and Privacy drafts to review",
      },
      community: {
        name: "Community",
        desc:
          data.offer === "community"
            ? "Your community and its join page"
            : "Ready for when you switch it on",
      },
      offer: {
        name: offerTitleOr(data) || "Your offer",
        desc: isPaidOffer(data)
          ? "Saved, hidden until you add a price"
          : "Its sales page",
      },
      email: {
        name: "Email",
        desc:
          liveRows.email === "fail"
            ? "Couldn't finish setting up email"
            : "So you can send to your contacts",
      },
    };
    return { key, ...base[key], state: liveRows[key] };
  });
  const liveAllDone = liveRowViews.every((row) => row.state === "done");

  const planSummaryRows = [
    { key: "site", name: "Your site", desc: host, state: "done" as RowState },
    {
      key: "offer",
      name: "First offer",
      desc: !data.offer
        ? "Add one any time from your dashboard"
        : offerTitleOr(data) +
          (isPaidOffer(data) ? ", hidden until you add a price" : ""),
      state: (!data.offer || isPaidOffer(data) ? "later" : "done") as RowState,
    },
    {
      key: "email",
      name: "Email",
      desc: data.email.skipped
        ? "Off until you add a mailing address"
        : "Ready to send",
      state: (data.email.skipped ? "later" : "done") as RowState,
    },
  ];

  const planSummary = `${data.plan.plan === "pro" ? "Pro" : "Business"} plan, billed ${data.plan.interval === "month" ? "monthly" : "yearly"}`;

  // Preview pane content.
  let previewTitle = "Live preview";
  let previewBadge: React.ReactNode = null;
  let previewBody: React.ReactNode;
  if (aiOpen) {
    previewTitle = "Your assistant";
    previewBadge = aiBadge(ai.status);
    previewBody = (
      <AiStatusPane
        ai={ai}
        schoolName={schoolName}
        canUse={step === "build"}
        onUse={(offer) => void adoptAiProduct(offer)}
        onBackToForm={() => setAiPanel(false)}
        adminUrl={ai.detected ? `/products/${ai.detected.id}` : "/products"}
      />
    );
  } else if (step === "about") {
    previewTitle = "Where your name appears";
    previewBody = <UsesPreview name={accountName} />;
  } else if (step === "offer" && data.offer) {
    previewTitle = "What learners will see";
    previewBody = <WirePreview data={data} fullUrl={host} />;
  } else if (step === "build") {
    previewTitle = "Live preview";
    if (isPaidOffer(data))
      previewBadge = <Badge tone="wait">Hidden until it has a price</Badge>;
    previewBody = <ProductPreview data={data} schoolName={schoolName} fullUrl={host} />;
  } else if (step === "email") {
    previewTitle = "Where your address appears";
    previewBody = <EmailPreview data={data} schoolName={schoolName} />;
  } else {
    previewTitle =
      step === "live"
        ? "Your site"
        : step === "plan" || inGoingLive
          ? "Ready to go live"
          : "Live preview";
    if (step === "live") previewBadge = <Badge tone="ok">Live</Badge>;
    else if (step === "plan") previewBadge = <Badge tone="wait">Not live yet</Badge>;
    previewBody = <HomePreview data={data} schoolName={schoolName} fullUrl={host} />;
  }

  // Footer controls.
  const showFooter = !aiOpen && !inCheckout;
  const canBack =
    flow.indexOf(step) > 0 &&
    !inGoingLive &&
    !isLast &&
    !(step === "school" && !creating && flow.indexOf(step) === 0);
  const canSkip =
    ["offer", "build", "brand", "email"].includes(step) &&
    !aiOpen &&
    !saving &&
    !inGoingLive &&
    !inCreating;
  const emailFailed = inGoingLive && liveFailed === "email";
  let nextLabel = "Continue";
  if (saving) nextLabel = "Saving…";
  else if (inGoingLive)
    nextLabel = emailFailed
      ? "Go live without email"
      : liveReady
        ? "Continue"
        : "Going live…";
  else if (step === "plan") nextLabel = "Continue to checkout";
  else if (step === "email")
    nextLabel = hosted ? "Save and continue" : "Save and finish";
  else if (step === "build")
    nextLabel = uploadsBusy ? "Uploading…" : "Save and continue";
  else if (step === "brand" && uploadsBusy) nextLabel = "Uploading…";
  else if (inCreating)
    nextLabel = createError ? "Try again" : createReady ? "Continue" : "Creating…";
  const nextBusy =
    saving ||
    (inGoingLive && !emailFailed && !liveReady) ||
    (inCreating && !createError && !createReady);
  const nextDisabled =
    nextBusy ||
    (inGoingLive && !emailFailed && !liveFailed && !liveReady) ||
    (step === "offer" && !data.offer) ||
    ((step === "build" || step === "brand") && uploadsBusy) ||
    (step === "school" && !inCreating && availability === "checking");

  function onNext() {
    if (inGoingLive && emailFailed) {
      setData((state) => ({ ...state, email: { ...state.email, skipped: true } }));
      dataRef.current = {
        ...dataRef.current,
        email: { ...dataRef.current.email, skipped: true },
      };
      setGoingLive(false);
      toast.success(`${schoolName} is live`);
      goTo("live");
      return;
    }
    if (inGoingLive && liveReady) {
      setLiveReady(false);
      setGoingLive(false);
      toast.success(`${schoolName} is live`);
      goTo("live");
      return;
    }
    if (inCreating && createError) {
      void createFlow();
      return;
    }
    if (inCreating && createReady) {
      setCreateReady(false);
      setCreating(false);
      setStep("offer");
      formRef.current?.scrollTo({ top: 0 });
      return;
    }
    continueFrom();
  }

  const savedLabel = saveState === "saving" ? "Saving…" : "Saved";
  const hasSchool = Boolean(school);
  const mobileLabel = groups[stepIndex]?.label ?? "";

  if (booting) {
    return <CourseLitLoading label="Loading your setup" />;
  }
  if (bootError) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p role="alert" className="max-w-md text-center text-sm text-destructive">
          {bootError}
        </p>
      </div>
    );
  }

  const form = (() => {
    if (aiOpen) {
      return (
        <AiForm
          ai={ai}
          data={data}
          schoolName={schoolName}
          backLabel={step === "live" ? "Back" : "Back to the form"}
          onBack={() => setAiPanel(false)}
        />
      );
    }
    if (inGoingLive) {
      return (
        <SetupStep
          schoolName={schoolName}
          rows={liveRowViews}
          failed={Boolean(liveFailed)}
          allDone={liveAllDone}
          paidConfirmed={paidConfirmed}
          planSummary={planSummary}
          onRetry={(key) => void runGoingLive(key as LiveKey)}
        />
      );
    }
    switch (step) {
      case "about":
        return (
          <AboutStep
            name={accountName}
            onName={(value) => {
              setAccountName(value);
              setErrors({});
            }}
            email={account?.email ?? ""}
            error={errors.name}
          />
        );
      case "school":
        return (
          <SchoolStep
            ctx={ctx}
            siteDomain={siteDomain}
            availability={availability}
            suggestions={suggestions}
            onName={setSchoolName}
            onSubdomain={setSubdomain}
            onPickSuggestion={(value) => {
              patch({ subdomain: value, subdomainTouched: true });
            }}
            creating={creating}
            createReady={createReady}
            locked={Boolean(school)}
            rows={stepCtxCreateRows}
            onRetry={() => void createFlow()}
            createError={createError}
          />
        );
      case "offer":
        return (
          <OfferStep
            offer={data.offer}
            onPick={pickOffer}
            onDecideLater={() => {
              patch({ offer: null });
              dataRef.current = { ...dataRef.current, offer: null };
              goTo("brand");
            }}
          />
        );
      case "build":
        return (
          <BuildStep
            ctx={ctx}
            schoolId={school?.id ?? null}
            onUpload={startUpload}
            onSelectImage={selectImage}
            onRemoveUpload={removeUpload}
          />
        );
      case "brand":
        return (
          <BrandStep
            ctx={ctx}
            schoolId={school?.id ?? null}
            onSelectImage={selectImage}
            onRemoveUpload={removeUpload}
          />
        );
      case "email":
        return <EmailStep ctx={ctx} />;
      case "plan":
        return (
          <PlanStep
            ctx={ctx}
            catalog={catalog}
            schoolName={schoolName}
            fullUrl={host}
            cancelled={cancelled && planMode === "form"}
            checkoutError={checkoutError}
            checkingOut={saving}
            onOpenCheckout={() => void openCheckout()}
            onChangePlan={() => {
              setPlanMode("form");
              setSaving(false);
              setCancelled(true);
            }}
            summaryRows={planSummaryRows}
            mode={planMode}
          />
        );
      case "live":
        return (
          <LiveStep
            data={data}
            schoolName={schoolName}
            siteUrl={siteUrl}
            aiConnected={aiEverConnected}
            aiName={appDisplayName(ai.app)}
            onOpenAi={() => setAiPanel(true)}
          />
        );
      default:
        return null;
    }
  })();

  const learnerUrl = data.offer
    ? `${siteUrl.replace(/\/$/, "")}${offerSharePath(data)}`
    : siteUrl;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      <header className="grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-border bg-card px-6 max-md:h-14 max-md:grid-cols-[1fr_auto] max-md:gap-3 max-md:px-4">
        <div className="flex items-center gap-2 font-bold">
          <CourseLitLogo className="size-7" />
          <span className="max-md:hidden">CourseLit</span>
        </div>
        <ol
          aria-label="Setup progress"
          className="flex items-center justify-center gap-2 max-md:hidden"
        >
          {groups.map((group, index) => {
            const done = index < stepIndex;
            const now = index === stepIndex;
            const skipped =
              (group.key === "email" && data.email.skipped) ||
              (group.key === "offer" && !data.offer && index < stepIndex);
            return (
              <li
                key={group.key}
                aria-current={now ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-[13px] text-muted-foreground",
                  now && "font-semibold text-foreground",
                  done && "text-foreground",
                  skipped && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold",
                    done &&
                      "bg-[oklch(0.56_0.13_150/0.12)] text-[oklch(0.44_0.12_150)]",
                    now && "bg-primary text-primary-foreground",
                  )}
                >
                  {done ? (
                    <Check aria-hidden className="size-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn("max-[1180px]:hidden", now && "max-[1180px]:inline")}
                >
                  {group.label}
                </span>
                {index < groups.length - 1 ? (
                  <span
                    aria-hidden
                    className="ml-1 h-px w-4 bg-border max-[1180px]:w-2"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3">
          {hasSchool ? (
            <span
              role="status"
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground"
            >
              {saveState === "saving" ? (
                <Spinner className="size-3.5" />
              ) : (
                <Check aria-hidden className="size-3.5" />
              )}
              <span className="max-md:hidden">{savedLabel}</span>
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void finishLater()}
          >
            Finish later
          </Button>
        </div>
      </header>

      <div
        aria-hidden
        className="flex flex-col gap-1.5 border-b border-border bg-card px-4 py-3 md:hidden"
      >
        <div className="flex justify-between text-[13px]">
          <b className="font-semibold">{mobileLabel}</b>
          <span className="text-muted-foreground">
            Step {stepIndex + 1} of {groups.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <i
            className="block h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.round(((stepIndex + 1) / groups.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(420px,1fr)_minmax(0,1fr)]">
        <section
          aria-label="Setup"
          className="flex min-h-0 flex-col border-r border-border"
        >
          <div
            ref={formRef}
            className="mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col gap-6 overflow-auto px-12 pb-8 pt-12 max-[1180px]:px-9 max-[1180px]:pt-10 max-md:gap-5 max-md:px-4 max-md:pb-6 max-md:pt-6"
          >
            {failed ? (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-[var(--radius)] bg-[var(--destructive-soft)] px-3.5 py-3 text-sm"
              >
                <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <b className="font-semibold">We couldn&apos;t save this step.</b>{" "}
                  Check your connection and try again. Nothing you entered is lost.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const retry = failed.retry;
                    setFailed(null);
                    retry();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {form}
          </div>
          {showFooter ? (
            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-card px-12 py-3.5 max-[1180px]:px-9 max-md:px-4 max-md:py-3">
              {canBack || (inCreating && !createReady) ? (
                <Button type="button" variant="ghost" onClick={back} disabled={saving}>
                  <ChevronLeft aria-hidden className="size-4" />
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="hidden max-md:inline-flex"
                onClick={() => setPrevOpen(true)}
              >
                <Eye aria-hidden className="size-4" />
                Preview
              </Button>
              <span className="flex-1 max-md:hidden" />
              {canSkip ? (
                <Button type="button" variant="ghost" onClick={skip}>
                  Skip for now
                </Button>
              ) : null}
              {isLast ? (
                <>
                  <Button type="button" variant="outline" asChild>
                    <a href={learnerUrl} target="_blank" rel="noreferrer">
                      See it as a learner
                    </a>
                  </Button>
                  <Button
                    type="button"
                    className="max-md:order-3 max-md:flex-[1_1_100%]"
                    disabled={saving}
                    onClick={() => void goToDashboard()}
                  >
                    {saving ? <Spinner /> : null}
                    Go to your dashboard
                    <ArrowRight aria-hidden className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="min-w-40 max-md:order-3 max-md:flex-[1_1_100%]"
                  disabled={nextDisabled}
                  onClick={onNext}
                >
                  {nextBusy ? <Spinner /> : null}
                  {nextLabel}
                  {nextBusy ? null : <ArrowRight aria-hidden className="size-4" />}
                </Button>
              )}
            </footer>
          ) : null}
        </section>

        <PreviewFrame
          title={previewTitle}
          badge={previewBadge}
          open={prevOpen}
          onClose={() => setPrevOpen(false)}
        >
          {previewBody}
        </PreviewFrame>
      </div>

      <ResumeDialog
        open={showResume}
        schoolName={schoolName}
        rows={resumeRows(
          resumeStep,
          { firstRun, hosted },
          data,
          accountName,
          trialEndsAt,
        )}
        onContinue={() => {
          markResumePrompted();
          setShowResume(false);
        }}
        onDashboard={() => {
          markResumePrompted();
          window.location.assign("/");
        }}
        onNeverAgain={async () => {
          markResumePrompted();
          const current = schoolRef.current;
          if (current) {
            await patchOnboarding(current.id, { resumePromptHidden: true }).catch(
              () => undefined,
            );
          }
          window.location.assign("/");
        }}
      />
    </div>
  );
}
