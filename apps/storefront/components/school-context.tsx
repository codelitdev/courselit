"use client";

import { createContext, type ReactNode, useContext } from "react";

const SchoolContext = createContext<string | null>(null);

/** Provides the school public id (`sch_...`) resolved from the request host
 * to client components, which use it to build path-scoped public API URLs. */
export function SchoolProvider({
  schoolId,
  children,
}: {
  schoolId: string;
  children: ReactNode;
}) {
  return <SchoolContext.Provider value={schoolId}>{children}</SchoolContext.Provider>;
}

export function useSchoolId(): string {
  const schoolId = useContext(SchoolContext);
  if (!schoolId) {
    throw new Error("useSchoolId() must be used inside <SchoolProvider>.");
  }
  return schoolId;
}

/** Browser path of a public API route for a school, e.g.
 * `publicApiPath(schoolId, "/products")` -> `/api/v1/public/sch_x/products`. */
export function publicApiPath(schoolId: string, suffix: string): string {
  return `/api/v1/public/${encodeURIComponent(schoolId)}${suffix}`;
}
