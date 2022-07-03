import React, { FormEvent, useEffect, useState } from "react";
import { Section } from "@courselit/components-library";
import useCourse from "./course-hook";
import { connect } from "react-redux";
import { Button, Grid, Typography } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { Address, AppMessage } from "@courselit/common-models";
import {
    BTN_PUBLISH,
    BTN_UNPUBLISH,
    PUBLISH_TAB_STATUS_SUBTITLE,
    PUBLISH_TAB_STATUS_TITLE,
    PUBLISH_TAB_VISIBILITY_SUBTITLE,
    PUBLISH_TAB_VISIBILITY_TITLE,
} from "../../../../ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";

interface PublishProps {
    id: string;
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}

function Publish({ id, address, dispatch, loading }: PublishProps) {
    const [published, setPublished] = useState(course?.published);
    const [privacy, setPrivacy] = useState(course?.privacy);
    let course = useCourse(id);

    useEffect(() => {
        if (course) {
            setPublished(course.published);
            setPrivacy(course.privacy);
        }
    }, [course]);

    const updatePublishingDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    const togglePublishedStatus = async () => {
        const query = `
      mutation {
        course: updateCourse(courseData: {
          id: "${course!.id}"
          published: ${!published}
        }) {
          id,
          published
        }
      }
    `;
        const response = await saveSettings(query);
        setPublished(response.published);
    };

    const toggleVisibility = async () => {
        const query = `
        mutation {
            course: updateCourse(courseData: {
            id: "${course!.id}"
            privacy: ${privacy === "UNLISTED" ? "PUBLIC" : "UNLISTED"}
            }) {
            id,
            privacy 
            }
        }
        `;
        const response = await saveSettings(query);
        setPrivacy(response.privacy);
    };

    const saveSettings = async (mutation: string) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                return response.course;
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    if (!course) {
        return <></>;
    }

    return (
        <Section>
            <form onSubmit={updatePublishingDetails}>
                <Grid container>
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <Grid
                            container
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Grid item>
                                <Typography variant="h5">
                                    {PUBLISH_TAB_STATUS_TITLE}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    color="textSecondary"
                                >
                                    {PUBLISH_TAB_STATUS_SUBTITLE}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Button
                                    onClick={togglePublishedStatus}
                                    variant="outlined"
                                    disabled={loading}
                                >
                                    {published ? BTN_UNPUBLISH : BTN_PUBLISH}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={12}>
                        <Grid
                            container
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Grid item>
                                <Typography variant="h5">
                                    {PUBLISH_TAB_VISIBILITY_TITLE}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    color="textSecondary"
                                >
                                    {PUBLISH_TAB_VISIBILITY_SUBTITLE}
                                </Typography>
                            </Grid>
                            <Grid item>
                                <Button
                                    onClick={toggleVisibility}
                                    variant="outlined"
                                    disabled={loading}
                                >
                                    {privacy}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </form>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Publish);
