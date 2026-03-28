"use client";

import {
    useState,
    useEffect,
    useContext,
    useMemo,
    useCallback,
    startTransition,
} from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcwIcon as RotateCCW } from "lucide-react";
import { RejectionReasonDialog } from "./rejection-reason-dialog";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import { PaginatedTable, useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import {
    CommunityReport,
    CommunityReportStatus,
    Constants,
} from "@courselit/common-models";
import { getNextStatusForCommunityReport } from "@ui-lib/utils";

const itemsPerPage = 10;

export function ReportsTable({ communityId }: { communityId: string }) {
    const [reports, setReports] = useState<CommunityReport[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [currentReportId, setCurrentReportId] = useState<string | null>(null);
    const [totalReports, setTotalReports] = useState(0);
    const address = useContext(AddressContext);
    const { toast } = useToast();

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const loadReports = useCallback(async () => {
        const query = `
            query ($communityId: String!, $page: Int, $limit: Int, $status: CommunityReportStatusType) {
                reports: getCommunityReports(communityId: $communityId, page: $page, limit: $limit, status: $status) {
                    reportId
                    content {
                        id
                        content 
                        media {
                            type
                            media {
                                file
                                thumbnail
                            }
                        }
                    }
                    type
                    reason
                    status
                    contentParentId
                    rejectionReason
                },
                totalReports: getCommunityReportsCount(communityId: $communityId, status: $status) 
            }`;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        communityId,
                        page,
                        limit: itemsPerPage,
                        status:
                            filter === "all" ? undefined : filter.toUpperCase(),
                    },
                })
                .build();
            const response = await fetchRequest.exec();
            if (response.reports) {
                setReports(response.reports);
                setTotalReports(response.totalReports);
            }
        } catch (e) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
            });
        }
    }, [communityId, fetch, filter, page, toast]);

    useEffect(() => {
        startTransition(() => {
            void loadReports();
        });
    }, [loadReports]);

    useEffect(() => {
        startTransition(() => {
            setPage(1);
            setTotalReports(0);
        });
    }, [filter]);

    const handleStatusChange = (report: CommunityReport) => {
        const nextStatus = getNextStatusForCommunityReport(
            report.status.toLowerCase() as CommunityReportStatus,
        );
        if (nextStatus === Constants.CommunityReportStatus.REJECTED) {
            setCurrentReportId(report.reportId);
            setRejectionDialogOpen(true);
        } else {
            updateReportStatus(report.reportId);
        }
    };

    const updateReportStatus = async (
        id: string,
        rejectionReason: string = "",
    ) => {
        const query = `
            mutation ($communityId: String!, $reportId: String!, $rejectionReason: String) {
                report: updateCommunityReportStatus(communityId: $communityId, reportId: $reportId, rejectionReason: $rejectionReason) {
                    reportId
                    status
                    rejectionReason
                }
            }
        `;

        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        communityId: communityId,
                        reportId: id,
                        rejectionReason,
                    },
                })
                .build();

            const response = await fetchRequest.exec();
            if (response.report) {
                setReports((reports) =>
                    reports.map((r) =>
                        r.reportId === id
                            ? {
                                  ...r,
                                  status: response.report.status,
                                  rejectionReason:
                                      response.report.rejectionReason,
                              }
                            : r,
                    ),
                );
            }
        } catch (e) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
            });
        }
    };

    const handleRejectionConfirm = (reason: string) => {
        if (currentReportId) {
            updateReportStatus(currentReportId, reason);
        }
        setRejectionDialogOpen(false);
        setCurrentReportId(null);
    };

    const getStatusBadge = (status: CommunityReportStatus) => {
        switch (status) {
            case "pending":
                return (
                    <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                    >
                        PENDING
                    </Badge>
                );
            case "accepted":
                return (
                    <Badge
                        variant="default"
                        className="bg-red-100 text-red-700 hover:bg-red-100"
                    >
                        ACCEPTED
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-700 hover:bg-gray-100"
                    >
                        REJECTED
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <div className="rounded-md bg-white">
            <div className="py-4 pr-4 border-b">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="overflow-x-auto">
                <PaginatedTable
                    page={page}
                    totalPages={Math.ceil(totalReports / itemsPerPage)}
                    onPageChange={setPage}
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Content
                                </TableHead>
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Type
                                </TableHead>
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Reason
                                </TableHead>
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Status
                                </TableHead>
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Rejection Reason
                                </TableHead>
                                <TableHead className="text-sm font-medium text-gray-500">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow
                                    key={report.reportId}
                                    className="border-b"
                                >
                                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                                        {report.content.content}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {report.type.charAt(0).toUpperCase() +
                                            report.type.slice(1).toLowerCase()}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {report.reason}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(
                                            report.status.toLowerCase() as CommunityReportStatus,
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {report.rejectionReason || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                handleStatusChange(report)
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
            </div>
            <RejectionReasonDialog
                isOpen={rejectionDialogOpen}
                onClose={() => setRejectionDialogOpen(false)}
                onConfirm={handleRejectionConfirm}
            />
        </div>
    );
}
