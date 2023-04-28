import React, { useState, useEffect, FormEvent } from "react";
import {
    Avatar,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import Box from "@mui/material/Box";
import TablePagination from "@mui/material/TablePagination";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import {
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_JOINED,
    USERS_MANAGER_PAGE_HEADING,
    USER_TABLE_HEADER_LAST_ACTIVE,
    USER_TYPE_TEAM,
    USER_TYPE_CUSOMER,
    USER_FILTER_PERMISSION,
    USER_TYPE_ALL,
    EXPORT_CSV,
    USER_TYPE_SUBSCRIBER,
    USER_TABLE_HEADER_EMAIL,
    USER_TABLE_HEADER_NAME_NAME,
    TOOLTIP_USER_PAGE_SEND_MAIL,
} from "../../../ui-config/strings";
import { checkPermission, exportToCsv, FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import {
    Profile,
    User,
    Auth,
    Address,
    State,
    AppMessage,
} from "@courselit/common-models";
import Link from "next/link";
import MuiLink from "@mui/material/Link";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import { Select as SingleSelect } from "@courselit/components-library";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { CSVLink } from "react-csv";
import Email from "@mui/icons-material/Email";
import Cancel from "@mui/icons-material/Cancel";
import InputAdornment from "@mui/material/InputAdornment";
import { useRouter } from "next/router";
import { UIConstants } from "@courselit/common-models";

const { networkAction } = actionCreators;
const { permissions } = UIConstants;

interface UserManagerProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
    profile: Profile;
    featureFlags: string[];
}

const UsersManager = ({
    auth,
    address,
    dispatch,
    profile,
    featureFlags,
}: UserManagerProps) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [type, setType] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchEmailHook, setSearchEmailHook] = useState(0);
    const [count, setCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        loadUsers();
    }, [page, rowsPerPage, type, searchEmailHook]);

    useEffect(() => {
        loadUsersCount();
    }, [rowsPerPage, type, searchEmailHook]);

    const handlePageChange = (
        e: MouseEvent<HTMLButtonElement> | null,
        newPage: number
    ) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const loadUsers = async () => {
        const query =
            type !== ""
                ? `
                query {
                    users: getUsers(searchData: {
                        type: ${type.toUpperCase()}
                        offset: ${page + 1},
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
                : searchEmail
                ? `
                query {
                    users: getUsers(searchData: {
                        offset: ${page + 1}
                        email: "${searchEmail}",
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
                        offset: ${page + 1},
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
                networkAction(true)
            );
            const response = await fetch.exec();
            if (response.users && response.users.length > 0) {
                setUsers(response.users);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false)
            );
        }
    };

    const loadUsersCount = async () => {
        const query =
            type !== ""
                ? `
                query {
                    count: getUsersCount(searchData: {
                        offset: ${page},
                        type: ${type.toUpperCase()}
                    })
                }
            `
                : searchEmail
                ? `
                query {
                    count: getUsersCount(searchData: {
                        offset: ${page}
                        email: "${searchEmail}"
                    }) 
                }
            `
                : `
                query {
                    count: getUsersCount(searchData: {
                        offset: ${page}
                    })
                }
            `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true)
            );
            const response = await fetch.exec();
            if (response.count) {
                setCount(response.count);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false)
            );
        }
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
                networkAction(true)
            );
            const response = await fetch.exec();
            if (response.mail && response.mail.mailId) {
                router.push(`/dashboard/mails/${response.mail.mailId}/edit`);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false)
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

    const handleUserTypeChange = (value: string) => {
        setSearchEmail("");
        setType(value);
        setUsers([]);
        setPage(0);
    };

    const searchByEmail = async (e?: FormEvent) => {
        e && e.preventDefault();
        setUsers([]);
        setPage(0);
        setType("");
        setSearchEmailHook(searchEmailHook + 1);
    };

    const exportData = () => {
        exportToCsv(users.map((user) => Object.values(user)));
    };

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <Typography variant="h1">
                    {USERS_MANAGER_PAGE_HEADING}
                </Typography>
            </Grid>
            <Grid item sx={{ mb: 2 }} component={Paper}>
                <Toolbar>
                    <Box
                        component="form"
                        onSubmit={searchByEmail}
                        sx={{ pr: 1 }}
                    >
                        <TextField
                            type="email"
                            label="Search by email"
                            onChange={(e) => setSearchEmail(e.target.value)}
                            value={searchEmail}
                            required
                            InputProps={{
                                endAdornment: searchEmail ? (
                                    <InputAdornment>
                                        <IconButton
                                            aria-label="clear email search box"
                                            onClick={() => {
                                                setSearchEmail("");
                                                searchByEmail();
                                            }}
                                        >
                                            <Cancel />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                    </Box>
                    <Box sx={{ minWidth: 140 }}>
                        <SingleSelect
                            title={USER_FILTER_PERMISSION}
                            onChange={handleUserTypeChange}
                            value={type}
                            options={[
                                { label: USER_TYPE_ALL, value: "" },
                                {
                                    label: USER_TYPE_CUSOMER,
                                    value: USER_TYPE_CUSOMER,
                                },
                                {
                                    label: USER_TYPE_TEAM,
                                    value: USER_TYPE_TEAM,
                                },
                                {
                                    label: USER_TYPE_SUBSCRIBER,
                                    value: USER_TYPE_SUBSCRIBER,
                                },
                            ]}
                        />
                    </Box>
                    <Box sx={{ display: "none" }}>
                        <CSVLink
                            filename={"users-courselit.csv"}
                            headers={[
                                USER_TABLE_HEADER_EMAIL,
                                USER_TABLE_HEADER_NAME_NAME,
                                USER_TABLE_HEADER_JOINED,
                                USER_TABLE_HEADER_LAST_ACTIVE,
                            ]}
                            data={users.map((user) => [
                                user.email,
                                user.name,
                                user.createdAt
                                    ? new Date(
                                          +user.createdAt
                                      ).toLocaleDateString()
                                    : "",
                                user.updatedAt !== user.createdAt
                                    ? user.updatedAt
                                        ? new Date(
                                              +user.updatedAt
                                          ).toLocaleDateString()
                                        : ""
                                    : "",
                            ])}
                        >
                            {EXPORT_CSV}
                        </CSVLink>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}></Box>
                    {featureFlags.includes("mail") && (
                        <Tooltip title={TOOLTIP_USER_PAGE_SEND_MAIL}>
                            <IconButton onClick={createMail}>
                                <Email />
                            </IconButton>
                        </Tooltip>
                    )}
                </Toolbar>
                <TableContainer>
                    <Table aria-label="Users">
                        <TableHead>
                            <TableRow>
                                <TableCell>{USER_TABLE_HEADER_NAME}</TableCell>
                                <TableCell align="right">Type</TableCell>
                                <TableCell align="right">
                                    {USER_TABLE_HEADER_JOINED}
                                </TableCell>
                                <TableCell align="right">
                                    {USER_TABLE_HEADER_LAST_ACTIVE}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow
                                    key={user.email}
                                    sx={{
                                        "&:last-child td, &:last-child th": {
                                            border: 0,
                                        },
                                    }}
                                >
                                    <TableCell>
                                        <Grid
                                            container
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Grid item>
                                                <Avatar />
                                            </Grid>
                                            <Grid item>
                                                <Grid item>
                                                    <Link
                                                        href={`/dashboard/users/${user.userId}`}
                                                    >
                                                        <MuiLink
                                                            color="inherit"
                                                            variant="body1"
                                                        >
                                                            <b>
                                                                {user.name
                                                                    ? user.name
                                                                    : user.email}
                                                            </b>
                                                        </MuiLink>
                                                    </Link>
                                                </Grid>
                                                <Grid item>
                                                    <Typography variant="body1">
                                                        {user.email}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </TableCell>
                                    <TableCell align="right">
                                        {getUserType(user)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {user.createdAt
                                            ? new Date(
                                                  +user.createdAt
                                              ).toLocaleDateString()
                                            : ""}
                                    </TableCell>
                                    <TableCell align="right">
                                        {user.updatedAt !== user.createdAt
                                            ? user.updatedAt
                                                ? new Date(
                                                      +user.updatedAt
                                                  ).toLocaleDateString()
                                                : ""
                                            : ""}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={count}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                />
            </Grid>
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    profile: state.profile,
    featureFlags: state.featureFlags,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
