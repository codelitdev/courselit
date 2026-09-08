"use client";

import { createContext, type ReactNode, useContext, useId, useState } from "react";

export type PlatformTabItem = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

type PlatformTabContextValue = {
  activeValue: string;
  baseId: string;
};

const PlatformTabContext = createContext<PlatformTabContextValue | null>(null);

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function tabId(baseId: string, value: string) {
  return `${baseId}-tab-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function panelId(baseId: string, value: string) {
  return `${baseId}-panel-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function PlatformTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
  listClassName,
  children,
}: {
  items: readonly PlatformTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel: string;
  className?: string;
  listClassName?: string;
  children?: ReactNode;
}) {
  const firstValue = items[0]?.value ?? "";
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? firstValue,
  );
  const activeValue = value ?? uncontrolledValue;
  const baseId = useId();

  function select(valueToSelect: string) {
    if (value === undefined) setUncontrolledValue(valueToSelect);
    onValueChange?.(valueToSelect);
  }

  return (
    <div className={joinClassNames("w-full", className)} data-slot="tabs">
      <div
        className={joinClassNames(
          "flex flex-wrap items-center gap-1 border-b-0",
          "max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1",
          listClassName,
        )}
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const active = item.value === activeValue;
          const triggerId = tabId(baseId, item.value);
          return (
            <button
              key={item.value}
              id={triggerId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId(baseId, item.value)}
              data-state={active ? "active" : "inactive"}
              disabled={item.disabled}
              className={joinClassNames(
                "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 text-sm font-semibold leading-5 whitespace-nowrap text-muted-foreground transition-colors duration-150",
                "outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                "data-[state=active]:border-border data-[state=active]:bg-primary-soft data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "max-sm:flex-none",
              )}
              onClick={() => select(item.value)}
            >
              {item.icon ? (
                <span
                  className="inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <PlatformTabContext.Provider value={{ activeValue, baseId }}>
        {children}
      </PlatformTabContext.Provider>
    </div>
  );
}

export function PlatformTabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(PlatformTabContext);
  if (!context) {
    throw new Error("PlatformTabsContent must be used inside PlatformTabs");
  }
  const active = context.activeValue === value;

  return (
    <div
      id={panelId(context.baseId, value)}
      role="tabpanel"
      aria-labelledby={tabId(context.baseId, value)}
      hidden={!active}
      className={joinClassNames("min-w-0 outline-none", className)}
    >
      {children}
    </div>
  );
}

export function PlatformTabNav({
  items,
  value,
  ariaLabel,
  className,
  listClassName,
}: {
  items: readonly (PlatformTabItem & { href: string })[];
  value: string;
  ariaLabel: string;
  className?: string;
  listClassName?: string;
}) {
  return (
    <nav className={joinClassNames("w-full", className)} aria-label={ariaLabel}>
      <div
        className={joinClassNames(
          "flex flex-wrap items-center gap-1 border-b-0",
          "max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1",
          listClassName,
        )}
      >
        {items.map((item) => {
          const active = item.value === value;
          return (
            <a
              key={item.value}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-disabled={item.disabled || undefined}
              data-state={active ? "active" : "inactive"}
              className={joinClassNames(
                "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 text-sm font-semibold leading-5 whitespace-nowrap text-muted-foreground no-underline transition-colors duration-150",
                "outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                '[aria-disabled="true"]:pointer-events-none [aria-disabled="true"]:opacity-50',
                "data-[state=active]:border-border data-[state=active]:bg-primary-soft data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "max-sm:flex-none",
              )}
              onClick={item.disabled ? (event) => event.preventDefault() : undefined}
            >
              {item.icon ? (
                <span
                  className="inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
