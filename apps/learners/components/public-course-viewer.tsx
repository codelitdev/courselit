"use client";

import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CourseDiscussions } from "@/components/course-discussions";
import {
  CourseViewerShell,
  courseViewerPath,
} from "@/components/layout/course-viewer-shell";
import {
  type CourseViewerProduct,
  courseViewerHref,
} from "@/components/layout/course-viewer-sidebar";
import {
  type LearnerLesson,
  LessonContent,
  LessonMediaContent,
} from "@/components/lesson-viewer";
import {
  LearnerButton as Button,
  LearnerBadge,
  LearnerCard,
  LearnerCardContent,
  LearnerCardImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerHeader4,
  LearnerSelect,
  LearnerText2,
} from "@/components/themed-page-builder";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type Learner = {
  id: string;
  email: string;
  name: string;
  schoolId: string;
};

type Plan = {
  id: string;
  name: string;
  description: string;
  kind: "free" | "one_time" | "subscription" | "installment";
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  isDefault: boolean;
};

type Product = CourseViewerProduct & {
  slug: string;
  description: string;
  enrolled: boolean;
  status: "draft" | "published";
  leadMagnet: boolean;
  certificate: boolean;
  featuredMedia: {
    canonicalUrl: string;
    thumbnailUrl: string | null;
    fileName: string;
    altText: string;
  } | null;
  plans: Plan[];
};

function hasLessonContent(lesson: LearnerLesson): boolean {
  return Boolean(
    lesson.mediaId || (lesson.content && Object.keys(lesson.content).length > 0),
  );
}

function parseProductDescription(value: string): TextEditorContent | null {
  try {
    const parsed = JSON.parse(value) as TextEditorContent;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) {
      return parsed;
    }
  } catch {
    // Descriptions created before rich-text support are plain strings.
  }
  return null;
}

function ProductDescription({
  value,
  content,
}: {
  value: string;
  content: TextEditorContent | null;
}) {
  const theme = useSchoolThemeStyle();
  if (!value) return null;
  if (content) {
    return <TextRenderer json={content} theme={theme} className="lesson-rich-text" />;
  }
  return (
    <LearnerText2 className="whitespace-pre-wrap text-muted-foreground">
      {value}
    </LearnerText2>
  );
}

function formatPlanAmount(plan: Plan) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(plan.amountMinor / 100);
}

function formatPlan(plan: Plan) {
  const amount = formatPlanAmount(plan);
  if (plan.kind === "subscription" && plan.billingInterval) {
    return `${amount} / ${plan.billingInterval}`;
  }
  if (plan.kind === "installment" && plan.installmentCount) {
    return `${amount} × ${plan.installmentCount}`;
  }
  return amount;
}

