"use client";

import type { MediaRef } from "@courselit/api-contract";
import { COURSELIT_PERMISSIONS } from "@courselit/api-contract/team-permissions";
import {
  type MediaUploadPurpose,
  uploadCourseLitMedia,
} from "@/lib/course-media-uploader";
import {
  type BillingInterval,
  formatMailingAddress,
  isPaidOffer,
  type LessonKind,
  type OfferRefs,
  offerTitle,
  type PlanId,
  type ServerStep,
  type UploadedFile,
  uploadedToMediaRef,
  type WizardData,
} from "./flow";

export class ApiError extends Error {
  status: number;
  reason: string | null;
  constructor(message: string, status: number, reason: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reason = reason;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  schoolId?: string | null;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.schoolId) headers["x-school-id"] = options.schoolId;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string;
      details?: { reason?: string };
    } | null;
    throw new ApiError(
      data?.message ?? "Something went wrong. Please try again.",
      response.status,
      data?.details?.reason ?? null,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json().catch(() => undefined)) as T;
}

// -------------------------------------------------------------------- types

export type BillingCatalog = {
  catalogRevision: number | null;
  currency: string | null;
  checkoutAvailable: boolean;
  offers: Array<{
    catalogKey: string;
    plan: PlanId;
    interval: BillingInterval;
    currency: string;
    amountMinor: number;
    trialDays: number;
  }>;
};

/** OSS = no catalog and no checkout. Everything else is the hosted service. */
export function isHostedCatalog(catalog: BillingCatalog | null): boolean {
  if (!catalog) return true;
  return !(catalog.catalogRevision === null && catalog.checkoutAvailable === false);
}

export type SchoolOnboarding = {
  status: "in_progress" | "complete";
  step: ServerStep;
  draft: Record<string, unknown>;
  checklistHidden: boolean;
  resumePromptHidden: boolean;
  checklist: Array<{ key: string; done: boolean }>;
  billing: {
    required: boolean;
    entitled: boolean;
    paid: boolean;
    trialEndsAt: string | null;
  };
  updatedAt: string;
};

export type CreatedSchool = {
  id: string;
  name: string;
  subdomain: string;
  storefrontHost?: string | null;
  storefrontOrigin?: string | null;
};

export type SubdomainCheck = {
  subdomain: string;
  available: boolean;
  reason: "invalid" | "taken" | null;
  suggestions: string[];
};

export type AiConnection = {
  id: string;
  name: string;
  connectedAt: string;
  lastUsedAt: string | null;
};

// ---------------------------------------------------------------- operations

export const fetchBillingCatalog = () =>
  request<BillingCatalog>("/api/v1/billing/catalog");

export const checkSubdomain = (subdomain: string) =>
  request<SubdomainCheck>(
    `/api/v1/schools/subdomain-availability?subdomain=${encodeURIComponent(subdomain)}`,
  );

export const createSchool = (body: {
  name: string;
  subdomain: string;
  locale: string;
  currency: string;
}) => request<CreatedSchool>("/api/v1/schools", { method: "POST", body });

export const selectSchool = (schoolId: string) =>
  request<void>("/api/school/select", { method: "POST", body: { schoolId } });

export const updateAccountName = (name: string) =>
  request<unknown>("/api/auth/update-user", { method: "POST", body: { name } });

export const getOnboarding = (schoolId: string) =>
  request<SchoolOnboarding>("/api/v1/school/onboarding", { schoolId });

export const patchOnboarding = (
  schoolId: string,
  body: {
    status?: "in_progress" | "complete";
    step?: ServerStep;
    draft?: Record<string, unknown>;
    markDone?: string[];
    resumePromptHidden?: boolean;
  },
) =>
  request<SchoolOnboarding>("/api/v1/school/onboarding", {
    method: "PATCH",
    schoolId,
    body,
  });

export const startBillingCheckout = (
  schoolId: string,
  body: { plan: PlanId; interval: BillingInterval; catalogRevision: number },
) =>
  request<{ checkoutUrl: string }>("/api/v1/school/billing/checkout", {
    method: "POST",
    schoolId,
    body,
  });

export const updateBranding = (
  schoolId: string,
  body: {
    title?: string | null;
    subtitle?: string | null;
    logo?: MediaRef | null;
    themeId?: string | null;
  },
) =>
  request<unknown>("/api/v1/school/website/branding", {
    method: "PATCH",
    schoolId,
    body,
  });

export const updateMailingAddress = (schoolId: string, mailingAddress: string) =>
  request<unknown>("/api/v1/school/mails/settings", {
    method: "PATCH",
    schoolId,
    body: { mailingAddress },
  });

