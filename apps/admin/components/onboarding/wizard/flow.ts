/**
 * Pure logic for the setup wizard: step flow, validation, address rules,
 * draft (de)serialization and copy helpers. No React, no fetch, so it can be
 * unit tested in isolation.
 */
import type { MediaRef } from "@courselit/api-contract";

export type WizardStep =
  | "about"
  | "school"
  | "offer"
  | "build"
  | "brand"
  | "email"
  | "plan"
  | "live";

/** The steps the API stores. `about` happens before a school exists. */
export type ServerStep = Exclude<WizardStep, "about">;

export type OfferKind = "course" | "community" | "download";
export type PriceMode = "free" | "paid";
export type LessonKind = "text" | "video";
export type JoinMode = "any" | "request";
export type PlanId = "pro" | "business";
export type BillingInterval = "month" | "year";

export type FlowEnv = {
  /** The user has no school yet, so the wizard starts with "About you". */
  firstRun: boolean;
  /** Hosted CourseLit (a plan is needed to go live). */
  hosted: boolean;
  /** An offer was chosen (the "Set up the offer" step exists). */
  hasOffer: boolean;
};

export function buildFlow(env: FlowEnv): WizardStep[] {
  const flow: WizardStep[] = [];
  if (env.firstRun) flow.push("about");
  flow.push("school", "offer");
  if (env.hasOffer) flow.push("build");
  flow.push("brand", "email");
  if (env.hosted) flow.push("plan");
  flow.push("live");
  return flow;
}

export function nextStep(flow: WizardStep[], step: WizardStep): WizardStep {
  const index = flow.indexOf(step);
  if (index < 0) return flow[0];
  return flow[Math.min(index + 1, flow.length - 1)];
}

export function previousStep(flow: WizardStep[], step: WizardStep): WizardStep {
  const index = flow.indexOf(step);
  if (index <= 0) return flow[0];
  return flow[index - 1];
}

export type StepperGroup = {
  key: "you" | "school" | "offer" | "site" | "email" | "plan" | "live";
  label: string;
  steps: WizardStep[];
};

export function stepperGroups(
  env: Pick<FlowEnv, "firstRun" | "hosted">,
): StepperGroup[] {
  const groups: Array<StepperGroup & { show: boolean }> = [
    { key: "you", label: "You", steps: ["about"], show: env.firstRun },
    { key: "school", label: "School", steps: ["school"], show: true },
    { key: "offer", label: "First offer", steps: ["offer", "build"], show: true },
    { key: "site", label: "Your site", steps: ["brand"], show: true },
    { key: "email", label: "Email", steps: ["email"], show: true },
    { key: "plan", label: "Plan", steps: ["plan"], show: env.hosted },
    { key: "live", label: "Live", steps: ["live"], show: true },
  ];
  return groups.filter((group) => group.show).map(({ show: _show, ...rest }) => rest);
}

export function stepperIndex(groups: StepperGroup[], step: WizardStep): number {
  return Math.max(
    0,
    groups.findIndex((group) => group.steps.includes(step)),
  );
}

/** The step to store on the server. The pre-school "about" step is never stored. */
export function toServerStep(step: WizardStep): ServerStep {
  return step === "about" ? "school" : step;
}

/**
 * Where a stored step resumes in the current flow. A stored `build` without an
 * offer falls forward to `brand`; a stored `plan` on a non-hosted deployment
 * falls forward to `live`.
 */
export function resolveResumeStep(
  stored: ServerStep,
  env: Pick<FlowEnv, "hosted" | "hasOffer">,
): WizardStep {
  if (stored === "build" && !env.hasOffer) return "brand";
  if (stored === "plan" && !env.hosted) return "live";
  // A school that already exists never resumes on the school-name form.
  if (stored === "school") return "offer";
  return stored;
}

// ---------------------------------------------------------------- addresses

/** 3 to 63 lowercase letters, digits and single hyphens, no edge hyphens. */
export const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-)){1,61}[a-z0-9]$/;

