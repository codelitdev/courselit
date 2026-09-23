"use client";

import { LearnerSessionProvider } from "@/components/auth/learner-session";

export function LoggedInRoute({ children }: { children: React.ReactNode }) {
  return <LearnerSessionProvider>{children}</LearnerSessionProvider>;
}
