"use client";

import { useMemo, useState } from "react";
import { SkeletonCard } from "./skeleton-card";
import { ContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { Constants, Course } from "@courselit/common-models";
import { useProducts } from "@/hooks/use-products";

const ITEMS_PER_PAGE = 9;

export function ProductsList({
    itemsPerPage = ITEMS_PER_PAGE,
}: {
    itemsPerPage?: number;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const filters = useMemo(
        () => [Constants.CourseType.COURSE.toUpperCase()],
        [],
    );
    const { products, loading, totalPages } = useProducts(
        currentPage,
        itemsPerPage,
        filters,
        true,
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading
                    ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                          <SkeletonCard key={index} />
                      ))
                    : products.map((product: Course) => (
                          <ContentCard
                              key={product.courseId}
                              product={product}
                          />
                      ))}
            </div>
            <PaginationControls
                currentPage={currentPage}
                totalPages={Math.ceil(totalPages / itemsPerPage)}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
