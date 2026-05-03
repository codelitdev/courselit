"use client";

import { useEffect, useMemo } from "react";
import { Tabbs } from "@courselit/components-library";
import { usePathname, useRouter } from "next/navigation";
import { useEnabledCommunities } from "@/hooks/use-enabled-communities";

export default function MyContentTabs({
    tabs,
    ariaLabel,
}: {
    tabs: { label: string; href: string }[];
    ariaLabel: string;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { hasEnabledCommunities, loading } = useEnabledCommunities();

    const visibleTabs = useMemo(
        () =>
            tabs.filter(
                (tab) =>
                    hasEnabledCommunities ||
                    tab.href !== "/dashboard/my-content/feed",
            ),
        [hasEnabledCommunities, tabs],
    );

    useEffect(() => {
        if (
            !loading &&
            !hasEnabledCommunities &&
            pathname === "/dashboard/my-content/feed"
        ) {
            router.replace("/dashboard/my-content/products");
        }
    }, [hasEnabledCommunities, loading, pathname, router]);

    const activeTab =
        visibleTabs.find((tab) => tab.href === pathname)?.label ??
        visibleTabs[0]?.label;

    if (!visibleTabs.length) {
        return null;
    }

    return (
        <Tabbs
            items={visibleTabs.map((tab) => tab.label)}
            value={activeTab}
            onChange={(value) =>
                router.replace(
                    visibleTabs.find((tab) => tab.label === value)?.href ??
                        visibleTabs[0].href,
                )
            }
        >
            {visibleTabs.map((tab) => (
                <div key={tab.href} aria-label={ariaLabel} />
            ))}
        </Tabbs>
    );
}
