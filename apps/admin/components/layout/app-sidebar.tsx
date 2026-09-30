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
        href: "/mails/broadcasts",
        label: "Broadcasts",
        requiredPermission: "contacts:read",
      },
      {
        href: "/mails/sequences",
        label: "Sequences",
        requiredPermission: "contacts:read",
      },
      {
        href: "/mails/templates",
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
  { href: "/settings", label: "Settings", icon: Settings },
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

export function AppSidebar({
  schools,
  account,
}: {
  schools: School[];
  account: CurrentAccount | null;
}) {
  const currentSchoolId =
    schools.find((school) => school.selected)?.id ?? schools[0]?.id ?? null;

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
