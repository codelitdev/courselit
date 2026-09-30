import type { ReactNode } from "react";

/**
 * Protected routes are authenticated by AdminShell. Keep this wrapper as a
 * transparent boundary for existing page compositions.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return children;
}
