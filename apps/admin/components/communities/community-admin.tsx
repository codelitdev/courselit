"use client";

import { ExternalLink, LayoutTemplate, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { CourseLitLoading } from "@/components/loading";
import { PermissionMessage } from "@/components/permission-message";
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
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { storefrontUrl } from "@/lib/storefront-url";
import { cn } from "@/lib/utils";
import { CommunityDetails } from "./community-details";
import { CommunityMembers } from "./community-members";
import { CommunityReports } from "./community-reports";
import { CommunityNotSetUp, CommunitySetup } from "./community-setup";
import {
  type Community,
  communityPagePath,
  errorMessage,
  type SalesPage,
  type School,
  StatusBadge,
  type StorefrontPlan,
} from "./community-shared";

export type CommunityManageSection = "details" | "setup" | "memberships" | "reports";

type ApiError = { message?: string; details?: { reason?: string } };

function communityApiErrorMessage(error: ApiError | null, fallback: string) {
  if (error?.details?.reason === "community_requires_default_payment_plan") {
    return "Add a plan and star the one to show first before going live.";
  }
  if (error?.details?.reason === "community_offline") {
    return "Make the community live before inviting people.";
  }
  return error?.message ?? fallback;
}

/** "3", or "10+" when there are more pending items than one page. */
function pendingLabel(body: { items?: unknown[]; nextCursor?: string | null }) {
  const count = body.items?.length ?? 0;
  if (count === 0) return null;
  return body.nextCursor ? `${count}+` : String(count);
}

const SECTION_LABELS: Record<CommunityManageSection, string | null> = {
  details: null,
  setup: "Set up",
  memberships: "Members",
  reports: "Reports",
};

function sectionFor(pathname: string): CommunityManageSection {
  if (pathname.startsWith("/community/setup")) return "setup";
  if (pathname.startsWith("/community/memberships")) return "memberships";
  if (pathname.startsWith("/community/reports")) return "reports";
  return "details";
}

export function CommunityAdmin() {
  const router = useRouter();
  const section = sectionFor(usePathname());
  const [school, setSchool] = useState<School | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [plans, setPlans] = useState<StorefrontPlan[]>([]);
  const [pendingMembers, setPendingMembers] = useState<string | null>(null);
  const [pendingReports, setPendingReports] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [switching, setSwitching] = useState(false);

  const breadcrumbItems = useMemo(() => {
    const label = SECTION_LABELS[section];
    return label
      ? [{ label: "Community", href: "/community" }, { label }]
      : [{ label: "Community" }];
  }, [section]);
  useSetBreadcrumb(breadcrumbItems);

  const setNotice = useCallback((message: string | null) => {
    if (message) toast.success(message);
  }, []);

  const request = useCallback(
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
      if (!school) throw new Error("Select a school before managing the community.");
      const headers = new Headers(init.headers);
      headers.set("x-school-id", school.id);
      if (init.body && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        credentials: "include",
        headers,
      });
      const body = (await response.json().catch(() => null)) as (T & ApiError) | null;
      if (!response.ok) {
        throw new Error(
          communityApiErrorMessage(body, "The request could not be completed."),
        );
      }
      return body as T;
    },
    [school],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing the community.");
        if (active) setSchool(selected);
      })
      .catch((caught) => {
        if (active) {
          setError(errorMessage(caught, "Unable to load the community."));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshPending = useCallback(
    async (communityId: string) => {
      const base = `/api/v1/communities/${encodeURIComponent(communityId)}`;
      const [members, reports] = await Promise.all([
        request<{ items?: unknown[]; nextCursor?: string | null }>(
          communityPagePath(`${base}/members`, null, { status: "pending" }),
        ).catch(() => ({ items: [] })),
        request<{ items?: unknown[]; nextCursor?: string | null }>(
          communityPagePath(`${base}/reports`, null, { status: "pending" }),
        ).catch(() => ({ items: [] })),
      ]);
      setPendingMembers(pendingLabel(members));
      setPendingReports(pendingLabel(reports));
    },
    [request],
  );

  useEffect(() => {
    if (!school) return;
    let active = true;
    void (async () => {
      const detail = await request<Community>("/api/v1/community");
      const id = encodeURIComponent(detail.id);
      const [salesPage, planBody] = await Promise.all([
        request<SalesPage>(`/api/v1/sales-pages/community/${id}`).catch(() => null),
        request<{ items?: StorefrontPlan[] }>(`/api/v1/communities/${id}/plans`),
      ]);
      if (!active) return;
      setCommunity({ ...detail, salesPage });
      setPlans(planBody.items ?? []);
      if (detail.enabled) await refreshPending(detail.id);
    })()
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "Unable to load the community."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [school, request, refreshPending]);

  const canWrite = hasSchoolPermission(school, "communities:write");
  const canModerate = hasSchoolPermission(school, "communities:moderate");
  const canEditWebsite = hasSchoolPermission(school, "storefront:write");
  const host = school?.storefrontHost?.trim();
  const address = `${host || "[your-school]"}/join`;
  const salesPageUrl = storefrontUrl("/join", school?.storefrontHost);
  const communityUrl = storefrontUrl("/dashboard", school?.storefrontHost);
  const salesPageEditorHref =
    community?.salesPage?.pageId && canEditWebsite
      ? `/pages/${encodeURIComponent(community.salesPage.pageId)}/edit?redirectTo=${encodeURIComponent("/community")}&resourceType=community&resourceId=${encodeURIComponent(community.id)}`
      : null;
  const hasActivePlans = plans.some((plan) => plan.status === "active");

  async function copyAddress() {
    if (!salesPageUrl) return;
    try {
      await navigator.clipboard.writeText(salesPageUrl);
      setNotice("Sales page link copied.");
    } catch {
      setError("Unable to copy the link.");
    }
  }

  async function setEnabled(enabled: boolean) {
    if (!community || switching) return;
    setSwitching(true);
    setError(null);
    try {
      const updated = await request<Community>(`/api/v1/communities/${community.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      setCommunity({ ...updated, salesPage: community.salesPage });
      setNotice(
        enabled
          ? "Your community is live."
          : "Your community is offline. Learners can't see or join it.",
      );
      setConfirmOffline(false);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update the community."));
    } finally {
      setSwitching(false);
    }
  }

  function renderBody() {
    if (!community || !school) return null;
    if (!canWrite && !(section === "reports" && canModerate)) {
      return <PermissionMessage permission="communities:write" />;
    }
    if (!community.enabled && section === "setup") {
      return (
        <CommunitySetup
          school={school}
          community={community}
          plans={plans}
          setPlans={setPlans}
          request={request}
          address={address}
          onLive={(updated) => {
            setCommunity({ ...updated, salesPage: community.salesPage });
            setNotice("Your community is live.");
            router.replace("/community");
          }}
        />
      );
    }
    if (!community.enabled && !hasActivePlans) {
      return (
        <CommunityNotSetUp
          school={school}
          community={community}
          address={address}
          canSetUp={canWrite}
        />
      );
    }

    const tabs = [
      { value: "details", label: "Details", href: "/community", count: null },
      {
        value: "memberships",
        label: "Members",
        href: "/community/memberships",
        count: pendingMembers,
      },
      {
        value: "reports",
        label: "Reports",
        href: "/community/reports",
        count: pendingReports,
      },
    ] as const;
    const activeSection = section === "setup" ? "details" : section;

    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{community.name}</h1>
              {community.enabled ? null : (
                <StatusBadge tone="muted">Offline</StatusBadge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {community.enabled ? (
              communityUrl ? (
                <Button asChild variant="outline">
                  <a href={communityUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> View community
                  </a>
                </Button>
              ) : null
            ) : canWrite ? (
              <Button asChild>
                <Link href="/community/setup">Go live</Link>
              </Button>
            ) : null}
            {salesPageEditorHref ? (
              <Button asChild variant="outline">
                <Link href={salesPageEditorHref}>
                  <LayoutTemplate /> Edit sales page
                </Link>
              </Button>
            ) : null}
            {canWrite && community.enabled ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {salesPageUrl ? (
                    <DropdownMenuItem onSelect={() => void copyAddress()}>
                      Copy sales page link
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setConfirmOffline(true)}
                  >
                    Take offline
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <nav aria-label="Community" className="-mt-2 flex gap-6 border-b">
          {tabs.map((tab) => {
            const active = tab.value === activeSection;
            if (tab.value === "details" && !canWrite) return null;
            if (tab.value === "memberships" && !canWrite) return null;
            if (tab.value === "reports" && !canModerate) return null;
            return (
              <Link
                key={tab.value}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition-colors",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className="rounded-full bg-[var(--primary-soft)] px-1.5 text-xs text-primary">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        {/* Panels stay mounted so switching tabs never reloads them. */}
        <div hidden={activeSection !== "details"}>
          <CommunityDetails
            school={school}
            community={community}
            setCommunity={setCommunity}
            plans={plans}
            setPlans={setPlans}
            request={request}
            address={address}
            salesPageUrl={salesPageUrl}
            salesPageEditorHref={salesPageEditorHref}
            setNotice={setNotice}
          />
        </div>
        {canWrite ? (
          <div hidden={activeSection !== "memberships"}>
            <CommunityMembers
              community={community}
              plans={plans}
              request={request}
              pendingCount={pendingMembers}
              onPendingChanged={() => void refreshPending(community.id)}
              setNotice={setNotice}
              setError={setError}
            />
          </div>
        ) : null}
        {canModerate ? (
          <div hidden={activeSection !== "reports"}>
            <CommunityReports
              community={community}
              request={request}
              pendingCount={pendingReports}
              onPendingChanged={() => void refreshPending(community.id)}
              setNotice={setNotice}
              setError={setError}
            />
          </div>
        ) : null}
        <Dialog open={confirmOffline} onOpenChange={setConfirmOffline}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take the community offline?</DialogTitle>
              <DialogDescription>
                Learners won&apos;t be able to see or join it, and members lose access
                until you bring it back. Nothing is deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOffline(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={switching}
                onClick={() => void setEnabled(false)}
              >
                {switching ? "Taking offline…" : "Take offline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <AuthGate>
      <main className="page-shell">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            <CourseLitLoading />
          </div>
        ) : (
          renderBody()
        )}
      </main>
    </AuthGate>
  );
}
