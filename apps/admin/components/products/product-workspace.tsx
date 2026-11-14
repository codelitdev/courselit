"use client";

import {
  BookOpen,
  Copy,
  Files,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { CourseLitLoading } from "@/components/loading";
import { PermissionMessage } from "@/components/permission-message";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import {
  canGoLive,
  coursePreviewPath,
  launchChecklist,
  lessonCounts,
  PHASE_LABEL,
  type ProductPhase,
  plural,
  productPhase,
} from "@/lib/product-publishing";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { storefrontUrl } from "@/lib/storefront-url";
import { cn } from "@/lib/utils";
import { ProductContent } from "./product-content";
import { ProductOverview } from "./product-overview";
import { ProductSettings } from "./product-settings";
import type { Lesson, Product, School, Section, StorefrontPlan } from "./product-types";
import { INVITE_LIMIT_COPY } from "@/lib/invite-errors";

export type ProductWorkspaceView = "overview" | "content" | "manage";

export type ProductDetail = Product & {
  sections: Section[];
  lessons: Lesson[];
};

export type WorkspaceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

type ApiError = {
  message?: string;
  details?: { reason?: string };
};

const REASON_MESSAGES: Record<string, string> = {
  ...INVITE_LIMIT_COPY,
  payment_plan_required: "Add a payment plan before going live.",
  section_not_empty: "This section has lessons. Delete them before proceeding.",
  download_last_section: "A digital download must keep at least one section.",
  default_plan_cannot_be_archived:
    "The default payment plan cannot be archived. Select another default first.",
  duplicate_payment_plan: "A payment plan with this type and frequency already exists.",
  included_products_not_allowed: "Product payment plans cannot include other products.",
  product_financial_history:
    "This product has financial history and cannot be deleted.",
  slug_taken: "Another product or page already uses this link.",
};

export function errorText(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

export function kindWord(kind: Product["kind"]) {
  return kind === "course" ? "course" : "download";
}

/** The sales page address without the protocol, for display. */
function displayUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function PhasePill({ phase }: { phase: ProductPhase }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        phase === "live" && "bg-success-soft text-success-ink",
        phase === "draft" && "bg-muted text-muted-foreground",
        phase === "offline" && "bg-destructive/10 text-destructive",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          phase === "live" && "bg-success",
          phase === "draft" && "bg-muted-foreground",
          phase === "offline" && "bg-destructive",
        )}
      />
      {PHASE_LABEL[phase]}
    </span>
  );
}

