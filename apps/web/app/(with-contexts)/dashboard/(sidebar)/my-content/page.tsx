"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEnabledCommunities } from "@/hooks/use-enabled-communities";

export default function Page() {
    const router = useRouter();
    const { hasEnabledCommunities, loading } = useEnabledCommunities();

    useEffect(() => {
        if (loading) {
            return;
        }

        router.replace(
            hasEnabledCommunities
                ? "/dashboard/my-content/feed"
                : "/dashboard/my-content/products",
        );
    }, [hasEnabledCommunities, loading, router]);

    return null;
}
