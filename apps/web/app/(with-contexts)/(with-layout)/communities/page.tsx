"use client";

import { useCallback } from "react";
import { CommunitiesList } from "./communities-list";
import { useRouter, useSearchParams } from "next/navigation";

export default function CommunitiesPage() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const router = useRouter();

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(`/communities?page=${value}`);
        },
        [router],
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Communities</h1>
            <CommunitiesList
                page={page}
                onPageChange={handlePageChange}
                itemsPerPage={1}
            />
        </div>
    );
}