export const listAiConnections = () =>
  request<{ mcpUrl: string; items: AiConnection[] }>("/api/v1/ai-connections");

export const createSchoolApiKey = (schoolId: string, name: string) =>
  request<{ key: string }>("/api/v1/api-keys", {
    method: "POST",
    schoolId,
    body: { name, permissions: [...COURSELIT_PERMISSIONS] },
  });

export type ProductSummary = {
  id: string;
  kind: "course" | "download";
  status: "draft" | "published";
  slug: string;
  title: string;
  description: string;
  featuredImage: MediaRef | null;
  createdAt: string;
};

export const listProducts = (schoolId: string) =>
  request<{ items: ProductSummary[] }>("/api/v1/products?limit=50", { schoolId });

export type ProductDetail = ProductSummary & {
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{ id: string; title: string; type: string; status: string }>;
};

export const getProduct = (schoolId: string, productId: string) =>
  request<ProductDetail>(`/api/v1/products/${encodeURIComponent(productId)}`, {
    schoolId,
  });

export type CommunitySummary = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  enabled: boolean;
};

export const getCommunity = (schoolId: string) =>
  request<CommunitySummary>("/api/v1/community", { schoolId });

// ------------------------------------------------------------------- uploads

export type UploadTarget = {
  purpose: MediaUploadPurpose;
  accessPolicy: "public" | "private";
};

export const UPLOAD_TARGETS = {
  cover: { purpose: "product_artwork", accessPolicy: "public" },
  video: { purpose: "lesson_media", accessPolicy: "private" },
  file: { purpose: "downloadable_file", accessPolicy: "private" },
  logo: { purpose: "school_branding", accessPolicy: "public" },
} as const satisfies Record<string, UploadTarget>;

/** Cover and logo go through the image dialog, which enforces its own types. */
const ACCEPTED_TYPES: Partial<
  Record<keyof typeof UPLOAD_TARGETS, { types: string[]; hint: string }>
> = {
  video: { types: ["video/*"], hint: "Choose a video file." },
};

export function assertAcceptedFile(
  slot: keyof typeof UPLOAD_TARGETS,
  file: File,
): void {
  const rule = ACCEPTED_TYPES[slot];
  if (!rule) return;
  const ok = rule.types.some((type) =>
    type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type,
  );
  if (!ok) throw new Error(`That file type isn't supported. ${rule.hint}`);
}

export function newUploadingFile(id: string, file: File): UploadedFile {
  return {
    id,
    name: file.name,
    size: file.size,
    mediaId: null,
    url: null,
    thumbnailUrl: null,
    mimeType: file.type || "application/octet-stream",
    status: "uploading",
    pct: 0,
  };
}

/** Uploads through the standard media pipeline; only real uploads enter the library. */
export async function uploadWizardFile(
  schoolId: string,
  target: UploadTarget,
  file: File,
  id: string,
  onProgress: (pct: number) => void,
): Promise<UploadedFile> {
  const media = await uploadCourseLitMedia(
    { schoolId, purpose: target.purpose, accessPolicy: target.accessPolicy },
    file,
    { fileName: file.name, mimeType: file.type || undefined },
    { onProgress },
  );
  return {
    id,
    name: media.fileName || file.name,
    size: media.byteSize || file.size,
    mediaId: media.id,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    mimeType: media.mimeType || file.type || "application/octet-stream",
    status: "done",
    pct: 100,
  };
}

// --------------------------------------------------------------- offer saving

type Plan = { id: string; isDefault: boolean; kind: string; status: string };

