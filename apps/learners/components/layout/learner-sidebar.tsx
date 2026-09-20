"use client";

import {
  Bell,
  ChevronsUpDown,
  Home,
  LogOut,
  MessagesSquare,
  Package,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LearnerSchoolLogo } from "@/components/layout/learner-school-logo";
import { type NavItem, NavMain } from "@/components/layout/nav-main";
import {
  LearnerDropdownMenu,
  LearnerDropdownMenuContent,
  LearnerDropdownMenuItem,
  LearnerDropdownMenuLabel,
  LearnerDropdownMenuSeparator,
  LearnerDropdownMenuTrigger,
  LearnerText2,
} from "@/components/themed-page-builder";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { requestJson } from "@/lib/request-json";
import { clearSchoolId } from "@/lib/school";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/products", label: "Products", icon: Package },
];

type LearnerSpace = {
  id: string;
  name: string;
};

function displayNameFor(user: { email: string; name?: string | null }) {
  return user.name?.trim() || user.email;
}

function initialsFor(displayName: string, email: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("");
  return (initials || email.slice(0, 1) || "L").toUpperCase();
}

export function LearnerSidebar({
  user,
}: {
  user: { email: string; name?: string | null; schoolId: string };
}) {
  const { isMobile } = useSidebar();
  const [spaces, setSpaces] = useState<LearnerSpace[]>([]);
  const displayName = displayNameFor(user);
  const initials = initialsFor(displayName, user.email);

  useEffect(() => {
    let active = true;
    void requestJson<{ items: LearnerSpace[] }>("/api/v1/learner/spaces")
      .then((body) => {
        if (active) setSpaces(body.items);
      })
      .catch(() => {
        // The sidebar should remain usable when the spaces request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const spaceNav: NavItem[] = spaces.map((space) => ({
    href: `/dashboard/s/${encodeURIComponent(space.id)}`,
    label: space.name,
    icon: MessagesSquare,
  }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                <LearnerSchoolLogo className="size-8 object-contain" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <LearnerText2 component="span" className="truncate font-medium">
                  CourseLit
                </LearnerText2>
                <LearnerText2
                  component="span"
                  className="truncate text-xs text-muted-foreground"
                >
                  Learner Portal
                </LearnerText2>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV} />
        {spaceNav.length > 0 ? <NavMain label="Spaces" items={spaceNav} /> : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LearnerDropdownMenu>
              <LearnerDropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                    {initials}
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <LearnerText2 component="span" className="truncate font-medium">
                      {displayName}
                    </LearnerText2>
                    <LearnerText2
                      component="span"
                      className="truncate text-xs text-muted-foreground"
                    >
                      Learner
                    </LearnerText2>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </LearnerDropdownMenuTrigger>
              <LearnerDropdownMenuContent
                className="w-64"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <LearnerDropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                      {initials}
                    </div>
                    <div className="grid min-w-0 flex-1 leading-tight">
                      <LearnerText2 component="span" className="truncate font-medium">
                        {displayName}
                      </LearnerText2>
                      <LearnerText2
                        component="span"
                        className="truncate text-xs text-muted-foreground"
                      >
                        Learner
                      </LearnerText2>
                    </div>
                  </div>
                </LearnerDropdownMenuLabel>
                <LearnerDropdownMenuSeparator />
                <LearnerDropdownMenuItem asChild>
                  <Link href="/dashboard/account/profile">
                    <UserRound />
                    <LearnerText2 component="span">Account</LearnerText2>
                  </Link>
                </LearnerDropdownMenuItem>
                <LearnerDropdownMenuItem asChild>
                  <Link href="/dashboard/account/notifications">
                    <Bell />
                    <LearnerText2 component="span">Notifications</LearnerText2>
                  </Link>
                </LearnerDropdownMenuItem>
                <LearnerDropdownMenuSeparator />
                <LearnerDropdownMenuItem
                  onClick={async () => {
                    await Promise.allSettled([
                      authClient.signOut(),
                      fetch("/api/v1/learner/auth/sign-out", {
                        method: "POST",
                        credentials: "include",
                      }),
                    ]);
                    clearSchoolId();
                    window.location.href = "/";
                  }}
                >
                  <LogOut />
                  <LearnerText2 component="span">Log out</LearnerText2>
                </LearnerDropdownMenuItem>
              </LearnerDropdownMenuContent>
            </LearnerDropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