export function isValidSubdomain(value: string): boolean {
  return SUBDOMAIN_RE.test(value);
}

export function slugify(value: string, max = 63): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** What the subdomain input lets a person type: lowercase letters, digits, hyphens. */
export function sanitizeSubdomainInput(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);
}

export type SubdomainStatus = "idle" | "checking" | "ok" | "taken" | "invalid";

/** Whether a check result makes the school form submittable. */
export function canSubmitSubdomain(status: SubdomainStatus, value: string): boolean {
  return status === "ok" && isValidSubdomain(value);
}

/** Example custom domain for the "Have your own domain?" hint. */
export function domainExample(subdomain: string): string {
  return (subdomain || "yourschool").replace(/-/g, "");
}

// ------------------------------------------------------------- locale prefill

export const CURRENCIES = [
  { value: "USD", label: "USD, US dollar", symbol: "$" },
  { value: "EUR", label: "EUR, Euro", symbol: "€" },
  { value: "GBP", label: "GBP, British pound", symbol: "£" },
  { value: "INR", label: "INR, Indian rupee", symbol: "₹" },
  { value: "AUD", label: "AUD, Australian dollar", symbol: "A$" },
  { value: "CAD", label: "CAD, Canadian dollar", symbol: "C$" },
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "hi", label: "हिन्दी" },
  { value: "pt", label: "Português" },
] as const;

export const COUNTRIES = [
  { value: "GB", label: "United Kingdom", currency: "GBP" },
  { value: "US", label: "United States", currency: "USD" },
  { value: "IN", label: "India", currency: "INR" },
  { value: "CA", label: "Canada", currency: "CAD" },
  { value: "AU", label: "Australia", currency: "AUD" },
  { value: "DE", label: "Germany", currency: "EUR" },
] as const;

const EURO_REGIONS = new Set([
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "PT",
  "IE",
  "AT",
  "BE",
  "FI",
  "GR",
]);
const REGION_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  IN: "INR",
  AU: "AUD",
  CA: "CAD",
};

export function parseLocaleTag(tag: string | undefined | null): {
  language: string;
  region: string | null;
} {
  const parts = String(tag ?? "en-US").split(/[-_]/);
  const language = (parts[0] || "en").toLowerCase();
  const region = parts.find((part, index) => index > 0 && /^[A-Za-z]{2}$/.test(part));
  return { language, region: region ? region.toUpperCase() : null };
}

/** Currency and language prefilled from the browser, limited to the supported lists. */
export function detectLocaleDefaults(tag: string | undefined | null): {
  currency: string;
  language: string;
  country: string;
} {
  const { language, region } = parseLocaleTag(tag);
  const supportedLanguage = LANGUAGES.some((item) => item.value === language)
    ? language
    : "en";
  const currency = region
    ? EURO_REGIONS.has(region)
      ? "EUR"
      : (REGION_CURRENCY[region] ?? "USD")
    : "USD";
  const country = COUNTRIES.some((item) => item.value === region)
    ? (region as string)
    : "GB";
  return {
    currency: CURRENCIES.some((item) => item.value === currency) ? currency : "USD",
    language: supportedLanguage,
    country,
  };
}

// -------------------------------------------------------------------- uploads

