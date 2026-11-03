"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useOnboarding } from "./use-onboarding";

/** Top-of-nav "Onboarding" entry. Owner only, hidden once dismissed. */
export function OnboardingNavItem() {
  const pathname = usePathname();
  const { isOwner, state, progress } = useOnboarding();

  if (!isOwner || !state || state.checklistHidden) return null;

  return (
    <SidebarGroup className="pb-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/onboarding"}
            tooltip="Onboarding"
            className={cn(
              "font-semibold",
              progress.allDone
                ? "bg-success-soft text-success-ink hover:bg-success-soft hover:text-success-ink data-[active=true]:bg-success-soft data-[active=true]:text-success-ink data-[active=true]:shadow-[inset_0_0_0_1.5px_var(--success)]"
                : "bg-primary-soft text-primary-ink hover:bg-primary/20 hover:text-primary-ink data-[active=true]:bg-primary-soft data-[active=true]:text-primary-ink data-[active=true]:shadow-[inset_0_0_0_1.5px_var(--primary)]",
            )}
          >
            <Link href="/onboarding">
              <span
                aria-hidden="true"
                className="size-4 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(currentColor ${progress.percent}%, color-mix(in oklch, currentColor 25%, transparent) 0)`,
                  WebkitMask: "radial-gradient(circle, transparent 4.5px, #000 5px)",
                  mask: "radial-gradient(circle, transparent 4.5px, #000 5px)",
                }}
              />
              <span>Onboarding</span>
              <span className="ml-auto shrink-0 rounded-full bg-card px-1.5 py-1 font-mono text-[11.5px] font-semibold leading-none group-data-[collapsible=icon]:hidden">
                {progress.allDone ? "Done" : `${progress.doneCount}/${progress.total}`}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
