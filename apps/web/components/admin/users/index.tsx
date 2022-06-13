import React, { useState, useEffect } from "react";
import {
    Avatar,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    LOAD_MORE_TEXT,
    USER_TABLE_HEADER_NAME,
    USER_TABLE_HEADER_JOINED,
    USERS_MANAGER_PAGE_HEADING,
    USER_TABLE_HEADER_LAST_ACTIVE,
    USER_TYPE_TEAM,
    USER_TYPE_AUDIENCE,
    USER_FILTER_PERMISSION,
    USER_TYPE_TOOLTIP,
    USER_TYPE_ALL,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { Section } from "@courselit/components-library";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import type {
    Profile,
    User,
    Auth,
    Address,
    State,
} from "@courselit/common-models";
import { checkPermission } from "../../../ui-lib/utils";
import { permissions } from "../../../ui-config/constants";
import Link from "next/link";
import MuiLink from "@mui/material/Link";
import { Help } from "@mui/icons-material";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";

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

    useEffect(() => {
        loadUsers();
    }, [usersPaginationOffset, type]);

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
            types.push(USER_TYPE_AUDIENCE);
        }
        return types.join(", ");
    };

    const handleUserTypeChange = (e: SelectChangeEvent) => {
        setType(e.target.value);
        setUsers([]);
        setUsersPaginationOffset(1);
    };

    return (
        <Section>
            <Grid container direction="column" spacing={2}>
                <Grid item>
                    <Typography variant="h1">
                        {USERS_MANAGER_PAGE_HEADING}
                    </Typography>
                </Grid>
                <Grid item>
                    <TableContainer>
                        <Table aria-label="Users">
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        {USER_TABLE_HEADER_NAME}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Grid
                                            container
                                            justifyContent="end"
                                            alignItems="center"
                                        >
                                            <Grid item>
                                                <FormControl
                                                    sx={{ minWidth: 120 }}
                                                >
                                                    <InputLabel
                                                        htmlFor="permissions-select"
                                                        id="type-select"
                                                        shrink
                                                    >
                                                        {USER_FILTER_PERMISSION}
                                                    </InputLabel>
                                                    <Select
                                                        onChange={
                                                            handleUserTypeChange
                                                        }
                                                        displayEmpty
                                                        value={type}
                                                        id="permissions-select"
                                                        label="Grouping"
                                                        labelId="type-select"
                                                        size="small"
                                                    >
                                                        <MenuItem value="">
                                                            {USER_TYPE_ALL}
                                                        </MenuItem>
                                                        <MenuItem
                                                            value={
                                                                USER_TYPE_AUDIENCE
                                                            }
                                                        >
                                                            {USER_TYPE_AUDIENCE}
                                                        </MenuItem>
                                                        <MenuItem
                                                            value={
                                                                USER_TYPE_TEAM
                                                            }
                                                        >
                                                            {USER_TYPE_TEAM}
                                                        </MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item>
                                                <Tooltip
                                                    title={USER_TYPE_TOOLTIP}
                                                >
                                                    <Help />
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </TableCell>
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
                                            "&:last-child td, &:last-child th":
                                                { border: 0 },
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
        </Section>
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
