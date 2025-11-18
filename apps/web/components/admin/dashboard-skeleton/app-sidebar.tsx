"use client";

import {
    Box,
    Globe,
    LibraryBig,
    LifeBuoy,
    Mail,
    MessageCircleHeart,
    Settings,
    Target,
    Text,
    Users,
} from "lucide-react";

import { NavMain } from "@components/admin/dashboard-skeleton/nav-main";
import { NavProjects } from "@components/admin/dashboard-skeleton/nav-projects";
import { NavUser } from "@components/admin/dashboard-skeleton/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Image } from "@courselit/components-library";
import { ProfileContext, SiteInfoContext } from "@components/contexts";
import { checkPermission } from "@courselit/utils";
import { Profile, UIConstants } from "@courselit/common-models";
import {
    GET_SET_UP,
    MY_CONTENT_HEADER,
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_MAILS,
    SIDEBAR_MENU_PAGES,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_USERS,
} from "@ui-config/strings";
import { NavSecondary } from "./nav-secondary";
import { usePathname, useSearchParams } from "next/navigation";
import { ComponentProps, useContext, useEffect, useState } from "react";
import { CircularProgress } from "@components/circular-progress";
import { hasPermissionToAccessSetupChecklist } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@ui-config/constants";
import { getSetupChecklist } from "@/app/(with-contexts)/dashboard/(sidebar)/action";
const { permissions } = UIConstants;

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
    const siteInfo = useContext(SiteInfoContext);
    const { profile } = useContext(ProfileContext);
    const path = usePathname();
    const searchParams = useSearchParams();
    const tab = searchParams?.get("tab");
    const [checklist, setChecklist] = useState<string[]>([]);
    const [totalChecklistItems, setTotalChecklistItems] = useState<number>(0);

    useEffect(() => {
        const loadChecklist = async () => {
            try {
                const setupChecklist = await getSetupChecklist();
                if (!setupChecklist) {
                    return;
                }
                setChecklist(setupChecklist.checklist);
                setTotalChecklistItems(setupChecklist.total);
            } catch (error) {}
        };

        if (
            profile &&
            profile.userId &&
            hasPermissionToAccessSetupChecklist(profile.permissions!)
        ) {
            loadChecklist();
        }
    }, [profile]);

    if (!profile) {
        return null;
    }

    const { navMainItems, navProjectItems, navSecondaryItems } =
        getSidebarItems({ profile, path, tab, checklist, totalChecklistItems });

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Image
                                        borderRadius={1}
                                        src={siteInfo.logo?.file || ""}
                                        width="w-[16px]"
                                        height="h-[16px]"
                                        alt="logo"
                                    />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {siteInfo.title}
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavProjects projects={navProjectItems} />
                {navMainItems.length > 0 && <NavMain items={navMainItems} />}
                <NavSecondary items={navSecondaryItems} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

