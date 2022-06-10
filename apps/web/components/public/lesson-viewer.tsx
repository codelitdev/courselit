import React, { useEffect, useState } from "react";
import { styled } from "@mui/system";
import PropTypes from "prop-types";
import { FetchBuilder } from "@courselit/utils";
import {
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_PDF,
} from "../../ui-config/constants";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import { Typography, Grid } from "@mui/material";
import {
    ENROLL_IN_THE_COURSE,
    NOT_ENROLLED_HEADER,
} from "../../ui-config/strings";
import { Section, RichText as TextEditor } from "@courselit/components-library";
import type { Lesson, Auth, Profile, Address } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";

const { networkAction } = actionCreators;

const PREFIX = "LessonViewer";

const classes = {
    notEnrolledHeader: `${PREFIX}-notEnrolledHeader`,
    videoPlayer: `${PREFIX}-videoPlayer`,
    section: `${PREFIX}-section`,
};

const StyledSection = styled(Section)(({ theme }: { theme: any }) => ({
    [`& .${classes.notEnrolledHeader}`]: {
        marginBottom: theme.spacing(1),
    },

    [`& .${classes.videoPlayer}`]: {
        width: "100%",
        height: "auto",
    },

    [`& .${classes.section}`]: {
        marginTop: "1.6em",
    },
}));

interface CaptionProps {
    text: string;
}

const Caption = (props: CaptionProps) => {
    if (!props.text) {
        return null;
    }

    return (
        <Grid container justifyContent="center">
            <Grid item>
                <Typography variant="caption" color="textSecondary">
                    {props.text}
                </Typography>
            </Grid>
        </Grid>
    );
};

Caption.propTypes = {
    text: PropTypes.string,
};

interface LessonViewerProps {
    lesson: Lesson;
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
}

const LessonViewer = (props: LessonViewerProps) => {
    const [lesson, setLesson] = useState(props.lesson);
    const [isEnrolled] = useState(
        !lesson.requiresEnrollment ||
            (props.profile &&
                props.profile.purchases.includes(props.lesson.courseId))
    );

    useEffect(() => {
        props.lesson.id && isEnrolled && loadLesson(props.lesson.id);
    }, [props.lesson]);

    const loadLesson = async (id: string) => {
        const query = `
    query {
      lesson: getLessonDetails(id: "${id}") {
        id,
        title,
        downloadable,
        type,
        content,
        media {
          id,
          file,
          caption
        },
        requiresEnrollment,
        courseId
      }
    }
    `;

        const fetch = new FetchBuilder()
            .setUrl(`${props.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            props.dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.lesson) {
                setLesson(
                    Object.assign({}, response.lesson, {
                        content: TextEditor.hydrate({
                            data: response.lesson.content,
                        }),
                    })
                );
            }
        } catch (err) {
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    return (
        <StyledSection>
            {!isEnrolled && (
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Typography
                            variant="h2"
                            className={classes.notEnrolledHeader}
                        >
                            {NOT_ENROLLED_HEADER}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Typography variant="body1">
                            {ENROLL_IN_THE_COURSE}
                        </Typography>
                    </Grid>
                </Grid>
            )}
            {isEnrolled && (
                <Grid container direction="column" component="article">
                    <Grid item>
                        <header>
                            <Typography variant="h2">{lesson.title}</Typography>
                        </header>
                    </Grid>
                    {String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO) ===
                        lesson.type && (
                        <Grid item>
                            <video
                                controls
                                controlsList="nodownload"
                                className={`${classes.videoPlayer} ${classes.section}`}
                            >
                                <source
                                    src={
                                        lesson.media &&
                                        (lesson.media.file as string)
                                    }
                                    type="video/mp4"
                                />
                                Your browser does not support the video tag.
                            </video>
                            <Caption
                                text={
                                    lesson.media &&
                                    (lesson.media.caption as string)
                                }
                            />
                        </Grid>
                    )}
                    {String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO) ===
                        lesson.type && (
                        <Grid item>
                            <audio
                                controls
                                controlsList="nodownload"
                                className={classes.section}
                            >
                                <source
                                    src={
                                        lesson.media &&
                                        (lesson.media.file as string)
                                    }
                                    type="audio/mpeg"
                                />
                                Your browser does not support the video tag.
                            </audio>
                            <Caption
                                text={
                                    lesson.media &&
                                    (lesson.media.caption as string)
                                }
                            />
                        </Grid>
                    )}
                    {String.prototype.toUpperCase.call(LESSON_TYPE_PDF) ===
                        lesson.type && (
                        <Grid item>
                            <iframe
                                frameBorder="0"
                                width="100%"
                                height="500"
                                src={`${
                                    lesson.media && lesson.media.file
                                }#view=fit`}
                            ></iframe>
                            <Caption
                                text={
                                    lesson.media &&
                                    (lesson.media.caption as string)
                                }
                            />
                        </Grid>
                    )}
                    {lesson.content && (
                        <Grid item className={classes.section}>
                            <TextEditor
                                initialContentState={lesson.content}
                                readOnly={true}
                            />
                        </Grid>
                    )}
                </Grid>
            )}
        </StyledSection>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonViewer);
