import React, { useEffect, useState } from "react";
import { styled } from "@mui/system";
import { FetchBuilder } from "@courselit/utils";
import {
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_FILE,
    LESSON_TYPE_TEXT,
    LESSON_TYPE_EMBED,
    LESSON_TYPE_QUIZ,
} from "../../../ui-config/constants";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import { Typography, Grid, Button } from "@mui/material";
import {
    COURSE_PROGRESS_FINISH,
    COURSE_PROGRESS_INTRO,
    COURSE_PROGRESS_NEXT,
    COURSE_PROGRESS_PREV,
    ENROLL_BUTTON_TEXT,
    ENROLL_IN_THE_COURSE,
    NOT_ENROLLED_HEADER,
} from "../../../ui-config/strings";
import { TextRenderer, Link } from "@courselit/components-library";
import type {
    Address,
    Lesson,
    Profile,
    Quiz,
    SiteInfo,
} from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { useRouter } from "next/router";
import {
    refreshUserProfile,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { isEnrolled } from "../../../ui-lib/utils";
import LessonEmbedViewer from "./embed-viewer";
import QuizViewer from "./quiz-viewer";
import Head from "next/head";

const { networkAction } = actionCreators;

const PREFIX = "LessonViewer";

const classes = {
    notEnrolledHeader: `${PREFIX}-notEnrolledHeader`,
    videoPlayer: `${PREFIX}-videoPlayer`,
    section: `${PREFIX}-section`,
};

const StyledSection = styled("div")(({ theme }: { theme: any }) => ({
    [`& .${classes.notEnrolledHeader}`]: {
        marginBottom: theme.spacing(1),
    },

    [`& .${classes.videoPlayer}`]: {
        width: "100%",
        height: "auto",
    },

    [`& .${classes.section}`]: {
        marginTop: "1.6em",
        paddingBottom: 100,
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

interface LessonViewerProps {
    slug: string;
    lessonId: string;
    dispatch: AppDispatch;
    profile: Profile;
    address: Address;
    networkAction: boolean;
    siteinfo: SiteInfo;
}

const LessonViewer = ({
    slug,
    lessonId,
    dispatch,
    profile,
    address,
    siteinfo,
    networkAction: loading,
}: LessonViewerProps) => {
    const [lesson, setLesson] = useState<Lesson>();
    const router = useRouter();

    useEffect(() => {
        if (lessonId) {
            loadLesson(lessonId);
        }
    }, [lessonId]);

    const loadLesson = async (id: string) => {
        const query = `
    query {
      lesson: getLessonDetails(id: "${id}") {
        lessonId,
        title,
        downloadable,
        type,
        content,
        media {
          file,
          caption,
          originalFileName
        },
        requiresEnrollment,
        courseId,
        prevLesson,
        nextLesson
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

            if (response.lesson) {
                setLesson(response.lesson);
            }
        } catch (err: any) {
            if (err.message === "You are not enrolled in the course") {
                setLesson(undefined);
                return;
            }

            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const markCompleteAndNext = async () => {
        const query = `
        mutation {
            result: markLessonCompleted(id: "${lesson!.lessonId}")
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

            if (response.result) {
                if (lesson!.nextLesson) {
                    dispatch(refreshUserProfile());
                    router.push(
                        `/course/${slug}/${lesson!.courseId}/${
                            lesson!.nextLesson
                        }`
                    );
                } else {
                    router.push(`/my-content`);
                }
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    if (!lesson) {
        return (
            <Grid container direction="column" sx={{ p: 2 }}>
                <Grid item sx={{ mb: 1 }}>
                    <Typography
                        variant="h2"
                        className={classes.notEnrolledHeader}
                    >
                        {NOT_ENROLLED_HEADER}
                    </Typography>
                </Grid>
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="body1">
                        {ENROLL_IN_THE_COURSE}
                    </Typography>
                </Grid>
                <Grid item>
                    <Link
                        href={`/checkout/${router.query.id}`}
                        sxProps={{
                            textDecoration: "none",
                        }}
                    >
                        <Button variant="contained" size="large">
                            {ENROLL_BUTTON_TEXT}
                        </Button>
                    </Link>
                </Grid>
            </Grid>
        );
    }

    return (
        <StyledSection>
            {lesson && (
                <Head>
                    <title>
                        {lesson.title} | {siteinfo.title}
                    </title>
                    <link
                        rel="icon"
                        href={
                            siteinfo.logo && siteinfo.logo.file
                                ? siteinfo.logo.file
                                : "/favicon.ico"
                        }
                    />
                    <meta
                        name="viewport"
                        content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                    />
                </Head>
            )}
            {lesson && (
                <Grid
                    container
                    direction="column"
                    component="article"
                    sx={{ p: 2 }}
                >
                    <Grid item>
                        <header>
                            <Typography variant="h2">{lesson.title}</Typography>
                        </header>
                    </Grid>
                    {String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO) ===
                        lesson.type && (
                        <Grid
                            item
                            className={classes.section}
                            sx={{
                                overflow: "hidden",
                                borderRadius: 4,
                            }}
                        >
                            <video
                                controls
                                controlsList="nodownload" // eslint-disable-line react/no-unknown-property
                                className={classes.videoPlayer}
                                key={lesson.lessonId}
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
                                controlsList="nodownload" // eslint-disable-line react/no-unknown-property
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
                        <Grid item className={classes.section}>
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
                    {String.prototype.toUpperCase.call(LESSON_TYPE_TEXT) ===
                        lesson.type &&
                        lesson.content && (
                            <Grid item className={classes.section}>
                                <TextRenderer json={lesson.content} />
                            </Grid>
                        )}
                    {String.prototype.toUpperCase.call(LESSON_TYPE_EMBED) ===
                        lesson.type &&
                        lesson.content && (
                            <Grid item className={classes.section}>
                                <LessonEmbedViewer content={lesson.content} />
                            </Grid>
                        )}
                    {String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ) ===
                        lesson.type &&
                        lesson.content && (
                            <Grid item className={classes.section}>
                                <QuizViewer
                                    lessonId={lesson.lessonId}
                                    content={lesson.content as Quiz}
                                />
                            </Grid>
                        )}
                    {String.prototype.toUpperCase.call(LESSON_TYPE_FILE) ===
                        lesson.type && (
                        <Grid item className={classes.section}>
                            <Grid
                                container
                                justifyContent="center"
                                alignItems="center"
                            >
                                <Grid
                                    item
                                    xs={12}
                                    component="object"
                                    data={lesson.media?.file as string}
                                    sx={{
                                        height: "100vh",
                                    }}
                                />
                            </Grid>
                        </Grid>
                    )}
                    {isEnrolled(lesson.courseId, profile) && (
                        <Grid
                            item
                            sx={{
                                position: "fixed",
                                bottom: 0,
                                left: 0,
                                right: 0,
                            }}
                        >
                            <Grid
                                container
                                justifyContent="flex-end"
                                sx={(theme) => ({
                                    padding: 2,
                                    backgroundColor:
                                        theme.palette.background.default,
                                })}
                            >
                                <Grid item sx={{ mr: 2 }}>
                                    {!lesson.prevLesson && (
                                        <Link
                                            href={`/course/${slug}/${lesson.courseId}`}
                                            sxProps={{
                                                textDecoration: "none",
                                            }}
                                        >
                                            <Button
                                                component="a"
                                                size="large"
                                                startIcon={<ArrowBack />}
                                            >
                                                {COURSE_PROGRESS_INTRO}
                                            </Button>
                                        </Link>
                                    )}
                                    {lesson.prevLesson && (
                                        <Link
                                            href={`/course/${slug}/${lesson.courseId}/${lesson.prevLesson}`}
                                            sxProps={{
                                                textDecoration: "none",
                                            }}
                                        >
                                            <Button
                                                component="a"
                                                size="large"
                                                startIcon={<ArrowBack />}
                                            >
                                                {COURSE_PROGRESS_PREV}
                                            </Button>
                                        </Link>
                                    )}
                                </Grid>
                                <Grid item>
                                    <Button
                                        component="a"
                                        size="large"
                                        endIcon={
                                            lesson.nextLesson ? (
                                                <ArrowForward />
                                            ) : undefined
                                        }
                                        variant="contained"
                                        onClick={markCompleteAndNext}
                                        disabled={loading}
                                    >
                                        {lesson.nextLesson
                                            ? COURSE_PROGRESS_NEXT
                                            : COURSE_PROGRESS_FINISH}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            )}
        </StyledSection>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
    networkAction: state.networkAction,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonViewer);