export type UploadedFile = {
  /** Client-side id, stable across the draft. */
  id: string;
  name: string;
  size: number;
  mediaId: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  mimeType: string;
  status: "uploading" | "done" | "error";
  pct: number;
  error?: string;
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function uploadedToMediaRef(file: UploadedFile): MediaRef | null {
  if (!file.url || !file.mediaId) return null;
  return {
    mediaId: file.mediaId,
    url: file.url,
    ...(file.thumbnailUrl ? { thumbnailUrl: file.thumbnailUrl } : {}),
    fileName: file.name,
    mimeType: file.mimeType,
    byteSize: file.size,
  };
}

// ----------------------------------------------------------------- wizard data

export type CourseDraft = {
  title: string;
  description: string;
  cover: UploadedFile | null;
  lessonTitle: string;
  lessonKind: LessonKind;
  lessonBody: string;
  video: UploadedFile | null;
};

export type CommunityDraft = {
  name: string;
  description: string;
  join: JoinMode;
  question: string;
  welcome: string;
};

export type DownloadDraft = {
  title: string;
  description: string;
  files: UploadedFile[];
};

export type BrandDraft = {
  themeId: string;
  tagline: string;
  logo: UploadedFile | null;
};

export type EmailDraft = {
  line1: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  sender: string;
  skipped: boolean;
};

/** Server-side ids of what the wizard already created, so re-saving updates in place. */
export type OfferRefs = {
  productId?: string;
  productSlug?: string;
  communityId?: string;
  sectionId?: string;
  lessonId?: string;
  lessonType?: LessonKind;
  /** Client file id -> created file lesson id (download products). */
  fileLessons?: Record<string, string>;
  planId?: string;
  emailSaved?: boolean;
};

export type WizardData = {
  school: string;
  subdomain: string;
  subdomainTouched: boolean;
  currency: string;
  locale: string;
  offer: OfferKind | null;
  price: PriceMode;
  course: CourseDraft;
  community: CommunityDraft;
  download: DownloadDraft;
  brand: BrandDraft;
  email: EmailDraft;
  plan: { plan: PlanId; interval: BillingInterval };
  refs: OfferRefs;
};

export const DEFAULT_COMMUNITY_QUESTION = "What do you want to make?";
export const DEFAULT_THEME_ID = "classic";

export function emptyWizardData(defaults?: {
  currency?: string;
  language?: string;
  country?: string;
}): WizardData {
  return {
    school: "",
    subdomain: "",
    subdomainTouched: false,
    currency: defaults?.currency ?? "USD",
    locale: defaults?.language ?? "en",
    offer: null,
    price: "free",
    course: {
      title: "",
      description: "",
      cover: null,
      lessonTitle: "",
      lessonKind: "text",
      lessonBody: "",
      video: null,
    },
    community: {
      name: "",
      description: "",
      join: "any",
      question: DEFAULT_COMMUNITY_QUESTION,
      welcome: "",
    },
    download: { title: "", description: "", files: [] },
    brand: { themeId: DEFAULT_THEME_ID, tagline: "", logo: null },
    email: {
      line1: "",
      city: "",
      region: "",
      postal: "",
      country: defaults?.country ?? "GB",
      sender: "",
      skipped: false,
    },
    plan: { plan: "pro", interval: "month" },
    refs: {},
  };
}

// ------------------------------------------------------------------ validation

export type FieldErrors = Partial<
  Record<
    | "name"
    | "school"
    | "subdomain"
    | "title"
    | "question"
    | "files"
    | "address"
    | "postal",
    string
  >
>;

export const ERROR_COPY = {
  name: "Add your name so learners know who's teaching.",
  school: "Give your school a name.",
  courseTitle: "Give your course a title.",
  communityName: "Give your community a name.",
  question: "Add the question applicants answer.",
  downloadTitle: "Give your download a title.",
  files: "Add at least one file.",
  address: "Add the street address.",
  postal: "Add a postal code.",
  subdomain: "Use 3 to 63 lowercase letters, numbers and single hyphens.",
  subdomainTaken: "That address is taken. Pick another.",
} as const;

const blank = (value: string | null | undefined) => !String(value ?? "").trim();

export function validateAbout(name: string): FieldErrors {
  return blank(name) ? { name: ERROR_COPY.name } : {};
}

export function validateSchool(
  data: Pick<WizardData, "school" | "subdomain">,
  availability: SubdomainStatus,
): FieldErrors {
  const errors: FieldErrors = {};
  if (blank(data.school)) errors.school = ERROR_COPY.school;
  if (!isValidSubdomain(data.subdomain)) errors.subdomain = ERROR_COPY.subdomain;
  else if (availability === "taken") errors.subdomain = ERROR_COPY.subdomainTaken;
  return errors;
}

export function validateBuild(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};
  if (data.offer === "course") {
    if (blank(data.course.title)) errors.title = ERROR_COPY.courseTitle;
  } else if (data.offer === "community") {
    if (blank(data.community.name)) errors.title = ERROR_COPY.communityName;
    if (data.community.join === "request" && blank(data.community.question)) {
      errors.question = ERROR_COPY.question;
    }
  } else if (data.offer === "download") {
    if (blank(data.download.title)) errors.title = ERROR_COPY.downloadTitle;
    if (!data.download.files.some((file) => file.status === "done")) {
      errors.files = ERROR_COPY.files;
    }
  }
  return errors;
}

