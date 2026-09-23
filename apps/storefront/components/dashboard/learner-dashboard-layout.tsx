"use client";

import { usePathname } from "next/navigation";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { useLearnerSession } from "@/components/communities/learner-community";
import { LearnerShell } from "@/components/layout/learner-shell";

export function LearnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSpacePost = /^\/dashboard\/s\/[^/]+\/[^/]+$/.test(pathname);
  const isDashboardContent =
    !isSpacePost &&
    (pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/s/") ||
      pathname.startsWith("/dashboard/products"));
  if (!isDashboardContent) return <>{children}</>;

  return (
    <LearnerDashboardContent
      isProducts={pathname.startsWith("/dashboard/products")}
      nextPath={pathname}
    >
      {children}
    </LearnerDashboardContent>
  );
}

function LearnerDashboardContent({
  isProducts,
  nextPath,
  children,
}: {
  isProducts: boolean;
  nextPath: string;
  children: React.ReactNode;
}) {
  const { learner, checking } = useLearnerSession(nextPath);

  return (
    <LearnerShell
      user={learner}
      loading={checking}
      headerTitle={isProducts ? "Products" : "Feed"}
    >
      <main className="grid gap-7">
        {checking ? <CourseLitLoading label="Loading your content…" /> : null}
        {!checking && learner ? children : null}
      </main>
    </LearnerShell>
  );
}
