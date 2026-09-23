"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LearnerText2 } from "@/components/themed-page-builder";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { isNavHrefActive, isNavItemActive } from "@/lib/nav-active";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
}

function isGroupActive(pathname: string, search: string, item: NavItem): boolean {
  if (item.items?.length) {
    return item.items.some((child) => isNavHrefActive(pathname, child.href, search));
  }
  return isNavItemActive(pathname, item.href);
}

function NavCollapsibleItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams ? searchParams.toString() : "";
  const children = item.items ?? [];
  const active = isGroupActive(pathname, search, item);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={active} tooltip={item.label}>
            <item.icon />
            <LearnerText2 component="span">{item.label}</LearnerText2>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => {
              const itemActive = isNavHrefActive(pathname, child.href, search);
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={itemActive}>
                    <Link href={child.href}>
                      <child.icon />
                      <LearnerText2 component="span">{child.label}</LearnerText2>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams ? searchParams.toString() : "";

  return (
    <>
      {items.map((item) => {
        if (item.items?.length) {
          return <NavCollapsibleItem key={item.label} item={item} />;
        }

        const active = isNavHrefActive(pathname, item.href, search);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon />
                <LearnerText2 component="span">{item.label}</LearnerText2>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function NavMain({ label, items }: { label?: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      {label ? (
        <SidebarGroupLabel>
          <LearnerText2 component="span">{label}</LearnerText2>
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        <NavItems items={items} />
      </SidebarMenu>
    </SidebarGroup>
  );
}
