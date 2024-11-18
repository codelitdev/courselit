"use client";

import * as React from "react";
import {
    Box,
    Globe,
    LibraryBig,
    LifeBuoy,
    Mail,
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
    MY_CONTENT_HEADER,
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_MAILS,
    SIDEBAR_MENU_PAGES,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_USERS,
} from "@ui-config/strings";
import { NavSecondary } from "./nav-secondary";
import { usePathname, useSearchParams } from "next/navigation";
const { permissions } = UIConstants;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const siteInfo = React.useContext(SiteInfoContext);
    const profile = React.useContext(ProfileContext);
    const path = usePathname();
    const searchParams = useSearchParams();
    const tab = searchParams?.get("tab");

    const { navMainItems, navProjectItems, navSecondaryItems } =
        getSidebarItems(profile, path, tab);

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
                                {/* <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div> */}
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

function getSidebarItems(profile: Partial<Profile>, path, tab) {
    const navMainItems: any[] = [];

    if (
        checkPermission(profile.permissions!, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        navMainItems.push({
            title: "Overview",
            url: "/dashboard4/overview",
            icon: Target,
            isActive: path === "/dashboard4/overview",
            // items: [],
        });
        navMainItems.push({
            title: "Products",
            url: "/dashboard4/products",
            icon: Box,
            isActive:
                path === "/dashboard4/products" ||
                path.startsWith("/dashboard4/product"),
            items: [],
        });
    }
    if (checkPermission(profile.permissions!, [permissions.publishCourse])) {
        navMainItems.push({
            title: SIDEBAR_MENU_BLOGS,
            url: "/dashboard4/blogs",
            icon: Text,
            isActive:
                path === "/dashboard4/blogs" ||
                path.startsWith("/dashboard4/blog"),
            items: [],
        });
    }
    if (profile.permissions!.includes(permissions.manageSite)) {
        navMainItems.push({
            title: SIDEBAR_MENU_PAGES,
            url: "/dashboard4/pages",
            icon: Globe,
            isActive:
                path === "/dashboard4/pages" ||
                path.startsWith("/dashboard4/page"),
            items: [],
        });
    }
    if (profile.permissions!.includes(permissions.manageUsers)) {
        navMainItems.push({
            title: SIDEBAR_MENU_USERS,
            url: "#",
            icon: Users,
            isActive: path?.startsWith("/dashboard4/users"),
            items: [
                {
                    title: "All users",
                    url: "/dashboard4/users",
                    isActive: path === "/dashboard4/users",
                },
                {
                    title: "Tags",
                    url: "/dashboard4/users/tags",
                    isActive: path === "/dashboard4/users/tags",
                },
            ],
        });
        navMainItems.push({
            title: SIDEBAR_MENU_MAILS,
            url: "#",
            icon: Mail,
            isActive:
                path.startsWith("/dashboard4/mails") ||
                path.startsWith("/dashboard/mail"),
            items: [
                {
                    title: "Broadcasts",
                    url: "/dashboard4/mails?tab=Broadcasts",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/mails?tab=Broadcasts",
                },
                {
                    title: "Sequences",
                    url: "/dashboard4/mails?tab=Sequences",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/mails?tab=Sequences",
                },
            ],
        });
    }
    if (profile.permissions!.includes(permissions.manageSettings)) {
        navMainItems.push({
            title: SIDEBAR_MENU_SETTINGS,
            url: "#",
            icon: Settings,
            isActive: path?.startsWith("/dashboard4/settings"),
            items: [
                {
                    title: "Branding",
                    url: "/dashboard4/settings?tab=Branding",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/settings?tab=Branding",
                },
                {
                    title: "Payment",
                    url: "/dashboard4/settings?tab=Payment",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/settings?tab=Payment",
                },
                {
                    title: "Mails",
                    url: "/dashboard4/settings?tab=Mails",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/settings?tab=Mails",
                },
                {
                    title: "Code injection",
                    url: "/dashboard4/settings?tab=Code%20Injection",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/settings?tab=Code Injection",
                },
                {
                    title: "API Keys",
                    url: "/dashboard4/settings?tab=API%20Keys",
                    isActive:
                        `${path}?tab=${tab}` ===
                        "/dashboard4/settings?tab=API Keys",
                },
            ],
        });
    }

    const navSecondaryItems = [
        {
            title: "Support",
            url: "/dashboard4/support",
            icon: LifeBuoy,
            isActive: path === "/dashboard4/support",
        },
    ];
    const navProjectItems = [
        {
            name: MY_CONTENT_HEADER,
            url: "/dashboard4/my-content",
            icon: LibraryBig,
            isActive: path === "/dashboard4/my-content",
        },
    ];

    return { navMainItems, navSecondaryItems, navProjectItems };
}
