"use client";

import {
    useContext,
    useEffect,
    useState,
    useCallback,
    startTransition,
    useMemo,
} from "react";
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    Inbox,
    Check,
    TriangleAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Card,
    CardContent,
    CardHeader,
    CardFooter,
    CardTitle,
} from "@/components/ui/card";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
} from "./contexts";
import { Notification } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 10;

export function NotificationsViewer() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    const unreadCount = notifications.filter((n) => !n.read).length;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const address = useContext(AddressContext);
    const router = useRouter();
    const { toast } = useToast();
    const { profile } = useContext(ProfileContext);
    const config = useContext(ServerConfigContext);

    const nextPage = () =>
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    const fetchBuilder = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const getNotification = useCallback(
        async (notificationId: string) => {
            const query = `
                query ($notificationId: String!) {
                    notification: getNotification(notificationId: $notificationId) {
                        notificationId
                        message
                        href
                        read
                        createdAt
                    }
                }
            `;

            const fetcher = fetchBuilder
                .setPayload({
                    query,
                    variables: {
                        notificationId,
                    },
                })
                .build();
            try {
                const response = await fetcher.exec();
                startTransition(() => {
                    setNotifications((prev) => [
                        response.notification,
                        ...prev,
                    ]);
                });
            } catch (error) {
                console.error(error);
            }
        },
        [fetchBuilder],
    );

    useEffect(() => {
        if (!profile?.userId || !config.queueServer) {
            return;
        }

        const eventSource = new EventSource(
            `${config.queueServer}/sse/${profile.userId}`,
        );

        eventSource.onmessage = (event) => {
            const notificationId = JSON.parse(event.data);
            getNotification(notificationId);
        };

        return () => {
            eventSource.close();
        };
    }, [profile?.userId, config.queueServer, getNotification]);

    const markAllAsRead = () => {
        const mutation = `
            mutation {
                markAllAsRead
            }
        `;

        const fetcher = fetchBuilder.setPayload({ query: mutation }).build();
        try {
            fetcher.exec();
            startTransition(() => {
                setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true })),
                );
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to mark all as read",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            const query = `
                query ($page: Int!, $limit: Int!) {
                    notifications: getNotifications(page: $page, limit: $limit) {
                        notifications {
                            notificationId
                            message
                            href
                            read
                            createdAt
                        }
                        total
                    }
                }
            `;

            const fetcher = await fetchBuilder
                .setPayload({
                    query,
                    variables: {
                        page: currentPage,
                        limit: ITEMS_PER_PAGE,
                    },
                })
                .build();
            try {
                const response = await fetcher.exec();
                if (response.notifications) {
                    startTransition(() => {
                        setNotifications(response.notifications.notifications);
                        setTotalPages(
                            Math.ceil(
                                response.notifications.total / ITEMS_PER_PAGE,
                            ),
                        );
                    });
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchNotifications();
    }, [currentPage, fetchBuilder]);

    const markReadAndNavigate = async (
        notificationId: string,
        href: string,
    ) => {
        const query = `
            mutation ($notificationId: String!) {
                markAsRead(notificationId: $notificationId)
            }
        `;

        const fetcher = await fetchBuilder
            .setPayload({
                query,
                variables: {
                    notificationId,
                },
            })
            .build();
        try {
            await fetcher.exec();
            router.push(href);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to open the notification",
                variant: "destructive",
            });
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                    )}
                    <span className="sr-only">View notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Card>
                    <CardHeader className="border-b py-2 px-4 flex flex-row justify-between items-center">
                        <CardTitle className="text-base text-left">
                            Notifications
                        </CardTitle>
                        {notifications.some((n) => !n.read) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="h-6 text-xs px-2 py-0"
                            >
                                <Check className="h-3 w-3 mr-1" />
                                <span className="sr-only sm:not-sr-only">
                                    Read all
                                </span>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 max-h-96 overflow-y-auto">
                        {!config.queueServer && (
                            <div className="p-2 bg-yellow-100 text-red-500 text-xs flex items-center">
                                <TriangleAlert className="h-6 w-6 inline mr-2" />
                                Queue configuration is missing. Realtime
                                notifications will not work.
                            </div>
                        )}
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    No new notifications
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notificationId}
                                    onClick={() =>
                                        markReadAndNavigate(
                                            notification.notificationId,
                                            notification.href,
                                        )
                                    }
                                    className={`p-3 border-b last:border-b-0 ${notification.read ? "bg-muted/50" : ""} hover:bg-accent cursor-pointer transition-colors duration-200`}
                                >
                                    <p className="text-xs text-muted-foreground">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(
                                            new Date(notification.createdAt),
                                            { addSuffix: true },
                                        )}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                    {notifications.length > 0 && (
                        <CardFooter className="flex justify-between py-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="text-xs"
                            >
                                <ChevronLeft className="h-3 w-3 mr-1" />{" "}
                                Previous
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                                className="text-xs"
                            >
                                Next <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </PopoverContent>
        </Popover>
    );
}
