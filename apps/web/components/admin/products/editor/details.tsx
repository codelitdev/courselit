import React, { FormEvent, useEffect, useState } from "react";
import { RichText, Section } from "@courselit/components-library";
import useCourse from "./course-hook";
import { FetchBuilder } from "@courselit/utils";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { Address, AppMessage } from "@courselit/common-models";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    FORM_FIELD_FEATURED_IMAGE,
} from "../../../../ui-config/strings";
import { connect } from "react-redux";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Button, Grid, TextField } from "@mui/material";
import MediaSelector from "../../media/media-selector";
import { MIMETYPE_IMAGE } from "../../../../ui-config/constants";
import Media from "@courselit/common-models/dist/media";

interface DetailsProps {
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

function Details({ id, address, dispatch }: DetailsProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(RichText.emptyState());
    const [featuredImage, setFeaturedImage] = useState<Media>(null);
    const course = useCourse(id);

    useEffect(() => {
        if (course) {
            setTitle(course.title);
            setDescription(
                course.description
                    ? RichText.hydrate({ data: course.description })
                    : RichText.emptyState()
            );
            setFeaturedImage(course.featuredImage);
        }
    }, [course]);

    const updateDetails = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const mutation = `
        mutation {
            updateCourse(courseData: {
                id: "${course.id}"
                title: "${course!.title}",
          description: "${RichText.stringify(description)}",
          featuredImage: ${
              featuredImage ? '"' + featuredImage.mediaId + '"' : null
          },
            }) {
                id
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
            if (response.updateCourse) {
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_COURSE_SAVED))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <Section>
            <form onSubmit={updateDetails}>
                <Grid container direction="column">
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <TextField
                            required
                            variant="outlined"
                            label="Title"
                            fullWidth
                            margin="normal"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ mb: 2 }}>
                        <RichText
                            initialContentState={description}
                            onChange={(editorState) =>
                                setDescription(editorState)
                            }
                        />
                    </Grid>
                    <Grid item>
                        <MediaSelector
                            title={FORM_FIELD_FEATURED_IMAGE}
                            src={featuredImage && featuredImage.thumbnail}
                            onSelection={(media?: Media) => {
                                media && setFeaturedImage(media || null);
                            }}
                            mimeTypesToShow={[...MIMETYPE_IMAGE]}
                            access="public"
                        />
                    </Grid>
                </Grid>
                <Grid item>
                    <Button
                        type="submit"
                        variant="contained"
                        // disabled={
                        //     !title ||
                        //     (course?.title === title &&
                        //         course?.featuredImage?.mediaId ===
                        //             featuredImage?.mediaId)
                        // }
                    >
                        {BUTTON_SAVE}
                    </Button>
                </Grid>
            </form>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Details);
