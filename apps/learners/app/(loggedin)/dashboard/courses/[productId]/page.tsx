"use client";

import { Button } from "@codelitdev/design-system";
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
import { learnerHeaders, writeSchoolId } from "@/lib/school";

type Product = {
  id: string;
  kind: "course" | "download";
  title: string;
  description: string;
  enrolled: boolean;
  featuredMedia: {
    canonicalUrl: string;
    thumbnailUrl: string | null;
    fileName: string;
    altText: string;
  } | null;
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
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) {
      return (
        <TextRenderer
          json={parsed as unknown as TextEditorContent}
          className="lesson-rich-text"
        />
      );
    }
  } catch {
    // Descriptions saved before rich-text support remain plain strings.
  }
  return <p className="subtitle">{value}</p>;
}

export default function CoursePage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Set<string>>(new Set());
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
              startedAt: string;
              completedAt: string | null;
            }>;
          };
          setStarted(new Set((progress.items ?? []).map((item) => item.lessonId)));
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
    const response = await fetch("/api/v1/learner/enrollments", {
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
    setStarted((current) => new Set(current).add(lessonId));
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

  async function start(lessonId: string) {
    setError(null);
    const response = await fetch(`/api/v1/learner/lessons/${lessonId}/start`, {
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
      setError("Unable to start the lesson.");
      return;
    }
    setStarted((current) => new Set(current).add(lessonId));
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
      <div className="page-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">
              {product?.kind === "download" ? "Digital download" : "Course"}
            </p>
            <h1>{product?.title ?? "Product"}</h1>
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
        {error ? <p role="alert">{error}</p> : null}
        <section className="card stack">
          {previewToken ? <p className="eyebrow">Preview mode</p> : null}
          {!previewToken ? (
            <>
              {product?.kind === "download" && me ? (
                <Button type="button" onClick={() => void downloadProduct()}>
                  Download files
                </Button>
              ) : null}
              {(product?.plans ?? []).length ? (
                <div className="stack">
                  <p className="eyebrow">Choose access</p>
                  {(product?.plans ?? []).map((plan) => (
                    <div className="flex gap-2 items-center" key={plan.id}>
                      <span>
                        {plan.name} · {plan.currency} {plan.amountMinor / 100}
                        {plan.kind === "subscription" && plan.billingInterval
                          ? ` / ${plan.billingInterval}`
                          : plan.kind === "installment" && plan.installmentCount
                            ? ` · ${plan.installmentCount} payments`
                            : ""}
                      </span>
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
              {product.featuredMedia ? (
                <img
                  src={
                    product.featuredMedia.thumbnailUrl ??
                    product.featuredMedia.canonicalUrl
                  }
                  alt={product.featuredMedia.altText || product.title}
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
                className="stack scroll-mt-6"
              >
                <h2>{lesson.title}</h2>
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
                    <p className="muted">Quiz content is available after enrollment.</p>
                  ) : (
                    <LessonContent
                      content={lesson.content}
                      lessonId={lesson.id}
                      productId={productId}
                      type={lesson.type}
                    />
                  )
                ) : (
                  <p className="muted">
                    {lesson.availableAt
                      ? `This lesson unlocks on ${new Date(lesson.availableAt).toLocaleString()}.`
                      : "Enroll to read this lesson."}
                  </p>
                )}
                {!previewToken &&
                (lesson.mediaId ||
                  (lesson.content && Object.keys(lesson.content).length > 0)) ? (
                  <>
                    {!started.has(lesson.id) ? (
                      <Button type="button" onClick={() => void start(lesson.id)}>
                        Start lesson
                      </Button>
                    ) : null}
                    {!completed.has(lesson.id) ? (
                      <Button type="button" onClick={() => void complete(lesson.id)}>
                        Mark complete
                      </Button>
                    ) : (
                      <p>Lesson completed.</p>
                    )}
                  </>
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
            <p>
              <Link
                href={`/certificates/${encodeURIComponent(certificate.verificationId)}`}
                className="font-medium text-primary hover:underline"
              >
                View your course certificate
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </LearnerShell>
  );
}
