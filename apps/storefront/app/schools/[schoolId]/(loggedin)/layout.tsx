import type { ReactNode } from "react";
import { LoggedInRoute } from "@/components/auth/logged-in-route";

export default function LoggedInLayout({ children }: { children: ReactNode }) {
  return <LoggedInRoute>{children}</LoggedInRoute>;
}
