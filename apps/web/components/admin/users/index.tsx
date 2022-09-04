import React, { useState, useEffect, FormEvent } from "react";
import {
    Avatar,
    Button,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {
    LOAD_MORE_TEXT,
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
    GENERIC_FAILURE_MESSAGE,
    USER_TABLE_HEADER_EMAIL,
    USER_TABLE_HEADER_NAME_NAME,
} from "../../../ui-config/strings";
import { exportToCsv, FetchBuilder } from "@courselit/utils";
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
import { checkPermission } from "../../../ui-lib/utils";
import { permissions } from "../../../ui-config/constants";
import Link from "next/link";
import MuiLink from "@mui/material/Link";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import { Select as SingleSelect } from "@courselit/components-library";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { CSVLink } from "react-csv";

const { networkAction } = actionCreators;

interface UserManagerProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
    profile: Profile;
}

const UsersManager = ({
    auth,
    address,
    dispatch,
    profile,
}: UserManagerProps) => {
    const [usersPaginationOffset, setUsersPaginationOffset] = useState(1);
    const [users, setUsers] = useState<User[]>([]);
    const [type, setType] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [searchEmailHook, setSearchEmailHook] = useState(0);

    useEffect(() => {
        loadUsers();
    }, [usersPaginationOffset, type, searchEmailHook]);

    const loadUsers = async () => {
        const query =
            type !== ""
                ? `
                query {
                    users: getUsers(searchData: {
                        offset: ${usersPaginationOffset},
                        type: ${type.toUpperCase()}
                    }) {
                        id,
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
                    }
                }
            `
                : searchEmail
                ? `
                query {
                    users: getUsers(searchData: {
                        offset: ${usersPaginationOffset}
                        email: "${searchEmail}"
                    }) {
                        id,
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
                    }
                }
            `
                : `
                query {
                    users: getUsers(searchData: {
                        offset: ${usersPaginationOffset}
                    }) {
                        id,
                        name,
                        userId,
                        email,
                        permissions,
                        createdAt,
                        updatedAt
                    }
                }
            `;
        await fetchUsers(query);
    };

    const fetchUsers = async (query: string) => {
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
                setUsers([...users, ...response.users]);
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(GENERIC_FAILURE_MESSAGE)));
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
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
        setUsersPaginationOffset(1);
    };

    const searchByEmail = async (e: FormEvent) => {
        e.preventDefault();
        setUsers([]);
        setUsersPaginationOffset(1);
        setType("");
        setSearchEmailHook(searchEmailHook + 1);
        // const query = `
        //     query {
        //         users: getUsers(searchData: {
        //             offset: ${usersPaginationOffset}
        //             email: "${searchEmail}"
        //         }) {
        //             id,
        //             name,
        //             userId,
        //             email,
        //             permissions,
        //             createdAt,
        //             updatedAt
        //         }
        //     }
        // `
        // await fetchUsers(query);
    };

    const exportData = () => {
        exportToCsv(users.map((user) => Object.values(user)));
    };

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 3 }}>
                <Typography variant="h1">
                    {USERS_MANAGER_PAGE_HEADING}
                </Typography>
            </Grid>
            <Grid item sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item>
                        <form onSubmit={searchByEmail}>
                            <TextField
                                type="email"
                                label="Search by email"
                                onChange={(e) => setSearchEmail(e.target.value)}
                                value={searchEmail}
                                required
                            />
                        </form>
                    </Grid>
                    <Grid item sx={{ minWidth: 140 }}>
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
                    </Grid>
                    <Grid item>
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
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
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
            </Grid>
            {users.length > 0 && (
                <Grid item container justifyContent="center">
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={() =>
                                setUsersPaginationOffset(
                                    usersPaginationOffset + 1
                                )
                            }
                        >
                            {LOAD_MORE_TEXT}
                        </Button>
                    </Grid>
                </Grid>
            )}
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
