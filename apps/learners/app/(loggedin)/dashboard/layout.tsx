import type { ReactNode } from "react";
// Dashboard routes live inside the logged-in route group.
import { LearnerDashboardLayout } from "@/components/dashboard/learner-dashboard-layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <LearnerDashboardLayout>{children}</LearnerDashboardLayout>;
}
