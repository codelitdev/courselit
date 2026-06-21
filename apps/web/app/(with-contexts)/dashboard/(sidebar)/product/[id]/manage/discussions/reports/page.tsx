"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardContent from "@components/admin/dashboard-content";
import useProduct from "@/hooks/use-product";
import { AddressContext } from "@components/contexts";
import { FetchBuilder, truncate } from "@courselit/utils";
import { UIConstants } from "@courselit/common-models";
import {
    COURSE_DISCUSSIONS_ADMIN_AUTHOR,
    COURSE_DISCUSSIONS_ADMIN_CONTENT,
    COURSE_DISCUSSIONS_ADMIN_DATE,
    COURSE_DISCUSSIONS_ADMIN_FILTER_ALL,
    COURSE_DISCUSSIONS_ADMIN_LESSON,
    COURSE_DISCUSSIONS_ADMIN_NO_REPORTS,
    COURSE_DISCUSSIONS_ADMIN_NO_REPORTS_DESCRIPTION,
    COURSE_DISCUSSIONS_ADMIN_REASON,
    COURSE_DISCUSSIONS_ADMIN_REJECTION_REASON_DEFAULT,
    COURSE_DISCUSSIONS_ADMIN_REPORTED_BY,
    COURSE_DISCUSSIONS_ADMIN_REPORTS,
    COURSE_DISCUSSIONS_ADMIN_STATUS,
    COURSE_DISCUSSIONS_ADMIN_STATUS_ACCEPTED,
    COURSE_DISCUSSIONS_ADMIN_STATUS_PENDING,
    COURSE_DISCUSSIONS_ADMIN_STATUS_REJECTED,
    COURSE_DISCUSSIONS_TITLE,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import AdminEmptyState from "@components/admin/empty-state";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginatedTable, useToast } from "@courselit/components-library";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RotateCcwIcon as RotateCCW } from "lucide-react";
import { RejectionReasonDialog } from "./rejection-reason-dialog";
import Link from "next/link";

const { permissions } = UIConstants;
const itemsPerPage = 10;

type ReportStatus = "pending" | "accepted" | "rejected";

type DiscussionReport = {
    reportId: string;
    contentType: "COMMENT" | "REPLY";
    contentId: string;
    userId: string;
    reason: string;
    status: ReportStatus;
    createdAt: string;
    entityId: string;
    lessonTitle?: string;
    contentPreview?: string;
    authorName?: string;
    reporterName?: string;
};

const STATUS_FILTERS: Array<{ label: string; value?: ReportStatus }> = [
    { label: COURSE_DISCUSSIONS_ADMIN_FILTER_ALL },
    { label: COURSE_DISCUSSIONS_ADMIN_STATUS_PENDING, value: "pending" },
    { label: COURSE_DISCUSSIONS_ADMIN_STATUS_ACCEPTED, value: "accepted" },
    { label: COURSE_DISCUSSIONS_ADMIN_STATUS_REJECTED, value: "rejected" },
];

