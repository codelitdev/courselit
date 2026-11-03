"use client";

import { Bell, Receipt, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LearnerButton } from "@/components/themed-page-builder";

const ACCOUNT_TABS = [
  { href: "/dashboard/account/profile", label: "Profile", icon: UserRound },
  {
    href: "/dashboard/account/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/dashboard/account/communities",
    label: "Communities",
    icon: Users,
  },
  { href: "/dashboard/account/purchases", label: "Purchases", icon: Receipt },
] as const;

export function LearnerAccountTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account sections" className="flex flex-wrap gap-2">
      {ACCOUNT_TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <LearnerButton
            key={tab.href}
            asChild
            size="sm"
            variant={active ? "secondary" : "ghost"}
          >
            <Link href={tab.href} aria-current={active ? "page" : undefined}>
              <Icon />
              {tab.label}
            </Link>
          </LearnerButton>
        );
      })}
    </nav>
  );
}