export function validateEmail(email: EmailDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (blank(email.line1)) errors.address = ERROR_COPY.address;
  if (blank(email.postal)) errors.postal = ERROR_COPY.postal;
  return errors;
}

export function validateStep(
  step: WizardStep,
  data: WizardData,
  extras: { name: string; availability: SubdomainStatus },
): FieldErrors {
  switch (step) {
    case "about":
      return validateAbout(extras.name);
    case "school":
      return validateSchool(data, extras.availability);
    case "build":
      return validateBuild(data);
    case "email":
      return validateEmail(data.email);
    default:
      return {};
  }
}

/** True while a file the form depends on is still uploading. */
export function hasUploadsInFlight(data: WizardData): boolean {
  const files: Array<UploadedFile | null> = [
    data.course.cover,
    data.course.video,
    data.brand.logo,
    ...data.download.files,
  ];
  return files.some((file) => file?.status === "uploading");
}

// --------------------------------------------------------------- offer helpers

export function offerTitle(data: WizardData): string {
  if (data.offer === "course") return data.course.title.trim();
  if (data.offer === "community") return data.community.name.trim();
  if (data.offer === "download") return data.download.title.trim();
  return "";
}

export function offerTitleOr(data: WizardData): string {
  return (
    offerTitle(data) ||
    (data.offer === "course"
      ? "Your course"
      : data.offer === "community"
        ? "Your community"
        : data.offer === "download"
          ? "Your download"
          : "")
  );
}

export function offerDescription(data: WizardData): string {
  if (data.offer === "course") return data.course.description.trim();
  if (data.offer === "community") return data.community.description.trim();
  if (data.offer === "download") return data.download.description.trim();
  return "";
}

export function isPaidOffer(data: Pick<WizardData, "offer" | "price">): boolean {
  return Boolean(data.offer) && data.price === "paid";
}

/** Community pricing is chosen on the community form; courses and downloads on their own. */
export function offerSharePath(data: WizardData): string {
  if (data.offer === "community") return "/join";
  if (data.offer === "course" || data.offer === "download") {
    const slug =
      data.refs.productSlug ||
      slugify(offerTitle(data), 200) ||
      (data.offer === "course" ? "your-course" : "your-download");
    return `/p/${slug}`;
  }
  return "";
}

export function shareLabel(offer: OfferKind | null): string {
  if (offer === "course") return "Share your course";
  if (offer === "community") return "Share your community's join page";
  return "Share your download";
}

export function buildCopy(offer: OfferKind | null): {
  eyebrow: string;
  title: string;
  sub: string;
} {
  switch (offer) {
    case "course":
      return {
        eyebrow: "Your first course",
        title: "Set up your course",
        sub: "Add the basics and one lesson. You can add more lessons later.",
      };
    case "community":
      return {
        eyebrow: "Your community",
        title: "Set up your community",
        sub: "Decide who can join and what it costs. You can add spaces later.",
      };
    case "download":
      return {
        eyebrow: "Your first download",
        title: "Set up your download",
        sub: "Upload your files and set a price.",
      };
    default:
      return { eyebrow: "", title: "", sub: "" };
  }
}