export default function ProductDiscussionReportsPage() {
    const params = useParams();
    const productId = params?.id as string;
    const { product } = useProduct(productId);
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const [reports, setReports] = useState<DiscussionReport[]>([]);
    const [page, setPage] = useState(1);
    const [totalReports, setTotalReports] = useState(0);
    const [status, setStatus] = useState<ReportStatus | undefined>();

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        {
            label: COURSE_DISCUSSIONS_TITLE,
            href: `/dashboard/product/${productId}/manage`,
        },
        { label: COURSE_DISCUSSIONS_ADMIN_REPORTS, href: "#" },
    ];

    const graph = useCallback(
        async (payload: Record<string, unknown>) => {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(payload)
                .setIsGraphQLEndpoint(true)
                .build();

            return await fetch.exec();
        },
        [address.backend],
    );

    const loadReports = useCallback(async () => {
        try {
            const response = await graph({
                query: `
                    query GetProductDiscussionReports($productId: String!, $status: ProductDiscussionReportStatus, $page: Int, $limit: Int) {
                        reports: getProductDiscussionReports(productId: $productId, status: $status, page: $page, limit: $limit) {
                            items {
                                reportId
                                contentType
                                contentId
                                userId
                                reason
                                status
                                createdAt
                                entityId
                                lessonTitle
                                contentPreview
                                authorName
                                reporterName
                            }
                        }
                        totalReports: getProductDiscussionReportsCount(productId: $productId, status: $status)
                    }
                `,
                variables: {
                    productId,
                    status: status?.toUpperCase(),
                    page,
                    limit: itemsPerPage,
                },
            });
            setReports(response.reports.items);
            setTotalReports(response.totalReports);
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [graph, page, productId, status, toast]);

    useEffect(() => {
        if (productId && address?.backend) {
            void Promise.resolve().then(loadReports);
        }
    }, [productId, address?.backend, loadReports]);

    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [currentReportId, setCurrentReportId] = useState<string | null>(null);

    async function handleStatusChange(report: DiscussionReport) {
        // Status transition sequence for reports: pending -> accepted -> rejected -> pending
        let nextStatus: ReportStatus = "pending";
        if (report.status === "pending") {
            nextStatus = "accepted";
        } else if (report.status === "accepted") {
            nextStatus = "rejected";
        }

        if (nextStatus === "rejected") {
            setCurrentReportId(report.reportId);
            setRejectionDialogOpen(true);
        } else {
            await updateReportStatus(report.reportId, nextStatus);
        }
    }

    async function handleRejectionConfirm(reason: string) {
        if (currentReportId) {
            await updateReportStatus(currentReportId, "rejected", reason);
        }
        setRejectionDialogOpen(false);
        setCurrentReportId(null);
    }

    async function updateReportStatus(
        reportId: string,
        nextStatus: ReportStatus,
        rejectionReason?: string,
    ) {
        try {
            const response = await graph({
                query: `
                    mutation UpdateProductDiscussionReportStatus($productId: String!, $reportId: String!, $rejectionReason: String) {
                        report: updateProductDiscussionReportStatus(productId: $productId, reportId: $reportId, rejectionReason: $rejectionReason) {
                            reportId
                            status
                            rejectionReason
                        }
                    }
                `,
                variables: {
                    productId,
                    reportId,
                    rejectionReason:
                        nextStatus === "rejected"
                            ? rejectionReason ||
                              COURSE_DISCUSSIONS_ADMIN_REJECTION_REASON_DEFAULT
                            : undefined,
                },
            });
            setReports((current) =>
                current.map((item) =>
                    item.reportId === reportId
                        ? {
                              ...item,
                              status: response.report.status.toLowerCase() as ReportStatus,
                          }
                        : item,
                ),
            );
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }

    function getViewerDiscussionHref(report: DiscussionReport) {
        if (!product?.slug) {
            return null;
        }

        const returnTo = encodeURIComponent(
            `/dashboard/product/${productId}/manage/discussions/reports`,
        );
        const targetHash = `discussion-${
            report.contentType === "REPLY" ? "reply" : "comment"
        }-${report.contentId}`;

        return `/course/${product.slug}/${productId}/${report.entityId}?discussion=open&preview=true&returnTo=${returnTo}#${targetHash}`;
    }

    const getStatusBadge = (status: ReportStatus) => {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="secondary" className="text-[10px]">
                        PENDING
                    </Badge>
                );
            case "accepted":
                return (
                    <Badge variant="default" className="text-[10px]">
                        ACCEPTED
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="outline" className="text-[10px]">
                        REJECTED
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <div>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {COURSE_DISCUSSIONS_ADMIN_REPORTS}
                        </h2>
                        <p className="text-muted-foreground">
                            Review and manage reported discussion content
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Select
                            value={status || "all"}
                            onValueChange={(val) => {
                                setPage(1);
                                setStatus(
                                    val === "all"
                                        ? undefined
                                        : (val as ReportStatus),
                                );
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">
                                    Accepted
                                </SelectItem>
                                <SelectItem value="rejected">
                                    Rejected
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto">
                        {reports.length === 0 ? (
                            <AdminEmptyState
                                title={COURSE_DISCUSSIONS_ADMIN_NO_REPORTS}
                                description={
                                    COURSE_DISCUSSIONS_ADMIN_NO_REPORTS_DESCRIPTION
                                }
                            />
                        ) : (
                            <PaginatedTable
                                page={page}
                                totalPages={Math.ceil(
                                    totalReports / itemsPerPage,
                                )}
                                onPageChange={setPage}
                                className="rounded-md border"
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_CONTENT
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_LESSON
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_AUTHOR
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_REPORTED_BY
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_REASON
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {
                                                    COURSE_DISCUSSIONS_ADMIN_STATUS
                                                }
                                            </TableHead>
                                            <TableHead>
                                                {COURSE_DISCUSSIONS_ADMIN_DATE}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports.map((report) => (
                                            <TableRow key={report.reportId}>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {getViewerDiscussionHref(
                                                        report,
                                                    ) ? (
                                                        <Link
                                                            href={
                                                                getViewerDiscussionHref(
                                                                    report,
                                                                )!
                                                            }
                                                            className="font-medium underline underline-offset-4"
                                                        >
                                                            {report.contentPreview ||
                                                                "View Details"}
                                                        </Link>
                                                    ) : (
                                                        report.contentPreview ||
                                                        "View Details"
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {report.lessonTitle ||
                                                        report.entityId}
                                                </TableCell>
                                                <TableCell>
                                                    {report.authorName || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {report.reporterName ||
                                                        report.userId}
                                                </TableCell>
                                                <TableCell>
                                                    {report.reason}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(
                                                        report.status,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(
                                                        report.createdAt,
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                report,
                                                            )
                                                        }
                                                    >
                                                        <RotateCCW className="mr-2 h-4 w-4" />
                                                        Change
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </PaginatedTable>
                        )}
                    </div>
                </div>
            </div>

            <RejectionReasonDialog
                isOpen={rejectionDialogOpen}
                onClose={() => setRejectionDialogOpen(false)}
                onConfirm={handleRejectionConfirm}
            />
        </DashboardContent>
    );
}
