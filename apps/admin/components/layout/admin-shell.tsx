"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AdminShellContext } from "@/components/layout/admin-shell-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import type { CurrentAccount } from "@/components/layout/nav-user";
import type { School } from "@/components/layout/team-switcher";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { PermissionDeniedFeedback } from "@/components/permission-denied-feedback";
import { CourseLitLoadingIcon } from "@/components/loading";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  persistInvitationToken,
  readInvitationTokenFromHash,
} from "@/lib/invitation-token";

const SCHOOL_OPTIONAL_PREFIXES = [
  "/schools",
  "/invitations/accept",
  "/team-invitations",
];

function ShellLoadingOverlay({
  label,
  error,
}: {
  label: string;
  error?: string | null;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background">
      {error ? (
        <p role="alert" className="max-w-md px-6 text-center text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div role="status" aria-live="polite" aria-label={label}>
          <CourseLitLoadingIcon size={48} />
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith("/login");
  const isFullScreenPageEditor = /^\/pages\/[^/]+\/edit\/?$/.test(pathname);
  const isFullScreenBlogEditor = /^(?:\/website)?\/blogs\/[^/]+\/edit\/?$/.test(
    pathname,
  );
  const isFullScreenMailEditor =
    /^\/mails\/(?:editor\/[^/]+|templates\/[^/]+\/edit)\/?$/.test(pathname);
  const isFullScreenTeamInvitation = /^\/team-invitations\/[^/]+\/?$/.test(
    pathname,
  );
  const schoolOptional = SCHOOL_OPTIONAL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const bypassAuthentication = isLoginPage || isFullScreenTeamInvitation;
  const accessScope = bypassAuthentication
    ? "public"
    : schoolOptional
      ? "school-optional"
      : "school-required";

  const [ready, setReady] = useState(bypassAuthentication);
  const [checkedScope, setCheckedScope] = useState<string | null>(
    bypassAuthentication ? accessScope : null,
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [pageLoaders, setPageLoaders] = useState<Map<string, string>>(
    () => new Map(),
  );

  const registerPageLoading = useCallback((id: string, label: string) => {
    setPageLoaders((current) => new Map(current).set(id, label));
  }, []);
  const clearPageLoading = useCallback((id: string) => {
    setPageLoaders((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  const shellContext = useMemo(
    () => ({ account, schools, registerPageLoading, clearPageLoading }),
    [account, schools, registerPageLoading, clearPageLoading],
  );

  const shellAccessReady =
    bypassAuthentication || (ready && checkedScope === accessScope);
  const pageLoadingLabel = [...pageLoaders.values()].at(-1) ?? null;
  const shellLoadingLabel =
    !shellAccessReady
      ? "Loading your workspace"
      : pageLoadingLabel;
  const shellError = shellAccessReady ? null : authError;
  const showLoadingOverlay = Boolean(shellError || shellLoadingLabel);
  const isFullScreen =
    isFullScreenPageEditor ||
    isFullScreenBlogEditor ||
    isFullScreenMailEditor ||
    isFullScreenTeamInvitation;

  useEffect(() => {
    if (bypassAuthentication) {
      setReady(true);
      setCheckedScope(accessScope);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setAuthError(null);

    function redirectToLogin() {
      const token = readInvitationTokenFromHash(window.location.hash);
      if (token) {
        const invitationMatch = /^\/team-invitations\/([^/]+)\/?$/.exec(
          window.location.pathname,
        );
        if (invitationMatch?.[1]) {
          persistInvitationToken(decodeURIComponent(invitationMatch[1]), token);
        } else {
          persistInvitationToken(token);
        }
      }

      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set(
        "next",
        `${window.location.pathname}${window.location.search}`,
      );
      router.replace(`${loginUrl.pathname}${loginUrl.search}`);
    }

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/get-session", {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled) return;
        if (response.status === 429) {
          retryTimer = setTimeout(() => {
            if (!cancelled) void checkSession();
          }, 2000);
          return;
        }
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok) {
          setAuthError("Unable to verify your session. Please try again.");
          return;
        }

        const authBody = (await response.json()) as { user?: CurrentAccount };
        if (!authBody?.user) {
          redirectToLogin();
          return;
        }
        setAccount(authBody.user);

        const schoolsResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (schoolsResponse.status === 429) {
          retryTimer = setTimeout(() => {
            if (!cancelled) void checkSession();
          }, 2000);
          return;
        }
        if (schoolsResponse.status === 401) {
          redirectToLogin();
          return;
        }
        if (!schoolsResponse.ok) {
          setAuthError("Unable to verify your school access. Please try again.");
          return;
        }

        const body = (await schoolsResponse.json()) as { items?: School[] };
        const items = Array.isArray(body.items) ? body.items : [];
        if (cancelled) return;
        setSchools(items);
        if (items.length === 0 && !schoolOptional) {
          router.replace("/schools");
          return;
        }
        setCheckedScope(accessScope);
        setReady(true);
      } catch {
        if (!cancelled) {
          setAuthError("Unable to verify your session. Please try again.");
        }
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [accessScope, bypassAuthentication, router, schoolOptional]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminShellContext.Provider value={shellContext}>
      <BreadcrumbProvider>
        <Toaster />
        <PermissionDeniedFeedback />
        {isFullScreen ? (
          <div
            data-full-screen-editor={isFullScreenTeamInvitation ? undefined : true}
            data-full-screen-invitation={isFullScreenTeamInvitation ? true : undefined}
            className="relative flex h-dvh min-h-0 w-full min-w-0 overflow-hidden"
          >
            {shellAccessReady ? (
              <div
                aria-hidden={showLoadingOverlay || undefined}
                className={`h-full min-h-0 min-w-0 flex-1 ${showLoadingOverlay ? "invisible" : ""}`}
              >
                {children}
              </div>
            ) : null}
            {showLoadingOverlay ? (
              <ShellLoadingOverlay
                label={shellLoadingLabel ?? "Loading"}
                error={shellError}
              />
            ) : null}
          </div>
        ) : (
          <SidebarProvider defaultOpen={true}>
            <AppSidebar schools={schools} account={account} />
            <SidebarInset>
              <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                />
                <AdminBreadcrumb />
                <div className="ml-auto">
                  <NotificationsBell />
                </div>
              </header>
              <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden">
                {shellAccessReady ? (
                  <div
                    aria-hidden={showLoadingOverlay || undefined}
                    className={`h-full overflow-auto p-6 ${showLoadingOverlay ? "invisible" : ""}`}
                  >
                    {children}
                  </div>
                ) : null}
                {showLoadingOverlay ? (
                  <ShellLoadingOverlay
                    label={shellLoadingLabel ?? "Loading"}
                    error={shellError}
                  />
                ) : null}
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
      </BreadcrumbProvider>
    </AdminShellContext.Provider>
  );
}
