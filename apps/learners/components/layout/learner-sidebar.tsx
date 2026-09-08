"use client";

import {
  Bell,
  ChevronsUpDown,
  LogOut,
  MessageCircleHeart,
  Package,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { type NavItem, NavMain } from "@/components/layout/nav-main";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
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
import { clearSchoolId } from "@/lib/school";

const NAV: NavItem[] = [
  { href: "/dashboard/feed", label: "Feed", icon: MessageCircleHeart },
  { href: "/dashboard/products", label: "Products", icon: Package },
];

function initialsFor(email: string) {
  return (email.slice(0, 1) || "L").toUpperCase();
}

export function LearnerSidebar({
  user,
}: {
  user: { email: string; schoolId: string };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)]">
                <CourseLitLogo className="size-8" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">CourseLit</span>
                <span className="truncate text-xs text-muted-foreground">
                  Learner Portal
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                    {initialsFor(user.email)}
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.email}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Learner
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                      {initialsFor(user.email)}
                    </div>
                    <div className="grid min-w-0 flex-1 leading-tight">
                      <span className="truncate font-medium">{user.email}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        Learner
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account">
                    <UserRound />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/notifications">
                    <Bell />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
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
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
