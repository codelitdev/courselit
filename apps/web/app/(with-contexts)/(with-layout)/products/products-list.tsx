"use client";

import { useMemo, useContext } from "react";
import { PaginationControls } from "@components/public/pagination";
import { Constants, Course } from "@courselit/common-models";
import { useProducts } from "@/hooks/use-products";
import { BookOpen } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Button } from "@components/ui/button";
import { SkeletonCard } from "@components/skeleton-card";
import { ProductCard } from "@courselit/page-blocks";
import { SiteInfoContext } from "@components/contexts";
import { truncate } from "@ui-lib/utils";
const ITEMS_PER_PAGE = 9;

export function ProductsList({
    page,
    itemsPerPage = ITEMS_PER_PAGE,
    onPageChange,
}: {
    page: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
}) {
    const siteinfo = useContext(SiteInfoContext);
    const filters = useMemo(
        () => [Constants.CourseType.COURSE.toUpperCase()],
        [],
    );

    const { products, loading, totalPages } = useProducts(
        page,
        itemsPerPage,
        filters,
        true,
    );

    if (!loading && totalPages === 0) {
        return <EmptyState />;
    }

    if (!loading && totalPages && products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                    This page is empty.
                </p>
                <Button variant="outline" onClick={() => onPageChange(1)}>
                    Go to first page
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading
                    ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                          <SkeletonCard key={index} />
                      ))
                    : products.map((product: Course) => (
                          <ProductCard
                              key={product.courseId}
                              product={Object.assign({}, product, {
                                  title: truncate(product.title, 32),
                              })}
                              siteinfo={siteinfo}
                          />
                      ))}
            </div>
            <PaginationControls
                currentPage={page}
                totalPages={Math.ceil(totalPages / itemsPerPage)}
                onPageChange={onPageChange}
            />
        </div>
    );
}
