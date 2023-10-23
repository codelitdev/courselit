import React, { useState, useEffect, FormEvent } from "react";
import {
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_JOINED,
    USERS_MANAGER_PAGE_HEADING,
    USER_TABLE_HEADER_LAST_ACTIVE,
    USER_TYPE_TEAM,
    USER_TYPE_CUSOMER,
    //EXPORT_CSV,
    //USER_TABLE_HEADER_EMAIL,
    //USER_TABLE_HEADER_NAME_NAME,
    TOOLTIP_USER_PAGE_SEND_MAIL,
    USER_FILTER_BTN_LABEL,
    USER_FILTER_SAVE,
    USER_FILTER_LABEL_DEFAULT,
} from "../../../ui-config/strings";
import {
    checkPermission,
    //exportToCsv,
    FetchBuilder,
} from "@courselit/utils";
import { connect } from "react-redux";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import { User, Address, State, AppMessage } from "@courselit/common-models";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import {
    Tooltip,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Avatar,
    Link,
    Form,
    FormField,
    Popover,
} from "@courselit/components-library";
//import { CSVLink } from "react-csv";
import { Search } from "@courselit/icons";
import { useRouter } from "next/router";
import { UIConstants } from "@courselit/common-models";
import { Mail } from "@courselit/icons";
import { formattedLocaleDate } from "../../../ui-lib/utils";
import dynamic from "next/dynamic";
import Filter from "../../../ui-models/filter";
import Segment from "../../../ui-models/segment";
const FilterChip = dynamic(() => import("./filter-chip"));
const FilterSave = dynamic(() => import("./filter-save"));
const SegmentEditor = dynamic(() => import("./segment-editor"));
const FilterEditor = dynamic(() => import("./filter-editor"));

const { networkAction, setAppMessage } = actionCreators;
const { permissions } = UIConstants;

interface UserManagerProps {
    address: Address;
    dispatch: AppDispatch;
    featureFlags: string[];
    loading: boolean;
}

