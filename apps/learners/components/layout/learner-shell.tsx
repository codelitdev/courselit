"use client";

import { usePathname } from "next/navigation";
import {
  type CourseViewerProduct,
  CourseViewerSidebar,
} from "@/components/layout/course-viewer-sidebar";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { LearnerText2 } from "@/components/themed-page-builder";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function LearnerShell({
  user,
  course,
  headerTitle,
  previewToken = null,
  completedLessonIds = new Set<string>(),
  children,
}: {
  user: { email: string; schoolId: string } | null;
  course?: CourseViewerProduct;
  headerTitle?: string;
  previewToken?: string | null;
  completedLessonIds?: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");

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
              <LearnerText2 component="span" className="font-medium">{headerTitle}</LearnerText2>
            </>
          ) : null}
          {course ? (
            <LearnerText2
              component="span"
              className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <a href="/dashboard/feed">Back to feed</a>
            </LearnerText2>
          ) : null}
        </header>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
