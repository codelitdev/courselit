"use client";

import type { certificateSchema, learnerProductSchema } from "@courselit/api-contract";
import { BadgeCheck, BookOpen, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { requestJson } from "@/components/communities/learner-community";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { courseViewerHref } from "@/components/layout/course-viewer-sidebar";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import {
  LearnerBadge,
  LearnerCard,
  LearnerCardContent,
  LearnerCardImage,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";

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
      href={courseViewerHref(
        `/course/${encodeURIComponent(product.slug)}/${encodeURIComponent(product.id)}`,
        null,
        "dashboard",
      )}
      className="group block"
    >
      <LearnerCard isLink className="overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:shadow-lg">
        {product.featuredImage ? (
          <LearnerCardImage
            src={product.featuredImage.thumbnailUrl ?? product.featuredImage.url}
            alt={product.featuredImage.alt || product.title}
            className="h-48 object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-muted text-muted-foreground/40">
            <CourseLitLogo className="size-20" />
          </div>
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
        {product.description ? (
          <LearnerText2 className="line-clamp-2 text-muted-foreground">
            {product.description}
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
      </LearnerCard>
    </Link>
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
            <LearnerProductCard key={product.id} product={product} />
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
