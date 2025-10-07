"use client";

import { useState, useContext } from "react";
import { redirect, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    GraduationCap,
    DollarSign,
    Download,
    BookOpen,
    ChevronDown,
    Eye,
    Globe,
    Settings,
    UserPlus,
    Share2,
} from "lucide-react";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
    EDIT_CONTENT_MENU_ITEM,
    EDIT_PAGE_MENU_ITEM,
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_EMPTY_WARNING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    PRODUCT_UNPUBLISHED_WARNING,
    TOAST_TITLE_SUCCESS,
    VIEW_PAGE_MENU_ITEM,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext, SiteInfoContext } from "@components/contexts";
import useProduct from "../../../../../../hooks/use-product";
import { formatDistanceToNow } from "date-fns";
import { capitalize } from "@courselit/utils";
import { truncate } from "@ui-lib/utils";
import MetricCard from "./metric-card";
import { useToast, Tooltip as TooltipCL } from "@courselit/components-library";
import { useActivities } from "@/hooks/use-activities";
import { Constants, UIConstants } from "@courselit/common-models";
import Resources from "@components/resources";
import { TIME_RANGES } from "@ui-config/constants";
import SalesCard from "../../overview/sales-card";
const { permissions } = UIConstants;

const { ActivityType } = Constants;

