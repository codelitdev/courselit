"use client";

import type { MediaRef } from "@courselit/api-contract";
// Course viewing is protected, except for explicit preview tokens.
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CourseDiscussions } from "@/components/course-discussions";
import type { CourseViewerProduct } from "@/components/layout/course-viewer-sidebar";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  type LearnerLesson,
  LessonContent,
  LessonMediaContent,
} from "@/components/lesson-viewer";
import {
  LearnerButton as Button,
  LearnerHeader1,
  LearnerHeader4,
  LearnerText2,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
  LearnerCardImage as PageCardImage,
} from "@/components/themed-page-builder";
import { learnerHeaders, writeSchoolId } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

type Product = {
  id: string;
  kind: "course" | "download";
  title: string;
  description: string;
  enrolled: boolean;
  featuredImage: MediaRef | null;
  discussions: boolean;
  sections: CourseViewerProduct["sections"];
  status: string;
  lessons: LearnerLesson[];
  plans?: Plan[];
};
type Plan = {
  id: string;
  name: string;
  kind: "free" | "one_time" | "subscription" | "installment";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  status: "active" | "archived";
  isDefault: boolean;
};

function ProductDescription({ value }: { value: string }) {
  const theme = useSchoolThemeStyle();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) {
      return (
        <TextRenderer
          json={parsed as unknown as TextEditorContent}
          theme={theme}
          className="lesson-rich-text"
        />
      );
    }
  } catch {
    // Descriptions saved before rich-text support remain plain strings.
  }
  return <LearnerText2 className="mt-2 text-muted-foreground">{value}</LearnerText2>;
}

