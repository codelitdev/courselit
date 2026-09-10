"use client";

import { usePathname } from "next/navigation";
import { useLearnerSession } from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";
import { LearnerText2 } from "@/components/themed-page-builder";

export function LearnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardContent =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/feed") ||
    pathname.startsWith("/dashboard/products");
  if (!isDashboardContent) return <>{children}</>;

  return (
    <LearnerDashboardContent isProducts={pathname.startsWith("/dashboard/products")}>
      {children}
    </LearnerDashboardContent>
  );
}

function LearnerDashboardContent({
  isProducts,
  children,
}: {
  isProducts: boolean;
  children: React.ReactNode;
}) {
  const { learner, checking } = useLearnerSession(
    isProducts ? "/dashboard/products" : "/dashboard/feed",
  );

  if (checking) {
    return (
      <main className="flex min-h-[400px] items-center justify-center p-6">
        <LearnerText2 className="text-muted-foreground">Loading your content…</LearnerText2>
      </main>
    );
  }
  if (!learner) return null;

  return (
    <LearnerShell user={learner} headerTitle={isProducts ? "Products" : "Feed"}>
      <main className="grid gap-7">{children}</main>
    </LearnerShell>
  );
}
