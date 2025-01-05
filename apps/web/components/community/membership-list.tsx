"use client";

import { useContext, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import {
    Badge,
    Link,
    PaginatedTable,
    useToast,
} from "@courselit/components-library";
import {
    COMMUNITY_MEMBERSHIP_LIST_HEADER,
    COMMUNITY_MEMBERSHIP_LIST_SUBHEADER,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { AddressContext, ProfileContext } from "@components/contexts";
import { capitalize, FetchBuilder } from "@courselit/utils";
import {
    CommunityMemberStatus,
    Constants,
    Membership,
    User,
} from "@courselit/common-models";
import { getNextStatusForCommunityMember } from "@ui-lib/utils";

interface MembershipRequest {
    id: string;
    name: string;
    email: string;
    avatar: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
}

const itemsPerPage = 10;

type Member = Pick<
    Membership,
    "entityId" | "status" | "rejectionReason" | "joiningReason"
> & {
    user: Pick<User, "email" | "name" | "userId" | "avatar">;
};

export function MembershipList({ id }: { id: string }) {
    const [requests, setRequests] = useState<MembershipRequest[]>([]);
    const [filter, setFilter] = useState<"all" | CommunityMemberStatus>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRequest, setSelectedMember] = useState<Member | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);
    const [members, setMembers] = useState<Member[]>([]);
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const { profile } = useContext(ProfileContext);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadMembers();
    }, [page]);

    useEffect(() => {
        setPage(1);
        setTotalMembers(0);
        loadMembers();
    }, [filter]);

    const loadMembers = async () => {
        const query = `
            query ($communityId: String!, $page: Int, $limit: Int, $status: MemberStatus) {
                members: getMembers(communityId: $communityId, page: $page, limit: $limit, status: $status) {
                    user {
                        userId
                        name
                        email
                        avatar {
                            mediaId
                            thumbnail
                        }
                    }
                    status
                    rejectionReason
                    joiningReason
                },
                totalMembers: getMembersCount(communityId: $communityId, status: $status) 
            }`;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        communityId: id,
                        page,
                        limit: itemsPerPage,
                        status:
                            filter === "all" ? undefined : filter.toUpperCase(),
                    },
                })
                .build();
            const response = await fetchRequest.exec();
            if (response.members) {
                setMembers(response.members);
                setTotalMembers(response.totalMembers);
            }
        } catch (e) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
            });
        }
    };

    const updateMemberStatus = async (userId: string) => {
        setIsUpdating(true);
        const query = `
            mutation ($communityId: String!, $userId: String!, $rejectionReason: String) {
                member: updateMemberStatus(communityId: $communityId, userId: $userId, rejectionReason: $rejectionReason) {
                    user {
                        userId
                        name
                        email
                        avatar {
                            mediaId
                            thumbnail
                        }
                    }
                    status
                    rejectionReason
                    joiningReason
                }
            }`;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        communityId: id,
                        userId,
                        rejectionReason,
                    },
                })
                .build();
            const response = await fetchRequest.exec();
            if (response.member) {
                // replace the member in members
                setMembers((members: Member[]) =>
                    members.map((member) =>
                        member.user.userId === userId
                            ? response.member
                            : member,
                    ),
                );
            }
        } catch (e) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // const filteredRequests = requests.filter((request) => {
    //     const matchesFilter = filter === "all" || request.status === filter;
    //     const matchesSearch =
    //         request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //         request.email.toLowerCase().includes(searchTerm.toLowerCase());
    //     return matchesFilter && matchesSearch;
    // });

    const handleStatusChange = (member: Member) => {
        const nextStatus = getNextStatusForCommunityMember(
            member.status.toLowerCase() as CommunityMemberStatus,
        );
        setSelectedMember(member);
        if (nextStatus === Constants.MembershipStatus.REJECTED) {
            setIsDialogOpen(true);
        } else {
            updateMemberStatus(member.user.userId);
        }
    };

    // const updateRequestStatus = (
    //     id: string,
    //     newStatus: MembershipRequest["status"],
    //     reason?: string,
    // ) => {
    //     setRequests(
    //         requests.map((request) =>
    //             request.id === id
    //                 ? {
    //                       ...request,
    //                       status: newStatus,
    //                       rejectionReason:
    //                           newStatus === "rejected" ? reason : undefined,
    //                   }
    //                 : request,
    //         ),
    //     );
    // };

    const handleDialogConfirm = async () => {
        if (selectedRequest && rejectionReason) {
            await updateMemberStatus(selectedRequest.user.userId);
            setIsDialogOpen(false);
            setSelectedMember(null);
            setRejectionReason("");
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {COMMUNITY_MEMBERSHIP_LIST_HEADER}
                </h2>
                <p className="text-muted-foreground">
                    {COMMUNITY_MEMBERSHIP_LIST_SUBHEADER}
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <Select
                        value={filter}
                        onValueChange={(value: any) => setFilter(value)}
                    >
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {[
                                Constants.MembershipStatus.PENDING,
                                Constants.MembershipStatus.ACTIVE,
                                Constants.MembershipStatus.REJECTED,
                            ].map((status) => (
                                <SelectItem value={status} key={status}>
                                    {capitalize(status)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* <Input
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-[300px]"
                    /> */}
                </div>
                <div className="overflow-x-auto">
                    <PaginatedTable
                        page={page}
                        totalPages={Math.ceil(totalMembers / itemsPerPage)}
                        onPageChange={setPage}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">
                                        User
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        Reason
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden xl:table-cell">
                                        Rejection Reason
                                    </TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.user.email}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard4/users/${member.user.userId}`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={
                                                                member.user
                                                                    .avatar
                                                                    ?.thumbnail ||
                                                                "/courselit_backdrop_square.webp"
                                                            }
                                                            alt={
                                                                member.user
                                                                    .name ||
                                                                member.user
                                                                    .email
                                                            }
                                                        />
                                                        <AvatarFallback>
                                                            {(
                                                                member.user
                                                                    .name ||
                                                                member.user
                                                                    .email
                                                            ).charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">
                                                            {member.user.name ||
                                                                member.user
                                                                    .email}
                                                        </span>
                                                        {member.user.name && (
                                                            <span className="text-sm text-muted-foreground">
                                                                {
                                                                    member.user
                                                                        .email
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell max-w-xs truncate">
                                            {member.joiningReason}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    member.status === "pending"
                                                        ? "default"
                                                        : member.status ===
                                                            "approved"
                                                          ? "success"
                                                          : "destructive"
                                                }
                                            >
                                                {member.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    member.status.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden xl:table-cell max-w-xs truncate">
                                            {member.rejectionReason || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {member.user.userId !==
                                                profile.userId && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            member,
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                >
                                                    <RotateCcw className="mr-2 h-3 w-3" />{" "}
                                                    Change
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </PaginatedTable>
                </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Membership Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this
                            membership request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-4">
                            <Label htmlFor="rejection-reason">Reason</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            onClick={handleDialogConfirm}
                            disabled={!rejectionReason}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
