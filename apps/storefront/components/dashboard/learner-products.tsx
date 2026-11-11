"use client";

import type { certificateSchema, learnerProductSchema } from "@courselit/api-contract";
import { BadgeCheck, BookOpen, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/components/communities/learner-community";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { courseViewerHref } from "@/components/layout/course-viewer-sidebar";
import { ImagePlaceholder } from "@/components/image-placeholder";
import {
  LearnerAlertDialog,
  LearnerAlertDialogAction,
  LearnerAlertDialogCancel,
  LearnerAlertDialogContent,
  LearnerAlertDialogDescription,
  LearnerAlertDialogFooter,
  LearnerAlertDialogHeader,
  LearnerAlertDialogTitle,
  LearnerBadge,
  LearnerButton,
  LearnerCard,
  LearnerCardContent,
  LearnerCardImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";

type LearnerProduct = z.infer<typeof learnerProductSchema>;
type Certificate = z.infer<typeof certificateSchema>;

// Product descriptions are stored as rich-text documents; the card shows a
// short plain-text excerpt.
function descriptionText(value: string | null | undefined): string {
  if (!value) return "";
  let document: unknown;
  try {
    document = JSON.parse(value);
  } catch {
    return value;
  }
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { text, content } = node as { text?: unknown; content?: unknown };
    if (typeof text === "string") parts.push(text);
    if (Array.isArray(content)) {
      for (const child of content) walk(child);
      parts.push(" ");
    }
  };
  walk(document);
  return parts.join("").replace(/\s+/g, " ").trim();
}

type ProductSubscription = NonNullable<LearnerProduct["subscription"]>;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function subscriptionSummary(subscription: ProductSubscription): string {
  if (subscription.planKind === "installment") {
    if (subscription.status === "completed") return "Installments paid in full — lifetime access";
    const paid = `${subscription.installmentsPaid ?? 0} of ${subscription.installmentCount ?? 0} installments paid`;
    return subscription.status === "past_due" ? `${paid} — payment overdue` : paid;
  }
  switch (subscription.status) {
    case "active":
      return subscription.currentPeriodEnd
        ? `Subscription active — renews on ${formatDate(subscription.currentPeriodEnd)}`
        : "Subscription active";
    case "cancelling":
      return subscription.accessUntil
        ? `Cancelled — access until ${formatDate(subscription.accessUntil)}`
        : "Cancelled — access until the end of the billing period";
    case "past_due":
      return "Subscription payment overdue";
    default:
      return "Subscription ended";
  }
}

function ProductSubscriptionDetails({
  product,
  onChange,
}: {
  product: LearnerProduct;
  onChange: (subscription: ProductSubscription) => void;
}) {
  const subscription = product.subscription;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!subscription) return null;

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      onChange(
        await requestJson<ProductSubscription>(
          `/api/v1/learner/products/${encodeURIComponent(product.id)}/subscription/cancel`,
          { method: "POST", body: JSON.stringify({}) },
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to cancel the subscription.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <LearnerCardContent className="grid gap-3 pt-0">
        <LearnerText2 className="text-muted-foreground">
          {subscriptionSummary(subscription)}
        </LearnerText2>
        {subscription.planKind === "installment" && subscription.status !== "completed" ? (
          <LearnerText2 className="text-muted-foreground">
            Installment plans can’t be cancelled — remaining installments are
            charged automatically until the plan is paid in full.
          </LearnerText2>
        ) : null}
        {subscription.learnerCanCancel ? (
          <div>
            <LearnerButton
              variant="outline"
              size="sm"
              disabled={cancelling}
              onClick={() => setConfirmOpen(true)}
            >
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </LearnerButton>
          </div>
        ) : null}
        {error ? (
          <LearnerText2 className="text-destructive" role="alert">
            {error}
          </LearnerText2>
        ) : null}
      <LearnerAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <LearnerAlertDialogContent>
          <LearnerAlertDialogHeader>
            <LearnerAlertDialogTitle>Cancel subscription</LearnerAlertDialogTitle>
            <LearnerAlertDialogDescription>
              {`You won’t be charged again for ${product.title}. You keep access until ${
                subscription.currentPeriodEnd
                  ? formatDate(subscription.currentPeriodEnd)
                  : "the end of the current billing period"
              }, after which access ends.`}
            </LearnerAlertDialogDescription>
          </LearnerAlertDialogHeader>
          <LearnerAlertDialogFooter>
            <LearnerButton asChild variant="outline">
              <LearnerAlertDialogCancel>Keep subscription</LearnerAlertDialogCancel>
            </LearnerButton>
            <LearnerButton asChild variant="destructive" disabled={cancelling}>
              <LearnerAlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  void cancel();
                }}
              >
                Cancel subscription
              </LearnerAlertDialogAction>
            </LearnerButton>
          </LearnerAlertDialogFooter>
        </LearnerAlertDialogContent>
      </LearnerAlertDialog>
    </LearnerCardContent>
  );
}