export default function DashboardPage() {
    const params = useParams();
    const productId = params?.id as string;
    const [timeRange, setTimeRange] = useState("7d");
    // const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const address = useContext(AddressContext);
    const { product, loaded: productLoaded } = useProduct(productId);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: "#",
        },
    ];
    const siteinfo = useContext(SiteInfoContext);
    const { data: salesData, loading: salesLoading } = useActivities(
        ActivityType.PURCHASED,
        timeRange,
        productId,
        true,
    );
    const { toast } = useToast();
    if (productLoaded && !product) {
        redirect("/dashboard/products");
    }

    const handleShareClick = () => {
        navigator.clipboard.writeText(
            `${address.frontend}/p/${product?.pageId}`,
        );
        toast({
            title: TOAST_TITLE_SUCCESS,
            description: "Product URL copied to clipboard!",
        });
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            {!product?.published && (
                <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
                    {PRODUCT_UNPUBLISHED_WARNING}{" "}
                    <Link
                        href={`/dashboard/product/${productId}/manage#publish`}
                        className="underline"
                    >
                        Manage
                    </Link>
                </div>
            )}
            <div className="mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-semibold flex items-center gap-2">
                            {product?.title || (
                                <Skeleton className="h-9 w-64" />
                            )}
                            <TooltipCL
                                title="Share product"
                                className="font-normal!"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={handleShareClick}
                                    size="sm"
                                >
                                    <Share2 className="h-5 w-5" />
                                </Button>
                            </TooltipCL>
                        </h1>
                        <div className="flex items-center gap-2">
                            {product ? (
                                <>
                                    <Badge variant="secondary">
                                        {capitalize(product.type!) ===
                                        "Course" ? (
                                            <BookOpen className="h-4 w-4 mr-1" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-1" />
                                        )}
                                        {capitalize(product.type!)}
                                    </Badge>
                                    <Badge variant="outline">
                                        {product.published
                                            ? "Published"
                                            : "Draft"}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Last updated{" "}
                                        {product.updatedAt
                                            ? formatDistanceToNow(
                                                  new Date(+product.updatedAt),
                                                  { addSuffix: true },
                                              )
                                            : "N/A"}
                                    </span>
                                </>
                            ) : (
                                <Skeleton className="h-5 w-48" />
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_RANGES.map((range) => (
                                    <SelectItem
                                        key={range.value}
                                        value={range.value}
                                    >
                                        {range.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                            <Link
                                href={`/dashboard/product/${productId}/content`}
                            >
                                {EDIT_CONTENT_MENU_ITEM}
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Actions
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/p/${encodeURIComponent(product?.pageId!)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        {VIEW_PAGE_MENU_ITEM}
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product/${productId}/customer/new`}
                                    >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        {
                                            PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER
                                        }
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product/${productId}/content`}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        {EDIT_CONTENT_MENU_ITEM}
                                    </Link>
                                </DropdownMenuItem> */}
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/page/${product?.pageId}?redirectTo=/dashboard/product/${product?.courseId}`}
                                    >
                                        <Globe className="mr-2 h-4 w-4" />
                                        {EDIT_PAGE_MENU_ITEM}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product/${productId}/manage`}
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Manage
                                    </Link>
                                </DropdownMenuItem>
                                {/* <DropdownMenuSeparator /> */}
                                {/* <Dialog
                                    open={deleteDialogOpen}
                                    onOpenChange={setDeleteDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>
                                                Are you sure you want to delete
                                                this product?
                                            </DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone.
                                                This will permanently delete the
                                                product and remove all
                                                associated data from our
                                                servers.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setDeleteDialogOpen(false)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => {
                                                    setDeleteDialogOpen(false);
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog> */}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {productLoaded && !product?.lessons?.length && (
                <div className="px-2 py-16 text-center mb-4 text-sm text-muted-foreground rounded-md border-dashed border-2">
                    <p className="mb-4">{PRODUCT_EMPTY_WARNING}</p>
                    <Link href={`/dashboard/product/${productId}/content`}>
                        <Button size="sm">{EDIT_CONTENT_MENU_ITEM}</Button>
                    </Link>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {" "}
                {/* Updated grid columns */}
                <MetricCard
                    title="Sales"
                    icon={
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    }
                    type={ActivityType.PURCHASED}
                    duration={timeRange}
                    entityId={productId}
                />
                <Link href={`/dashboard/product/${productId}/customers`}>
                    <MetricCard
                        title="Customers"
                        icon={
                            <Users className="h-4 w-4 text-muted-foreground" />
                        }
                        type={ActivityType.ENROLLED}
                        duration={timeRange}
                        entityId={productId}
                    />
                </Link>
                {product?.type?.toLowerCase() === "course" ? (
                    <>
                        <MetricCard
                            title="People who completed the course"
                            icon={
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            }
                            type={ActivityType.COURSE_COMPLETED}
                            duration={timeRange}
                            entityId={productId}
                        />
                    </>
                ) : (
                    <MetricCard
                        title="Downloads"
                        icon={
                            <Download className="h-4 w-4 text-muted-foreground" />
                        }
                        type={ActivityType.DOWNLOADED}
                        duration={timeRange}
                        entityId={productId}
                    />
                )}
            </div>

            <SalesCard data={salesData} loading={salesLoading} />

            {/* <div className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {salesLoading ? (
                            <Skeleton className="h-[240px] w-full" />
                        ) : (
                            <div className="">
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart
                                        width={300}
                                        height={200}
                                        data={salesData?.points}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#e5e7eb"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            strokeWidth={2}
                                            stroke="#000000"
                                            dot={false}
                                        />
                                        <XAxis
                                            dataKey="date"
                                            className="text-xs"
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tickFormatter={(value) =>
                                                `${getSymbolFromCurrency(siteinfo.currencyISOCode || "USD")}${value}`
                                            }
                                            className="text-xs"
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#333",
                                                border: "none",
                                                borderRadius: "4px",
                                                padding: "4px 8px",
                                                fontSize: "12px",
                                                color: "white",
                                            }}
                                            itemStyle={{ color: "white" }}
                                            formatter={(value) => [
                                                `Sales: ${value}`,
                                            ]}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div> */}

            <Resources
                links={[
                    {
                        href: `https://docs.courselit.app/en/courses/add-content/`,
                        text: "Add content to a product",
                    },
                    {
                        href: `https://docs.courselit.app/en/courses/add-content/`,
                        text: "Understanding product dashboard",
                    },
                ]}
            />
        </DashboardContent>
    );
}
