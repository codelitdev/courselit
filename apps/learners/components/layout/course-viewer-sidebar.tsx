"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Folder,
  LockKeyhole,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { LearnerLesson } from "@/components/lesson-viewer";

export type CourseViewerSection = {
  id: string;
  title: string;
  position: number;
  dripEnabled: boolean;
  dripType: "relative-date" | "exact-date" | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
};

export type CourseViewerProduct = {
  id: string;
  title: string;
  kind: "course" | "download";
  discussions: boolean;
  sections: CourseViewerSection[];
  lessons: LearnerLesson[];
};

export function courseViewerHref(path: string, previewToken: string | null) {
  return previewToken ? `${path}#preview=${encodeURIComponent(previewToken)}` : path;
}

function isLessonLocked(lesson: LearnerLesson, previewToken: string | null) {
  if (previewToken || !lesson.requiresEnrollment) return false;
  return !lesson.content && !lesson.mediaId;
}

function sectionAvailability(
  section: CourseViewerSection,
  lessons: LearnerLesson[],
  previewToken: string | null,
) {
  if (previewToken || !section.dripEnabled) return null;
  const nextLesson = lessons
    .filter((lesson) => lesson.availableAt)
    .sort((left, right) =>
      String(left.availableAt).localeCompare(String(right.availableAt)),
    )[0];
  if (!nextLesson?.availableAt) return null;

  const availableAt = new Date(nextLesson.availableAt);
  if (Number.isNaN(availableAt.getTime()) || availableAt <= new Date()) return null;
  return section.dripType === "relative-date"
    ? `${Math.max(1, Math.ceil((availableAt.getTime() - Date.now()) / 86_400_000))} days`
    : availableAt.toLocaleDateString();
}

function lessonStatusIcon(
  lesson: LearnerLesson,
  completedLessonIds: ReadonlySet<string>,
  previewToken: string | null,
) {
  if (previewToken) return null;
  if (isLessonLocked(lesson, previewToken)) {
    return <LockKeyhole aria-label="Locked" className="size-3.5" />;
  }
  return completedLessonIds.has(lesson.id) ? (
    <CheckCircle2 aria-label="Completed" className="size-3.5 text-primary" />
  ) : (
    <Circle aria-label="Not completed" className="size-3.5" />
  );
}

export function CourseViewerSidebar({
  product,
  previewToken,
  completedLessonIds,
  user,
}: {
  product: CourseViewerProduct;
  previewToken: string | null;
  completedLessonIds: ReadonlySet<string>;
  user: { email: string; schoolId: string } | null;
}) {
  const pathname = usePathname();
  const basePath = `/dashboard/courses/${encodeURIComponent(product.id)}`;
  const sections = useMemo(
    () => [...product.sections].sort((left, right) => left.position - right.position),
    [product.sections],
  );
  const lessonsBySection = useMemo(() => {
    const grouped = new Map<string, LearnerLesson[]>();
    for (const lesson of product.lessons) {
      if (!lesson.sectionId) continue;
      const current = grouped.get(lesson.sectionId) ?? [];
      current.push(lesson);
      grouped.set(lesson.sectionId, current);
    }
    return grouped;
  }, [product.lessons]);
  const unsectionedLessons = product.lessons.filter((lesson) => !lesson.sectionId);

  function lessonItem(lesson: LearnerLesson) {
    const href = courseViewerHref(
      `${basePath}/${encodeURIComponent(lesson.id)}`,
      previewToken,
    );
    const active = pathname === `/dashboard/courses/${product.id}/${lesson.id}`;
    return (
      <SidebarMenuSubItem key={lesson.id}>
        <SidebarMenuSubButton asChild isActive={active}>
          <Link href={href}>
            <BookOpen className="size-3.5" />
            <span>{lesson.title}</span>
            {lessonStatusIcon(lesson, completedLessonIds, previewToken)}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  function sectionItem(section: CourseViewerSection, lessons: LearnerLesson[]) {
    const availability = sectionAvailability(section, lessons, previewToken);
    return (
      <Collapsible key={section.id} defaultOpen className="group/collapsible">
        <SidebarGroup className="py-1">
          <SidebarGroupLabel asChild className="h-auto min-h-8 px-0">
            <CollapsibleTrigger className="w-full rounded-md px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Folder className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{section.title}</span>
              {availability ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="size-3" />
                  {availability}
                </span>
              ) : null}
              <ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenuSub>{lessons.map(lessonItem)}</SidebarMenuSub>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  return (
    <Sidebar variant="floating" collapsible="offcanvas" className="bg-background">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard/products">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CourseLitLogo className="size-8" />
                </div>
                <span className="truncate font-semibold">{product.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className="pb-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === basePath}
                  tooltip="About"
                >
                  <Link href={courseViewerHref(basePath, previewToken)}>
                    <BookOpen />
                    <span>About</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {product.discussions && (user || previewToken) ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `${basePath}/discussions`}
                    tooltip="Discussions"
                  >
                    <Link
                      href={courseViewerHref(`${basePath}/discussions`, previewToken)}
                    >
                      <MessageSquare />
                      <span>Discussions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {sections.map((section) =>
          sectionItem(section, lessonsBySection.get(section.id) ?? []),
        )}
        {unsectionedLessons.length > 0
          ? sectionItem(
              {
                id: "unsectioned",
                title: "Other lessons",
                position: Number.MAX_SAFE_INTEGER,
                dripEnabled: false,
                dripType: null,
                dripDelaySeconds: null,
                dripAt: null,
              },
              unsectionedLessons,
            )
          : null}
      </SidebarContent>
    </Sidebar>
  );
}
