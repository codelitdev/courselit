"use client";

import { ReactNode, useContext, useEffect, useRef } from "react";
import constants from "@/config/constants";
import {
    formattedLocaleDate,
    isEnrolled,
    isLessonCompleted,
} from "@ui-lib/utils";
import { CheckCircled, Circle, Lock } from "@courselit/icons";
import {
    BTN_EXIT_COURSE_TOOLTIP,
    PREVIEW_COURSE_MENU_ITEM,
    SIDEBAR_TEXT_COURSE_ABOUT,
    SIDEBAR_TEXT_COURSE_DISCUSSIONS,
} from "@ui-config/strings";
import { Profile, Constants } from "@courselit/common-models";
import {
    ProfileContext,
    SiteInfoContext,
    ThemeContext,
    AddressContext,
} from "@components/contexts";
import { CourseFrontend, GroupWithLessons } from "./helpers";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@components/ui/sidebar";
import { Image } from "@courselit/components-library";
import Link from "next/link";
import { truncate } from "@courselit/utils";
import { Button } from "@components/ui/button";
import {
    BookOpen,
    ChevronRight,
    Clock,
    Folder,
    LogOutIcon,
    MessageSquare,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@components/ui/collapsible";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Caption } from "@courselit/page-primitives";
import NextThemeSwitcher from "@components/admin/next-theme-switcher";
import {
    appendCourseViewerSessionParamsToHref,
    getCourseViewerSessionParams,
    getCourseViewerReturnPath,
    setHrefQueryParam,
} from "@/lib/course-viewer-session-params";
import { Badge } from "@/components/ui/badge";
import ProductDiscussionPanel from "@/components/public/product-discussions/panel";

function MobileStateSync() {
    const { open, setOpenMobile, isMobile } = useSidebar();
    useEffect(() => {
        setOpenMobile(open);
    }, [open, isMobile, setOpenMobile]);
    return null;
}

function DiscussionSidebarSync({
    pathname,
    router,
    searchParams,
}: {
    pathname: string | null;
    router: ReturnType<typeof useRouter>;
    searchParams: ReturnType<typeof useSearchParams>;
}) {
    const { openMobile, isMobile } = useSidebar();
    const prevOpenMobile = useRef(openMobile);
    useEffect(() => {
        if (isMobile && prevOpenMobile.current && !openMobile) {
            const params = new URLSearchParams(searchParams?.toString() || "");
            if (params.has("discussion")) {
                params.delete("discussion");
                const newPath = params.toString()
                    ? `${pathname}?${params.toString()}`
                    : pathname;
                router.push(newPath || "");
            }
        }
        prevOpenMobile.current = openMobile;
    }, [openMobile, isMobile, searchParams, pathname, router]);
    return null;
}

export default function ProductPage({
    product,
    children,
}: {
    product: CourseFrontend;
    children: React.ReactNode;
}) {
    const { profile } = useContext(ProfileContext);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const viewerSessionParams = getCourseViewerSessionParams(searchParams);
    const exitPath = getCourseViewerReturnPath(viewerSessionParams.returnTo);
    const isDiscussionOpen = searchParams?.get("discussion") === "open";
    const router = useRouter();
    const address = useContext(AddressContext);

    const pathSegments = pathname.split("/").filter(Boolean);
    const isLessonPage =
        pathSegments.length === 4 && pathSegments[0] === "course";
    const isActualLessonPage =
        isLessonPage && pathSegments[3] !== "discussions";
    const showDiscussionsAction = product.discussions && isActualLessonPage;
    const discussionsHref = getDiscussionHref({
        pathname,
        searchParams,
        isDiscussionOpen,
    });

    if (!profile) {
        return null;
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "20rem",
                    "--sidebar-width-mobile": "20rem",
                } as React.CSSProperties
            }
            className="courselit-theme"
        >
            <AppSidebar
                course={product}
                profile={profile}
                viewerSessionParams={viewerSessionParams}
            />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-4 justify-between text-foreground transition-all duration-200">
                    <SidebarTrigger className="-ml-1" />
                    <div className="flex items-center gap-2">
                        {product.isPreview && (
                            <Badge variant="secondary">
                                {PREVIEW_COURSE_MENU_ITEM}
                            </Badge>
                        )}
                        {showDiscussionsAction && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={
                                            isDiscussionOpen
                                                ? "secondary"
                                                : "ghost"
                                        }
                                        size="icon"
                                        asChild
                                    >
                                        <Link
                                            href={discussionsHref}
                                            aria-label={
                                                SIDEBAR_TEXT_COURSE_DISCUSSIONS
                                            }
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {SIDEBAR_TEXT_COURSE_DISCUSSIONS}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <NextThemeSwitcher variant="ghost" />
                        <Tooltip>
                            <TooltipTrigger>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href={exitPath}>
                                        <LogOutIcon />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {BTN_EXIT_COURSE_TOOLTIP}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </header>
                <div className="flex flex-1 flex-col min-h-0 min-w-0 p-4">
                    {children}
                </div>
            </SidebarInset>
            {isActualLessonPage && product.discussions && (
                <SidebarProvider
                    open={isDiscussionOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            const params = new URLSearchParams(
                                searchParams?.toString() || "",
                            );
                            params.delete("discussion");
                            const newPath = params.toString()
                                ? `${pathname}?${params.toString()}`
                                : pathname;
                            router.push(newPath || "");
                        }
                    }}
                    style={
                        {
                            "--sidebar-width": "20rem",
                            "--sidebar-width-mobile": "28rem",
                        } as React.CSSProperties
                    }
                    className="min-h-0 w-auto"
                >
                    <MobileStateSync />
                    <DiscussionSidebarSync
                        pathname={pathname}
                        router={router}
                        searchParams={searchParams}
                    />
                    <Sidebar
                        side="right"
                        collapsible="offcanvas"
                        className="z-40"
                    >
                        <ProductDiscussionPanel
                            address={address}
                            productId={product.courseId}
                            slug={product.slug}
                            entityId={pathSegments[3]}
                            className="w-full"
                            onClose={() => {
                                const params = new URLSearchParams(
                                    searchParams?.toString() || "",
                                );
                                params.delete("discussion");
                                const newPath = params.toString()
                                    ? `${pathname}?${params.toString()}`
                                    : pathname;
                                router.push(newPath || "");
                            }}
                        />
                    </Sidebar>
                </SidebarProvider>
            )}
        </SidebarProvider>
    );
}

