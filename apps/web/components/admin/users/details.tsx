import React, { useState, useEffect } from "react";
import { Grid, Typography, Switch, IconButton } from "@mui/material";
import { connect } from "react-redux";
import {
    SWITCH_ACCOUNT_ACTIVE,
    ENROLLED_COURSES_HEADER,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import PermissionsEditor from "./permissions-editor";
import type { Address, Auth, Course, User } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import Link from "next/link";
import { ArrowBack } from "@mui/icons-material";

const { networkAction, setAppMessage } = actionCreators;

const PREFIX = "Details";

const classes = {
    container: `${PREFIX}-container`,
    enrolledCourseItem: `${PREFIX}-enrolledCourseItem`,
    fullHeight: `${PREFIX}-fullHeight`,
};

interface DetailsProps {
    userId: string;
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
}

const Details = ({ userId, auth, address, dispatch }: DetailsProps) => {
    const [userData, setUserData] = useState<User>();
    const [enrolledCourses, setEnrolledCourses] = useState([]);

    useEffect(() => {
        getUserDetails();
    }, [userId]);

    useEffect(() => {
        if (userData) {
            getEnrolledCourses();
        }
    }, []);

    const getUserDetails = async () => {
        const query = `
    query {
        user: getUser(userId: "${userId}") { 
            id,
            email,
            name,
            purchases,
            active,
            permissions,
            userId
         }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    // TODO: test this method. A hard-coded userId was there in the query.
    const getEnrolledCourses = async () => {
        const query = `
    query {
      enrolledCourses: getEnrolledCourses(userId: "${userData!.id}") {
        id,
        title
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            setEnrolledCourses(response.enrolledCourses);
        } catch (err) {
        } finally {
            dispatch(networkAction(false));
        }
    };

    const toggleActiveState = async (value: boolean) => {
        const mutation = `
    mutation {
      user: updateUser(userData: {
          id: "${userData!.id}"
          active: ${value}
      }) { 
        id,
        email,
        name,
        purchases,
        active,
        permissions,
        userId
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <Section>
            {userData && (
                <Grid
                    container
                    direction="column"
                    className={classes.container}
                    spacing={2}
                >
                    <Grid item xs>
                        <Grid container alignItems="center">
                            <Grid item>
                                <IconButton size="large">
                                    <Link href="/dashboard/users">
                                        <ArrowBack />
                                    </Link>
                                </IconButton>
                            </Grid>
                            <Grid item>
                                <Grid item>
                                    <Typography variant="h1">
                                        {userData.name
                                            ? userData.name
                                            : userData.email}
                                    </Typography>
                                    <Typography variant="body2">
                                        <a href={`mailto:${userData.email}`}>
                                            {userData.email}
                                        </a>
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item>
                        <Grid container spacing={2}>
                            <Grid
                                item
                                container
                                direction="row"
                                justifyContent="space-between"
                                xs
                            >
                                <Typography variant="subtitle1">
                                    {SWITCH_ACCOUNT_ACTIVE}
                                </Typography>
                                <Switch
                                    type="checkbox"
                                    name="active"
                                    checked={userData.active}
                                    onChange={(e) =>
                                        toggleActiveState(e.target.checked)
                                    }
                                />
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Section>
                                <PermissionsEditor user={userData} />
                            </Section>
                        </Grid>
                    </Grid>

                    {userData.purchases && userData.purchases.length > 0 && (
                        <Grid item>
                            <Section>
                                <Typography variant="h6">
                                    {ENROLLED_COURSES_HEADER} (
                                    {userData.purchases.length})
                                </Typography>
                                <Grid container direction="column">
                                    {enrolledCourses.map((course: Course) => (
                                        <Grid
                                            item
                                            key={course.id}
                                            className={
                                                classes.enrolledCourseItem
                                            }
                                        >
                                            {course.title}
                                        </Grid>
                                    ))}
                                </Grid>
                            </Section>
                        </Grid>
                    )}
                </Grid>
            )}
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

export default connect(mapStateToProps, mapDispatchToProps)(Details);