export function paidNoteKind(offer: OfferKind | null): string {
  return offer === "community" ? "membership plan" : "price";
}

export function liveSubtitle(data: WizardData): string {
  const title = offerTitleOr(data);
  if (!data.offer) {
    return "Your site is up. Add your first course, community or download from the dashboard.";
  }
  if (isPaidOffer(data)) {
    return `Your site is up. ${title} appears once you connect payments and add a price.`;
  }
  const verb =
    data.offer === "course" ? "enrol in" : data.offer === "community" ? "join" : "get";
  return `Learners can visit your site and ${verb} ${title} now.`;
}

export function laterItems(data: WizardData): string[] {
  const items: string[] = [];
  if (isPaidOffer(data)) {
    items.push(`Connect payments and add a price to publish ${offerTitleOr(data)}`);
  }
  if (data.email.skipped) items.push("Add your mailing address to turn on email");
  return items;
}

export function buyCta(data: WizardData): string {
  const paid = isPaidOffer(data);
  if (data.offer === "community") {
    return data.community.join === "request"
      ? "Request to join"
      : paid
        ? "Join"
        : "Join for free";
  }
  if (data.offer === "download") return paid ? "Buy" : "Get it free";
  return paid ? "Enrol" : "Enrol for free";
}

// ------------------------------------------------------------------ AI prompts

export function aiPromptFor(
  offer: OfferKind | null,
  schoolName: string,
  title: string,
): string {
  const school = schoolName.trim() || "your school";
  switch (offer ?? "course") {
    case "community":
      return `Set up the ${school} community: write a short description, create spaces for introductions, questions and sharing work, and draft a welcome post.`;
    case "download":
      return `Create a free download in ${school} called “${title.trim() || "[your guide]"}”, write a description that makes people want it, and set it up as a lead magnet.`;
    default:
      return `Create a course in ${school} called “${title.trim() || "[your topic]"}” for beginners, with 5 sections and 3 lessons each, and draft the first lesson.`;
  }
}

export type AiApp = {
  key: "claude" | "chatgpt" | "cursor" | "other";
  name: string;
  mono: string;
  steps: string[];
};

export const AI_APPS: AiApp[] = [
  {
    key: "claude",
    name: "Claude",
    mono: "Cl",
    steps: [
      "In Claude, open Settings, then Connectors, and add a custom connector.",
      "Paste the CourseLit address below and save.",
      "Sign in with CourseLit when asked.",
    ],
  },
  {
    key: "chatgpt",
    name: "ChatGPT",
    mono: "Ch",
    steps: [
      "In ChatGPT, open Settings, then Connectors, and add a new connector.",
      "Paste the CourseLit address below.",
      "Sign in with CourseLit when asked.",
    ],
  },
  {
    key: "cursor",
    name: "Cursor",
    mono: "Cu",
    steps: [
      "In Cursor, open Settings, then MCP, and add a new server.",
      "Paste the CourseLit address below as the server URL.",
      "Sign in with CourseLit when the browser opens.",
    ],
  },
  {
    key: "other",
    name: "Other",
    mono: "+",
    steps: [
      "In your app, add a remote MCP server.",
      "Paste the CourseLit address below.",
      "Sign in with CourseLit when asked, or use an API key if your app needs one.",
    ],
  },
];

export type AiStatus = "idle" | "waiting" | "connected" | "detected" | "failed";

/** How long to wait for the assistant before offering help. */
export const AI_TIMEOUT_MS = 5 * 60 * 1000;

export function aiStatusAfterPoll(input: {
  current: AiStatus;
  newConnection: boolean;
  newProduct: boolean;
  waitingSince: number | null;
  now: number;
}): AiStatus {
  if (input.current === "detected") return "detected";
  if (input.newProduct) return "detected";
  if (input.newConnection) return "connected";
  if (
    input.current === "waiting" &&
    input.waitingSince !== null &&
    input.now - input.waitingSince >= AI_TIMEOUT_MS
  ) {
    return "failed";
  }
  return input.current;
}