function getDiscussionHref({
    pathname,
    searchParams,
    isDiscussionOpen,
}: {
    pathname: string;
    searchParams: ReturnType<typeof useSearchParams>;
    isDiscussionOpen: boolean;
}) {
    const currentSearch = searchParams?.toString() || "";
    return setHrefQueryParam(
        currentSearch ? `${pathname}?${currentSearch}` : pathname,
        "discussion",
        isDiscussionOpen ? null : "open",
    );
}

export function AppSidebar({
    course,
    profile,
    viewerSessionParams,
    ...rest
}: {
    course: CourseFrontend;
    profile: Partial<Profile>;
    viewerSessionParams?: ReturnType<typeof getCourseViewerSessionParams>;
} & React.ComponentProps<typeof Sidebar>) {
    const siteinfo = useContext(SiteInfoContext);
    const pathname = usePathname();
    const sideBarItems = generateSideBarItems(
        course,
        profile as Profile,
        pathname,
        viewerSessionParams,
    );
    const { theme } = useContext(ThemeContext);

    return (
        <Sidebar variant="floating" {...rest} className="bg-background">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard/my-content">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                                    <Image
                                        borderRadius={1}
                                        src={siteinfo.logo?.file || ""}
                                        alt="logo"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="grid flex-1 text-left leading-tight text-foreground font-semibold">
                                    {siteinfo.title}
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="gap-0">
                {sideBarItems.map((item, index) =>
                    item.items?.length ? (
                        <Collapsible
                            key={index}
                            asChild
                            defaultOpen={true}
                            className="group/collapsible"
                        >
                            <SidebarGroup>
                                <SidebarGroupLabel
                                    asChild
                                    className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                                >
                                    <CollapsibleTrigger
                                        asChild
                                        className="w-full mb-1"
                                    >
                                        <div>
                                            <span className="flex justify-between items-center gap-2 w-full">
                                                <TooltipProvider
                                                    delayDuration={1000}
                                                >
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <Folder className="h-4 w-4 shrink-0 text-foreground" />
                                                        <Tooltip>
                                                            <TooltipTrigger className="min-w-0 truncate text-foreground">
                                                                {truncate(
                                                                    item.title,
                                                                    item.badge
                                                                        ? 15
                                                                        : 26,
                                                                )}
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {item.title}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </span>
                                                </TooltipProvider>
                                                {item.badge?.text && (
                                                    <Tooltip>
                                                        <TooltipTrigger className="text-muted-foreground">
                                                            <Caption
                                                                theme={
                                                                    theme.theme
                                                                }
                                                                className="flex text-muted-foreground text-xs items-center gap-1"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                                {
                                                                    item.badge
                                                                        .text
                                                                }
                                                            </Caption>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                {
                                                                    item.badge
                                                                        .description
                                                                }
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </span>
                                            <ChevronRight className="ml-auto text-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </div>
                                    </CollapsibleTrigger>
                                </SidebarGroupLabel>
                                {item.items?.length ? (
                                    <CollapsibleContent>
                                        <SidebarGroupContent>
                                            <SidebarMenu className="ml-0 border-l-0 px-1.5">
                                                {item.items.map(
                                                    (item, index) => (
                                                        <SidebarMenuItem
                                                            key={index}
                                                        >
                                                            <SidebarMenuButton
                                                                asChild
                                                                isActive={
                                                                    item.isActive
                                                                }
                                                                className="text-foreground"
                                                            >
                                                                <span className="flex items-center gap-2 w-full">
                                                                    {
                                                                        item.leadingIcon
                                                                    }
                                                                    <Link
                                                                        href={
                                                                            item.href
                                                                        }
                                                                        className="flex-1"
                                                                    >
                                                                        <TooltipProvider
                                                                            delayDuration={
                                                                                1000
                                                                            }
                                                                        >
                                                                            <Tooltip>
                                                                                <TooltipTrigger>
                                                                                    {truncate(
                                                                                        item.title,
                                                                                        22,
                                                                                    )}
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    {
                                                                                        item.title
                                                                                    }
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </Link>
                                                                    {item.icon}
                                                                </span>
                                                            </SidebarMenuButton>
                                                        </SidebarMenuItem>
                                                    ),
                                                )}
                                            </SidebarMenu>
                                        </SidebarGroupContent>
                                    </CollapsibleContent>
                                ) : null}
                            </SidebarGroup>
                        </Collapsible>
                    ) : (
                        <SidebarGroup key={index}>
                            <SidebarGroupContent>
                                <SidebarMenuItem key={index}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={item.isActive}
                                        tooltip={item.title}
                                        className="text-foreground"
                                    >
                                        <Link href={item.href}>
                                            {item.icon}
                                            {item.title}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ),
                )}
            </SidebarContent>
            {!siteinfo.hideCourseLitBranding && (
                <span className="flex justify-center align-center">
                    <a
                        href={`https://courselit.app`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 my-[10px] border rounded-md bg-background text-foreground text-sm text-center"
                    >
                        Powered by{" "}
                        <span className="font-semibold">CourseLit</span>
                    </a>
                </span>
            )}
        </Sidebar>
    );
}

interface SidebarItem {
    title: string;
    href: string;
    icon?: ReactNode;
    badge?: {
        text: string;
        description: string;
    };
    isActive?: boolean;
    items?: {
        title: string;
        href: string;
        icon?: ReactNode;
        leadingIcon?: ReactNode;
        isActive?: boolean;
    }[];
}

export function generateSideBarItems(
    course: CourseFrontend,
    profile: Profile,
    pathname: string,
    viewerSessionParams?: ReturnType<typeof getCourseViewerSessionParams>,
): SidebarItem[] {
    if (!course) return [];

    const isPreview = Boolean(course.isPreview);
    const items: SidebarItem[] = [
        {
            title: SIDEBAR_TEXT_COURSE_ABOUT,
            href: appendCourseViewerSessionParamsToHref(
                `/course/${course.slug}/${course.courseId}`,
                viewerSessionParams,
            ),
            icon: <BookOpen className="h-4 w-4 shrink-0" />,
            isActive: pathname === `/course/${course.slug}/${course.courseId}`,
        },
    ];

    if (course.discussions) {
        items.push({
            title: SIDEBAR_TEXT_COURSE_DISCUSSIONS,
            href: appendCourseViewerSessionParamsToHref(
                `/course/${course.slug}/${course.courseId}/discussions`,
                viewerSessionParams,
            ),
            icon: <MessageSquare className="h-4 w-4 shrink-0" />,
            isActive:
                pathname ===
                `/course/${course.slug}/${course.courseId}/discussions`,
        });
    }

    let lastGroupDripDateInMillis = getRelativeDripAnchorMillis(
        course,
        profile,
    );

    for (const group of course.groups) {
        const groupItem: SidebarItem = {
            title: group.name,
            href: "#",
            isActive: false,
            badge: getDripLabel({
                course,
                group,
                profile,
                lastGroupDripDateInMillis,
                isPreview,
            }),
            items: [],
        };

        for (const lesson of group.lessons) {
            const isActive =
                pathname ===
                `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`;
            if (isActive) {
                groupItem.isActive = true;
            }
            let lessonStatusIcon: ReactNode;
            if (!isPreview) {
                if (!profile?.userId) {
                    lessonStatusIcon = lesson.requiresEnrollment ? (
                        <Lock />
                    ) : undefined;
                } else if (isEnrolled(course.courseId, profile)) {
                    lessonStatusIcon = isLessonCompleted({
                        courseId: course.courseId,
                        lessonId: lesson.lessonId,
                        profile,
                    }) ? (
                        <CheckCircled />
                    ) : (
                        <Circle />
                    );
                } else {
                    lessonStatusIcon = lesson.requiresEnrollment ? (
                        <Lock />
                    ) : undefined;
                }
            }
            groupItem.items!.push({
                title: lesson.title,
                href: appendCourseViewerSessionParamsToHref(
                    `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`,
                    viewerSessionParams,
                ),
                isActive,
                leadingIcon: <BookOpen className="h-4 w-4 shrink-0" />,
                icon: lessonStatusIcon,
            });
        }

        items.push(groupItem);

        // Advance the cumulative relative drip cursor after computing the
        // current group's label so the current delay is counted exactly once.
        if (
            group.drip &&
            group.drip.status &&
            group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase() &&
            !isPreview &&
            !isGroupAccessibleToUser(course, profile as Profile, group)
        ) {
            lastGroupDripDateInMillis += group?.drip?.delayInMillis ?? 0;
        }
    }

    return items;
}

function getDripLabel({
    course,
    group,
    profile,
    lastGroupDripDateInMillis,
    isPreview,
}: {
    course: CourseFrontend;
    group: GroupWithLessons;
    profile: Profile;
    lastGroupDripDateInMillis: number;
    isPreview: boolean;
}): { text: string; description: string } | undefined {
    if (isPreview) {
        return undefined;
    }

    if (
        group.drip?.status &&
        isGroupAccessibleToUser(course, profile as Profile, group)
    ) {
        return undefined;
    }

    if (group.drip && group.drip.status) {
        let availableLabel = "";
        let text = "";
        if (
            group.drip.type ===
            Constants.dripType[0].split("-")[0].toUpperCase()
        ) {
            const delayInMillis =
                (group?.drip?.delayInMillis ?? 0) + lastGroupDripDateInMillis;
            const daysUntilAvailable = Math.ceil(
                (delayInMillis - Date.now()) /
                    constants.relativeDripUnitInMillis,
            );
            availableLabel =
                daysUntilAvailable &&
                !isGroupAccessibleToUser(course, profile as Profile, group)
                    ? isEnrolled(course.courseId, profile)
                        ? `Available in ${daysUntilAvailable} days`
                        : `Available ${daysUntilAvailable} days after enrollment`
                    : "";
            text = `${daysUntilAvailable} days`;
        } else {
            const today = new Date();
            const dripDate = new Date(group?.drip?.dateInUTC ?? "");
            const timeDiff = dripDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            availableLabel =
                daysDiff > 0 && !isGroupAccessibleToUser(course, profile, group)
                    ? `Available on ${formattedLocaleDate(dripDate)}`
                    : "";
            text = formattedLocaleDate(dripDate);
        }
        return {
            text,
            description: availableLabel,
        };
    }

    return undefined;
}

function getRelativeDripAnchorMillis(
    course: CourseFrontend,
    profile: Profile,
): number {
    const purchase = profile.purchases?.find(
        (purchase) => purchase.courseId === course.courseId,
    );

    if (purchase?.lastDripAt) {
        const lastDripAt = normalizeTimestamp(purchase.lastDripAt);
        if (!Number.isNaN(lastDripAt)) {
            return lastDripAt;
        }
    }

    if (purchase?.createdAt) {
        const createdAt = normalizeTimestamp(purchase.createdAt);
        if (!Number.isNaN(createdAt)) {
            return createdAt;
        }
    }

    return Date.now();
}

function normalizeTimestamp(value: string | number | Date): number {
    if (typeof value === "number") {
        return value;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
        return numericValue;
    }

    return new Date(value).getTime();
}

export function isGroupAccessibleToUser(
    course: CourseFrontend,
    profile: Profile,
    group: GroupWithLessons,
): boolean {
    if (!group.drip || !group.drip.status) return true;

    if (!Array.isArray(profile.purchases)) return false;
    const groupId = getGroupId(group);
    if (!groupId) return false;

    for (const purchase of profile.purchases) {
        if (purchase.courseId === course.courseId) {
            if (Array.isArray(purchase.accessibleGroups)) {
                const accessibleGroupIds = purchase.accessibleGroups
                    .map((id) =>
                        id === null || id === undefined ? "" : String(id),
                    )
                    .filter(Boolean);
                if (accessibleGroupIds.includes(groupId)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function getGroupId(group: GroupWithLessons): string | undefined {
    const value =
        (group as GroupWithLessons & { _id?: unknown }).id ??
        (group as GroupWithLessons & { _id?: unknown })._id;
    if (value === null || value === undefined) {
        return undefined;
    }

    return String(value);
}
