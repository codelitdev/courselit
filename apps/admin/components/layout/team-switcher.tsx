"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
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

export type School = {
  id: string;
  name: string;
  subdomain?: string;
  status?: string;
  selected?: boolean;
};

export function TeamSwitcher({
  schools,
  currentSchoolId,
}: {
  schools: School[];
  currentSchoolId: string | null;
}) {
  const { isMobile } = useSidebar();
  const [switching, setSwitching] = useState(false);

  const currentSchool =
    schools.find((s) => s.id === currentSchoolId) ??
    schools.find((s) => s.selected) ??
    schools[0];

  const title = currentSchool?.name ?? "Choose a school";
  const subtitle = currentSchool
    ? currentSchool.subdomain
      ? `${currentSchool.subdomain}.courselit.app`
      : "Active school"
    : "No active school";

  async function handleSelectSchool(schoolId: string) {
    if (schoolId === currentSchool?.id || switching) return;
    setSwitching(true);
    try {
      const response = await fetch("/api/school/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId }),
      });
      if (response.ok) {
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)]">
                <CourseLitLogo className="size-8" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Schools
            </DropdownMenuLabel>
            {schools.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                No schools available.
              </div>
            ) : (
              schools.map((school) => {
                const isSelected = school.id === currentSchool?.id;
                return (
                  <DropdownMenuItem
                    key={school.id}
                    onClick={() => void handleSelectSchool(school.id)}
                    className="gap-2 p-2 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium">
                        {(school.name || "S").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {school.name}
                        </span>
                        {school.subdomain && (
                          <span className="truncate text-xs text-muted-foreground">
                            {school.subdomain}.courselit.app
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/schools">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add school</div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
