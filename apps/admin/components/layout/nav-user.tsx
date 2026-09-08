"use client";

import { BadgeCheck, ChevronsUpDown, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export interface CurrentAccount {
  email: string;
  name?: string | null;
}

function initialsFor(account: CurrentAccount | null) {
  const source = account?.name || account?.email || "C";
  return source.slice(0, 1).toUpperCase();
}

export function NavUser({ account }: { account: CurrentAccount | null }) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                {initialsFor(account)}
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {account?.name || account?.email || "Admin"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {account?.email || "Signed in"}
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
                  {initialsFor(account)}
                </div>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">
                    {account?.name || account?.email || "Admin"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {account?.email || "Signed in"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <BadgeCheck />
                  Account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await fetch("/api/auth/sign-out", {
                  method: "POST",
                  credentials: "include",
                });
                router.push("/login");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
