"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const value = useMemo(() => ({ items, setItems }), [items]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbItems() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error(
      "useBreadcrumbItems must be used within a BreadcrumbProvider",
    );
  }
  return ctx.items;
}

/** Sets the current page's breadcrumb trail; clears it on unmount. */
export function useSetBreadcrumb(items: BreadcrumbItem[]) {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error(
      "useSetBreadcrumb must be used within a BreadcrumbProvider",
    );
  }
  const { setItems } = ctx;
  const key = JSON.stringify(items);
  useEffect(() => {
    setItems(items);
    return () => setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setItems]);
}
