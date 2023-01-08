import React, { useState, useEffect, ChangeEvent } from "react";
import {
    Button,
    TextField,
    Typography,
    Grid,
    Switch,
    capitalize,
    Tooltip,
} from "@mui/material";
import {
    BUTTON_SAVE,
    DOWNLOADABLE_SWITCH,
    TYPE_DROPDOWN,
    LESSON_CONTENT_HEADER,
    CONTENT_URL_LABEL,
    LESSON_PREVIEW,
    DELETE_LESSON_POPUP_HEADER,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    APP_MESSAGE_LESSON_DELETED,
    BUTTON_NEW_LESSON_TEXT,
    EDIT_LESSON_TEXT,
    BUTTON_DELETE_LESSON_TEXT,
    LESSON_PREVIEW_TOOLTIP,
    LESSON_CONTENT_EMBED_HEADER,
    LESSON_CONTENT_EMBED_PLACEHOLDER,
    BUTTON_SAVING,
} from "../../../../../ui-config/strings";
import {
    LESSON_TYPE_TEXT,
    LESSON_TYPE_AUDIO,
    LESSON_TYPE_VIDEO,
    LESSON_TYPE_PDF,
    LESSON_TYPE_QUIZ,
    LESSON_TYPE_FILE,
    MIMETYPE_VIDEO,
    MIMETYPE_AUDIO,
    MIMETYPE_PDF,
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
    LESSON_TYPE_EMBED,
} from "../../../../../ui-config/constants";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { AppMessage, Media, Profile, Quiz } from "@courselit/common-models";
import { Section, Select, TextEditor } from "@courselit/components-library";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Auth, Lesson, Address } from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import Link from "next/link";
import { useRouter } from "next/router";
import useCourse from "../course-hook";
import { Help } from "@mui/icons-material";
import { Dialog, MediaSelector } from "@courselit/components-library";
import { QuizBuilder } from "./quiz-builder";

const { networkAction, setAppMessage } = actionCreators;

interface LessonEditorProps {
    courseId: string;
    sectionId: string;
    lessonId?: string;
    auth: Auth;
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
}