const UsersManager = ({
    address,
    dispatch,
    featureFlags,
    loading,
}: UserManagerProps) => {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [type, setType] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchEmailHook, setSearchEmailHook] = useState(0);
    const [count, setCount] = useState(0);
    const [filters, setFilters] = useState<Filter[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [segmentSaveOpen, setSegmentSaveOpen] = useState(false);
    const defaultSegment: Segment = {
        name: USER_FILTER_LABEL_DEFAULT,
        filters: [],
        segmentId: "",
    };
    const [segments, setSegments] = useState<Segment[]>([defaultSegment]);
    const [activeSegment, setActiveSegment] = useState("");
    const router = useRouter();
    const [segmentSelectOpen, setSegmentSelectOpen] = useState(false);
    const {
        segmentId,
        page: routerPage,
        filters: routerFilters,
    } = router.query;

    useEffect(() => {
        loadUsers();
    }, [page, rowsPerPage, filters, searchEmailHook]);

    useEffect(() => {
        loadUsersCount();
    }, [rowsPerPage, filters, searchEmailHook]);

    useEffect(() => {
        if (routerFilters) {
            setFilters(JSON.parse(atob(routerFilters)));
        }
        if (routerPage) {
            setPage(parseInt((routerPage as string) || "1"));
        }
        if (segmentId) {
            setActiveSegment(segmentId as string);
        }
    }, [segmentId, routerPage, routerFilters]);

    /*
    useEffect(() => {
        if (activeSegment) {
            const segmnt = segments.filter(segment => segment.value === activeSegment)
            setFilters(segmnt[0]?.filters)
        }
    }, [segments])
    */

    const handlePageChange = (newPage: number) => {
        router.replace({
            query: { ...router.query, page: newPage },
        });
    };

    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(1);
    };

    const loadUsers = async () => {
        const query =
            filters.length !== 0
                ? `
                query {
                    users: getUsers(searchData: {
                        filters: ${JSON.stringify(JSON.stringify(filters))}
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
            if (response.users && response.users.length > 0) {
                setUsers(response.users);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false),
            );
        }
    };

    const loadUsersCount = async () => {
        const query =
            filters.length !== 0
                ? `
                query {
                    count: getUsersCount(searchData: {
                        filters: ${JSON.stringify(JSON.stringify(filters))},
                        offset: ${page},
                    }),
                    segments {
                        name,
                        filters {
                            name,
                            condition,
                            value
                        },
                        segmentId
                    }
                }
            `
                : `
                query {
                    count: getUsersCount(searchData: {
                        offset: ${page}
                    }),
                    segments {
                        name,
                        filters {
                            name,
                            condition,
                            value
                        },
                        segmentId
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
            if (response.count) {
                setCount(response.count);
            }
            if (response.segments) {
                mapSegments(response.segments);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false),
            );
        }
    };

    const mapSegments = (segments: Segment[]) => {
        setSegments([defaultSegment, ...segments]);
    };

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

    const getUserType = (user: User) => {
        const types = [];
        const hasAdminPermissions = checkPermission(user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
            permissions.publishCourse,
            permissions.manageMedia,
            permissions.manageAnyMedia,
            permissions.uploadMedia,
            permissions.viewAnyMedia,
            permissions.manageSite,
            permissions.manageSettings,
            permissions.manageUsers,
        ]);
        const hasAudiencePermission = checkPermission(user.permissions, [
            permissions.enrollInCourse,
        ]);
        if (hasAdminPermissions) {
            types.push(USER_TYPE_TEAM);
        }
        if (hasAudiencePermission) {
            types.push(USER_TYPE_CUSOMER);
        }
        return types.join(", ");
    };

    const resetView = () => {
        setSearchEmail("");
        setUsers([]);
        setPage(1);
        setCount(0);
        delete router.query.page;
        router.replace({
            query: { ...router.query },
        });
    };

    const handleSegmentChange = (segmentId: string) => {
        if (segmentId === activeSegment) return;

        resetView();

        if (segmentId) {
            router.replace({
                query: {
                    ...router.query,
                    segmentId,
                    filters: btoa(
                        JSON.stringify(
                            segments.filter(
                                (segment) => segment.segmentId === segmentId,
                            )[0].filters,
                        ),
                    ),
                },
            });
        } else {
            delete router.query.segmentId;
            delete router.query.filters;
            setActiveSegment("");
            setFilters([]);
            router.replace({
                query: {
                    ...router.query,
                },
            });
        }
    };

    const searchByEmail = async (e?: FormEvent) => {
        e && e.preventDefault();
        //setUsers([]);
        //setPage(1);
        //setType("");
        //setSearchEmailHook(searchEmailHook + 1);
        resetView();
        setFilters([
            ...filters,
            {
                name: "email",
                condition: "Contains",
                value: searchEmail,
            },
        ]);
    };

    const exportData = () => {
        exportToCsv(users.map((user) => Object.values(user)));
    };

    const onFilterRemove = (index: number) => {
        filters.splice(index, 1);
        router.replace({
            query: {
                ...router.query,
                filters: btoa(JSON.stringify([...filters])),
            },
        });
    };

    return (
        <div className="flex flex-col">
            <h1 className="text-4xl font-semibold mb-4">
                {USERS_MANAGER_PAGE_HEADING}
            </h1>
            <div className="flex items-end gap-2 mb-4">
                <Form
                    onSubmit={searchByEmail}
                    className="flex gap-2 items-start"
                >
                    <FormField
                        type="email"
                        label="Search by email"
                        onChange={(e) => setSearchEmail(e.target.value)}
                        value={searchEmail}
                        required
                        endIcon={
                            searchEmail ? (
                                <span className="flex gap-2">
                                    <IconButton
                                        type="submit"
                                        variant="soft"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            searchByEmail();
                                        }}
                                    >
                                        <Search />
                                    </IconButton>
                                </span>
                            ) : null
                        }
                    />
                </Form>
                <Popover
                    open={segmentSelectOpen}
                    setOpen={setSegmentSelectOpen}
                    title={
                        segments.filter(
                            (segment) => segment.segmentId === activeSegment,
                        )[0]?.name
                    }
                >
                    <SegmentEditor
                        segments={segments}
                        selectedSegment={activeSegment}
                        dismissPopover={({
                            selectedSegment,
                            segments,
                            cancelled,
                        }) => {
                            if (!cancelled) {
                                if (segments && segments.length) {
                                    mapSegments(segments);
                                }
                                handleSegmentChange(selectedSegment);
                            }
                            setSegmentSelectOpen(false);
                        }}
                    />
                </Popover>
                <Popover
                    open={filterOpen}
                    setOpen={setFilterOpen}
                    title={USER_FILTER_BTN_LABEL}
                >
                    <FilterEditor
                        dismissPopover={(filter: Filter) => {
                            if (filter) {
                                router.replace({
                                    query: {
                                        ...router.query,
                                        filters: btoa(
                                            JSON.stringify([
                                                ...filters,
                                                filter,
                                            ]),
                                        ),
                                    },
                                });
                            }
                            setFilterOpen(false);
                        }}
                    />
                </Popover>
                {featureFlags.includes("mail") && (
                    <Tooltip title={TOOLTIP_USER_PAGE_SEND_MAIL}>
                        <IconButton onClick={createMail} variant="soft">
                            <Mail />
                        </IconButton>
                    </Tooltip>
                )}
            </div>
            {filters.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {filters.map((filter, index) => (
                        <FilterChip
                            onRemove={onFilterRemove}
                            key={index}
                            index={index}
                            filter={filter}
                        />
                    ))}
                    <Popover
                        open={segmentSaveOpen}
                        setOpen={setSegmentSaveOpen}
                        title={USER_FILTER_SAVE}
                    >
                        <FilterSave
                            filters={filters}
                            dismissPopover={(segments?: Segment[]) => {
                                if (segments && segments.length) {
                                    mapSegments(segments);
                                }
                                setSegmentSaveOpen(false);
                            }}
                        />
                    </Popover>
                </div>
            )}
            <Table aria-label="Users">
                <TableHead>
                    <td>{USER_TABLE_HEADER_NAME}</td>
                    <td align="right">{USER_TABLE_HEADER_JOINED}</td>
                    <td align="right">{USER_TABLE_HEADER_LAST_ACTIVE}</td>
                </TableHead>
                <TableBody
                    count={count}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
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
    auth: state.auth,
    address: state.address,
    profile: state.profile,
    featureFlags: state.featureFlags,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