function LearnerProductCard({
  product,
  onSubscriptionChange,
}: {
  product: LearnerProduct;
  onSubscriptionChange: (subscription: ProductSubscription) => void;
}) {
  const TypeIcon = product.kind === "course" ? BookOpen : Download;
  const description = descriptionText(product.description);
  const progressPercent =
    product.totalLessons > 0
      ? Math.round((product.completedLessonsCount / product.totalLessons) * 100)
      : 0;

  // The card holds the subscription's cancel button, which can't sit inside
  // a link, so only the image and details link to the course.
  return (
    <LearnerCard isLink className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
      <Link
        href={courseViewerHref(
          `/course/${encodeURIComponent(product.slug)}/${encodeURIComponent(product.id)}`,
          null,
          "dashboard",
        )}
        className="block"
      >
        {product.featuredImage ? (
          <LearnerCardImage
            src={product.featuredImage.thumbnailUrl ?? product.featuredImage.url}
            alt={product.featuredImage.alt || product.title}
            className="h-48 object-cover"
          />
        ) : (
          <ImagePlaceholder className="h-48 w-full" />
        )}
      <LearnerCardContent className="grid gap-3">
        <LearnerHeader2 className="truncate group-hover:text-primary">
          {product.title}
        </LearnerHeader2>
        <div className="flex items-center justify-between gap-3">
          <LearnerBadge className="inline-flex items-center gap-1">
            <TypeIcon className="mr-1 size-3.5" />
            {product.kind === "course" ? "Course" : "Digital download"}
          </LearnerBadge>
          {product.certificateId ? (
            <LearnerText2 component="span" className="inline-flex items-center text-muted-foreground">
              <BadgeCheck className="mr-1 size-4" />
              Certificate
            </LearnerText2>
          ) : null}
        </div>
        {description ? (
          <LearnerText2 className="line-clamp-2 text-muted-foreground">
            {description}
          </LearnerText2>
        ) : null}
        {product.kind === "course" && product.totalLessons > 0 ? (
          <div className="space-y-2 pt-1">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              aria-label={`${progressPercent}% complete`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <LearnerText2 className="flex justify-between gap-3 text-muted-foreground">
              <span>
                {product.completedLessonsCount} of {product.totalLessons} lessons
                completed
              </span>
              <span>{progressPercent}%</span>
            </LearnerText2>
          </div>
        ) : null}
      </LearnerCardContent>
      </Link>
      <ProductSubscriptionDetails product={product} onChange={onSubscriptionChange} />
    </LearnerCard>
  );
}

export function LearnerProducts() {
  const [products, setProducts] = useState<LearnerProduct[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      requestJson<{ items: LearnerProduct[] }>("/api/v1/learner/products"),
      requestJson<{ items: Certificate[] }>("/api/v1/learner/certificates"),
    ])
      .then(([productBody, certificateBody]) => {
        if (!active) return;
        setProducts(productBody.items);
        setCertificates(certificateBody.items);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load your products.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <LearnerText2 className="text-muted-foreground">Products</LearnerText2>
          <LearnerHeader1>Your products</LearnerHeader1>
          <LearnerText2 className="mt-2 text-muted-foreground">Continue learning where you left off.</LearnerText2>
        </div>
      </header>
      {error ? (
        <LearnerText2 className="text-destructive" role="alert">
          {error}
        </LearnerText2>
      ) : null}
      {loading ? (
        <CourseLitLoading label="Loading products…" className="min-h-64" />
      ) : products.length === 0 ? (
        <LearnerCard>
          <LearnerCardContent className="grid gap-3">
          <LearnerHeader2>No enrolled products yet</LearnerHeader2>
          <LearnerText2 className="text-muted-foreground">Browse the school catalog to find something to learn.</LearnerText2>
          <Link href="/products" className="font-medium text-primary hover:underline">
            Browse products
          </Link>
          </LearnerCardContent>
        </LearnerCard>
      ) : (
        <section
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Your products"
        >
          {products.map((product) => (
            <LearnerProductCard
              key={product.id}
              product={product}
              onSubscriptionChange={(subscription) =>
                setProducts((current) =>
                  current.map((item) =>
                    item.id === product.id ? { ...item, subscription } : item,
                  ),
                )
              }
            />
          ))}
        </section>
      )}
      <LearnerCard>
        <LearnerCardContent className="grid gap-4">
        <div>
          <LearnerText2 className="text-muted-foreground">Achievements</LearnerText2>
          <LearnerHeader2>Certificates</LearnerHeader2>
        </div>
        {certificates.length === 0 ? (
          <LearnerText2 className="text-muted-foreground">Complete a course to earn a certificate.</LearnerText2>
        ) : (
          <ul className="grid gap-4">
            {certificates.map((certificate) => (
              <li key={certificate.id}>
                <Link
                  href={`/certificates/${encodeURIComponent(certificate.verificationId)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {certificate.productTitle}
                </Link>
                <LearnerText2 className="text-muted-foreground">
                  Issued {new Date(certificate.issuedAt).toLocaleDateString()}
                </LearnerText2>
              </li>
            ))}
          </ul>
        )}
        </LearnerCardContent>
      </LearnerCard>
    </div>
  );
}
