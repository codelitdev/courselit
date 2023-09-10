import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
    SWITCH_ACCOUNT_ACTIVE,
    //ENROLLED_COURSES_HEADER,
    USERS_MANAGER_PAGE_HEADING,
    PAGE_HEADER_EDIT_USER,
    USER_BASIC_DETAILS_HEADER,
    USER_EMAIL_SUBHEADER,
    USER_NAME_SUBHEADER,
} from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { AppMessage } from "@courselit/common-models";
import PermissionsEditor from "./permissions-editor";
import type { Address, User } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import {
    Link,
    Section,
    Switch,
    Breadcrumbs,
} from "@courselit/components-library";

const { networkAction, setAppMessage } = actionCreators;

interface DetailsProps {
    userId: string;
    address: Address;
    dispatch: AppDispatch;
}

const Details = ({ userId, address, dispatch }: DetailsProps) => {
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
            active,
            permissions,
            userId,
            purchases {
               courseId 
            }
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

    if (!userData) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumbs aria-label="breakcrumb">
                <Link href="/dashboard/users">
                    {USERS_MANAGER_PAGE_HEADING}
                </Link>

                <p>{PAGE_HEADER_EDIT_USER}</p>
            </Breadcrumbs>
            <h1 className="text-4xl font-semibold mb-4">
                {userData.name ? userData.name : userData.email}
            </h1>
            <div className="flex gap-2">
                <Section
                    className="md:w-1/2"
                    header={USER_BASIC_DETAILS_HEADER}
                >
                    <div className="flex items-center justify-between">
                        <p>{USER_NAME_SUBHEADER}</p>
                        <p>{userData.name || "--"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <p>{USER_EMAIL_SUBHEADER}</p>
                        <p>
                            <Link href={`mailto:${userData.email}`}>
                                {userData.email}
                            </Link>
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        {SWITCH_ACCOUNT_ACTIVE}
                        <Switch
                            type="checkbox"
                            name="active"
                            checked={userData.active}
                            onChange={(value) => toggleActiveState(value)}
                        />
                    </div>
                </Section>
                <PermissionsEditor user={userData} />
            </div>

            {/*
                    {userData.purchases && userData.purchases.length > 0 && (
                        <Grid item>
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
                        </Grid>
                    )}
                    */}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Details);