/** Connections that appeared, or were used, since the panel opened. */
export function hasNewConnection(
  baseline: Array<{ id: string; lastUsedAt: string | null }>,
  current: Array<{ id: string; lastUsedAt: string | null; connectedAt?: string }>,
  openedAt: number,
): boolean {
  const known = new Map(baseline.map((item) => [item.id, item.lastUsedAt]));
  return current.some((item) => {
    if (!known.has(item.id)) return true;
    const before = known.get(item.id) ?? null;
    if (item.lastUsedAt && item.lastUsedAt !== before) {
      return new Date(item.lastUsedAt).getTime() >= openedAt - 1000;
    }
    return false;
  });
}

// ----------------------------------------------------------------------- email

export function formatMailingAddress(email: EmailDraft): string {
  const country =
    COUNTRIES.find((item) => item.value === email.country)?.label ?? email.country;
  const cityLine = [email.city.trim(), email.region.trim(), email.postal.trim()]
    .filter(Boolean)
    .join(", ");
  return [email.line1.trim(), cityLine, country].filter(Boolean).join("\n");
}

export function addressPreview(email: EmailDraft): string {
  return (
    [email.line1, email.city, email.postal]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ") || "Your mailing address"
  );
}

// ----------------------------------------------------------------------- draft

/** Transient upload state is never stored: only finished uploads survive a reload. */
function persistFile(file: UploadedFile | null): UploadedFile | null {
  if (file?.status !== "done") return null;
  return { ...file, pct: 100 };
}

