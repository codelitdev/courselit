"use client";

import type { certificateSchema, learnerProductSchema } from "@courselit/api-contract";
import { BadgeCheck, BookOpen, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/components/communities/learner-community";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { Skeleton } from "@/components/ui/skeleton";

type LearnerProduct = z.infer<typeof learnerProductSchema>;
type Certificate = z.infer<typeof certificateSchema>;

function LearnerProductCard({ product }: { product: LearnerProduct }) {
  const TypeIcon = product.kind === "course" ? BookOpen : Download;
  const progressPercent =
    product.totalLessons > 0
      ? Math.round((product.completedLessonsCount / product.totalLessons) * 100)
      : 0;

  return (
    <Link
      href={`/dashboard/courses/${encodeURIComponent(product.id)}`}
      className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg"
    >
      {product.featuredMedia ? (
        <img
          src={product.featuredMedia.thumbnailUrl ?? product.featuredMedia.canonicalUrl}
          alt={product.featuredMedia.altText || product.title}
          className="h-48 w-full object-cover"
        />
      ) : (
        <div className="flex h-48 items-center justify-center bg-muted text-muted-foreground/40">
          <CourseLitLogo className="size-20" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <h2 className="truncate font-semibold group-hover:text-primary">
          {product.title}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
            <TypeIcon className="mr-1 size-3.5" />
            {product.kind === "course" ? "Course" : "Digital download"}
          </span>
          {product.certificateId ? (
            <span className="inline-flex items-center text-sm text-muted-foreground">
              <BadgeCheck className="mr-1 size-4" />
              Certificate
            </span>
          ) : null}
        </div>
        {product.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
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
            <p className="flex justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {product.completedLessonsCount} of {product.totalLessons} lessons
                completed
              </span>
              <span>{progressPercent}%</span>
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function LearnerProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-hidden="true">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-4 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
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
    <div className="page-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Products</p>
          <h1>Your products</h1>
          <p className="subtitle">Continue learning where you left off.</p>
        </div>
      </header>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <section
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Loading products"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <LearnerProductSkeleton key={index} />
          ))}
        </section>
      ) : products.length === 0 ? (
        <section className="card stack">
          <h2>No enrolled products yet</h2>
          <p className="muted">Browse the school catalog to find something to learn.</p>
          <Link href="/products" className="font-medium text-primary hover:underline">
            Browse products
          </Link>
        </section>
      ) : (
        <section
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Your products"
        >
          {products.map((product) => (
            <LearnerProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
      <section className="card stack">
        <div>
          <p className="eyebrow">Achievements</p>
          <h2>Certificates</h2>
        </div>
        {certificates.length === 0 ? (
          <p className="muted">Complete a course to earn a certificate.</p>
        ) : (
          <ul className="stack">
            {certificates.map((certificate) => (
              <li key={certificate.id}>
                <Link
                  href={`/certificates/${encodeURIComponent(certificate.verificationId)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {certificate.productTitle}
                </Link>
                <p className="muted">
                  Issued {new Date(certificate.issuedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
