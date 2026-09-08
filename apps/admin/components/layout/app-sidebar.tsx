"use client";

import {
  Box,
  Contact,
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
import { useEffect, useState } from "react";
import { type NavItem, NavMain } from "@/components/layout/nav-main";
import { type CurrentAccount, NavUser } from "@/components/layout/nav-user";
import { type School, TeamSwitcher } from "@/components/layout/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const CREATE_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Target },
  { href: "/products", label: "Products", icon: Box },
  {
    href: "/communities",
    label: "Communities",
    icon: MessageCircleHeart,
  },
  { href: "/blogs", label: "Blogs", icon: Text },
  { href: "/pages", label: "Pages", icon: Globe },
  { href: "/contacts", label: "Contacts", icon: Contact },
  {
    href: "#",
    label: "Mails",
    icon: Mail,
    items: [
      { href: "/mails?tab=broadcasts", label: "Broadcasts" },
      { href: "/mails?tab=sequences", label: "Sequences" },
      { href: "/mails?tab=templates", label: "Templates" },
    ],
  },
  {
    href: "#",
    label: "Settings",
    icon: Settings,
    items: [
      { href: "/settings", label: "Branding" },
      { href: "/settings?tab=payment", label: "Payment" },
      { href: "/settings?tab=mails", label: "Mails" },
      { href: "/settings?tab=code-injection", label: "Code Injection" },
      { href: "/settings?tab=miscellaneous", label: "Miscellaneous" },
    ],
  },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/media", label: "Media library", icon: LibraryBig },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function AppSidebar() {
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [account, setAccount] = useState<CurrentAccount | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Load session
    fetch("/api/auth/get-session", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const session = (await res.json()) as { user?: CurrentAccount };
        return session.user ?? null;
      })
      .then((user) => {
        if (!cancelled && user) setAccount(user);
      })
      .catch(() => {});

    // Load schools
    fetch("/api/v1/schools", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { items?: School[] };
      })
      .then((body) => {
        if (cancelled || !body) return;
        const items = body.items ?? [];
        setSchools(items);
        const selected = items.find((s) => s.selected);
        if (selected) setCurrentSchoolId(selected.id);
        else if (items[0]) setCurrentSchoolId(items[0].id);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher schools={schools} currentSchoolId={currentSchoolId} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain label="Create" items={CREATE_NAV} />
        <div className="mt-auto">
          <NavMain items={SECONDARY_NAV} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <NavUser account={account} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