export function serializeDraft(data: WizardData): Record<string, unknown> {
  return {
    v: 1,
    school: data.school,
    subdomain: data.subdomain,
    currency: data.currency,
    locale: data.locale,
    offer: data.offer,
    price: data.price,
    course: {
      ...data.course,
      cover: persistFile(data.course.cover),
      video: persistFile(data.course.video),
    },
    community: data.community,
    download: {
      ...data.download,
      files: data.download.files.map(persistFile).filter(Boolean),
    },
    brand: { ...data.brand, logo: persistFile(data.brand.logo) },
    email: data.email,
    plan: data.plan,
    refs: data.refs,
  };
}

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function parseFile(value: unknown): UploadedFile | null {
  const raw = obj(value);
  if (typeof raw.id !== "string" || typeof raw.mediaId !== "string") return null;
  return {
    id: raw.id,
    name: str(raw.name),
    size: typeof raw.size === "number" ? raw.size : 0,
    mediaId: raw.mediaId,
    url: typeof raw.url === "string" ? raw.url : null,
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : null,
    mimeType: str(raw.mimeType, "application/octet-stream"),
    status: "done",
    pct: 100,
  };
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Rebuild wizard data from a stored draft, tolerating missing or malformed parts. */
export function parseDraft(
  draft: unknown,
  defaults?: Parameters<typeof emptyWizardData>[0],
): WizardData {
  const base = emptyWizardData(defaults);
  const raw = obj(draft);
  if (Object.keys(raw).length === 0) return base;
  const course = obj(raw.course);
  const community = obj(raw.community);
  const download = obj(raw.download);
  const brand = obj(raw.brand);
  const email = obj(raw.email);
  const plan = obj(raw.plan);
  const refs = obj(raw.refs);
  const subdomain = str(raw.subdomain);

  return {
    school: str(raw.school),
    subdomain,
    subdomainTouched: Boolean(subdomain),
    currency: str(raw.currency, base.currency),
    locale: str(raw.locale, base.locale),
    offer: ["course", "community", "download"].includes(raw.offer as string)
      ? (raw.offer as OfferKind)
      : null,
    price: oneOf<PriceMode>(raw.price, ["free", "paid"], "free"),
    course: {
      title: str(course.title),
      description: str(course.description),
      cover: parseFile(course.cover),
      lessonTitle: str(course.lessonTitle),
      lessonKind: oneOf<LessonKind>(course.lessonKind, ["text", "video"], "text"),
      lessonBody: str(course.lessonBody),
      video: parseFile(course.video),
    },
    community: {
      name: str(community.name),
      description: str(community.description),
      join: oneOf<JoinMode>(community.join, ["any", "request"], "any"),
      question: str(community.question, DEFAULT_COMMUNITY_QUESTION),
      welcome: str(community.welcome),
    },
    download: {
      title: str(download.title),
      description: str(download.description),
      files: (Array.isArray(download.files) ? download.files : [])
        .map(parseFile)
        .filter((file): file is UploadedFile => file !== null),
    },
    brand: {
      themeId: str(brand.themeId, DEFAULT_THEME_ID) || DEFAULT_THEME_ID,
      tagline: str(brand.tagline).slice(0, 90),
      logo: parseFile(brand.logo),
    },
    email: {
      line1: str(email.line1),
      city: str(email.city),
      region: str(email.region),
      postal: str(email.postal),
      country: str(email.country, base.email.country),
      sender: str(email.sender),
      skipped: email.skipped === true,
    },
    plan: {
      plan: oneOf<PlanId>(plan.plan, ["pro", "business"], "pro"),
      interval: oneOf<BillingInterval>(plan.interval, ["month", "year"], "month"),
    },
    refs: {
      productId: typeof refs.productId === "string" ? refs.productId : undefined,
      productSlug: typeof refs.productSlug === "string" ? refs.productSlug : undefined,
      communityId: typeof refs.communityId === "string" ? refs.communityId : undefined,
      sectionId: typeof refs.sectionId === "string" ? refs.sectionId : undefined,
      lessonId: typeof refs.lessonId === "string" ? refs.lessonId : undefined,
      lessonType:
        refs.lessonType === "video" || refs.lessonType === "text"
          ? refs.lessonType
          : undefined,
      fileLessons: Object.fromEntries(
        Object.entries(obj(refs.fileLessons)).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      planId: typeof refs.planId === "string" ? refs.planId : undefined,
      emailSaved: refs.emailSaved === true,
    },
  };
}

// ---------------------------------------------------------------------- resume

export function resumeRows(
  step: WizardStep,
  env: Pick<FlowEnv, "firstRun" | "hosted">,
  data: WizardData,
  accountName: string,
): Array<{ key: string; name: string; desc: string; done: boolean; next: boolean }> {
  const groups = stepperGroups(env).filter((group) => group.key !== "live");
  const current = stepperIndex(stepperGroups(env), step);
  const fullUrl = `${data.subdomain || "your-school"}`;
  const descriptions: Record<StepperGroup["key"], string> = {
    you: accountName,
    school: fullUrl,
    offer: offerTitle(data) || "Not chosen yet",
    site: "Logo, colour and tagline",
    email: "Mailing address",
    plan: "Choose a CourseLit plan to go live",
    live: "",
  };
  return groups.map((group, index) => ({
    key: group.key,
    name: group.label,
    desc: descriptions[group.key],
    done: index < current,
    next: index === current,
  }));
}

// ------------------------------------------------------------------ site domain

/**
 * The domain school addresses live under. Learned from a school the user
 * already has; otherwise guessed from the admin's own hostname.
 */
export function deriveSiteDomain(
  schools: Array<{ subdomain?: string; storefrontHost?: string | null }>,
  adminHostname: string,
): string {
  for (const school of schools) {
    const host = school.storefrontHost?.toLowerCase();
    const sub = school.subdomain?.toLowerCase();
    if (host && sub && host.startsWith(`${sub}.`)) return host.slice(sub.length + 1);
  }
  const labels = adminHostname.toLowerCase().split(".").filter(Boolean);
  if (labels.length >= 3) return labels.slice(1).join(".");
  return labels.join(".") || "courselit.app";
}
