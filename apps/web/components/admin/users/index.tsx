import React, { useState, useEffect } from "react";
import {
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_JOINED,
    USERS_MANAGER_PAGE_HEADING,
    USER_TABLE_HEADER_LAST_ACTIVE,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import { User, Address, State, AppMessage } from "@courselit/common-models";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    Avatar,
    Link,
} from "@courselit/components-library";
import { useRouter } from "next/router";
import { formattedLocaleDate } from "@ui-lib/utils";
import Filter from "@ui-models/filter";
import type FilterAggregator from "@ui-models/filter-aggregator";
import FilterContainer from "./filter-container";
import { useCallback } from "react";

const { networkAction, setAppMessage } = actionCreators;

interface UserManagerProps {
    address: Address;
    dispatch: AppDispatch;
    featureFlags: string[];
    loading: boolean;
}

const UsersManager = ({ address, dispatch, loading }: UserManagerProps) => {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState<Filter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<FilterAggregator>("or");
    const [count, setCount] = useState(0);
    const router = useRouter();

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
                        id,
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
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
                        id,
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
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

    /*
    const createMail = async () => {
        const query =
            type !== ""
                ? `
                mutation {
                    mail: createMail(
                        searchData: {
                            type: ${type.toUpperCase()}
                        } 
                    ) {
                        mailId
                    }
                }
            `
                : searchEmail
                ? `
                mutation {
                    mail: createMail(
                        searchData: {
                            email: "${searchEmail}"
                        } 
                    ) {
                        mailId
                    }
                }
            `
                : `
                mutation {
                    mail: createMail(
                        searchData: {
                            offset: ${page}
                        } 
                    ) {
                        mailId
                    }
                }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.mail && response.mail.mailId) {
                router.push(`/dashboard/mails/${response.mail.mailId}/edit`);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false),
            );
        }
    };

    const exportData = () => {
        exportToCsv(users.map((user) => Object.values(user)));
    };
    */

    const onFilterChange = useCallback(({ filters, aggregator, segmentId }) => {
        setFilters(filters);
        setFiltersAggregator(aggregator);
        setPage(1);
    }, []);

    return (
        <div className="flex flex-col">
            <h1 className="text-4xl font-semibold mb-4">
                {USERS_MANAGER_PAGE_HEADING}
            </h1>
            <div className="mb-4">
                <FilterContainer onChange={onFilterChange} />
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
                        <TableRow
                            key={user.email}
                            sx={{
                                "&:last-child td, &:last-child th": {
                                    border: 0,
                                },
                            }}
                        >
                            <td className="py-2">
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        fallbackText={(user.name
                                            ? user.name.charAt(0)
                                            : user.email.charAt(0)
                                        ).toUpperCase()}
                                    />
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
                                    ? user.updatedAt
                                        ? formattedLocaleDate(user.updatedAt)
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

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
