"use client";

import LoadingScreen from "@components/admin/loading-screen";
import FilterContainer from "@components/admin/users/filter-container";
import Tags from "@components/admin/users/tags";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    User,
    UserFilter,
    UIConstants,
    UserFilterAggregator,
} from "@courselit/common-models";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    Link,
    Table,
    TableBody,
    TableHead,
    TableRow,
    Tabbs,
} from "@courselit/components-library";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import {
    USER_TABLE_HEADER_JOINED,
    USER_TABLE_HEADER_LAST_ACTIVE,
    USER_TABLE_HEADER_NAME,
    USERS_MANAGER_PAGE_HEADING,
    USERS_TAG_NEW_HEADER,
} from "@ui-config/strings";
import { formattedLocaleDate } from "@ui-lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useState } from "react";

const { permissions } = UIConstants;

export default function UsersHub() {
    const address = useContext(AddressContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Users";

    const [page, setPage] = useState(1);
    const [rowsPerPage, _] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<UserFilter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<UserFilterAggregator>("or");
    const [count, setCount] = useState(0);
    const router = useRouter();

    const profile = useContext(ProfileContext);

    const loadUsers = useCallback(async () => {
        const query =
            filters.length !== 0
                ? `
                query {
                    users: getUsers(searchData: {
                        filters: ${JSON.stringify(
                            JSON.stringify({
                                aggregator: filtersAggregator,
                                filters,
                            }),
                        )}
                        offset: ${page},
                        rowsPerPage: ${rowsPerPage}
                    }) {
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
                        avatar {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
            },
                    },
                    count: getUsersCount(searchData: {
                        filters: ${JSON.stringify(
                            JSON.stringify({
                                aggregator: filtersAggregator,
                                filters,
                            }),
                        )}
                    })
                }
            `
                : `
                query {
                    users: getUsers(searchData: {
                        offset: ${page},
                        rowsPerPage: ${rowsPerPage}
                    }) {
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
                        avatar {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
                        },
                    },
                    count: getUsersCount
                }
            `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
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
            console.error(err);
        } finally {
        }
    }, [address.backend, page, rowsPerPage, filters, filtersAggregator]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const onFilterChange = useCallback(({ filters, aggregator, segmentId }) => {
        setFilters(filters);
        setFiltersAggregator(aggregator);
        setPage(1);
    }, []);

    if (!checkPermission(profile.permissions!, [permissions.manageSite])) {
        return <LoadingScreen />;
    }

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {USERS_MANAGER_PAGE_HEADING}
                </h1>
                {tab === "Tags" && (
                    <div>
                        <Button
                            component="link"
                            href={`/dashboard2/users/tags/new`}
                        >
                            {USERS_TAG_NEW_HEADER}
                        </Button>
                    </div>
                )}
            </div>
            <Tabbs
                items={["All users", "Tags"]}
                value={tab}
                onChange={(tab: string) => {
                    router.replace(`/dashboard2/users?tab=${tab}`);
                }}
            >
                <div className="w-full mt-4">
                    <div className="mb-4">
                        <FilterContainer
                            address={address}
                            onChange={onFilterChange}
                        />
                    </div>
                    <Table aria-label="Users" className="w-full">
                        <TableHead>
                            <td>{USER_TABLE_HEADER_NAME}</td>
                            <td align="right">{USER_TABLE_HEADER_JOINED}</td>
                            <td align="right">
                                {USER_TABLE_HEADER_LAST_ACTIVE}
                            </td>
                        </TableHead>
                        <TableBody
                            count={count}
                            page={page}
                            onPageChange={setPage}
                            rowsPerPage={rowsPerPage}
                            loading={false}
                        >
                            {users.map((user) => (
                                <TableRow key={user.email}>
                                    <td className="py-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar>
                                                <AvatarImage
                                                    src={
                                                        user.avatar
                                                            ? user.avatar?.file
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
                                                    href={`/dashboard2/users/${user.userId}`}
                                                >
                                                    <span className="font-medium">
                                                        {user.name
                                                            ? user.name
                                                            : user.email}
                                                    </span>
                                                </Link>
                                                <div className="text-sm text-slate-600">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td align="right">
                                        {user.createdAt
                                            ? formattedLocaleDate(
                                                  user.createdAt,
                                              )
                                            : ""}
                                    </td>
                                    <td align="right">
                                        {user.updatedAt !== user.createdAt
                                            ? user.updatedAt
                                                ? formattedLocaleDate(
                                                      user.updatedAt,
                                                  )
                                                : ""
                                            : ""}
                                    </td>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Tags address={address} prefix="/dashboard2" />
            </Tabbs>
        </div>
    );
}
