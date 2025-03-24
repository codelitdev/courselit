"use client";

import { useCallback } from "react";
import { ProductsList } from "./products-list";
import { useRouter, useSearchParams } from "next/navigation";

export default function CoursesPage() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const router = useRouter();

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(`/products?page=${value}`);
        },
        [router],
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Products</h1>
            <ProductsList page={page} onPageChange={handlePageChange} />
        </div>
    );
}
