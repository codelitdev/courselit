"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { SiteInfoContext } from "@components/contexts";
import {
    Constants,
    Course,
    CourseType,
    UIConstants,
} from "@courselit/common-models";
import { capitalize } from "@courselit/utils";
import {
    BTN_NEW_PRODUCT,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import Link from "next/link";
import { useContext, useCallback, useMemo } from "react";
import { Button } from "@components/ui/button";
import {
    ContentCard,
    ContentCardContent,
    ContentCardImage,
    ContentCardHeader,
    Badge,
    getSymbolFromCurrency,
    Skeleton,
} from "@courselit/components-library";
import {
    Download,
    BookOpen,
    Users,
    Eye,
    EyeOff,
    CheckCircle,
    CircleDashed,
} from "lucide-react";
import { PaginationControls } from "@components/public/pagination";
import { useProducts } from "@/hooks/use-products";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 9;

const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COURSES_PAGE_HEADING, href: "#" }];

function SkeletonCard() {
    return (
        <div className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <Skeleton className="h-40 sm:h-48 w-full" />
            <div className="p-3 sm:p-4">
                <Skeleton className="h-5 sm:h-6 w-3/4 mb-3 sm:mb-4" />
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Skeleton className="h-4 sm:h-5 w-20 sm:w-24 rounded-full" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-4" />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center text-muted-foreground">
                        <Skeleton className="h-4 w-28" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProductCard({ product }: { product: Course }) {
    const siteinfo = useContext(SiteInfoContext);

    return (
        <ContentCard href={`/dashboard/product/${product.courseId}`}>
            <ContentCardImage
                src={product.featuredImage?.thumbnail}
                alt={product.title}
            />
            <ContentCardContent>
                <ContentCardHeader>{product.title}</ContentCardHeader>
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge variant="outline">
                        {product.type.toLowerCase() ===
                        Constants.CourseType.COURSE ? (
                            <BookOpen className="h-4 w-4 mr-1" />
                        ) : (
                            <Download className="h-4 w-4 mr-1" />
                        )}
                        {capitalize(product.type)}
                    </Badge>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {product.privacy?.toLowerCase() ===
                                    Constants.ProductAccessType.PUBLIC ? (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {product.privacy?.toLowerCase() ===
                                    Constants.ProductAccessType.PUBLIC
                                        ? "Public"
                                        : "Hidden"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {product.published ? (
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {product.published ? "Published" : "Draft"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <span>
                            <span className="text-base">
                                {getSymbolFromCurrency(
                                    siteinfo.currencyISOCode || "USD",
                                )}{" "}
                            </span>
                            {product.sales.toLocaleString()} sales
                        </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        <span>
                            {product.customers.toLocaleString()} customers
                        </span>
                    </div>
                </div>
            </ContentCardContent>
        </ContentCard>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
                <SkeletonCard key={index} />
            ))}
        </div>
    );
}

export default function Page({
    params,
}: {
    params: { filter: string; page: string };
}) {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams?.get("page") || "1");
    const filter: "all" | CourseType =
        (searchParams?.get("filter") as "all" | CourseType) || "all";
    // const [page, setPage] = useState(parseInt(searchParams?.get("page") || "1") || 1);
    // const [filter, setFilter] = useState<"all" | CourseType>(searchParams?.get("filter") as "all" | CourseType || "all");
    const router = useRouter();

    const filterArray = useMemo(
        () => (filter === "all" ? undefined : [filter.toUpperCase()]),
        [filter],
    );

    const { products, loading, totalPages } = useProducts(
        page,
        ITEMS_PER_PAGE,
        filterArray,
    );

    const handleFilterChange = useCallback((value: "all" | CourseType) => {
        router.push(
            `/dashboard/products?${value !== "all" ? `filter=${value}` : ""}`,
        );
    }, []);

    const handlePageChange = useCallback(
        (value: number) => {
            router.push(
                `/dashboard/products?page=${value}${filter !== "all" ? `&filter=${filter}` : ""}`,
            );
        },
        [filter],
    );

    // if (
    //     !checkPermission(profile.permissions!, [
    //         permissions.manageAnyCourse,
    //         permissions.manageCourse,
    //     ])
    // ) {
    //     return <LoadingScreen />;
    // }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            {/* <Products address={address} loading={false} siteinfo={siteinfo} /> */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_COURSES_PAGE_HEADING}
                </h1>
                <div>
                    <Link href={`/dashboard/products/new`}>
                        <Button>{BTN_NEW_PRODUCT}</Button>
                    </Link>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {[
                            Constants.CourseType.COURSE,
                            Constants.CourseType.DOWNLOAD,
                        ].map((status) => (
                            <SelectItem value={status} key={status}>
                                {capitalize(status)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {loading ? (
                <SkeletonGrid />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product: Course) => (
                        <ProductCard key={product.courseId} product={product} />
                    ))}
                </div>
            )}
            <PaginationControls
                currentPage={page}
                totalPages={Math.ceil(totalPages / ITEMS_PER_PAGE)}
                onPageChange={handlePageChange}
            />
            {/* <Products address={address} loading={false} siteinfo={siteinfo} /> */}
        </DashboardContent>
    );
}
