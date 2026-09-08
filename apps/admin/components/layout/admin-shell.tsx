"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const SCHOOL_OPTIONAL_PREFIXES = ["/schools", "/invitations/accept"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith("/login");
  const isFullScreenPageEditor = /^\/pages\/[^/]+\/edit\/?$/.test(pathname);
  const isFullScreenBlogEditor = /^\/blogs\/[^/]+\/edit\/?$/.test(pathname);
  const isFullScreenMailEditor = /^\/mails\/editor\/[^/]+\/?$/.test(pathname);
  const schoolOptional = SCHOOL_OPTIONAL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const [ready, setReady] = useState(isLoginPage || schoolOptional);

  useEffect(() => {
    if (isLoginPage || schoolOptional) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void fetch("/api/auth/get-session", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (response.status === 429) return "rate_limited" as const;
        if (!response.ok) return false;
        const body = (await response.json()) as { user?: unknown };
        return Boolean(body?.user);
      })
      .then(async (authResult) => {
        if (cancelled) return;
        if (authResult === "rate_limited") {
          setReady(true);
          return;
        }
        if (!authResult) {
          setReady(true);
          return;
        }
        const schoolsResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (schoolsResponse.status === 429 || !schoolsResponse.ok) {
          // If rate limited or an error occurred, do NOT assume 0 schools and do NOT redirect to /schools
          setReady(true);
          return;
        }
        const body = (await schoolsResponse.json()) as { items?: unknown[] };
        if (cancelled) return;
        if ((body.items ?? []).length === 0) {
          router.replace("/schools");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoginPage, schoolOptional, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isFullScreenPageEditor || isFullScreenBlogEditor || isFullScreenMailEditor) {
    return (
      <BreadcrumbProvider>
        <Toaster />
        <div
          data-full-screen-editor
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
            {ready ? (
              children
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
