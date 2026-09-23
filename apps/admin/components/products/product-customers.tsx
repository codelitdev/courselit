"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProductKind, School } from "./product-types";

type ProductCustomer = {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  avatar: { url: string; thumbnailUrl?: string | null } | null;
  accountStatus: "active" | "deactivated" | "deletion_pending";
  membershipStatus:
    | "active"
    | "payment_failed"
    | "expired"
    | "pending"
    | "rejected"
    | "paused";
  subscriptionMethod: string | null;
  subscriptionId: string | null;
  signedUpAt: string;
  lastActiveAt: string | null;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  };
};

type ProductSummary = {
  title: string;
  kind: ProductKind;
};

type ProductCustomerProgress = {
  customer: Pick<ProductCustomer, "id" | "name" | "email" | "avatar">;
  lessons: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt: string | null;
  }>;
};

const PAGE_SIZE = 25;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function statusLabel(status: ProductCustomer["membershipStatus"]) {
  return status.replaceAll("_", " ");
}

function initials(customer: ProductCustomer) {
  return (customer.name.trim() || customer.email).slice(0, 1).toUpperCase();
}

export function ProductCustomers({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [customers, setCustomers] = useState<ProductCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<ProductCustomer | null>(null);
  const [progress, setProgress] = useState<ProductCustomerProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before viewing customers.");
        setSchoolId(selected.id);
        const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (submittedSearch) query.set("q", submittedSearch);
        const [productResponse, customersResponse] = await Promise.all([
          fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": selected.id },
          }),
          fetch(
            `/api/v1/products/${encodeURIComponent(productId)}/customers?${query.toString()}`,
            {
              credentials: "include",
              cache: "no-store",
              headers: { "x-school-id": selected.id },
            },
          ),
        ]);
        if (!productResponse.ok || !customersResponse.ok) {
          throw new Error("Unable to load product customers.");
        }
        const productBody = (await productResponse.json()) as ProductSummary;
        const customerBody = (await customersResponse.json()) as {
          items?: ProductCustomer[];
          total?: number;
        };
        if (!active) return;
        setProduct(productBody);
        setCustomers(customerBody.items ?? []);
        setTotal(customerBody.total ?? 0);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load product customers.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, productId, submittedSearch]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Products", href: "/products" },
      { label: product?.title ?? "Product", href: `/products/${productId}` },
      { label: "Customers" },
    ],
    [product?.title, productId],
  );
  useSetBreadcrumb(breadcrumbs);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  async function openProgress(customer: ProductCustomer) {
    if (!schoolId) return;
    setSelectedCustomer(customer);
    setProgress(null);
    setProgressError(null);
    setProgressLoading(true);
    try {
      const response = await fetch(
        `/api/v1/products/${encodeURIComponent(productId)}/customers/${encodeURIComponent(customer.id)}/progress`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": schoolId },
        },
      );
      if (!response.ok) throw new Error("Unable to load customer progress.");
      setProgress((await response.json()) as ProductCustomerProgress);
    } catch (caught) {
      setProgressError(
        caught instanceof Error ? caught.message : "Unable to load customer progress.",
      );
    } finally {
      setProgressLoading(false);
    }
  }

  function closeProgress(open: boolean) {
    if (!open) {
      setSelectedCustomer(null);
      setProgress(null);
      setProgressError(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AuthGate>
      <main className="page-shell space-y-6">
        <PageHeader
          title="Customers"
          description={
            product?.kind === "course"
              ? "View learners and their course progress."
              : "View customers with access to this product."
          }
        />

        <form className="flex max-w-xl gap-2" onSubmit={submitSearch}>
          <Input
            aria-label="Search customers"
            placeholder="Search customers…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit" variant="primary">
            <Search className="size-4" />
            Search
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}

        {loading ? (
          <CourseLitLoading label="Loading customers…" className="rounded-xl border bg-card p-12" />
        ) : customers.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-semibold">No customers found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Customers with access to this product will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[minmax(240px,2fr)_140px_minmax(180px,1.5fr)_140px_140px_140px] gap-4 border-b px-5 py-3 text-xs font-semibold text-muted-foreground">
                <span>Name</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Signed up</span>
                <span>Last active</span>
                <span>Subscription</span>
              </div>
              {customers.map((customer) => (
                <div
                  className="grid grid-cols-[minmax(240px,2fr)_140px_minmax(180px,1.5fr)_140px_140px_140px] items-center gap-4 border-b px-5 py-4 text-sm last:border-b-0"
                  key={customer.id}
                >
                  <Link
                    className="flex min-w-0 items-center gap-3 rounded-md outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/contacts/${encodeURIComponent(customer.id)}`}
                  >
                    <Avatar size="sm">
                      {customer.avatar ? (
                        <AvatarImage
                          src={customer.avatar.thumbnailUrl ?? customer.avatar.url}
                          alt={customer.name || customer.email}
                        />
                      ) : null}
                      <AvatarFallback>{initials(customer)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{customer.name || customer.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </Link>
                  <span className="w-fit rounded-full border px-2.5 py-1 text-xs capitalize">
                    {statusLabel(customer.membershipStatus)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${customer.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {customer.progress.percentage}%
                    </span>
                    {product?.kind === "course" && customer.progress.totalLessons > 0 ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={() => void openProgress(customer)}
                      >
                        View
                      </button>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">{formatDate(customer.signedUpAt)}</span>
                  <span className="text-muted-foreground">{formatDate(customer.lastActiveAt)}</span>
                  <span className="capitalize text-muted-foreground">
                    {customer.subscriptionMethod ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {total > 0 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <Dialog open={selectedCustomer !== null} onOpenChange={closeProgress}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer
                  ? `${selectedCustomer.name || selectedCustomer.email}'s Progress`
                  : "Customer progress"}
              </DialogTitle>
              <DialogDescription>
                Lesson completion for this customer.
              </DialogDescription>
            </DialogHeader>
            {progressLoading ? (
              <CourseLitLoading label="Loading progress…" className="py-6" />
            ) : progressError ? (
              <p className="py-6 text-sm text-destructive" role="alert">
                {progressError}
              </p>
            ) : progress?.lessons.length ? (
              <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
                {progress.lessons.map((lesson) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-2 text-sm"
                    key={lesson.id}
                  >
                    <span className="min-w-0 truncate">{lesson.title}</span>
                    {lesson.completed ? (
                      <CheckCircle2
                        aria-label="Completed"
                        className="size-4 shrink-0 text-primary"
                      />
                    ) : (
                      <Circle
                        aria-label="Not completed"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                This course has no published lessons.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}
