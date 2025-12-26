"use client";

import { ReactNode, useContext } from "react";
import {
    formattedLocaleDate,
    isEnrolled,
    isLessonCompleted,
} from "@ui-lib/utils";
import { CheckCircled, Circle, Lock } from "@courselit/icons";
import {
    BTN_EXIT_COURSE_TOOLTIP,
    SIDEBAR_TEXT_COURSE_ABOUT,
} from "@ui-config/strings";
import { Profile, Constants } from "@courselit/common-models";
import {
    ProfileContext,
    SiteInfoContext,
    ThemeContext,
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
} from "@components/ui/sidebar";
import { Image } from "@courselit/components-library";
import Link from "next/link";
import { truncate } from "@courselit/utils";
import { Button } from "@components/ui/button";
import { ChevronRight, Clock, LogOutIcon } from "lucide-react";
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
import { usePathname } from "next/navigation";
import { Caption } from "@courselit/page-primitives";
import NextThemeSwitcher from "@components/admin/next-theme-switcher";

export default function ProductPage({
    product,
    children,
}: {
    product: CourseFrontend;
    children: React.ReactNode;
}) {
    const { profile } = useContext(ProfileContext);

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
            <AppSidebar course={product} profile={profile} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-4 justify-between text-foreground">
                    <SidebarTrigger className="-ml-1" />
                    <div className="flex items-center gap-2">
                        <NextThemeSwitcher variant="ghost" />
                        <Tooltip>
                            <TooltipTrigger>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href="/dashboard/my-content">
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
                <div className="p-4">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export function AppSidebar({
    course,
    profile,
    ...rest
}: {
    course: CourseFrontend;
    profile: Partial<Profile>;
} & React.ComponentProps<typeof Sidebar>) {
    const siteinfo = useContext(SiteInfoContext);
    const pathname = usePathname();
    const sideBarItems = generateSideBarItems(
        course,
        profile as Profile,
        pathname,
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
                                                    <Tooltip>
                                                        <TooltipTrigger className="text-foreground">
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
                                                                <span>
                                                                    <Link
                                                                        href={
                                                                            item.href
                                                                        }
                                                                        className="w-full"
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
    badge?: {
        text: string;
        description: string;
    };
    isActive?: boolean;
    items?: {
        title: string;
        href: string;
        icon?: ReactNode;
        isActive?: boolean;
    }[];
}

export function generateSideBarItems(
    course: CourseFrontend,
    profile: Profile,
    pathname: string,
): SidebarItem[] {
    if (!course) return [];

    const items: SidebarItem[] = [
        {
            title: SIDEBAR_TEXT_COURSE_ABOUT,
            href: `/course/${course.slug}/${course.courseId}`,
            isActive: pathname === `/course/${course.slug}/${course.courseId}`,
        },
    ];

    let lastGroupDripDateInMillis = Date.now();

    for (const group of course.groups) {
        // Update lastGroupDripDateInMillis for relative drip types
        if (
            group.drip &&
            group.drip.status &&
            group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase()
        ) {
            lastGroupDripDateInMillis += group?.drip?.delayInMillis ?? 0;
        }

        const groupItem: SidebarItem = {
            title: group.name,
            href: "#",
            isActive: false,
            badge: getDripLabel({
                course,
                group,
                profile,
                lastGroupDripDateInMillis,
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
            groupItem.items!.push({
                title: lesson.title,
                href: `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`,
                isActive,
                icon:
                    profile && profile.userId ? (
                        isEnrolled(course.courseId, profile) ? (
                            isLessonCompleted({
                                courseId: course.courseId,
                                lessonId: lesson.lessonId,
                                profile,
                            }) ? (
                                <CheckCircled />
                            ) : (
                                <Circle />
                            )
                        ) : lesson.requiresEnrollment ? (
                            <Lock />
                        ) : undefined
                    ) : lesson.requiresEnrollment ? (
                        <Lock />
                    ) : undefined,
            });
        }

        items.push(groupItem);
    }

    return items;
}

function getDripLabel({
    course,
    group,
    profile,
    lastGroupDripDateInMillis,
}: {
    course: CourseFrontend;
    group: GroupWithLessons;
    profile: Profile;
    lastGroupDripDateInMillis: number;
}): { text: string; description: string } | undefined {
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
                (delayInMillis - Date.now()) / 86400000,
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

export function isGroupAccessibleToUser(
    course: CourseFrontend,
    profile: Profile,
    group: GroupWithLessons,
): boolean {
    if (!group.drip || !group.drip.status) return true;

    if (!Array.isArray(profile.purchases)) return false;

    for (const purchase of profile.purchases) {
        if (purchase.courseId === course.courseId) {
            if (Array.isArray(purchase.accessibleGroups)) {
                if (purchase.accessibleGroups.includes(group.id)) {
                    return true;
                }
            }
        }
    }

    return false;
}
