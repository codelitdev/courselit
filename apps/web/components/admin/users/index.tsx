import React, { useState, useEffect } from "react";
import {
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_JOINED,
    USERS_MANAGER_PAGE_HEADING,
    USER_TABLE_HEADER_LAST_ACTIVE,
    BTN_MANAGE_TAGS,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import {
    User,
    Address,
    State,
    AppMessage,
    UserFilter,
    UserFilterAggregator,
} from "@courselit/common-models";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    Link,
    Button,
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@courselit/components-library";
import { formattedLocaleDate } from "@ui-lib/utils";
import FilterContainer from "./filter-container";
import { useCallback } from "react";

const { networkAction, setAppMessage } = actionCreators;

interface UserManagerProps {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}

export const Users = ({ address, dispatch, loading }: UserManagerProps) => {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<UserFilter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<UserFilterAggregator>("or");
    const [count, setCount] = useState(0);

    /*
    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(1);
    };
    */

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
                        updatedAt,
                        invited,
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
                        updatedAt,
                        invited,
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
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.users) {
                setUsers(response.users);
            }
            if (typeof response.count !== "undefined") {
                setCount(response.count);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false),
            );
        }
    }, [
        address.backend,
        dispatch,
        page,
        rowsPerPage,
        filters,
        filtersAggregator,
    ]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const onFilterChange = useCallback(({ filters, aggregator, segmentId }) => {
        setFilters(filters);
        setFiltersAggregator(aggregator);
        setPage(1);
    }, []);

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {USERS_MANAGER_PAGE_HEADING}
                </h1>
                <div>
                    <Button
                        component="link"
                        variant="soft"
                        href="/dashboard/users/tags"
                    >
                        {BTN_MANAGE_TAGS}
                    </Button>
                </div>
            </div>
            <div className="mb-4">
                <FilterContainer
                    onChange={onFilterChange}
                    address={address}
                    dispatch={dispatch}
                />
            </div>
            <Table aria-label="Users">
                <TableHead>
                    <td>{USER_TABLE_HEADER_NAME}</td>
                    <td align="right">{USER_TABLE_HEADER_JOINED}</td>
                    <td align="right">{USER_TABLE_HEADER_LAST_ACTIVE}</td>
                </TableHead>
                <TableBody
                    count={count}
                    page={page}
                    onPageChange={setPage}
                    rowsPerPage={rowsPerPage}
                    loading={loading}
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
                                            href={`/dashboard/users/${user.userId}`}
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
                                    ? formattedLocaleDate(user.createdAt)
                                    : ""}
                            </td>
                            <td align="right">
                                {user.updatedAt !== user.createdAt
                                    ? !user.invited
                                        ? user.updatedAt
                                            ? formattedLocaleDate(
                                                  user.updatedAt,
                                              )
                                            : ""
                                        : ""
                                    : ""}
                            </td>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    profile: state.profile,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Users);