export function ProductWorkspace({
  productId,
  view,
}: {
  productId: string;
  view: ProductWorkspaceView;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [plans, setPlans] = useState<StorefrontPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");
  const [statusBusy, setStatusBusy] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const request: WorkspaceRequest = useCallback(
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const requestHeaders = new Headers(init.headers);
      requestHeaders.set("x-school-id", school?.id ?? "");
      if (init.body && !requestHeaders.has("content-type")) {
        requestHeaders.set("content-type", "application/json");
      }
      const response = await fetch(path, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers: requestHeaders,
      });
      const body = (await response.json().catch(() => null)) as T & ApiError;
      if (!response.ok) {
        const reason = body?.details?.reason;
        throw new Error(
          (reason && REASON_MESSAGES[reason]) ??
            body?.message ??
            "The request could not be completed.",
        );
      }
      return body as T;
    },
    [school],
  );

  const loadProduct = useCallback(
    async (activeSchool: School, active = true) => {
      const headers = { "x-school-id": activeSchool.id };
      const loaded = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
        credentials: "include",
        cache: "no-store",
        headers,
      });
      if (!active) return;
      if (!loaded.ok) {
        if (loaded.status === 404) {
          router.replace("/products");
          return;
        }
        throw new Error("Unable to load the product.");
      }
      const detail = (await loaded.json()) as ProductDetail;
      const salesPageResponse = await fetch(
        `/api/v1/sales-pages/product/${encodeURIComponent(productId)}`,
        { credentials: "include", cache: "no-store", headers },
      );
      const salesPage = salesPageResponse.ok
        ? ((await salesPageResponse.json()) as ProductDetail["salesPage"])
        : null;
      if (active) setProduct({ ...detail, salesPage });
    },
    [productId, router],
  );

  const loadPlans = useCallback(
    async (activeSchool: School) => {
      if (!hasSchoolPermission(activeSchool, "products:write")) return;
      const response = await fetch(
        `/api/v1/products/${encodeURIComponent(productId)}/plans`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": activeSchool.id },
        },
      );
      if (!response.ok) throw new Error("Unable to load payment plans.");
      const body = (await response.json()) as { items?: StorefrontPlan[] };
      setPlans(body.items ?? []);
    },
    [productId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing products.");
        if (active) setSchool(selected);
        await Promise.all([loadProduct(selected, active), loadPlans(selected)]);
      })
      .catch((caught) => {
        if (active) setLoadError(errorText(caught, "Unable to load the product."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadProduct, loadPlans]);

  const refresh = useCallback(async () => {
    if (!school) return;
    await Promise.all([loadProduct(school), loadPlans(school)]);
  }, [loadPlans, loadProduct, school]);

  const productRoot = `/products/${encodeURIComponent(productId)}`;
  const salesPageUrl = useMemo(() => {
    if (!product) return null;
    const path = product.slug
      ? `/p/${encodeURIComponent(product.slug)}`
      : `/product/${encodeURIComponent(product.id)}`;
    return storefrontUrl(path, school?.storefrontOrigin);
  }, [product, school?.storefrontOrigin]);

  useSetBreadcrumb(
    !product
      ? [{ label: "Products", href: "/products" }]
      : view === "overview"
        ? [{ label: "Products", href: "/products" }, { label: product.title }]
        : [
            { label: "Products", href: "/products" },
            { label: product.title, href: productRoot },
            {
              label:
                view === "content"
                  ? product.kind === "download"
                    ? "Files"
                    : "Content"
                  : "Settings",
            },
          ],
  );

  async function copyLink() {
    if (!salesPageUrl) {
      toast.error("This school has no public address yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(salesPageUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Unable to copy the link.");
    }
  }

  async function changeStatus(status: Product["status"]) {
    if (!product || statusBusy) return;
    const wasPhase = productPhase(product);
    setStatusBusy(true);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
      if (status === "published") {
        if (wasPhase === "draft") {
          setLaunched(true);
        } else {
          toast.success(`${product.title} is live again`);
        }
      } else {
        setOfflineDialogOpen(false);
        setLaunched(false);
        toast.success(`${product.title} is offline.`);
      }
    } catch (caught) {
      toast.error(errorText(caught, "Unable to change whether it is live."));
    } finally {
      setStatusBusy(false);
    }
  }

  async function createPreview() {
    if (previewing) return;
    setPreviewing(true);
    try {
      const grant = await request<{ token: string; expiresAt: string }>(
        `/api/v1/products/${encodeURIComponent(productId)}/preview`,
        { method: "POST", body: JSON.stringify({ ttlSeconds: 900 }) },
      );
      const previewUrl = storefrontUrl(
        coursePreviewPath({ id: productId, slug: product?.slug }, grant.token),
        school?.storefrontOrigin,
      );
      if (!previewUrl) {
        toast.error("This school has no public address to preview on yet.");
      } else {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
        toast.success(
          `Preview opened. It expires at ${new Date(grant.expiresAt).toLocaleTimeString()}.`,
        );
      }
    } catch (caught) {
      toast.error(errorText(caught, "Unable to create a preview."));
    } finally {
      setPreviewing(false);
    }
  }

  async function inviteCustomer() {
    if (inviting || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await request("/api/v1/memberships", {
        method: "POST",
        body: JSON.stringify({
          productId,
          email: inviteEmail.trim(),
          name: inviteName.trim() || "Learner",
        }),
      });
      toast.success(
        `${inviteEmail.trim()} now has access to this ${kindWord(product?.kind ?? "course")}.`,
      );
      setInviteDialogOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch (caught) {
      toast.error(errorText(caught, "Unable to invite the customer."));
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <AuthGate>
        <main className="page-shell">
          <CourseLitLoading
            label="Loading product…"
            className="rounded-xl border bg-card p-12"
          />
        </main>
      </AuthGate>
    );
  }

  if (loadError && !product) {
    return (
      <AuthGate>
        <main className="page-shell">
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        </main>
      </AuthGate>
    );
  }

  if (!product || !school) return null;

  const canWriteProducts = hasSchoolPermission(school, "products:write");
  const canInviteCustomers = hasSchoolPermission(school, "contacts:write");
  const canEditWebsite = hasSchoolPermission(school, "storefront:write");
  const salesPageEditorHref =
    product.salesPage?.pageId && canEditWebsite
      ? `/pages/${encodeURIComponent(product.salesPage.pageId)}/edit?redirectTo=${encodeURIComponent(productRoot)}&resourceType=product&resourceId=${encodeURIComponent(product.id)}`
      : null;

  if (view !== "overview" && !canWriteProducts) {
    return (
      <AuthGate>
        <main className="page-shell">
          <PermissionMessage permission="products:write" />
        </main>
      </AuthGate>
    );
  }

  const phase = productPhase(product);
  const isDownload = product.kind === "download";
  const word = kindWord(product.kind);
  const counts = lessonCounts(product.lessons);
  const steps = launchChecklist({
    kind: product.kind,
    privacy: product.privacy,
    description: product.description,
    hasFeaturedImage: Boolean(product.featuredImage),
    discussions: product.discussions,
    certificate: product.certificate,
    leadMagnet: product.leadMagnet,
    plans,
    lessons: product.lessons,
  });
  const readyToLaunch = canGoLive(steps);
  const urlLabel = displayUrl(salesPageUrl);
  const subLine = isDownload
    ? `Digital download · ${counts.live} of ${plural(counts.total, "file")} live${product.leadMagnet ? " · Lead magnet" : ""}`
    : `Course · ${counts.live} of ${plural(counts.total, "lesson")} live`;

  const tabs = [
    { value: "overview", label: "Overview", href: productRoot, icon: LayoutDashboard },
    {
      value: "content",
      label: isDownload ? "Files" : "Content",
      href: `${productRoot}/content`,
      icon: isDownload ? Files : BookOpen,
    },
    {
      value: "manage",
      label: "Settings",
      href: `${productRoot}/manage`,
      icon: Settings,
    },
  ] as const;

  return (
    <AuthGate>
      <main className="page-shell">
        {canWriteProducts && phase !== "live" ? (
          <StatusBanner
            className=""
            actionLabel="Manage publishing"
            actionHref={phase === "draft" ? `${productRoot}#golive` : productRoot}
          >
            {phase === "offline"
              ? `This ${word} is offline. Nobody can see or join it until it's live again.`
              : `This ${word} is a draft. Nobody can see it until it's live.`}
          </StatusBanner>
        ) : null}

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1
                className="min-w-0 truncate text-[28px] font-bold leading-tight tracking-tight"
                title={product.title}
              >
                {product.title}
              </h1>
              <PhasePill phase={phase} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              {urlLabel ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  <span className="truncate">{urlLabel}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label="Copy link to the sales page"
                    title="Copy link"
                    onClick={() => void copyLink()}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </span>
              ) : null}
              <span>{subLine}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === "overview" && phase !== "draft" ? (
              <Select
                value={analyticsRange}
                onValueChange={(value) => setAnalyticsRange(value as AnalyticsRange)}
              >
                <SelectTrigger className="w-[140px]" aria-label="Period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTICS_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {!isDownload && canWriteProducts ? (
              <Button
                type="button"
                variant="outline"
                disabled={previewing}
                onClick={() => void createPreview()}
              >
                {previewing ? "Opening…" : "Preview"}
              </Button>
            ) : null}
            {salesPageEditorHref ? (
              <Button asChild variant="outline">
                <Link href={salesPageEditorHref}>Edit sales page</Link>
              </Button>
            ) : null}
            {canWriteProducts && phase === "offline" ? (
              <Button
                type="button"
                disabled={statusBusy}
                onClick={() => void changeStatus("published")}
              >
                {statusBusy ? "Going live…" : "Go live again"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-9 px-0"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void copyLink()}>
                  Copy link to sales page
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`${productRoot}/customers`}>Customers</Link>
                </DropdownMenuItem>
                {canInviteCustomers ? (
                  <DropdownMenuItem onSelect={() => setInviteDialogOpen(true)}>
                    Invite a customer
                  </DropdownMenuItem>
                ) : null}
                {canWriteProducts && phase === "live" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setOfflineDialogOpen(true)}
                    >
                      Take {word} offline
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {canWriteProducts ? (
          <nav
            aria-label={isDownload ? "Download sections" : "Course sections"}
            className="-mt-1 flex gap-1.5 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const active = tab.value === view;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 flex-none items-center gap-2 rounded-[var(--radius)] px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-[var(--primary-soft)] font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-[17px]" aria-hidden="true" />
                  {tab.label}
                  {tab.value === "content" && !isDownload && counts.drafts > 0 ? (
                    <span
                      className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
                      aria-label={plural(counts.drafts, "draft")}
                    >
                      {counts.drafts}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {view === "overview" ? (
          <ProductOverview
            product={product}
            school={school}
            phase={phase}
            steps={steps}
            readyToLaunch={readyToLaunch}
            canWrite={canWriteProducts}
            productRoot={productRoot}
            analyticsRange={analyticsRange}
            launching={statusBusy}
            onGoLive={() => void changeStatus("published")}
            launched={launched && phase === "live"}
            onDismissLaunched={() => setLaunched(false)}
            salesPageUrl={salesPageUrl}
            urlLabel={urlLabel}
            onCopyLink={() => void copyLink()}
          />
        ) : null}

        {view === "content" ? (
          <ProductContent
            product={product}
            setProduct={setProduct}
            phase={phase}
            productRoot={productRoot}
            request={request}
            refresh={refresh}
          />
        ) : null}

        {view === "manage" ? (
          <ProductSettings
            product={product}
            school={school}
            plans={plans}
            setPlans={setPlans}
            phase={phase}
            request={request}
            refresh={refresh}
            salesPageUrl={salesPageUrl}
          />
        ) : null}

        <Dialog open={offlineDialogOpen} onOpenChange={setOfflineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take {product.title} offline?</DialogTitle>
              <DialogDescription>
                Its sales page stops working and nobody new can join. People who already
                joined can&apos;t open it until you go live again. Nothing is deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOfflineDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={statusBusy}
                onClick={() => void changeStatus("draft")}
              >
                {statusBusy ? "Taking offline…" : "Take offline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={inviteDialogOpen}
          onOpenChange={(open) => {
            setInviteDialogOpen(open);
            if (!open) {
              setInviteName("");
              setInviteEmail("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a customer</DialogTitle>
              <DialogDescription>
                Grant a learner access to {product.title}. They can sign in with this
                email address.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-customer-name">Name</Label>
                <Input
                  id="invite-customer-name"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder="Learner name"
                  disabled={inviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-customer-email">Email</Label>
                <Input
                  id="invite-customer-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="learner@example.com"
                  disabled={inviting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void inviteCustomer()}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? "Inviting…" : "Invite customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}
