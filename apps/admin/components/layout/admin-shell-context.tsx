"use client";

import { createContext, useContext } from "react";
import type { CurrentAccount } from "@/components/layout/nav-user";
import type { School } from "@/components/layout/team-switcher";

export type AdminShellContextValue = {
  account: CurrentAccount | null;
  schools: School[];
  registerPageLoading: (id: string, label: string) => void;
  clearPageLoading: (id: string) => void;
};

export const AdminShellContext =
  createContext<AdminShellContextValue | null>(null);

export function useAdminShellContext() {
  return useContext(AdminShellContext);
}