function getSidebarItems({
    profile,
    checklist = [],
    totalChecklistItems = 0,
    path,
    tab,
}: {
    profile: Partial<Profile>;
    checklist: string[];
    totalChecklistItems: number;
    path?: string | null;
    tab?: string | null;
}) {
    const navMainItems: any[] = [];

    if (
        checkPermission(profile.permissions!, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        navMainItems.push({
            title: "Overview",
            url: "/dashboard/overview",
            icon: Target,
            isActive: path === "/dashboard/overview",
        });
        navMainItems.push({
            title: "Products",
            url: "/dashboard/products",
            icon: Box,
            isActive:
                path === "/dashboard/products" ||
                path?.startsWith("/dashboard/product"),
            items: [],
        });
    }
    if (checkPermission(profile.permissions!, [permissions.manageCommunity])) {
        navMainItems.push({
            title: "Communities",
            beta: true,
            url: "/dashboard/communities",
            icon: MessageCircleHeart,
            isActive: path === "/dashboard/communities",
            items: [],
        });
    }
    if (checkPermission(profile.permissions!, [permissions.publishCourse])) {
        navMainItems.push({
            title: SIDEBAR_MENU_BLOGS,
            url: "/dashboard/blogs",
            icon: Text,
            isActive:
                path === "/dashboard/blogs" ||
                path?.startsWith("/dashboard/blog"),
            items: [],
        });
    }
    if (profile.permissions!.includes(permissions.manageSite)) {
        navMainItems.push({
            title: SIDEBAR_MENU_PAGES,
            url: "/dashboard/pages",
            icon: Globe,
            isActive:
                path === "/dashboard/pages" ||
                path?.startsWith("/dashboard/page"),
            items: [],
        });
    }
    if (profile.permissions!.includes(permissions.manageUsers)) {
        navMainItems.push({
            title: SIDEBAR_MENU_USERS,
            url: "#",
            icon: Users,
            isActive: path?.startsWith("/dashboard/users"),
            items: [
                {
                    title: "All users",
                    url: "/dashboard/users",
                    isActive: path === "/dashboard/users",
                },
                {
                    title: "Tags",
                    url: "/dashboard/users/tags",
                    isActive: path === "/dashboard/users/tags",
                },
            ],
        });
        navMainItems.push({
            title: SIDEBAR_MENU_MAILS,
            beta: true,
            url: "#",
            icon: Mail,
            isActive:
                path?.startsWith("/dashboard/mails") ||
                path?.startsWith("/dashboard/mail"),
            items: [
                {
                    title: "Broadcasts",
                    url: "/dashboard/mails?tab=Broadcasts",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard/mails?tab=Broadcasts",
                },
                {
                    title: "Sequences",
                    url: "/dashboard/mails?tab=Sequences",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard/mails?tab=Sequences",
                },
            ],
        });
    }
    if (profile.permissions!.includes(permissions.manageSettings)) {
        const items = [
            {
                title: "Branding",
                url: "/dashboard/settings?tab=Branding",
                isActive:
                    `${path}?tab=${tab}` === "/dashboard/settings?tab=Branding",
            },
            {
                title: "Payment",
                url: "/dashboard/settings?tab=Payment",
                isActive:
                    `${path}?tab=${tab}` === "/dashboard/settings?tab=Payment",
            },
            {
                title: "Mails",
                url: "/dashboard/settings?tab=Mails",
                isActive:
                    `${path}?tab=${tab}` === "/dashboard/settings?tab=Mails",
            },
            {
                title: "Code injection",
                url: "/dashboard/settings?tab=Code%20Injection",
                isActive:
                    `${path}?tab=${tab}` ===
                    "/dashboard/settings?tab=Code Injection",
            },
            {
                title: "API Keys",
                url: "/dashboard/settings?tab=API%20Keys",
                isActive:
                    `${path}?tab=${tab}` === "/dashboard/settings?tab=API Keys",
            },
        ];
        navMainItems.push({
            title: SIDEBAR_MENU_SETTINGS,
            url: "#",
            icon: Settings,
            isActive: path?.startsWith("/dashboard/settings"),
            items,
        });
    }

    const navSecondaryItems: any[] = [];
    if (
        profile &&
        profile.permissions &&
        checkPermission(profile.permissions, ADMIN_PERMISSIONS)
    ) {
        if (totalChecklistItems && checklist.length) {
            navSecondaryItems.push({
                title: GET_SET_UP,
                url: "/dashboard/get-set-up",
                icon: (
                    <CircularProgress
                        strokeWidth={4}
                        value={
                            ((totalChecklistItems - checklist.length) /
                                totalChecklistItems) *
                            100
                        }
                    />
                ),
                isActive: path === "/dashboard/get-set-up",
            });
        }
        navSecondaryItems.push({
            title: "Support",
            url: "/dashboard/support",
            icon: <LifeBuoy />,
            isActive: path === "/dashboard/support",
        });
    }
    const navProjectItems = [
        {
            name: MY_CONTENT_HEADER,
            url: "/dashboard/my-content",
            icon: LibraryBig,
            isActive: path === "/dashboard/my-content",
        },
    ];

    return { navMainItems, navSecondaryItems, navProjectItems };
}
