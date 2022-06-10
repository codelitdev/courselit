import { FetchBuilder } from "@courselit/utils";
import { Button, Grid, TextField, Typography } from "@mui/material";
import {
    PROFILE_PAGE_HEADER,
    PROFILE_SECTION_DETAILS_NAME,
    PROFILE_SECTION_DETAILS_BIO,
    PROFILE_SECTION_DETAILS_BIO_EMPTY,
    PROFILE_SECTION_DETAILS_EMAIL,
    PROFILE_MY_COURSES,
    PROFILE_PAGE_NOT_ENROLLED,
    PROFILE_PAGE_BROWSE_COURSES_TEXT,
    BUTTON_SAVE,
    APP_MESSAGE_CHANGES_SAVED,
} from "../../ui-config/strings";
import { connect } from "react-redux";
import Link from "next/link";
import { useState } from "react";
import { actionCreators } from "@courselit/state-management";
import { getBackendAddress } from "../../ui-lib/utils";
import { Section } from "@courselit/components-library";
import { AppMessage } from "@courselit/common-models";
import type { State } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import BaseLayout from "../../components/public/base-layout";

function Profile({ user, profile, auth, dispatch, address }: any) {
    const isMyProfile = profile && profile.id === user.id;
    const [bio, setBio] = useState(user.bio || "");
    const [name, setName] = useState(user.name || "");
    const { networkAction, refreshUserProfile, setAppMessage } = actionCreators;

    const saveDetails = async () => {
        if (!isMyProfile) {
            return;
        }

        const graphQuery = `
      mutation {
        user: updateUser(userData: {
          id: "${profile.id}"
          name: "${name}",
          bio: "${bio}"
        }) {
          id,
          bio
        }
      }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(graphQuery)
            .setIsGraphQLEndpoint(true)
            .setAuthToken(auth.token)
            .build();

        try {
            dispatch(networkAction(true));
            await fetch.exec();
            dispatch(refreshUserProfile());
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
        } catch (err) {
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <BaseLayout title={user.name || PROFILE_PAGE_HEADER}>
            <Grid item xs={12}>
                <Grid
                    container
                    direction="column"
                    sx={{
                        padding: 2,
                    }}
                >
                    <Grid item xs={12}>
                        <Typography variant="h2">
                            {PROFILE_PAGE_HEADER}
                        </Typography>
                    </Grid>
                    {user.id && (
                        <Grid item xs={12}>
                            <Section>
                                <Grid container direction="column" spacing={1}>
                                    {isMyProfile && (
                                        <Grid item container direction="column">
                                            <Grid item>
                                                <Typography variant="h6">
                                                    {
                                                        PROFILE_SECTION_DETAILS_EMAIL
                                                    }
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography
                                                    variant="body1"
                                                    color="textSecondary"
                                                >
                                                    {profile.email}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    )}

                                    <Grid item container direction="column">
                                        <Grid item>
                                            <Typography variant="h6">
                                                {PROFILE_SECTION_DETAILS_NAME}
                                            </Typography>
                                        </Grid>
                                        <Grid item>
                                            {!isMyProfile && (
                                                <Typography
                                                    variant="body1"
                                                    color="textSecondary"
                                                >
                                                    {user.name}
                                                </Typography>
                                            )}
                                            {isMyProfile && (
                                                <TextField
                                                    variant="outlined"
                                                    fullWidth
                                                    margin="normal"
                                                    name="name"
                                                    value={name}
                                                    onChange={(event) =>
                                                        setName(
                                                            event.target.value
                                                        )
                                                    }
                                                    required
                                                />
                                            )}
                                        </Grid>
                                    </Grid>

                                    <Grid item container direction="column">
                                        <Grid item>
                                            <Typography variant="h6">
                                                {PROFILE_SECTION_DETAILS_BIO}
                                            </Typography>
                                        </Grid>
                                        <Grid item>
                                            {!isMyProfile && (
                                                <Typography
                                                    variant="body1"
                                                    color="textSecondary"
                                                >
                                                    {user.bio ||
                                                        PROFILE_SECTION_DETAILS_BIO_EMPTY}
                                                </Typography>
                                            )}
                                            {isMyProfile && (
                                                <TextField
                                                    variant="outlined"
                                                    fullWidth
                                                    margin="normal"
                                                    name="bio"
                                                    value={bio}
                                                    onChange={(event) =>
                                                        setBio(
                                                            event.target.value
                                                        )
                                                    }
                                                    multiline={true}
                                                    maxRows={5}
                                                    required
                                                />
                                            )}
                                        </Grid>
                                    </Grid>

                                    {isMyProfile && (
                                        <Grid item>
                                            <Button
                                                onClick={saveDetails}
                                                disabled={
                                                    bio === user.bio &&
                                                    name === user.name
                                                }
                                            >
                                                {BUTTON_SAVE}
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </Section>
                        </Grid>
                    )}

                    {isMyProfile && (
                        <Grid item xs={12}>
                            <Section>
                                <Grid container direction="column" spacing={1}>
                                    <Grid item>
                                        <Typography variant="h3">
                                            {PROFILE_MY_COURSES}
                                        </Typography>
                                    </Grid>
                                    {profile.purchases.length > 0 && (
                                        <Grid item>
                                            {profile.purchases.map((course) => (
                                                <Typography key={course.id}>
                                                    {course.title}
                                                </Typography>
                                            ))}
                                        </Grid>
                                    )}
                                    {profile.purchases.length <= 0 && (
                                        <Grid item>
                                            <Typography>
                                                {PROFILE_PAGE_NOT_ENROLLED}{" "}
                                                <Link href="/courses">
                                                    <a>
                                                        {
                                                            PROFILE_PAGE_BROWSE_COURSES_TEXT
                                                        }
                                                    </a>
                                                </Link>
                                                .
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Section>
                        </Grid>
                    )}
                    {!user.id && (
                        <Section>
                            <Typography
                                variant="body1"
                                className={classes.leftMargin}
                            >
                                {user.name}
                            </Typography>
                        </Section>
                    )}
                </Grid>
            </Grid>
        </BaseLayout>
    );
}

export async function getServerSideProps({ query, req }: any) {
    const graphQuery = `
    query {
      user: getUser(userId: "${query.id}") {
        id,
        userId,
        email,
        name,
        bio
      }
    }
  `;
    const address = `${getBackendAddress(req.headers.host)}/api/graph`;
    const fetch = new FetchBuilder()
        .setUrl(address)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    let user = null;
    try {
        const response = await fetch.exec();
        user = response.user;
    } catch (err) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            user,
        },
    };
}

const mapStateToProps = (state: State) => ({
    profile: state.profile,
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Profile);
