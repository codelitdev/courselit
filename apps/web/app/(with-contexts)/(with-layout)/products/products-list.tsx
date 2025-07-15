"use client";

import { useMemo, useContext } from "react";
import { PaginationControls } from "@components/public/pagination";
import { Constants, Course, SiteInfo } from "@courselit/common-models";
import { useProducts } from "@/hooks/use-products";
import { BookOpen } from "lucide-react";
import { EmptyState } from "./empty-state";
import { ProductCard, ProductCardSkeleton } from "@courselit/page-blocks";
import { SiteInfoContext } from "@components/contexts";
import { getPlanPrice, truncate } from "@ui-lib/utils";
import { Button, Subheader1 } from "@courselit/page-primitives";
import { getSymbolFromCurrency } from "@courselit/components-library";
import { ThemeStyle } from "@courselit/page-models";
const ITEMS_PER_PAGE = 9;

export function ProductsList({
    theme,
    page,
    itemsPerPage = ITEMS_PER_PAGE,
    onPageChange,
}: {
    theme: ThemeStyle;
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
                          <ProductCard
                              key={product.courseId}
                              title={truncate(product.title, 50)}
                              user={{
                                  name: product.user.name || "",
                                  thumbnail: product.user.avatar?.thumbnail,
                              }}
                              image={
                                  product.featuredImage?.file ||
                                  "/courselit_backdrop_square.webp"
                              }
                              href={`/p/${product.pageId}`}
                              badgeChildren={getBadgeText(product, siteinfo)}
                              theme={theme}
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

function getBadgeText(course: Course, siteinfo: SiteInfo) {
    const defaultPlan = course.paymentPlans?.filter(
        (plan) => plan.planId === course.defaultPaymentPlan,
    )[0];
    const { amount, period } = getPlanPrice(defaultPlan);

    return (
        <>
            {getSymbolFromCurrency(siteinfo.currencyISOCode || "USD")}
            <span>{amount.toFixed(2)}</span>
            <span className="ml-1">{period}</span>
        </>
    );
}
