"use client";

import {
  BookOpen,
  CheckCircle,
  CircleDashed,
  Download,
  Eye,
  EyeOff,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FeaturedCard } from "@/components/featured-card";
import { EmptyState } from "@/components/empty-state";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import type { Product, ProductKind, School } from "@/components/products/product-types";
import { Resources } from "@/components/resources";
import { Button } from "@/components/ui/codelit/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/codelit/tooltip";
import { AuthGate } from "../../components/auth-gate";
import { hasSchoolPermission } from "@/lib/school-permissions";

type ProductFilter = "all" | ProductKind;
const ITEMS_PER_PAGE = 9;
const PRODUCT_SKELETON_KEYS = ["one", "two", "three", "four", "five", "six"];

function kindLabel(kind: ProductKind) {
  return kind === "course" ? "Course" : "Digital download";
}

function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function ProductCard({
  product,
  schoolCurrency,
}: {
  product: Product;
  schoolCurrency: string;
}) {
  const TypeIcon = product.kind === "course" ? BookOpen : Download;
  const StatusIcon = product.status === "published" ? CheckCircle : CircleDashed;
  const currency = product.currency ?? schoolCurrency ?? "USD";
  const isPublic = product.privacy === "public";
  const isPublished = product.status === "published";

  return (
    <FeaturedCard
      href={`/products/${product.id}`}
      imageUrl={
        product.featuredMedia?.thumbnailUrl ?? product.featuredMedia?.canonicalUrl
      }
      imageAlt={product.featuredMedia?.altText || product.title}
      title={product.title}
    >
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium">
          <TypeIcon className="mr-1 inline size-3.5" />
          {kindLabel(product.kind)}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span title={isPublic ? "Public" : "Hidden"}>
                {isPublic ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </span>
            </TooltipTrigger>
            <TooltipContent>{isPublic ? "Public" : "Hidden"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span title={isPublished ? "Published" : "Draft"}>
                <StatusIcon className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{isPublished ? "Published" : "Draft"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          <span className="text-base">{currencySymbol(currency)} </span>
          {(product.sales ?? 0).toLocaleString()} sales
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" />
          {(product.customers ?? 0).toLocaleString()} customers
        </span>
      </div>
    </FeaturedCard>
  );
}

function buildProductsQuery(filter: ProductFilter, page: number, cursor?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filter !== "all") params.set("filter", filter);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function ProductListSkeleton() {
  return (
    <section
      className="grid gap-x-4 gap-y-3 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading products"
    >
      {PRODUCT_SKELETON_KEYS.map((key) => (
        <div key={key} className="overflow-hidden rounded-xl border bg-card">
          <div className="h-36 animate-pulse bg-muted" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ProductPagination({
  page,
  hasNext,
  onPrevious,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="flex items-center justify-center gap-4" aria-label="Product pages">
      <Button
        type="button"
        variant="outline"
        disabled={page === 1}
        onClick={onPrevious}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">Page {page}</span>
      <Button type="button" variant="outline" disabled={!hasNext} onClick={onNext}>
        Next
      </Button>
    </nav>
  );
}

export default function ProductsPage() {
  useSetBreadcrumb([{ label: "Products" }]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const cursor = searchParams.get("cursor") ?? undefined;
  const requestedFilter = searchParams.get("filter");
  const filter: ProductFilter =
    requestedFilter === "course" || requestedFilter === "download"
      ? requestedFilter
      : "all";
  const [products, setProducts] = useState<Product[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorHistory = useRef(new Map<number, string | undefined>([[1, undefined]]));

  useEffect(() => {
    if (page === 1) cursorHistory.current.set(1, undefined);
    setLoading(true);
    setError(null);
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) return { selected: null, products: [] };
        const query = new URLSearchParams({ limit: String(ITEMS_PER_PAGE) });
        if (filter !== "all") query.set("kind", filter);
        if (cursor) query.set("cursor", cursor);
        const response = await fetch(`/api/v1/products?${query.toString()}`, {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": selected.id },
        });
        if (!response.ok) throw new Error("Unable to load products.");
        const listed = (await response.json()) as {
          items?: Product[];
          nextCursor?: string | null;
        };
        return {
          selected,
          products: listed.items ?? [],
          nextCursor: listed.nextCursor ?? null,
        };
      })
      .then((result) => {
        if (!active) return;
        setSchool(result.selected);
        setProducts(result.products);
        setNextCursor(result.nextCursor ?? null);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Unable to load products.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursor, filter, page]);

  function setFilter(next: ProductFilter) {
    cursorHistory.current = new Map([[1, undefined]]);
    router.replace(`/products${buildProductsQuery(next, 1)}`);
  }

  function goToPreviousPage() {
    if (page <= 1) return;
    const previousCursor = cursorHistory.current.get(page - 1);
    if (page > 2 && !cursorHistory.current.has(page - 1)) return;
    router.push(`/products${buildProductsQuery(filter, page - 1, previousCursor)}`);
  }

  function goToNextPage() {
    if (!nextCursor) return;
    cursorHistory.current.set(page + 1, nextCursor);
    router.push(`/products${buildProductsQuery(filter, page + 1, nextCursor)}`);
  }

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Products"
          description="Create and manage courses and digital downloads."
          action={hasSchoolPermission(school, "products:write") ? (
            <Button asChild>
              <Link href="/products/new">
                <Plus className="size-4" />
                New product
              </Link>
            </Button>
          ) : undefined}
        />

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground">Filter</span>
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as ProductFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="download">Digital download</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <ProductListSkeleton />
        ) : products.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Products Found"
            description="You have not added any products yet."
            action={hasSchoolPermission(school, "products:write") ? (
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="size-4" />
                  New product
                </Link>
              </Button>
            ) : undefined}
          />
        ) : (
          <section
            className="grid gap-x-4 gap-y-3 md:grid-cols-2 lg:grid-cols-3"
            aria-label="Products"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                schoolCurrency={school?.currency ?? "USD"}
              />
            ))}
          </section>
        )}
        {!loading && products.length > 0 ? (
          <ProductPagination
            page={page}
            hasNext={Boolean(nextCursor)}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
          />
        ) : null}
        {hasSchoolPermission(school, "products:write") ? (
          <Resources
            links={[
              {
                href: "https://docs.courselit.app/courses/introduction/",
                text: "Create a course",
              },
              {
                href: "https://docs.courselit.app/downloads/introduction/",
                text: "Create a digital download",
              },
            ]}
          />
        ) : null}
      </main>
    </AuthGate>
  );
}
