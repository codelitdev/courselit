"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import FilterContainer from "@components/admin/users/filter-container";
import { AddressContext, ProfileContext } from "@components/contexts";
import { PaginationControls } from "@components/public/pagination";
import {
    Table,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@components/ui/table";
import {
    User,
    UserFilter,
    UIConstants,
    UserFilterAggregator,
} from "@courselit/common-models";
import { MembershipEntityType } from "@courselit/common-models/dist/constants";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Link,
    TableBody,
    useToast,
    Skeleton,
} from "@courselit/components-library";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    USER_TABLE_HEADER_COMMUNITIES,
    USER_TABLE_HEADER_JOINED,
    USER_TABLE_HEADER_LAST_ACTIVE,
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_PRODUCTS,
    USER_TABLE_HEADER_STATUS,
    USERS_MANAGER_PAGE_HEADING,
} from "@ui-config/strings";
import { formattedLocaleDate } from "@ui-lib/utils";
import { useCallback, useContext, useEffect, useState } from "react";

const { permissions } = UIConstants;

const breadcrumbs = [{ label: "Users", href: "#" }];

export default function UsersHub() {
    const address = useContext(AddressContext);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rowsPerPage, _] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<UserFilter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<UserFilterAggregator>("or");
    const [count, setCount] = useState(0);
    const { toast } = useToast();

    const { profile } = useContext(ProfileContext);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        const query = `
                query ($page: Int, $filters: String) {
                    users: getUsers(
                        filters: $filters
                        page: $page
                    ) {
                        name
                        userId
                        email
                        permissions
                        createdAt
                        updatedAt
                        avatar {
                            mediaId
                            originalFileName
                            mimeType
                            size
                            access
                            file
                            thumbnail
                            caption
                        },
                        active 
                        content {
                            entityType
                            entity {
                                id
                                title
                            }
                        }
                    },
                    count: getUsersCount(filters: $filters)
                }
            `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    page,
                    filters: JSON.stringify({
                        aggregator: filtersAggregator,
                        filters,
                    }),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.users) {
                setUsers(response.users);
            }
            if (typeof response.count !== "undefined") {
                setCount(response.count);
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [address.backend, page, rowsPerPage, filters, filtersAggregator]);

    useEffect(() => {
        if (checkPermission(profile?.permissions!, [permissions.manageUsers])) {
            loadUsers();
        }
    }, [loadUsers]);

    const onFilterChange = useCallback(({ filters, aggregator, segmentId }) => {
        setFilters(filters);
        setFiltersAggregator(aggregator);
        setPage(1);
    }, []);

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageUsers]}
        >
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-semibold mb-4">
                    {USERS_MANAGER_PAGE_HEADING}
                </h1>
            </div>
            <div className="w-full mt-4 space-y-8">
                <div className="mb-4">
                    <FilterContainer onChange={onFilterChange} />
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-medium">
                                {USER_TABLE_HEADER_NAME}
                            </TableHead>
                            <TableHead className="text-muted-foreground font-medium">
                                {USER_TABLE_HEADER_STATUS}
                            </TableHead>
                            <TableHead className="text-muted-foreground font-medium">
                                {USER_TABLE_HEADER_PRODUCTS}
                            </TableHead>
                            <TableHead className="text-muted-foreground font-medium">
                                {USER_TABLE_HEADER_COMMUNITIES}
                            </TableHead>
                            <TableHead
                                align="right"
                                className="text-muted-foreground font-medium hidden lg:table-cell"
                            >
                                {USER_TABLE_HEADER_JOINED}
                            </TableHead>
                            <TableHead
                                align="right"
                                className="text-muted-foreground font-medium hidden lg:table-cell"
                            >
                                {USER_TABLE_HEADER_LAST_ACTIVE}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading
                            ? Array(5)
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
                                          <TableCell>
                                              <Skeleton className="h-6 w-20" />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton className="h-4 w-8" />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton className="h-4 w-8" />
                                          </TableCell>
                                          <TableCell className="hidden lg:table-cell">
                                              <Skeleton className="h-4 w-[100px] ml-auto" />
                                          </TableCell>
                                          <TableCell className="hidden lg:table-cell">
                                              <Skeleton className="h-4 w-[100px] ml-auto" />
                                          </TableCell>
                                      </TableRow>
                                  ))
                            : users.map((user) => (
                                  <TableRow key={user.email}>
                                      <TableCell className="py-2">
                                          <div className="flex items-center gap-2">
                                              <Avatar>
                                                  <AvatarImage
                                                      src={
                                                          user.avatar
                                                              ? user.avatar
                                                                    ?.file
                                                              : "/courselit_backdrop_square.webp"
                                                      }
                                                  />
                                                  <AvatarFallback>
                                                      {(user.name
                                                          ? user.name.charAt(0)
                                                          : user.email.charAt(0)
                                                      ).toUpperCase()}
                                                  </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                  <Link
                                                      href={`/dashboard/users/${user.userId}`}
                                                  >
                                                      <span className="font-medium text-base">
                                                          {user.name
                                                              ? user.name
                                                              : user.email}
                                                      </span>
                                                  </Link>
                                                  <div className="text-xs text-muted-foreground">
                                                      {user.email}
                                                  </div>
                                              </div>
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <Badge
                                              variant={
                                                  user.active
                                                      ? "default"
                                                      : "secondary"
                                              }
                                          >
                                              {user.active
                                                  ? "Active"
                                                  : "Restricted"}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>
                                          {
                                              (user.content ?? []).filter(
                                                  (content) =>
                                                      content.entityType.toLowerCase() ===
                                                      MembershipEntityType.COURSE,
                                              ).length
                                          }
                                      </TableCell>
                                      <TableCell>
                                          {
                                              (user.content ?? []).filter(
                                                  (content) =>
                                                      content.entityType.toLowerCase() ===
                                                      MembershipEntityType.COMMUNITY,
                                              ).length
                                          }
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell">
                                          {user.createdAt
                                              ? formattedLocaleDate(
                                                    user.createdAt,
                                                )
                                              : ""}
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell">
                                          {user.updatedAt !== user.createdAt
                                              ? user.updatedAt
                                                  ? formattedLocaleDate(
                                                        user.updatedAt,
                                                    )
                                                  : ""
                                              : ""}
                                      </TableCell>
                                  </TableRow>
                              ))}
                    </TableBody>
                </Table>
                <PaginationControls
                    currentPage={page}
                    totalPages={Math.ceil(count / rowsPerPage)}
                    onPageChange={setPage}
                />
            </div>
        </DashboardContent>
    );
}