const LessonEditor = ({
    courseId,
    sectionId,
    lessonId,
    dispatch,
    address,
    profile,
    auth,
}: LessonEditorProps) => {
    const [lesson, setLesson] = useState<Lesson>({
        lessonId: "",
        title: "",
        type: "",
        media: {},
        downloadable: false,
        requiresEnrollment: true,
        courseId,
        groupId: sectionId,
        content: "",
    });
    const router = useRouter();
    const [deleteLessonPopupOpened, setDeleteLessonPopupOpened] =
        useState(false);
    const [refresh, setRefresh] = useState(0);
    const [content, setContent] = useState<{ value: string }>({ value: "" });
    const [textContent, setTextContent] = useState<Record<string, unknown>>({
        type: "doc",
    });
    const [quizContent, setQuizContent] = useState<Partial<Quiz>>({});
    const [loading, setLoading] = useState(false);
    const course = useCourse(courseId);

    useEffect(() => {
        lessonId && loadLesson(lessonId);
    }, [lessonId]);

    useEffect(() => {
        if (course && !lessonId) {
            setLesson(
                Object.assign({}, lesson, {
                    type:
                        course.type?.toUpperCase() === COURSE_TYPE_DOWNLOAD
                            ? LESSON_TYPE_TEXT.toUpperCase()
                            : LESSON_TYPE_FILE.toUpperCase(),
                })
            );
        }
    }, [course]);

    const loadLesson = async (id: string) => {
        const query = `
            query {
                lesson: getLesson(id: "${id}") {
                    title,
                    downloadable,
                    type,
                    content,
                    media {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    requiresEnrollment,
                    lessonId
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
                switch (response.lesson.type.toLowerCase()) {
                    case LESSON_TYPE_TEXT:
                        setTextContent(
                            response.lesson.content || { type: "doc" }
                        );
                        setRefresh(refresh + 1);
                        break;
                    case LESSON_TYPE_QUIZ:
                        setQuizContent(response.lesson.content || {});
                        break;
                    default:
                        setContent(response.lesson.content || { value: "" });
                }
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onLessonCreate = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (lesson.lessonId) {
            await updateLesson();
        } else {
            await createLesson();
        }
    };

    const updateLesson = async () => {
        const query = `
            mutation {
                lesson: updateLesson(lessonData: {
                    id: "${lesson.lessonId}"
                    title: "${lesson.title}",
                    downloadable: ${lesson.downloadable},
                    content: ${formatContentForSending()},
                    media: ${
                        lesson.media && lesson.media.mediaId
                            ? `{
                                mediaId: "${lesson.media.mediaId}",
                                originalFileName: "${
                                    lesson.media.originalFileName
                                }",
                                mimeType: "${lesson.media.mimeType}",
                                size: ${lesson.media.size || 0},
                                access: "${lesson.media.access}",
                                file: ${
                                    lesson.media.access === "public"
                                        ? `"${lesson.media.file}"`
                                        : null
                                },
                                thumbnail: "${lesson.media.thumbnail}",
                                caption: "${lesson.media.caption}"
                            }`
                            : null
                    }, 
                    requiresEnrollment: ${lesson.requiresEnrollment}
                }) {
                    lessonId
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
            setLoading(true);
            await fetch.exec();
            goBackLessonList();
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
            setLoading(false);
        }
    };

    const formatContentForSending = () => {
        switch (lesson.type.toLowerCase()) {
            case LESSON_TYPE_TEXT:
                return JSON.stringify(JSON.stringify(textContent));
            case LESSON_TYPE_QUIZ:
                return JSON.stringify(JSON.stringify(quizContent));
            default:
                return JSON.stringify(JSON.stringify(content));
        }
    };

    const createLesson = async () => {
        const query = `
            mutation {
                lesson: createLesson(lessonData: {
                    title: "${lesson.title}",
                    downloadable: ${lesson.downloadable},
                    type: ${lesson.type.toUpperCase()},
                    content: ${formatContentForSending()},
                    media: ${
                        lesson.media && lesson.media.mediaId
                            ? `{
                        mediaId: "${lesson.media.mediaId}",
                        originalFileName: "${lesson.media.originalFileName}",
                        mimeType: "${lesson.media.mimeType}",
                        size: ${lesson.media.size || 0},
                        access: "${lesson.media.access}",
                        file: ${
                            lesson.media.access === "public"
                                ? `"${lesson.media.file}"`
                                : null
                        },
                        thumbnail: "${lesson.media.thumbnail}",
                        caption: "${lesson.media.caption}"
                    }`
                            : null
                    }, 
                    courseId: "${lesson.courseId}",
                    requiresEnrollment: ${lesson.requiresEnrollment},
                    groupId: "${lesson.groupId}"
                }) {
                    lessonId   
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
            setLoading(true);
            await fetch.exec();
            goBackLessonList();
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
            setLoading(false);
        }
    };

    const onLessonDelete = async (index: number) => {
        setDeleteLessonPopupOpened(false);

        if (lesson.lessonId) {
            const query = `
                mutation r {
                    result: deleteLesson(id: "${lesson.lessonId}")
                }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                dispatch(networkAction(true));
                setLoading(true);
                const response = await fetch.exec();

                if (response.result) {
                    dispatch(
                        setAppMessage(
                            new AppMessage(APP_MESSAGE_LESSON_DELETED)
                        )
                    );
                    router.replace(`/dashboard/product/${courseId}/content`);
                }
            } catch (err: any) {
                dispatch(setAppMessage(new AppMessage(err.message)));
            } finally {
                setLoading(false);
            }
        }
    };

    const onLessonDetailsChange = (e: any) =>
        setLesson(
            Object.assign({}, lesson, {
                [e.target.name]:
                    e.target.type === "checkbox"
                        ? !e.target.checked
                        : e.target.value,
            })
        );

    const closeDeleteLessonPopup = () => setDeleteLessonPopupOpened(false);

    const getMimeTypesToShow = () => {
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_VIDEO)
        ) {
            return MIMETYPE_VIDEO;
        }
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_AUDIO)
        ) {
            return MIMETYPE_AUDIO;
        }
        if (
            lesson.type === String.prototype.toUpperCase.call(LESSON_TYPE_PDF)
        ) {
            return MIMETYPE_PDF;
        }

        return [...MIMETYPE_AUDIO, ...MIMETYPE_VIDEO, ...MIMETYPE_PDF];
    };

    const goBackLessonList = () =>
        router.replace(`/dashboard/product/${courseId}/content`);

    const selectOptions =
        course?.type === COURSE_TYPE_COURSE.toUpperCase()
            ? [
                  {
                      label: capitalize(LESSON_TYPE_FILE),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_FILE
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_VIDEO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_VIDEO
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_AUDIO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_AUDIO
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_PDF),
                      value: String.prototype.toUpperCase.call(LESSON_TYPE_PDF),
                  },
                  {
                      label: capitalize(LESSON_TYPE_EMBED),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_EMBED
                      ),
                  },
              ]
            : [
                  {
                      label: capitalize(LESSON_TYPE_FILE),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_FILE
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_VIDEO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_VIDEO
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_AUDIO),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_AUDIO
                      ),
                  },
                  {
                      label: capitalize(LESSON_TYPE_PDF),
                      value: String.prototype.toUpperCase.call(LESSON_TYPE_PDF),
                  },
                  {
                      label: capitalize(LESSON_TYPE_EMBED),
                      value: String.prototype.toUpperCase.call(
                          LESSON_TYPE_EMBED
                      ),
                  },
              ];
    if (course?.type === COURSE_TYPE_COURSE.toUpperCase()) {
        selectOptions.unshift({
            label: capitalize(LESSON_TYPE_TEXT),
            value: String.prototype.toUpperCase.call(LESSON_TYPE_TEXT),
        });
        selectOptions.push({
            label: capitalize(LESSON_TYPE_QUIZ),
            value: String.prototype.toUpperCase.call(LESSON_TYPE_QUIZ),
        });
    }

    return (
        <Section>
            {lesson.type && (
                <Grid container direction="column">
                    <Grid item sx={{ mb: 1 }}>
                        <Typography variant="h2">
                            {lessonId
                                ? EDIT_LESSON_TEXT
                                : BUTTON_NEW_LESSON_TEXT}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <form onSubmit={onLessonCreate}>
                            <Grid container direction="column">
                                <Grid item sx={{ mb: 2 }}>
                                    {course?.type?.toLowerCase() ===
                                        COURSE_TYPE_COURSE && (
                                        <TextField
                                            required
                                            variant="outlined"
                                            label="Title"
                                            fullWidth
                                            margin="normal"
                                            name="title"
                                            value={lesson.title}
                                            onChange={onLessonDetailsChange}
                                        />
                                    )}
                                </Grid>
                                {course?.type?.toLowerCase() ===
                                    COURSE_TYPE_COURSE && (
                                    <Grid item sx={{ mb: 2 }}>
                                        <Select
                                            title={TYPE_DROPDOWN}
                                            value={lesson.type}
                                            options={selectOptions}
                                            onChange={(value) => {
                                                setLesson(
                                                    Object.assign({}, lesson, {
                                                        type: value,
                                                    })
                                                );
                                            }}
                                            disabled={!!lesson.lessonId}
                                        />
                                    </Grid>
                                )}
                                <Grid item sx={{ mb: 2 }}>
                                    {![
                                        String.prototype.toUpperCase.call(
                                            LESSON_TYPE_TEXT
                                        ),
                                        String.prototype.toUpperCase.call(
                                            LESSON_TYPE_QUIZ
                                        ),
                                        String.prototype.toUpperCase.call(
                                            LESSON_TYPE_EMBED
                                        ),
                                    ].includes(lesson.type) && (
                                        <div>
                                            <MediaSelector
                                                title={CONTENT_URL_LABEL}
                                                src={
                                                    (lesson.media &&
                                                        lesson.media
                                                            .thumbnail) ||
                                                    ""
                                                }
                                                srcTitle={
                                                    (lesson.media &&
                                                        lesson.media
                                                            .originalFileName) ||
                                                    ""
                                                }
                                                onSelection={(
                                                    media?: Media
                                                ) => {
                                                    media &&
                                                        setLesson(
                                                            Object.assign(
                                                                {},
                                                                lesson,
                                                                {
                                                                    title:
                                                                        lesson.title ||
                                                                        media.originalFileName,
                                                                    media,
                                                                }
                                                            )
                                                        );
                                                }}
                                                mimeTypesToShow={getMimeTypesToShow()}
                                                strings={{}}
                                                auth={auth}
                                                profile={profile}
                                                dispatch={dispatch}
                                                address={address}
                                            />
                                        </div>
                                    )}
                                    {lesson.type.toLowerCase() ===
                                        LESSON_TYPE_TEXT && (
                                        <Grid container direction="column">
                                            <Grid item>
                                                <Typography variant="body1">
                                                    {LESSON_CONTENT_HEADER}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <TextEditor
                                                    initialContent={textContent}
                                                    refresh={refresh}
                                                    onChange={(state: any) =>
                                                        setTextContent(state)
                                                    }
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                    {lesson.type.toLowerCase() ===
                                        LESSON_TYPE_QUIZ && (
                                        <QuizBuilder
                                            content={quizContent}
                                            // key={JSON.stringify(quizContent)} // to discard state between re-renders
                                            onChange={(state: any) =>
                                                setQuizContent(state)
                                            }
                                        />
                                    )}
                                    {lesson.type.toLowerCase() ===
                                        LESSON_TYPE_EMBED && (
                                        <Grid container direction="column">
                                            <Grid item>
                                                <TextField
                                                    label={
                                                        LESSON_CONTENT_EMBED_HEADER
                                                    }
                                                    placeholder={
                                                        LESSON_CONTENT_EMBED_PLACEHOLDER
                                                    }
                                                    required
                                                    value={content.value}
                                                    onChange={(
                                                        e: ChangeEvent<HTMLInputElement>
                                                    ) =>
                                                        setContent({
                                                            value: e.target
                                                                .value,
                                                        })
                                                    }
                                                    fullWidth
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                    {[
                                        LESSON_TYPE_VIDEO,
                                        LESSON_TYPE_AUDIO,
                                        LESSON_TYPE_PDF,
                                    ].includes(lesson.type) && (
                                        <Grid
                                            container
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Grid item>
                                                <Typography variant="body1">
                                                    {DOWNLOADABLE_SWITCH}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Switch
                                                    type="checkbox"
                                                    name="downloadable"
                                                    checked={
                                                        lesson.downloadable
                                                    }
                                                    onChange={
                                                        onLessonDetailsChange
                                                    }
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                </Grid>
                                {lesson.type.toLowerCase() !==
                                    LESSON_TYPE_QUIZ && (
                                    <Grid item sx={{ mb: 2 }}>
                                        <Grid
                                            container
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Grid item>
                                                <Grid container>
                                                    <Grid item sx={{ mr: 1 }}>
                                                        <Typography
                                                            variant="body1"
                                                            color="textSecondary"
                                                        >
                                                            {LESSON_PREVIEW}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item>
                                                        <Tooltip
                                                            title={
                                                                LESSON_PREVIEW_TOOLTIP
                                                            }
                                                        >
                                                            <Help
                                                                color="disabled"
                                                                fontSize="small"
                                                            />
                                                        </Tooltip>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                            <Grid item>
                                                <Switch
                                                    type="checkbox"
                                                    name="requiresEnrollment"
                                                    checked={
                                                        !lesson.requiresEnrollment
                                                    }
                                                    onChange={
                                                        onLessonDetailsChange
                                                    }
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}
                                <Grid item>
                                    <Grid
                                        container
                                        justifyContent="space-between"
                                    >
                                        <Grid item>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                disabled={
                                                    !lesson.title || loading
                                                }
                                                sx={{ mr: 1 }}
                                            >
                                                {loading
                                                    ? BUTTON_SAVING
                                                    : BUTTON_SAVE}
                                            </Button>
                                            {courseId && (
                                                <Link
                                                    href={`/dashboard/product/${courseId}/content`}
                                                >
                                                    <Button component="a">
                                                        {POPUP_CANCEL_ACTION}
                                                    </Button>
                                                </Link>
                                            )}
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                onClick={(e) =>
                                                    setDeleteLessonPopupOpened(
                                                        true
                                                    )
                                                }
                                                color="error"
                                            >
                                                {BUTTON_DELETE_LESSON_TEXT}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                </Grid>
            )}
            <Dialog
                onOpen={deleteLessonPopupOpened}
                onClose={closeDeleteLessonPopup}
                title={DELETE_LESSON_POPUP_HEADER}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeDeleteLessonPopup,
                    },
                    { name: POPUP_OK_ACTION, callback: onLessonDelete },
                ]}
            />
        </Section>
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

export default connect(mapStateToProps, mapDispatchToProps)(LessonEditor);