export default function CoursePage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [certificate, setCertificate] = useState<{
    verificationId: string;
    productTitle: string;
  } | null>(null);
  const [me, setMe] = useState<{
    id: string;
    email: string;
    name: string;
    schoolId: string;
  } | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token =
      new URLSearchParams(window.location.search).get("preview") ?? hash.get("preview");
    setPreviewToken(token && token.trim().length > 0 ? token : null);
    setPreviewChecked(true);
  }, []);

  useEffect(() => {
    if (!previewChecked || previewToken) return;
    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    }).then(async (res) => {
      if (res.ok) {
        const body = (await res.json()) as {
          id: string;
          email: string;
          name: string;
          schoolId: string;
        };
        writeSchoolId(body.schoolId);
        setMe(body);
      }
    });
  }, [previewChecked, previewToken]);

  useEffect(() => {
    if (!previewChecked) return;
    let active = true;
    const url = previewToken
      ? `/api/v1/preview/products/${productId}`
      : `/api/v1/products/${productId}`;
    void fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(
        previewToken ? { "x-preview-token": previewToken } : undefined,
      ),
    }).then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        setError("That course is not available.");
        setProduct(null);
        return;
      }
      const loadedProduct = (await response.json()) as Product;
      const plansResponse = await fetch(
        `/api/v1/storefront/products/${productId}/plans`,
        {
          credentials: "include",
          cache: "no-store",
          headers: learnerHeaders(),
        },
      );
      const plans = plansResponse.ok
        ? (((await plansResponse.json()) as { items?: Plan[] }).items ?? [])
        : [];
      setProduct({ ...loadedProduct, plans });
      if (!previewToken) {
        const progressResponse = await fetch(
          `/api/v1/learner/progress?productId=${encodeURIComponent(productId)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: learnerHeaders(),
          },
        );
        if (progressResponse.ok) {
          const progress = (await progressResponse.json()) as {
            items?: Array<{
              lessonId: string;
              completedAt: string | null;
            }>;
          };
          setCompleted(
            new Set(
              (progress.items ?? [])
                .filter((item) => item.completedAt)
                .map((item) => item.lessonId),
            ),
          );
        }
      }
    });
    return () => {
      active = false;
    };
  }, [productId, previewChecked, previewToken]);

  useEffect(() => {
    if (!product) return;
    const params = new URLSearchParams(window.location.search);
    const target = window.location.hash.startsWith("#lesson-")
      ? document.getElementById(window.location.hash.slice(1))
      : null;
    if (params.get("discussion") === "open" && target) {
      window.setTimeout(
        () => target.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    }
  }, [product]);

  async function enroll() {
    setError(null);
    const response = await fetch("/api/v1/learner/memberships", {
      method: "POST",
      credentials: "include",
      headers: learnerHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      setError("Unable to enroll.");
      return;
    }
    const refreshed = await fetch(`/api/v1/products/${productId}`, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    });
    if (refreshed.ok) {
      const updated = (await refreshed.json()) as Product;
      setProduct((current) => ({ ...updated, plans: current?.plans ?? [] }));
    }
  }

  async function downloadProduct() {
    setError(null);
    if (!me) {
      window.location.assign("/login");
      return;
    }
    const response = await fetch(
      `/api/v1/learner/products/${encodeURIComponent(productId)}/download`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      setError("Unable to prepare the download.");
      return;
    }
    const result = (await response.json()) as { token?: string };
    if (!result.token) {
      setError("Unable to prepare the download.");
      return;
    }
    window.location.assign(`/api/v1/learner/downloads/${result.token}`);
  }

  async function checkout(plan: Plan) {
    setError(null);
    const response = await fetch("/api/v1/storefront/checkout-sessions", {
      method: "POST",
      credentials: "include",
      headers: learnerHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ productId, planId: plan.id }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.assign(
          `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }
      setError("Unable to start checkout.");
      return;
    }
    const result = (await response.json()) as { id?: string };
    if (!result.id) {
      setError("Unable to create checkout session.");
      return;
    }
    window.location.assign(`/checkout?session=${encodeURIComponent(result.id)}`);
  }

  async function complete(lessonId: string) {
    setError(null);
    const response = await fetch(`/api/v1/learner/lessons/${lessonId}/complete`, {
      method: "POST",
      credentials: "include",
      headers: learnerHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      setError("Unable to complete the lesson.");
      return;
    }
    const progress = (await response.json()) as {
      courseCompleted: boolean;
      certificateId: string | null;
    };
    setCompleted((current) => new Set(current).add(lessonId));
    if (progress.courseCompleted && progress.certificateId) {
      const certificatesResponse = await fetch("/api/v1/learner/certificates", {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      });
      if (certificatesResponse.ok) {
        const body = (await certificatesResponse.json()) as {
          items?: Array<{
            id: string;
            verificationId: string;
            productTitle: string;
          }>;
        };
        const issued = body.items?.find((item) => item.id === progress.certificateId);
        if (issued) setCertificate(issued);
      }
    }
  }

  const firstAvailableLesson =
    product?.kind === "course"
      ? (product.lessons.find(
          (lesson) =>
            Boolean(lesson.mediaId) ||
            Boolean(lesson.content && Object.keys(lesson.content).length > 0),
        ) ?? null)
      : null;

  return (
    <LearnerShell
      user={me}
      course={product?.kind === "course" ? product : undefined}
      previewToken={previewToken}
      completedLessonIds={completed}
    >
      <div className="grid gap-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <LearnerText2 className="text-muted-foreground">
              {product?.kind === "download" ? "Digital download" : "Course"}
            </LearnerText2>
            <LearnerHeader1>{product?.title ?? "Product"}</LearnerHeader1>
            {product?.description ? (
              <ProductDescription value={product.description} />
            ) : null}
          </div>
          <Link
            href="/dashboard/products"
            className="text-sm font-medium hover:underline text-primary"
          >
            Back to dashboard
          </Link>
          {(previewToken || me) &&
          product?.discussions &&
          product.lessons.some(
            (lesson) => lesson.content && Object.keys(lesson.content).length > 0,
          ) ? (
            <Link
              href={`/dashboard/courses/${encodeURIComponent(productId)}/discussions${previewToken ? `#preview=${encodeURIComponent(previewToken)}` : ""}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              All discussions
            </Link>
          ) : null}
        </header>
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        <PageCard>
          <PageCardContent className="grid gap-5">
            {previewToken ? (
              <LearnerText2 className="text-muted-foreground">
                Preview mode
              </LearnerText2>
            ) : null}
            {!previewToken ? (
              <>
                {product?.kind === "download" && me ? (
                  <Button type="button" onClick={() => void downloadProduct()}>
                    Download files
                  </Button>
                ) : null}
                {(product?.plans ?? []).length ? (
                  <div className="grid gap-4">
                    <LearnerText2 className="text-muted-foreground">
                      Choose access
                    </LearnerText2>
                    {(product?.plans ?? []).map((plan) => (
                      <div className="flex gap-2 items-center" key={plan.id}>
                        <LearnerText2 component="span">
                          {plan.name} · {plan.currency} {plan.amountMinor / 100}
                          {plan.kind === "subscription" && plan.billingInterval
                            ? ` / ${plan.billingInterval}`
                            : plan.kind === "installment" && plan.installmentCount
                              ? ` · ${plan.installmentCount} payments`
                              : ""}
                        </LearnerText2>
                        <Button type="button" onClick={() => void checkout(plan)}>
                          {plan.kind === "free" ? "Get access" : "Buy now"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : product?.kind !== "download" ? (
                  <Button type="button" onClick={() => void enroll()}>
                    Enroll
                  </Button>
                ) : null}
              </>
            ) : null}
            {product?.kind === "course" ? (
              <>
                {product.featuredImage ? (
                  <PageCardImage
                    src={
                      product.featuredImage.thumbnailUrl ?? product.featuredImage.url
                    }
                    alt={product.featuredImage.alt || product.title}
                    className="w-full rounded-lg object-cover"
                  />
                ) : null}
                {firstAvailableLesson ? (
                  <Link
                    className="w-fit"
                    href={`/dashboard/courses/${encodeURIComponent(productId)}/${encodeURIComponent(firstAvailableLesson.id)}${previewToken ? `#preview=${encodeURIComponent(previewToken)}` : ""}`}
                  >
                    <Button type="button">
                      {product.enrolled ? "Continue learning" : "Start learning"}
                    </Button>
                  </Link>
                ) : null}
              </>
            ) : null}
            {product?.kind === "download" &&
              (product?.lessons ?? []).map((lesson) => (
                <article
                  id={`lesson-${lesson.id}`}
                  key={lesson.id}
                  className="grid gap-4 scroll-mt-6"
                >
                  <LearnerHeader4>{lesson.title}</LearnerHeader4>
                  <Link
                    className="w-fit text-sm font-medium text-primary hover:underline"
                    href={`/dashboard/courses/${encodeURIComponent(productId)}/${encodeURIComponent(lesson.id)}${previewToken ? `#preview=${encodeURIComponent(previewToken)}` : ""}`}
                  >
                    Open lesson
                  </Link>
                  {lesson.mediaId ? (
                    <LessonMediaContent
                      productId={productId}
                      lesson={lesson}
                      previewToken={previewToken}
                    />
                  ) : lesson.content && Object.keys(lesson.content).length > 0 ? (
                    previewToken && lesson.type === "quiz" ? (
                      <LearnerText2 className="text-muted-foreground">
                        Quiz content is available after enrollment.
                      </LearnerText2>
                    ) : (
                      <LessonContent
                        content={lesson.content}
                        lessonId={lesson.id}
                        productId={productId}
                        type={lesson.type}
                      />
                    )
                  ) : (
                    <LearnerText2 className="text-muted-foreground">
                      {lesson.availableAt
                        ? `This lesson unlocks on ${new Date(lesson.availableAt).toLocaleString()}.`
                        : "Enroll to read this lesson."}
                    </LearnerText2>
                  )}
                  {!previewToken &&
                  (lesson.mediaId ||
                    (lesson.content && Object.keys(lesson.content).length > 0)) ? (
                    !completed.has(lesson.id) ? (
                      <Button type="button" onClick={() => void complete(lesson.id)}>
                        Mark complete
                      </Button>
                    ) : (
                      <LearnerText2>Lesson completed.</LearnerText2>
                    )
                  ) : null}
                  {(previewToken || product?.discussions) &&
                  (lesson.mediaId ||
                    (lesson.content && Object.keys(lesson.content).length > 0)) &&
                  (me || previewToken) ? (
                    <CourseDiscussions
                      productId={productId}
                      lessonId={lesson.id}
                      enabled
                      viewerId={me?.id ?? "preview"}
                      previewToken={previewToken}
                    />
                  ) : null}
                </article>
              ))}
            {certificate ? (
              <LearnerText2>
                <Link
                  href={`/certificates/${encodeURIComponent(certificate.verificationId)}`}
                  className="font-medium text-primary hover:underline"
                >
                  View your course certificate
                </Link>
              </LearnerText2>
            ) : null}
          </PageCardContent>
        </PageCard>
      </div>
    </LearnerShell>
  );
}
