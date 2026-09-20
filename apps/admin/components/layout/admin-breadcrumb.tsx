"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  type BreadcrumbItem as BreadcrumbItemType,
  useBreadcrumbItems,
} from "@/components/layout/breadcrumb-context";

export function getFallbackBreadcrumbs(pathname: string): BreadcrumbItemType[] {
  if (!pathname || pathname === "/" || pathname === "") {
    return [{ label: "Overview" }];
  }

  const clean = pathname.replace(/\/+$/, "");

  // Products routes:
  // /products
  // /products/new
  // /products/:productId
  // /products/:productId/content
  // /products/:productId/content/section/new
  // /products/:productId/content/section/:sectionId
  // /products/:productId/content/section/:sectionId/lesson
  // /products/:productId/manage
  // /products/:productId/manage/discussions
  // /products/:productId/manage/discussions/reports
  if (clean === "/products") {
    return [{ label: "Products" }];
  }
  if (clean === "/products/new") {
    return [
      { label: "Products", href: "/products" },
      { label: "New Product" },
    ];
  }
  if (clean.startsWith("/products/")) {
    const parts = clean.split("/").filter(Boolean);
    const productId = parts[1];
    const productRoot = `/products/${productId}`;
    const crumbs: BreadcrumbItemType[] = [
      { label: "Products", href: "/products" },
    ];

    if (parts.length === 2) {
      crumbs.push({ label: "Product" });
      return crumbs;
    }

    crumbs.push({ label: "Product", href: productRoot });

    if (parts[2] === "content") {
      const contentRoot = `${productRoot}/content`;
      if (parts.length === 3) {
        crumbs.push({ label: "Content" });
        return crumbs;
      }
      crumbs.push({ label: "Content", href: contentRoot });

      if (parts[3] === "section") {
        if (parts[4] === "new") {
          crumbs.push({ label: "New Section" });
          return crumbs;
        }
        const sectionId = parts[4];
        const sectionRoot = `${contentRoot}/section/${sectionId}`;
        if (parts.length === 5) {
          crumbs.push({ label: "Edit Section" });
          return crumbs;
        }
        if (parts[5] === "lesson") {
          crumbs.push({ label: "Edit Section", href: sectionRoot });
          crumbs.push({ label: "Lesson" });
          return crumbs;
        }
      }
    } else if (parts[2] === "manage") {
      const manageRoot = `${productRoot}/manage`;
      if (parts.length === 3) {
        crumbs.push({ label: "Settings" });
        return crumbs;
      }
      crumbs.push({ label: "Settings", href: manageRoot });

      if (parts[3] === "discussions") {
        if (parts.length === 4) {
          crumbs.push({ label: "Discussions" });
          return crumbs;
        }
        if (parts[4] === "reports") {
          crumbs.push({ label: "Discussions", href: `${manageRoot}/discussions` });
          crumbs.push({ label: "Reports" });
          return crumbs;
        }
      }
    }
    return crumbs;
  }

  // Community routes:
  // /community
  // /community/:id
  // /community/:id/manage
  if (clean === "/communities" || clean === "/community") {
    return [{ label: "Community" }];
  }
  if (clean === "/spaces") {
    return [{ label: "Spaces" }];
  }
  if (clean === "/community/new" || clean === "/communities/new") {
    return [{ label: "Community", href: "/community" }];
  }
  if (clean === "/community/memberships" || clean === "/community/manage/memberships") {
    return [
      { label: "Community", href: "/community" },
      { label: "Members" },
    ];
  }
  if (clean === "/community/plans" || clean === "/community/manage/plans") {
    return [
      { label: "Community", href: "/community" },
      { label: "Payment plans" },
    ];
  }
  if (clean === "/community/reports" || clean === "/community/manage/reports") {
    return [
      { label: "Community", href: "/community" },
      { label: "Moderation" },
    ];
  }

  // Contacts / Learners
  if (clean === "/contacts" || clean === "/users" || clean === "/learners") {
    return [{ label: "Contacts" }];
  }
  if (
    clean.startsWith("/contacts/") ||
    clean.startsWith("/users/") ||
    clean.startsWith("/learners/")
  ) {
    return [
      { label: "Contacts", href: "/contacts" },
      { label: "Contact Details" },
    ];
  }

  // Certificates
  if (clean.startsWith("/certificates")) {
    return [{ label: "Certificates" }];
  }

  // Media
  if (clean.startsWith("/media")) {
    return [{ label: "Media" }];
  }

  // Website / Settings
  if (clean === "/website") {
    return [{ label: "Website", href: "/website/pages" }];
  }
  if (clean === "/website/pages") {
    return [
      { label: "Website", href: "/website/pages" },
      { label: "Pages" },
    ];
  }
  if (clean === "/website/blogs") {
    return [
      { label: "Website", href: "/website/pages" },
      { label: "Blogs" },
    ];
  }
  if (clean === "/website/settings") {
    return [
      { label: "Website", href: "/website/pages" },
      { label: "Settings" },
    ];
  }
  if (clean === "/mails/settings") {
    return [
      { label: "Mails", href: "/mails?tab=broadcasts" },
      { label: "Settings" },
    ];
  }
  if (clean === "/settings") {
    return [{ label: "Settings" }];
  }
  if (clean.startsWith("/settings/")) {
    return [
      { label: "Settings", href: "/settings" },
      { label: "Configuration" },
    ];
  }

  // Schools
  if (clean.startsWith("/schools")) {
    return [{ label: "Schools" }];
  }

  // Account
  if (clean.startsWith("/account")) {
    return [{ label: "Account" }];
  }

  // Support
  if (clean.startsWith("/support")) {
    return [{ label: "Support" }];
  }

  // Blogs
  if (clean.startsWith("/blogs")) {
    return [{ label: "Blogs" }];
  }

  // Pages
  if (clean.startsWith("/pages")) {
    return [{ label: "Pages" }];
  }

  return [];
}

export function AdminBreadcrumb() {
  const explicitItems = useBreadcrumbItems();
  const pathname = usePathname();
  const fallback = getFallbackBreadcrumbs(pathname);

  // If explicit items exist, use them. If explicit items only have 1 generic entry
  // but fallback has deeper navigation hierarchy, prefer fallback.
  const items =
    explicitItems.length > 1
      ? explicitItems
      : fallback.length > explicitItems.length
        ? fallback
        : explicitItems.length === 1
          ? explicitItems
          : fallback;

  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem
                className={isLast ? undefined : "hidden md:inline-flex"}
              >
                {isLast || !item.href ? (
                  <BreadcrumbPage className="max-w-[200px] truncate">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="max-w-[200px] truncate">
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className="hidden md:inline-flex" />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
