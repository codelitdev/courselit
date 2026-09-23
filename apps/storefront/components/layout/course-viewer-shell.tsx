"use client";

import { ThemeModeSwitcher } from "@frontlit/page-builder/components";
import { ArrowLeft, ChevronRight, LogOut, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CourseSpaceDiscussion } from "@/components/course-space-discussion";
import {
  type CourseViewerProduct,
  CourseViewerSidebar,
  courseViewerEntryPointFromParam,
  courseViewerExitHref,
  courseViewerHref,
} from "@/components/layout/course-viewer-sidebar";
import {
  LearnerButton as Button,
  LearnerLink,
  LearnerText2,
} from "@/components/themed-page-builder";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSchoolThemeMode, useSchoolThemeStyle } from "@/lib/school-theme-context";
import { truncate } from "@/lib/utils";

export function courseViewerPath(
  productSlug: string,
  productId: string,
  lessonId?: string,
) {
  const path = `/course/${encodeURIComponent(productSlug)}/${encodeURIComponent(productId)}`;
  return lessonId ? `${path}/${encodeURIComponent(lessonId)}` : path;
}

function DiscussionStateSync({ onClose }: { onClose: () => void }) {
  const { isMobile, open, openMobile, setOpenMobile } = useSidebar();
  const previousOpenMobile = useRef(openMobile);

  useEffect(() => {
    if (isMobile) setOpenMobile(open);
  }, [isMobile, open, setOpenMobile]);

  useEffect(() => {
    if (isMobile && previousOpenMobile.current && !openMobile) onClose();
    previousOpenMobile.current = openMobile;
  }, [isMobile, onClose, openMobile]);

  return null;
}

export function CourseViewerShell({
  product,
  productSlug,
  user,
  previewToken,
  completedLessonIds,
  currentLessonId,
  children,
}: {
  product: CourseViewerProduct;
  productSlug: string;
  user: { id: string; email: string; schoolId: string } | null;
  previewToken: string | null;
  completedLessonIds: ReadonlySet<string>;
  currentLessonId?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useSchoolThemeStyle();
  const { mode, mounted, toggle } = useSchoolThemeMode();
  const basePath = courseViewerPath(productSlug, product.id);
  const entryPoint = courseViewerEntryPointFromParam(searchParams.get("from"));
  const exitHref = courseViewerExitHref(productSlug, entryPoint);
  const discussionOpen = searchParams.get("discussion") === "open";
  const [discussionPostId, setDiscussionPostId] = useState<string | null>(null);
  const currentLesson = currentLessonId
    ? product.lessons.find((lesson) => lesson.id === currentLessonId)
    : null;
  const actualLesson = Boolean(currentLessonId);
  const canUseDiscussions = Boolean(
    actualLesson &&
      product.discussions &&
      product.discussionSpaceId &&
      (user || previewToken),
  );

  function setDiscussionOpen(open: boolean) {
    if (!open) setDiscussionPostId(null);
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set("discussion", "open");
    else params.delete("discussion");
    const query = params.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, {
      scroll: false,
    });
  }

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "20rem",
          "--sidebar-width-mobile": "20rem",
        } as CSSProperties
      }
      className="min-h-svh"
    >
      <CourseViewerSidebar
        product={product}
        previewToken={previewToken}
        completedLessonIds={completedLessonIds}
        user={user}
        basePath={basePath}
        homeHref={exitHref}
        entryPoint={entryPoint}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <nav
              aria-label="Course breadcrumb"
              className="flex min-w-0 items-center gap-2"
            >
              <LearnerLink
                href={courseViewerHref(basePath, previewToken, entryPoint)}
                className="min-w-0 max-w-[min(14rem,30vw)] truncate font-medium text-muted-foreground hover:text-foreground"
                title={product.title}
              >
                {truncate(product.title, 20) || "Course"}
              </LearnerLink>
              {currentLesson ? (
                <>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <LearnerText2
                    component="span"
                    className="min-w-0 max-w-[min(20rem,40vw)] truncate font-medium"
                    title={currentLesson.title}
                  >
                    {truncate(currentLesson.title, 30) || "Lesson"}
                  </LearnerText2>
                </>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeModeSwitcher
              resolved={mounted ? mode : "light"}
              onToggle={toggle}
              theme={theme}
              size="sm"
              variant="outline"
            />
            {previewToken ? (
              <LearnerText2
                component="span"
                className="rounded-md border bg-muted px-2 py-1 text-muted-foreground"
              >
                Preview
              </LearnerText2>
            ) : null}
            {canUseDiscussions ? (
              <Button
                aria-label="Open discussions"
                variant={discussionOpen ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDiscussionOpen(!discussionOpen)}
              >
                <MessageSquare className="size-4" />
                <LearnerText2 component="span" className="hidden sm:inline">
                  Discussions
                </LearnerText2>
              </Button>
            ) : null}
            <Button asChild aria-label="Exit course" variant="ghost" size="sm">
              <Link href={exitHref}>
                <LogOut className="size-4" />
                <LearnerText2 component="span" className="hidden sm:inline">
                  Exit
                </LearnerText2>
              </Link>
            </Button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-8">
          {children}
        </div>
      </SidebarInset>
      {canUseDiscussions ? (
        <SidebarProvider
          open={discussionOpen}
          onOpenChange={setDiscussionOpen}
          className="min-h-0 w-auto"
          style={
            {
              "--sidebar-width": "24rem",
              "--sidebar-width-mobile": "20rem",
            } as CSSProperties
          }
        >
          <DiscussionStateSync onClose={() => setDiscussionOpen(false)} />
          <Sidebar side="right" collapsible="offcanvas" className="z-40">
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
              <div className="flex h-16 shrink-0 items-center border-b px-4 py-3">
                {discussionPostId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2"
                    aria-label="Back to discussion space"
                    onClick={() => setDiscussionPostId(null)}
                  >
                    <ArrowLeft className="size-4" />
                    Back to discussion space
                  </Button>
                ) : (
                  <LearnerText2 className="font-semibold">Discussion space</LearnerText2>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <CourseSpaceDiscussion
                  spaceId={product.discussionSpaceId}
                  previewToken={previewToken}
                  embeddedPostId={discussionPostId}
                  onEmbeddedPostIdChange={setDiscussionPostId}
                />
              </div>
            </div>
          </Sidebar>
        </SidebarProvider>
      ) : null}
    </SidebarProvider>
  );
}
