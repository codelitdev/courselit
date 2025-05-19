"use client";

import { useContext, useMemo } from "react";
import { BlogContentCard } from "./content-card";
import { PaginationControls } from "@components/public/pagination";
import { Constants, Course } from "@courselit/common-models";
import { useProducts } from "@/hooks/use-products";
import { ProductCardSkeleton } from "@courselit/page-blocks";
import { ThemeContext } from "@components/contexts";
import { BookOpen } from "lucide-react";
import { Button, Subheader1 } from "@courselit/page-primitives";

const ITEMS_PER_PAGE = 9;

export function BlogsList({
    page,
    itemsPerPage = ITEMS_PER_PAGE,
    onPageChange,
}: {
    page: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
}) {
    const { theme: uiTheme } = useContext(ThemeContext);
    const { theme } = uiTheme;

    const filters = useMemo(
        () => [Constants.CourseType.BLOG.toUpperCase()],
        [],
    );
    const { products, loading, totalPages } = useProducts(
        page,
        itemsPerPage,
        filters,
        true,
    );

    if (!loading && totalPages && products.length === 0) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center py-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground" />
                <Subheader1 theme={theme}>This page is empty.</Subheader1>
                <Button size="sm" theme={theme} onClick={() => onPageChange(1)}>
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
                          <ProductCardSkeleton key={index} theme={theme} />
                      ))
                    : products.map((product: Course) => (
                          <BlogContentCard
                              key={product.courseId}
                              product={product}
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
