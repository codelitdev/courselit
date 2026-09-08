import { redirect } from "next/navigation";

// The dashboard root remains a convenience redirect.

export default function LearnerDashboardPage() {
  redirect("/dashboard/feed");
}
