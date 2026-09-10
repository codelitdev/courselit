"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const SCHOOL_OPTIONAL_PREFIXES = [
  "/schools",
  "/invitations/accept",
  "/team-invitations",
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith("/login");
  const isFullScreenPageEditor = /^\/pages\/[^/]+\/edit\/?$/.test(pathname);
  const isFullScreenBlogEditor = /^\/blogs\/[^/]+\/edit\/?$/.test(pathname);
  const isFullScreenMailEditor = /^\/mails\/editor\/[^/]+\/?$/.test(pathname);
  const isFullScreenTeamInvitation = /^\/team-invitations\/[^/]+\/?$/.test(pathname);
  const schoolOptional = SCHOOL_OPTIONAL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const [ready, setReady] = useState(isLoginPage || schoolOptional);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginPage || schoolOptional) {
      setReady(true);
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setAuthError(null);

    function redirectToLogin() {
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
        const authBody = (await response.json()) as { user?: unknown };
        if (!authBody?.user) {
          redirectToLogin();
          return;
        }

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
        const body = (await schoolsResponse.json()) as { items?: unknown[] };
        if (cancelled) return;
        if ((body.items ?? []).length === 0) {
          router.replace("/schools");
          return;
        }
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
  }, [isLoginPage, schoolOptional, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <main role={authError ? "alert" : undefined} className="p-12 text-center text-sm">
        {authError ?? "Checking session…"}
      </main>
    );
  }

  if (
    isFullScreenPageEditor ||
    isFullScreenBlogEditor ||
    isFullScreenMailEditor ||
    isFullScreenTeamInvitation
  ) {
    return (
      <BreadcrumbProvider>
        <Toaster />
        <div
          data-full-screen-editor={isFullScreenTeamInvitation ? undefined : true}
          data-full-screen-invitation={isFullScreenTeamInvitation ? true : undefined}
          className="flex h-dvh min-h-0 w-full min-w-0 overflow-hidden"
        >
          {children}
        </div>
      </BreadcrumbProvider>
    );
  }

  return (
    <BreadcrumbProvider>
      <Toaster />
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <AdminBreadcrumb />
          </header>
          <div className="min-h-0 min-w-0 w-full flex-1 overflow-auto p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
