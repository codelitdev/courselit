"use client";

import { LogOut, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { CourseDiscussions } from "@/components/course-discussions";
import {
  type CourseViewerProduct,
  CourseViewerSidebar,
} from "@/components/layout/course-viewer-sidebar";
import {
  LearnerButton as Button,
  LearnerText2,
} from "@/components/themed-page-builder";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const basePath = courseViewerPath(productSlug, product.id);
  const discussionOpen = searchParams.get("discussion") === "open";
  const actualLesson = Boolean(currentLessonId);
  const canUseDiscussions = Boolean(
    actualLesson && product.discussions && (user || previewToken),
  );

  function setDiscussionOpen(open: boolean) {
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
        homeHref={`/p/${encodeURIComponent(productSlug)}`}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
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
              <Link href={`/p/${encodeURIComponent(productSlug)}`}>
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
              "--sidebar-width": "22rem",
              "--sidebar-width-mobile": "22rem",
            } as CSSProperties
          }
        >
          <DiscussionStateSync onClose={() => setDiscussionOpen(false)} />
          <Sidebar side="right" collapsible="offcanvas" className="z-40">
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
              <div className="border-b px-4 py-3">
                <LearnerText2 className="font-semibold">
                  Lesson discussions
                </LearnerText2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <CourseDiscussions
                  productId={product.id}
                  lessonId={currentLessonId!}
                  enabled
                  viewerId={user?.id ?? "preview"}
                  previewToken={previewToken}
                  onClose={() => setDiscussionOpen(false)}
                />
              </div>
            </div>
          </Sidebar>
        </SidebarProvider>
      ) : null}
    </SidebarProvider>
  );
}