function AccessActions({
  productId,
  plans,
  onError,
}: {
  productId: string;
  plans: Plan[];
  onError: (message: string) => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => plan.isDefault) ??
    plans[0];

  async function checkout() {
    if (!selectedPlan) return;
    setBusyPlanId(selectedPlan.id);
    onError("");
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ productId, planId: selectedPlan.id }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(
            `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          );
          return;
        }
        onError("Unable to start checkout.");
        return;
      }
      const body = (await response.json()) as { id?: string };
      if (!body.id) {
        onError("Unable to create checkout session.");
        return;
      }
      window.location.assign(`/checkout?session=${encodeURIComponent(body.id)}`);
    } catch {
      onError("Unable to start checkout.");
    } finally {
      setBusyPlanId(null);
    }
  }

  if (!selectedPlan) {
    return (
      <LearnerText2 className="text-muted-foreground">
        This course is not available for checkout yet.
      </LearnerText2>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {plans.length > 1 ? (
        <LearnerSelect
          aria-label="Choose an access plan"
          value={selectedPlan.id}
          onChange={(event) => setSelectedPlanId(event.currentTarget.value)}
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {formatPlan(plan)}
            </option>
          ))}
        </LearnerSelect>
      ) : null}
      <Button
        type="button"
        disabled={busyPlanId !== null}
        onClick={() => void checkout()}
      >
        {busyPlanId ? "Please wait…" : "Buy now"}
      </Button>
    </div>
  );
}

function CourseOverview({
  product,
  productSlug,
  previewToken,
  actionError,
  onError,
}: {
  product: Product;
  productSlug: string;
  previewToken: string | null;
  actionError: string | null;
  onError: (message: string) => void;
}) {
  const firstLesson = product.lessons.find(hasLessonContent);
  const description = parseProductDescription(product.description);
  const defaultPlan = product.plans.find((plan) => plan.isDefault) ?? product.plans[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <LearnerHeader1 className="md:text-5xl">{product.title}</LearnerHeader1>
      </header>

      {!product.enrolled && !previewToken ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {defaultPlan ? (
            <LearnerHeader4>{formatPlanAmount(defaultPlan)}</LearnerHeader4>
          ) : null}
          <AccessActions
            productId={product.id}
            plans={product.plans}
            onError={onError}
          />
        </div>
      ) : null}

      {product.featuredMedia ? (
        <div className="flex justify-center">
          <LearnerCardImage
            src={
              product.featuredMedia.thumbnailUrl ?? product.featuredMedia.canonicalUrl
            }
            alt={product.featuredMedia.altText || product.title}
            loading="eager"
            sizes="(max-width: 768px) 100vw, 768px"
            className="max-h-[32rem] object-contain"
          />
        </div>
      ) : null}

      <ProductDescription value={product.description} content={description} />

      {product.enrolled || previewToken ? (
        <div className="flex justify-end">
          <Link
            href={
              firstLesson
                ? courseViewerPath(productSlug, product.id, firstLesson.id)
                : courseViewerPath(productSlug, product.id)
            }
          >
            <Button type="button">
              {firstLesson
                ? product.enrolled
                  ? "Continue learning"
                  : "Start learning"
                : "View course"}
            </Button>
          </Link>
        </div>
      ) : null}

      {previewToken && !product.enrolled ? (
        <LearnerBadge variant="outline" className="w-fit bg-muted">
          Preview mode
        </LearnerBadge>
      ) : null}

      {actionError ? (
        <LearnerText2 role="alert" className="text-destructive">
          {actionError}
        </LearnerText2>
      ) : null}
    </main>
  );
}

function LessonPage({
  product,
  productSlug,
  lesson,
  learner,
  previewToken,
  completed,
  certificateId,
  onComplete,
  actionError,
  onError,
}: {
  product: Product;
  productSlug: string;
  lesson: LearnerLesson;
  learner: Learner | null;
  previewToken: string | null;
  completed: boolean;
  certificateId: string | null;
  onComplete: () => void;
  actionError: string | null;
  onError: (message: string) => void;
}) {
  const hasContent = hasLessonContent(lesson);
  const locked = Boolean(
    !previewToken &&
      (!hasContent ||
        (!product.enrolled && lesson.requiresEnrollment) ||
        (!product.enrolled && lesson.type === "quiz")),
  );
  const lessonIndex = product.lessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? product.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < product.lessons.length - 1
      ? product.lessons[lessonIndex + 1]
      : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-20">
      <header className="flex flex-col gap-2">
        <Link
          href={courseViewerHref(
            courseViewerPath(productSlug, product.id),
            previewToken,
          )}
          className="w-fit text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {product.title}
        </Link>
        <LearnerText2 className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Lesson
        </LearnerText2>
        <LearnerHeader1>{lesson.title}</LearnerHeader1>
      </header>

      <div className="flex flex-col">
        {locked ? (
          <div className="flex flex-col items-start gap-4 py-12">
            <LockKeyhole className="size-8 text-muted-foreground" />
            <LearnerHeader2>Content Locked</LearnerHeader2>
            <LearnerText2 className="text-muted-foreground">
              {lesson.availableAt && !hasContent
                ? `This lesson unlocks on ${new Date(lesson.availableAt).toLocaleString()}.`
                : "You are not enrolled in the course."}
            </LearnerText2>
            {!product.enrolled && !previewToken ? (
              <AccessActions
                productId={product.id}
                plans={product.plans}
                onError={onError}
              />
            ) : null}
          </div>
        ) : lesson.mediaId ? (
          <LessonMediaContent
            productId={product.id}
            lesson={lesson}
            previewToken={previewToken}
          />
        ) : lesson.content ? (
          previewToken && lesson.type === "quiz" ? (
            <LearnerText2 className="text-muted-foreground">
              Quiz content is available after enrollment.
            </LearnerText2>
          ) : (
            <LessonContent
              content={lesson.content}
              lessonId={lesson.id}
              productId={product.id}
              type={lesson.type}
            />
          )
        ) : (
          <LearnerText2 className="text-muted-foreground">
            Enroll to view this lesson.
          </LearnerText2>
        )}

        {!previewToken && learner && product.enrolled && hasContent ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-5">
            {completed ? (
              <Button type="button" variant="secondary" disabled>
                <Check className="size-4" /> Completed
              </Button>
            ) : (
              <Button type="button" onClick={onComplete}>
                Mark complete
              </Button>
            )}
            {certificateId ? (
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={`/certificates/${encodeURIComponent(certificateId)}`}
              >
                View certificate
              </Link>
            ) : null}
          </div>
        ) : null}
        {actionError ? (
          <LearnerText2 role="alert" className="mt-4 text-destructive">
            {actionError}
          </LearnerText2>
        ) : null}
      </div>

      {(product.enrolled || previewToken) &&
      (learner || previewToken) &&
      product.discussions &&
      hasContent ? (
        <CourseDiscussions
          productId={product.id}
          lessonId={lesson.id}
          enabled
          viewerId={learner?.id ?? "preview"}
          previewToken={previewToken}
        />
      ) : null}

      <nav className="flex justify-end gap-2" aria-label="Lesson navigation">
        <Link
          href={courseViewerHref(
            previousLesson
              ? courseViewerPath(productSlug, product.id, previousLesson.id)
              : courseViewerPath(productSlug, product.id),
            previewToken,
          )}
        >
          <Button type="button" variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            <LearnerText2 component="span" className="hidden sm:inline">
              {previousLesson ? "Previous" : "Overview"}
            </LearnerText2>
          </Button>
        </Link>
        <Link
          href={courseViewerHref(
            nextLesson
              ? courseViewerPath(productSlug, product.id, nextLesson.id)
              : courseViewerPath(productSlug, product.id),
            previewToken,
          )}
        >
          <Button type="button" variant="outline" size="sm">
            <LearnerText2 component="span" className="hidden sm:inline">
              {nextLesson ? "Next" : "Finish"}
            </LearnerText2>
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </nav>
    </main>
  );
}

export function PublicCourseViewer({
  productSlug,
  productId,
  lessonId,
}: {
  productSlug: string;
  productId: string;
  lessonId?: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token =
      new URLSearchParams(window.location.search).get("preview") ?? hash.get("preview");
    setPreviewToken(token?.trim() ? token : null);
    setPreviewChecked(true);
  }, []);

  useEffect(() => {
    if (!previewChecked || previewToken) return;
    let active = true;
    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active || !response.ok) return;
        const body = (await response.json()) as Learner;
        writeSchoolId(body.schoolId);
        setLearner(body);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [previewChecked, previewToken]);

  useEffect(() => {
    if (!previewChecked) return;
    let active = true;
    setLoading(true);
    setError(null);
    const endpoint = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}`
      : `/api/v1/products/${encodeURIComponent(productId)}`;
    void Promise.all([
      fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(
          previewToken ? { "x-preview-token": previewToken } : undefined,
        ),
      }),
      fetch(`/api/v1/storefront/products/${encodeURIComponent(productId)}/plans`, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }),
    ])
      .then(async ([productResponse, plansResponse]) => {
        if (!active) return;
        if (!productResponse.ok) {
          setError("That course is not available.");
          return;
        }
        const loaded = (await productResponse.json()) as Product;
        if (loaded.slug !== productSlug) {
          setError("That course is not available.");
          return;
        }
        const plans = plansResponse.ok
          ? (((await plansResponse.json()) as { items?: Plan[] }).items ?? [])
          : [];
        setProduct({ ...loaded, plans });
      })
      .catch(() => {
        if (active) setError("Unable to load this course.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [previewChecked, previewToken, productId, productSlug]);

  useEffect(() => {
    if (!learner || previewToken) return;
    let active = true;
    void fetch(`/api/v1/learner/progress?productId=${encodeURIComponent(productId)}`, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active || !response.ok) return;
        const body = (await response.json()) as {
          items?: Array<{
            lessonId: string;
            completedAt: string | null;
          }>;
        };
        setCompletedLessonIds(
          new Set(
            (body.items ?? [])
              .filter((item) => item.completedAt)
              .map((item) => item.lessonId),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [learner, previewToken, productId]);

  const lesson = useMemo(
    () => product?.lessons.find((item) => item.id === lessonId) ?? null,
    [lessonId, product],
  );

  async function completeLesson() {
    if (!lesson) return;
    setActionError(null);
    const response = await fetch(
      `/api/v1/learner/lessons/${encodeURIComponent(lesson.id)}/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        details?: { reason?: string };
      } | null;
      setActionError(
        body?.details?.reason === "need_to_pass"
          ? "Pass the quiz before marking this lesson complete."
          : body?.details?.reason === "scorm_content_incomplete"
            ? "Complete the SCORM activity before marking this lesson complete."
            : "Unable to complete the lesson.",
      );
      return;
    }
    const body = (await response.json()) as { certificateId?: string | null };
    setCompletedLessonIds((current) => new Set(current).add(lesson.id));
    setCertificateId(body.certificateId ?? null);
  }

  if (loading || !previewChecked) {
    return (
      <main className="p-8">
        <LearnerText2 className="text-muted-foreground">Loading course…</LearnerText2>
      </main>
    );
  }
  if (error || !product) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
        <LearnerText2 role="alert" className="text-destructive">
          {error ?? "That course is not available."}
        </LearnerText2>
        <Link
          href={`/p/${encodeURIComponent(productSlug)}`}
          className="font-medium text-primary hover:underline"
        >
          Back to product
        </Link>
      </main>
    );
  }
  if (lessonId && !lesson) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
        <LearnerText2 role="alert" className="text-destructive">
          That lesson is not available.
        </LearnerText2>
        <Link
          href={courseViewerPath(productSlug, product.id)}
          className="font-medium text-primary hover:underline"
        >
          Back to course
        </Link>
      </main>
    );
  }

  return (
    <CourseViewerShell
      product={product}
      productSlug={productSlug}
      user={learner}
      previewToken={previewToken}
      completedLessonIds={completedLessonIds}
      currentLessonId={lessonId}
    >
      {lesson ? (
        <LessonPage
          product={product}
          productSlug={productSlug}
          lesson={lesson}
          learner={learner}
          previewToken={previewToken}
          completed={completedLessonIds.has(lesson.id)}
          certificateId={certificateId}
          onComplete={() => void completeLesson()}
          actionError={actionError}
          onError={setActionError}
        />
      ) : (
        <CourseOverview
          product={product}
          productSlug={productSlug}
          previewToken={previewToken}
          actionError={actionError}
          onError={setActionError}
        />
      )}
    </CourseViewerShell>
  );
}

export function PublicCourseDiscussions({
  productSlug,
  productId,
}: {
  productSlug: string;
  productId: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<
    Array<{
      entityId: string;
      lessonTitle: string;
      totalCount: number;
      lastActivityAt: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token =
      new URLSearchParams(window.location.search).get("preview") ?? hash.get("preview");
    setPreviewToken(token?.trim() ? token : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || previewToken) return;
    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    }).then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as Learner;
      writeSchoolId(body.schoolId);
      setLearner(body);
    });
  }, [previewToken, ready]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const endpoint = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}`
      : `/api/v1/products/${encodeURIComponent(productId)}`;
    void fetch(endpoint, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(
        previewToken ? { "x-preview-token": previewToken } : undefined,
      ),
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setError("That course is not available.");
          return;
        }
        const loaded = (await response.json()) as Product;
        if (loaded.slug !== productSlug) {
          setError("That course is not available.");
          return;
        }
        setProduct({ ...loaded, plans: [] });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [previewToken, productId, productSlug, ready]);

  useEffect(() => {
    if (!ready || (!learner && !previewToken)) return;
    const endpoint = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}/discussions`
      : `/api/v1/learner/products/${encodeURIComponent(productId)}/discussions`;
    void fetch(endpoint, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(
        previewToken ? { "x-preview-token": previewToken } : undefined,
      ),
    })
      .then(async (response) => {
        if (!response.ok) {
          setError("Discussions are not available for this course.");
          return;
        }
        const body = (await response.json()) as {
          items?: Array<{
            entityId: string;
            lessonTitle: string;
            totalCount: number;
            lastActivityAt: string;
          }>;
        };
        setItems(body.items ?? []);
      })
      .catch(() => setError("Unable to load discussions."));
  }, [learner, previewToken, productId, ready]);

  if (!product) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : (
          <LearnerText2 className="text-muted-foreground">
            Loading discussions…
          </LearnerText2>
        )}
        {error ? (
          <Link
            href={`/p/${encodeURIComponent(productSlug)}`}
            className="font-medium text-primary hover:underline"
          >
            Back to product
          </Link>
        ) : null}
      </main>
    );
  }

  return (
    <CourseViewerShell
      product={product}
      productSlug={productSlug}
      user={learner}
      previewToken={previewToken}
      completedLessonIds={new Set()}
    >
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <LearnerText2 className="font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Course
          </LearnerText2>
          <LearnerHeader1>Discussions</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">
            Continue the conversation from each lesson.
          </LearnerText2>
        </header>
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        {!error && !learner && !previewToken ? (
          <LearnerCard>
            <LearnerCardContent>
              <LearnerText2 className="text-muted-foreground">
                Sign in to view course discussions.
              </LearnerText2>
            </LearnerCardContent>
          </LearnerCard>
        ) : null}
        {!error && (learner || previewToken) && items.length === 0 ? (
          <LearnerCard>
            <LearnerCardContent>
              <LearnerText2 className="text-muted-foreground">
                No lesson discussions yet.
              </LearnerText2>
            </LearnerCardContent>
          </LearnerCard>
        ) : null}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Link
              key={item.entityId}
              href={courseViewerHref(
                `${courseViewerPath(productSlug, product.id, item.entityId)}?discussion=open`,
                previewToken,
              )}
              className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 hover:bg-muted"
            >
              <LearnerText2 component="span" className="font-medium">
                {item.lessonTitle}
              </LearnerText2>
              <LearnerText2 component="span" className="text-muted-foreground">
                {item.totalCount} {item.totalCount === 1 ? "post" : "posts"}
              </LearnerText2>
            </Link>
          ))}
        </div>
      </main>
    </CourseViewerShell>
  );
}
