import { useCallback, useEffect, useState } from "react";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { User } from "@courselit/common-models";
import {
    Table,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableBody,
} from "@components/ui/table";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Skeleton,
} from "@courselit/components-library";
import { PaginationControls } from "@components/public/pagination";

import NextLink from "next/link";

interface SubscribersListProps {
    sequenceId: string;
}

export default function SubscribersList({ sequenceId }: SubscribersListProps) {
    const [subscribers, setSubscribers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [rowsPerPage] = useState(10);
    const { toast } = useToast();
    const fetch = useGraphQLFetch();

    const loadSubscribers = useCallback(async () => {
        setLoading(true);

        const query = `
            query GetSubscribers($sequenceId: String!, $page: Int, $limit: Int) {
                subscribers: getSubscribers(sequenceId: $sequenceId, page: $page, limit: $limit) {
                    userId
                    name
                    email
                    avatar {
                        mediaId
                        originalFileName
                        mimeType
                        size
                        access
                        file
                        thumbnail
                        caption
                    }
                    active
                    createdAt
                }
                subscribersCount: getSubscribersCount(sequenceId: $sequenceId)
            }
        `;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    sequenceId,
                    page,
                    limit: rowsPerPage,
                },
            })
            .build();

        try {
            const response = await fetcher.exec();

            if (response) {
                setSubscribers(response.subscribers || []);
                setTotalCount(response.subscribersCount || 0);
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [sequenceId, page, rowsPerPage, fetch, toast]);

    useEffect(() => {
        if (sequenceId) {
            loadSubscribers();
        }
    }, [loadSubscribers]);

    if (loading && subscribers.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Subscribers</h3>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-medium">
                                Subscriber
                            </TableHead>
                            {/* <TableHead className="text-muted-foreground font-medium w-[50px]">
                                Actions
                            </TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array(5)
                            .fill(0)
                            .map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-5 w-[200px]" />
                                                <Skeleton className="h-3.5 w-[150px]" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    {/* <TableCell>
                                        <Skeleton className="h-8 w-8" />
                                    </TableCell> */}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                    Subscribers ({totalCount.toLocaleString()})
                </h3>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-medium">
                            Subscriber
                        </TableHead>
                        {/* <TableHead className="text-muted-foreground font-medium w-[50px]">
                            Actions
                        </TableHead> */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subscribers.map((subscriber) => (
                        <TableRow key={subscriber.userId}>
                            <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                    <Avatar>
                                        <AvatarImage
                                            src={
                                                subscriber.avatar?.file ||
                                                "/courselit_backdrop_square.webp"
                                            }
                                        />
                                        <AvatarFallback>
                                            {(subscriber.name
                                                ? subscriber.name.charAt(0)
                                                : subscriber.email.charAt(0)
                                            ).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">
                                            <NextLink
                                                href={`/dashboard/users/${subscriber.userId}`}
                                            >
                                                {subscriber.name ||
                                                    subscriber.email}
                                            </NextLink>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {subscriber.email}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            {/* <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => handleRemoveSubscriber(subscriber.userId)}
                                            className="text-red-600"
                                        >
                                            <UserX className="mr-2 h-4 w-4" />
                                            Remove from Sequence
                                        </DropdownMenuItem> 
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell> */}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {totalCount > rowsPerPage && (
                <PaginationControls
                    currentPage={page}
                    totalPages={Math.ceil(totalCount / rowsPerPage)}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
