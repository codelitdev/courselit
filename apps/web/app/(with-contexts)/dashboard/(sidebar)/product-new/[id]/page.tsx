"use client";

import { useState, useEffect, useContext } from "react";
import { redirect, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/ui/chart";
import {
    Edit,
    Users,
    GraduationCap,
    DollarSign,
    Download,
    BookOpen,
    ChevronDown,
    Eye,
    Globe,
    Trash2,
    Settings,
    PersonStanding,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    EDIT_CONTENT_MENU_ITEM,
    EDIT_PAGE_MENU_ITEM,
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    VIEW_PAGE_MENU_ITEM,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import useProduct from "./product-hook";
import { formatDistanceToNow } from "date-fns";
import { capitalize } from "@courselit/utils";
import { truncate } from "@ui-lib/utils";

const timeRanges = [
    { value: "1d", label: "1 day" },
    { value: "1w", label: "1 week" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "1y", label: "1 year" },
    { value: "all", label: "Lifetime" },
];

// This would typically come from an API or database
const fetchProductData = (productId: string, timeRange: string) => {
    // Simulated API call
    return new Promise((resolve) => {
        setTimeout(() => {
            const baseData = {
                "1": {
                    id: "1",
                    type: "Course",
                    name: "Web Development Masterclass",
                    lastUpdated: "2 days ago",
                },
                "2": {
                    id: "2",
                    type: "Download",
                    name: "Ultimate UI/UX Design Guide",
                    lastUpdated: "5 days ago",
                },
            }[productId];

            const randomGrowth = () => (Math.random() * 0.4 - 0.2).toFixed(2); // -20% to +20%

            const metrics = {
                totalSales: Math.floor(Math.random() * 100000) + 10000,
                totalCustomers: Math.floor(Math.random() * 5000) + 1000,
                completionRate: Math.floor(Math.random() * 30) + 70,
                totalDownloads: Math.floor(Math.random() * 3000) + 1000,
                activeUsers: Math.floor(Math.random() * 2000) + 500,
            };

            const salesData = Array.from(
                { length: timeRange === "1d" ? 24 : 30 },
                (_, i) => ({
                    name: timeRange === "1d" ? `${i}:00` : `Day ${i + 1}`,
                    total: Math.floor(Math.random() * 1000) + 100,
                }),
            );

            resolve({
                ...baseData,
                ...metrics,
                salesData,
                growthRates: {
                    totalSales: randomGrowth(),
                    totalCustomers: randomGrowth(),
                    completionRate: randomGrowth(),
                    totalDownloads: randomGrowth(),
                    activeUsers: randomGrowth(),
                },
            });
        }, 500); // Simulate network delay
    });
};

export default function DashboardPage() {
    const params = useParams();
    const productId = params.id as string;
    const [timeRange, setTimeRange] = useState("30d");
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const address = useContext(AddressContext);
    const { product, loaded: productLoaded } = useProduct(productId, address);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: "#",
        },
    ];

    useEffect(() => {
        setLoading(true);
        fetchProductData(productId, timeRange).then((data) => {
            setProductData(data);
            setLoading(false);
        });
    }, [productId, timeRange]);

    if (productLoaded && !product) {
        redirect("/dashboard/products");
    }

    const MetricCard = ({ title, value, growth, icon }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <>
                        <Skeleton className="h-7 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold">{value}</div>
                        <p className="text-xs text-muted-foreground">
                            {Number.parseFloat(growth) > 0 ? "+" : ""}
                            {growth}% from previous period
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">
                            {product?.title || (
                                <Skeleton className="h-9 w-64" />
                            )}
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
                                {timeRanges.map((range) => (
                                    <SelectItem
                                        key={range.value}
                                        value={range.value}
                                    >
                                        {range.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Actions
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/p/${productId}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        {VIEW_PAGE_MENU_ITEM}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product-new/${productId}/customer/new`}
                                    >
                                        <PersonStanding className="mr-2 h-4 w-4" />

                                        {
                                            PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER
                                        }
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product-new/${productId}/content`}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        {EDIT_CONTENT_MENU_ITEM}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/page/${product?.pageId}?redirectTo=/dashboard/product-new/${product?.courseId}`}
                                    >
                                        <Globe className="mr-2 h-4 w-4" />
                                        {EDIT_PAGE_MENU_ITEM}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/dashboard/product-new/${productId}/settings`}
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <Dialog
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
                                </Dialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {" "}
                {/* Updated grid columns */}
                <MetricCard
                    title="Total Sales"
                    value={`$${productData?.totalSales.toLocaleString()}`}
                    growth={productData?.growthRates.totalSales}
                    icon={
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    }
                />
                {capitalize(product?.type!) === "Course" ? (
                    <>
                        <MetricCard
                            title="Total Students"
                            value={productData?.totalCustomers.toLocaleString()}
                            growth={productData?.growthRates.totalCustomers}
                            icon={
                                <Users className="h-4 w-4 text-muted-foreground" />
                            }
                        />
                        <MetricCard
                            title="Completion Rate"
                            value={`${productData?.completionRate}%`}
                            growth={productData?.growthRates.completionRate}
                            icon={
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            }
                        />
                    </>
                ) : (
                    <MetricCard
                        title="Total Downloads"
                        value={productData?.totalDownloads.toLocaleString()}
                        growth={productData?.growthRates.totalDownloads}
                        icon={
                            <Download className="h-4 w-4 text-muted-foreground" />
                        }
                    />
                )}
            </div>

            <div className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-[240px] w-full" />
                        ) : (
                            <div className="h-[240px]">
                                <LineChart
                                    data={productData.salesData}
                                    categories={["Sales"]}
                                    index="name"
                                    colors={["#16a34a"]}
                                    valueFormatter={(value: number) =>
                                        `$${value}`
                                    }
                                    className="h-full w-full"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    );
}
