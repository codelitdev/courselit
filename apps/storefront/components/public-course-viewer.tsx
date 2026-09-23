"use client";

import type { MediaRef } from "@courselit/api-contract";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CourseViewerShell,
  courseViewerPath,
} from "@/components/layout/course-viewer-shell";
import {
  type CourseViewerProduct,
  courseViewerEntryPointFromParam,
  courseViewerExitHref,
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
  LearnerSelectContent,
  LearnerSelectItem,
  LearnerSelectTrigger,
  LearnerSelectValue,
  LearnerText2,
} from "@/components/themed-page-builder";
import { CourseLitLoading } from "@/components/course-lit-loader";
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
  featuredImage: MediaRef | null;
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
  selectedPlanId: controlledSelectedPlanId,
  onSelectedPlanIdChange,
}: {
  productId: string;
  plans: Plan[];
  onError: (message: string) => void;
  selectedPlanId?: string | null;
  onSelectedPlanIdChange?: (planId: string) => void;
}) {
  const [internalSelectedPlanId, setInternalSelectedPlanId] = useState<string | null>(
    null,
  );
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const selectedPlanId = controlledSelectedPlanId ?? internalSelectedPlanId;
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
          onValueChange={(planId) => {
            onSelectedPlanIdChange?.(planId);
            if (!onSelectedPlanIdChange) setInternalSelectedPlanId(planId);
          }}
        >
          <LearnerSelectTrigger>
            <LearnerSelectValue placeholder="Choose an access plan" />
          </LearnerSelectTrigger>
          <LearnerSelectContent>
            {plans.map((plan) => (
              <LearnerSelectItem key={plan.id} value={plan.id}>
                {plan.name} · {formatPlan(plan)}
              </LearnerSelectItem>
            ))}
          </LearnerSelectContent>
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
  const searchParams = useSearchParams();
  const entryPoint = courseViewerEntryPointFromParam(searchParams.get("from"));
  const firstLesson = product.lessons.find(hasLessonContent);
  const description = parseProductDescription(product.description);
  const defaultPlan = product.plans.find((plan) => plan.isDefault) ?? product.plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan =
    product.plans.find((plan) => plan.id === selectedPlanId) ?? defaultPlan;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <LearnerHeader1 className="md:text-5xl">{product.title}</LearnerHeader1>
      </header>

      {!product.enrolled && !previewToken ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {defaultPlan ? (
            <LearnerHeader4>
              {selectedPlan ? formatPlan(selectedPlan) : null}
            </LearnerHeader4>
          ) : null}
          <AccessActions
            productId={product.id}
            plans={product.plans}
            onError={onError}
            selectedPlanId={selectedPlanId}
            onSelectedPlanIdChange={setSelectedPlanId}
          />
        </div>
      ) : null}

      {product.featuredImage ? (
        <div className="flex justify-center">
          <LearnerCardImage
            src={product.featuredImage.thumbnailUrl ?? product.featuredImage.url}
            alt={product.featuredImage.alt || product.title}
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
            href={courseViewerHref(
              firstLesson
                ? courseViewerPath(productSlug, product.id, firstLesson.id)
                : courseViewerPath(productSlug, product.id),
              previewToken,
              entryPoint,
            )}
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
  const searchParams = useSearchParams();
  const entryPoint = courseViewerEntryPointFromParam(searchParams.get("from"));
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
      <LearnerCard>
        <LearnerCardContent className="grid gap-6">
          <LearnerHeader1>{lesson.title}</LearnerHeader1>
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
            <div className="flex flex-wrap items-center gap-3 border-t pt-5">
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
            <LearnerText2 role="alert" className="text-destructive">
              {actionError}
            </LearnerText2>
          ) : null}

          <nav
            className="flex justify-end gap-2 border-t pt-5"
            aria-label="Lesson navigation"
          >
            <Link
              href={courseViewerHref(
                previousLesson
                  ? courseViewerPath(productSlug, product.id, previousLesson.id)
                  : courseViewerPath(productSlug, product.id),
                previewToken,
                entryPoint,
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
                entryPoint,
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
        </LearnerCardContent>
      </LearnerCard>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryPoint = courseViewerEntryPointFromParam(searchParams.get("from"));
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

  useEffect(() => {
    if (!product || lessonId || product.lessons.length === 0) return;
    const firstLesson = product.lessons[0];
    router.replace(
      courseViewerHref(
        courseViewerPath(productSlug, product.id, firstLesson.id),
        previewToken,
        entryPoint,
      ),
    );
  }, [entryPoint, lessonId, previewToken, product, productSlug, router]);

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
        <CourseLitLoading label="Loading course…" />
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
          href={courseViewerExitHref(productSlug, entryPoint)}
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
          href={courseViewerHref(
            courseViewerPath(productSlug, product.id),
            previewToken,
            entryPoint,
          )}
          className="font-medium text-primary hover:underline"
        >
          Back to course
        </Link>
      </main>
    );
  }

  if (!lessonId && product.lessons.length > 0) {
    return (
      <main className="p-8">
        <CourseLitLoading label="Loading lesson…" />
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
