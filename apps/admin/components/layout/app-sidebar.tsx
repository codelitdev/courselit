"use client";

import {
  Box,
  Contact,
  Globe,
  LibraryBig,
  LifeBuoy,
  Mail,
  Hash,
  MessageCircleHeart,
  Settings,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CourseLitPermission } from "@courselit/api-contract/team-permissions";
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
import { hasSchoolPermission } from "@/lib/school-permissions";

type PermissionedNavItem = NavItem & {
  requiredPermission?: CourseLitPermission;
  items?: PermissionedNavItem[];
};

const CREATE_NAV: PermissionedNavItem[] = [
  { href: "/", label: "Overview", icon: Target },
  {
    href: "/products",
    label: "Products",
    icon: Box,
    requiredPermission: "products:read",
  },
  {
    href: "/community",
    label: "Community",
    icon: MessageCircleHeart,
    requiredPermission: "communities:read",
  },
  {
    href: "/spaces",
    label: "Spaces",
    icon: Hash,
    requiredPermission: "communities:read",
  },
  {
    href: "#",
    label: "Website",
    icon: Globe,
    items: [
      {
        href: "/website/pages",
        label: "Pages",
        requiredPermission: "storefront:read",
      },
      {
        href: "/website/blogs",
        label: "Blogs",
        requiredPermission: "storefront:read",
      },
      {
        href: "/website/settings",
        label: "Settings",
        requiredPermission: "storefront:read",
      },
    ],
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Contact,
    requiredPermission: "contacts:read",
  },
  {
    href: "#",
    label: "Mails",
    icon: Mail,
    items: [
      {
        href: "/mails?tab=broadcasts",
        label: "Broadcasts",
        requiredPermission: "contacts:read",
      },
      {
        href: "/mails?tab=sequences",
        label: "Sequences",
        requiredPermission: "contacts:read",
      },
      {
        href: "/mails?tab=templates",
        label: "Templates",
        requiredPermission: "contacts:read",
      },
      {
        href: "/mails/settings",
        label: "Settings",
        requiredPermission: "contacts:read",
      },
    ],
  },
];

const SECONDARY_NAV: PermissionedNavItem[] = [
  { href: "/support", label: "Support", icon: LifeBuoy },
  {
    href: "/media",
    label: "Media library",
    icon: LibraryBig,
    requiredPermission: "media:read",
  },
  {
    href: "#",
    label: "Settings",
    icon: Settings,
    items: [
      {
        href: "/settings?tab=payment",
        label: "Payments",
        requiredPermission: "commerce:read",
      },
      {
        href: "/settings?tab=team",
        label: "Team",
        requiredPermission: "members:read",
      },
      {
        href: "/settings?tab=api-keys",
        label: "API keys",
        requiredPermission: "api_keys:read",
      },
    ],
  },
];

function filterNav(
  items: readonly PermissionedNavItem[],
  school: School | null,
): PermissionedNavItem[] {
  return items.flatMap((item) => {
    if (
      item.requiredPermission &&
      !hasSchoolPermission(school, item.requiredPermission)
    ) {
      return [];
    }
    if (!item.items) return [item];
    const children = filterNav(item.items, school);
    return children.length > 0 ? [{ ...item, items: children }] : [];
  });
}

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

  const currentSchool =
    schools.find((school) => school.id === currentSchoolId) ??
    schools.find((school) => school.selected) ??
    schools[0] ??
    null;
  const createNav = filterNav(CREATE_NAV, currentSchool);
  const secondaryNav = filterNav(SECONDARY_NAV, currentSchool);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher schools={schools} currentSchoolId={currentSchoolId} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain label="Create" items={createNav} />
        <div className="mt-auto">
          <NavMain items={secondaryNav} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <NavUser account={account} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