function textDoc(body: string): Record<string, unknown> {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

const FREE_PLAN = {
  name: "Free",
  description: "",
  type: "free",
  kind: "free",
} as const;

async function ensureFreePlan(
  schoolId: string,
  scope: { kind: "product" | "community"; id: string },
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
) {
  if (refs.planId) return;
  const base =
    scope.kind === "product"
      ? `/api/v1/products/${encodeURIComponent(scope.id)}/plans`
      : `/api/v1/communities/${encodeURIComponent(scope.id)}/plans`;
  const plan = await request<Plan>(base, { method: "POST", schoolId, body: FREE_PLAN });
  if (!plan.isDefault) {
    await request(
      scope.kind === "product"
        ? `/api/v1/plans/${encodeURIComponent(plan.id)}/default`
        : `/api/v1/community-plans/${encodeURIComponent(plan.id)}/default`,
      { method: "POST", schoolId, body: {} },
    );
  }
  refs.planId = plan.id;
  emit({ ...refs });
}

/** Drops a free plan the creator no longer wants once they switch to Paid. */
async function dropFreePlan(
  schoolId: string,
  scope: "product" | "community",
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
) {
  if (!refs.planId) return;
  await request(
    scope === "product"
      ? `/api/v1/plans/${encodeURIComponent(refs.planId)}/archive`
      : `/api/v1/community-plans/${encodeURIComponent(refs.planId)}/archive`,
    { method: "POST", schoolId, body: {} },
  ).catch(() => undefined);
  refs.planId = undefined;
  emit({ ...refs });
}

async function ensureSection(
  schoolId: string,
  productId: string,
  title: string,
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
): Promise<string> {
  if (refs.sectionId) return refs.sectionId;
  const section = await request<{ id: string }>(
    `/api/v1/products/${encodeURIComponent(productId)}/sections`,
    { method: "POST", schoolId, body: { title } },
  );
  refs.sectionId = section.id;
  emit({ ...refs });
  return section.id;
}

async function saveCourseLesson(
  schoolId: string,
  productId: string,
  data: WizardData,
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
) {
  const { lessonKind, lessonTitle, lessonBody, video } = data.course;
  const wantsLesson =
    lessonKind === "video" ? Boolean(video?.mediaId) : Boolean(lessonBody.trim());
  const title = lessonTitle.trim() || "First lesson";

  if (refs.lessonId && (!wantsLesson || refs.lessonType !== lessonKind)) {
    await request(`/api/v1/lessons/${encodeURIComponent(refs.lessonId)}`, {
      method: "DELETE",
      schoolId,
    }).catch(() => undefined);
    refs.lessonId = undefined;
    refs.lessonType = undefined;
    emit({ ...refs });
  }
  if (!wantsLesson && !lessonTitle.trim()) return;

  const sectionId = await ensureSection(
    schoolId,
    productId,
    "Getting started",
    refs,
    emit,
  );
  const content = lessonKind === "video" ? { value: "" } : textDoc(lessonBody);
  const body = {
    title,
    content,
    mediaId: lessonKind === "video" ? (video?.mediaId ?? null) : null,
    sectionId,
    status: wantsLesson ? ("published" as const) : ("draft" as const),
  };
  if (refs.lessonId) {
    await request(`/api/v1/lessons/${encodeURIComponent(refs.lessonId)}`, {
      method: "PATCH",
      schoolId,
      body,
    });
    return;
  }
  const lesson = await request<{ id: string }>(
    `/api/v1/products/${encodeURIComponent(productId)}/lessons`,
    { method: "POST", schoolId, body: { ...body, type: lessonKind as LessonKind } },
  );
  refs.lessonId = lesson.id;
  refs.lessonType = lessonKind;
  emit({ ...refs });
}

async function saveDownloadFiles(
  schoolId: string,
  productId: string,
  data: WizardData,
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
) {
  const lessons = { ...(refs.fileLessons ?? {}) };
  refs.fileLessons = lessons;
  const current = data.download.files.filter(
    (file) => file.status === "done" && file.mediaId,
  );
  const currentIds = new Set(current.map((file) => file.id));
  for (const [fileId, lessonId] of Object.entries(lessons)) {
    if (currentIds.has(fileId)) continue;
    await request(`/api/v1/lessons/${encodeURIComponent(lessonId)}`, {
      method: "DELETE",
      schoolId,
    }).catch(() => undefined);
    delete lessons[fileId];
    emit({ ...refs, fileLessons: { ...lessons } });
  }
  for (const file of current) {
    if (lessons[file.id]) continue;
    const sectionId = await ensureSection(schoolId, productId, "Files", refs, emit);
    const lesson = await request<{ id: string }>(
      `/api/v1/products/${encodeURIComponent(productId)}/lessons`,
      {
        method: "POST",
        schoolId,
        body: {
          title: file.name,
          type: "file",
          content: { value: "" },
          mediaId: file.mediaId,
          downloadable: true,
          sectionId,
          status: "published",
        },
      },
    );
    lessons[file.id] = lesson.id;
    emit({ ...refs, fileLessons: { ...lessons } });
  }
}

/**
 * Creates or updates the first offer through the existing REST operations.
 * Re-running it updates what it created before, so Retry and re-saving are safe.
 * A Paid offer is saved as a hidden draft: no plan, not published.
 * Returns the refs; `emit` receives them after each created object so a partial
 * failure never loses an id.
 */
export async function saveOffer(
  schoolId: string,
  data: WizardData,
  emit: (refs: OfferRefs) => void,
): Promise<OfferRefs> {
  const refs: OfferRefs = {
    ...data.refs,
    fileLessons: { ...(data.refs.fileLessons ?? {}) },
  };
  const paid = isPaidOffer(data);

  if (data.offer === "community") {
    const community = await getCommunity(schoolId);
    refs.communityId = community.id;
    await request(`/api/v1/communities/${encodeURIComponent(community.id)}`, {
      method: "PATCH",
      schoolId,
      body: {
        name: data.community.name.trim(),
        description: data.community.description.trim(),
        banner: data.community.welcome.trim(),
        autoAcceptMembers: data.community.join === "any",
        joiningReasonText:
          data.community.join === "request" ? data.community.question.trim() : "",
      },
    });
    emit({ ...refs });
    if (paid) await dropFreePlan(schoolId, "community", refs, emit);
    else
      await ensureFreePlan(
        schoolId,
        { kind: "community", id: community.id },
        refs,
        emit,
      );
    return refs;
  }

  if (data.offer === "course" || data.offer === "download") {
    const title = offerTitle(data);
    const description =
      data.offer === "course"
        ? data.course.description.trim()
        : data.download.description.trim();
    const kind = data.offer;
    let productId = refs.productId;
    if (!productId) {
      const product = await request<ProductSummary>("/api/v1/products", {
        method: "POST",
        schoolId,
        body: { kind, title, description },
      });
      productId = product.id;
      refs.productId = product.id;
      refs.productSlug = product.slug;
      emit({ ...refs });
    }
    const cover =
      data.offer === "course" && data.course.cover
        ? uploadedToMediaRef(data.course.cover)
        : null;
    const updated = await request<ProductSummary>(
      `/api/v1/products/${encodeURIComponent(productId)}`,
      {
        method: "PATCH",
        schoolId,
        body: {
          title,
          description,
          featuredImage: cover,
          ...(data.offer === "download" ? { leadMagnet: !paid } : {}),
        },
      },
    );
    refs.productSlug = updated?.slug ?? refs.productSlug;
    emit({ ...refs });

    if (data.offer === "course")
      await saveCourseLesson(schoolId, productId, data, refs, emit);
    else await saveDownloadFiles(schoolId, productId, data, refs, emit);

    if (paid) await dropFreePlan(schoolId, "product", refs, emit);
    else await ensureFreePlan(schoolId, { kind: "product", id: productId }, refs, emit);
    return refs;
  }
  return refs;
}

/** "Going live": a free offer is published, a Paid one stays a hidden draft. */
export async function publishOffer(schoolId: string, data: WizardData): Promise<void> {
  if (!data.offer || isPaidOffer(data)) return;
  if (data.offer === "community" && data.refs.communityId) {
    await request(`/api/v1/communities/${encodeURIComponent(data.refs.communityId)}`, {
      method: "PATCH",
      schoolId,
      body: { enabled: true },
    });
  } else if (data.refs.productId) {
    const productId = data.refs.productId;
    // A product made by the creator's assistant may have no plan yet; publishing needs one.
    const plans = await request<{ items?: Plan[] }>(
      `/api/v1/products/${encodeURIComponent(productId)}/plans`,
      { schoolId },
    ).catch(() => ({ items: undefined }));
    if (plans.items && !plans.items.some((plan) => plan.status === "active")) {
      await ensureFreePlan(
        schoolId,
        { kind: "product", id: productId },
        {},
        () => undefined,
      );
    }
    await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      schoolId,
      body: { status: "published", privacy: "public" },
    });
  }
}

export async function applyBranding(
  schoolId: string,
  data: WizardData,
  schoolName: string,
): Promise<void> {
  await updateBranding(schoolId, {
    title: schoolName,
    subtitle: data.brand.tagline.trim() || null,
    themeId: data.brand.themeId,
    logo: data.brand.logo ? uploadedToMediaRef(data.brand.logo) : null,
  });
}

export async function applyEmail(schoolId: string, data: WizardData): Promise<void> {
  await updateMailingAddress(schoolId, formatMailingAddress(data.email));
}

/** Adopts a product the creator's AI assistant made as the first offer. */
export async function adoptProduct(
  schoolId: string,
  product: { id: string; slug: string },
  refs: OfferRefs,
  emit: (refs: OfferRefs) => void,
): Promise<OfferRefs> {
  const next: OfferRefs = {
    ...refs,
    productId: product.id,
    productSlug: product.slug,
    sectionId: undefined,
    lessonId: undefined,
    lessonType: undefined,
    fileLessons: {},
    planId: undefined,
  };
  emit({ ...next });
  await ensureFreePlan(schoolId, { kind: "product", id: product.id }, next, emit);
  return next;
}
