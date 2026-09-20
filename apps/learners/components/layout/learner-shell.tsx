"use client";

import { ThemeModeSwitcher } from "@frontlit/page-builder/components";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type CourseViewerProduct,
  CourseViewerSidebar,
} from "@/components/layout/course-viewer-sidebar";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { LearnerNotificationsBell } from "@/components/notifications/learner-notifications-bell";
import { LearnerText2 } from "@/components/themed-page-builder";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSchoolThemeMode, useSchoolThemeStyle } from "@/lib/school-theme-context";

export function LearnerShell({
  user,
  course,
  headerTitle,
  headerTitleHref,
  headerContext,
  previewToken = null,
  completedLessonIds = new Set<string>(),
  children,
}: {
  user: { email: string; name?: string | null; schoolId: string } | null;
  course?: CourseViewerProduct;
  headerTitle?: string;
  headerTitleHref?: string;
  headerContext?: string;
  previewToken?: string | null;
  completedLessonIds?: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");
  const theme = useSchoolThemeStyle();
  const { mode, mounted, toggle } = useSchoolThemeMode();

  if (isLoginPage || (!user && !course)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {course ? (
        <CourseViewerSidebar
          product={course}
          previewToken={previewToken}
          completedLessonIds={completedLessonIds}
          user={user}
        />
      ) : user ? (
        <LearnerSidebar user={user} />
      ) : null}
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {headerTitle ? (
            <>
              <div className="h-5 w-px bg-border" aria-hidden="true" />
              <LearnerText2
                component="span"
                className="max-w-[min(20rem,40vw)] truncate font-medium"
              >
                {headerTitleHref ? (
                  <Link href={headerTitleHref}>{headerTitle}</Link>
                ) : (
                  headerTitle
                )}
              </LearnerText2>
            </>
          ) : null}
          {headerContext ? (
            <>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <LearnerText2
                component="span"
                className="max-w-[min(24rem,40vw)] truncate font-medium"
              >
                {headerContext}
              </LearnerText2>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {user ? <LearnerNotificationsBell /> : null}
            <ThemeModeSwitcher
              resolved={mounted ? mode : "light"}
              onToggle={toggle}
              theme={theme}
              size="sm"
              variant="outline"
            />
            {course ? (
              <LearnerText2
                component="span"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <a href="/dashboard">Back to feed</a>
              </LearnerText2>
            ) : null}
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
